import { type FastifyInstance } from 'fastify';
import { type ServerDependencies } from '../server.js';
import { modelManager } from '../../llm/inference.js';
import { type RunInputs } from '../../trace/types.js';
import { nanoid } from 'nanoid';

function resolveModel(deps: ServerDependencies, requested: string | undefined): string {
  if (requested && deps.config.models.some((m) => m.name === requested)) {
    return requested;
  }
  if (deps.config.defaultModel) {
    return deps.config.defaultModel;
  }
  if (deps.config.models.length > 0) {
    return deps.config.models[0].name;
  }
  return requested || 'default';
}

export async function registerOpenAIRoutes(server: FastifyInstance, deps: ServerDependencies) {
  // GET /v1/models — return installed local models
  server.get('/v1/models', async () => ({
    object: 'list',
    data: deps.config.models.map((m) => ({
      id: m.name,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'local',
    })),
  }));

  // POST /v1/chat/completions
  server.post<{ Body: Record<string, unknown> }>('/v1/chat/completions', async (request, reply) => {
    const { model: rawModel, messages, tools, temperature, max_tokens, stream } = request.body as any;

    if (!messages || !Array.isArray(messages)) {
      return reply.status(400).send({ error: { message: 'messages is required and must be an array' } });
    }

    if (deps.config.models.length === 0) {
      return reply.status(400).send({
        error: { message: 'No models installed. Run: lat add <model-id>' },
      });
    }

    const model = resolveModel(deps, rawModel);
    const localModel = deps.config.models.find((m) => m.name === model);
    if (!localModel) {
      return reply.status(400).send({
        error: { message: `Model "${model}" not found in installed models. Run: lat add ${model}` },
      });
    }

    const runId = nanoid();
    const startedAt = Date.now();
    const run = {
      id: runId,
      parentRunId: undefined as string | undefined,
      name: 'llm_call',
      type: 'llm' as const,
      inputs: { messages, tools, temperature, max_tokens, stream, model } as RunInputs,
      status: 'pending' as const,
      durationMs: 0,
      model: model as string,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      toolCalls: undefined,
      createdAt: startedAt,
    };
    deps.buffer.addRun(run);

    if (stream === true) {
      // ── Streaming ──
      reply.hijack();
      const rawRes = reply.raw;
      rawRes.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      const sendSSE = (data: unknown) => {
        rawRes.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const id = `chatcmpl-${runId}`;
      const created = Math.floor(startedAt / 1000);

      sendSSE({
        id, object: 'chat.completion.chunk', created, model,
        choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
      });

      let fullContent = '';

      try {
        await modelManager.inferStream(
          localModel.path,
          { messages, tools, temperature, max_tokens, stream } as RunInputs,
          (text: string) => {
            fullContent += text;
            sendSSE({
              id, object: 'chat.completion.chunk', created, model,
              choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
            });
          },
        );

        deps.buffer.updateRun(runId, {
          status: 'success',
          outputs: { content: fullContent, finish_reason: 'stop' },
          durationMs: Date.now() - startedAt,
        });

        sendSSE({
          id, object: 'chat.completion.chunk', created, model,
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        });
        rawRes.write('data: [DONE]\n\n');
        rawRes.end();
      } catch (err: any) {
        deps.buffer.updateRun(runId, {
          status: 'error',
          error: err.message || 'Unknown error',
          durationMs: Date.now() - startedAt,
          outputs: { content: fullContent || null, finish_reason: 'error' },
        });
        try {
          sendSSE({ error: { message: err.message } });
          rawRes.write('data: [DONE]\n\n');
          rawRes.end();
        } catch { /* connection may already be closed */ }
      }
      return;
    }

    // ── Non-streaming ──
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
          message: { role: 'assistant', content: result.outputs.content },
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
        error: { message: `Inference error: ${err.message}` },
      });
    }
  });
}
