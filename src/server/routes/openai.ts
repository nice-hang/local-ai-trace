import { type FastifyInstance } from 'fastify';
import { type ServerDependencies } from '../server.js';
import { getProvider } from '../../config/config.js';
import { proxyChatCompletion } from '../proxy.js';
import { modelManager } from '../../llm/inference.js';
import { type RunInputs } from '../../trace/types.js';
import { nanoid } from 'nanoid';

export async function registerOpenAIRoutes(server: FastifyInstance, deps: ServerDependencies) {
  // GET /v1/models — return all available models
  server.get('/v1/models', async () => {
    const localModels = deps.config.models.map((m) => ({
      id: m.name,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'local',
    }));

    const remoteModels = deps.config.providers.flatMap((p) =>
      p.models.map((modelId) => ({
        id: modelId,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: p.name,
      }))
    );

    return {
      object: 'list',
      data: [...localModels, ...remoteModels],
    };
  });

  // POST /v1/chat/completions — core proxy + tracing
  server.post<{ Body: Record<string, unknown> }>('/v1/chat/completions', async (request, reply) => {
    const { model, messages, tools, temperature, max_tokens, stream } = request.body as any;

    if (!model || typeof model !== 'string') {
      return reply.status(400).send({ error: { message: 'model is required and must be a string' } });
    }
    if (!messages || !Array.isArray(messages)) {
      return reply.status(400).send({ error: { message: 'messages is required and must be an array' } });
    }
    if (stream === true) {
      return reply.status(400).send({ error: { message: 'Streaming is not supported yet. Set stream=false or omit stream.' } });
    }

    const runId = nanoid();
    const startedAt = Date.now();

    // 检查是否是已安装的本地模型
    const localModel = deps.config.models.find((m) => m.name === model);

    if (localModel) {
      // ── 本地推理路径 ──
      const run = {
        id: runId,
        parentRunId: undefined as string | undefined,
        name: 'llm_call',
        type: 'llm' as const,
        inputs: { messages, tools, temperature, max_tokens, stream, model } as RunInputs,
        status: 'pending' as const,
        durationMs: 0,
        model: model as string,
        provider: 'local',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        toolCalls: undefined,
        createdAt: startedAt,
      };

      deps.buffer.addRun(run);

      try {
        const result = await modelManager.infer(localModel.path, run.inputs);

        deps.buffer.updateRun(runId, {
          status: 'success',
          outputs: result.outputs,
          durationMs: Date.now() - startedAt,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          totalTokens: result.totalTokens,
        });

        return {
          id: `chatcmpl-${runId}`,
          object: 'chat.completion',
          created: Math.floor(startedAt / 1000),
          model,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: result.outputs.content,
            },
            finish_reason: result.outputs.finish_reason,
          }],
          usage: {
            prompt_tokens: result.promptTokens,
            completion_tokens: result.completionTokens,
            total_tokens: result.totalTokens,
          },
        };
      } catch (err: any) {
        deps.buffer.updateRun(runId, {
          status: 'error',
          error: err.message || 'Unknown error',
          durationMs: Date.now() - startedAt,
        });

        return reply.status(502).send({
          error: { message: `Local inference error: ${err.message}` },
        });
      }
    }

    // ── Proxy 路径（fallback） ──
    const provider = getProvider(deps.config, model);
    if (!provider) {
      return reply.status(400).send({
        error: {
          message: `Model "${model}" not found locally and no provider configured for it. ` +
            `Install locally: lat model add ${model}, or add a provider: lat provider add <name> --models ${model}`,
        },
      });
    }

    const run = {
      id: runId,
      parentRunId: undefined as string | undefined,
      name: 'llm_call',
      type: 'llm' as const,
      inputs: { messages, tools, temperature, max_tokens, stream, model } as RunInputs,
      status: 'pending' as const,
      durationMs: 0,
      model: model as string,
      provider: provider.name,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      toolCalls: undefined,
      createdAt: startedAt,
    };

    deps.buffer.addRun(run);

    try {
      const result = await proxyChatCompletion(provider, run.inputs);

      deps.buffer.updateRun(runId, {
        status: 'success',
        outputs: result.outputs,
        durationMs: Date.now() - startedAt,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        toolCalls: result.outputs.tool_calls,
      });

      return {
        id: `chatcmpl-${runId}`,
        object: 'chat.completion',
        created: Math.floor(startedAt / 1000),
        model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: result.outputs.content,
            tool_calls: result.outputs.tool_calls?.map((tc) => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: tc.arguments },
            })),
          },
          finish_reason: result.outputs.finish_reason,
        }],
        usage: {
          prompt_tokens: result.promptTokens,
          completion_tokens: result.completionTokens,
          total_tokens: result.totalTokens,
        },
      };
    } catch (err: any) {
      deps.buffer.updateRun(runId, {
        status: 'error',
        error: err.message || 'Unknown error',
        durationMs: Date.now() - startedAt,
      });

      return reply.status(502).send({
        error: { message: `Provider error: ${err.message}` },
      });
    }
  });
}
