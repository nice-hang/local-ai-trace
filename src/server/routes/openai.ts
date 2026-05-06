import { type FastifyInstance } from 'fastify';
import { type ServerDependencies } from '../server.js';
import { getProvider } from '../../config/config.js';
import { proxyChatCompletion } from '../proxy.js';
import { type RunInputs } from '../../trace/types.js';
import { nanoid } from 'nanoid';

export async function registerOpenAIRoutes(server: FastifyInstance, deps: ServerDependencies) {
  // GET /v1/models — return all available models
  server.get('/v1/models', async () => {
    const models = deps.config.providers.flatMap((p) => p.models);
    return {
      object: 'list',
      data: models.map((id) => ({
        id,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: deps.config.providers.find((p) => p.models.includes(id))?.name || 'unknown',
      })),
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

    const provider = getProvider(deps.config, model);
    if (!provider) {
      return reply.status(400).send({
        error: { message: `No provider configured for model "${model}". Add one with: lat provider add <name> --models ${model}` },
      });
    }

    const runId = nanoid();
    const startedAt = Date.now();

    // Create pending run
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
