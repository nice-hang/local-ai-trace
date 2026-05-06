import { type FastifyInstance } from 'fastify';
import { type ServerDependencies } from '../server.js';

export async function registerTraceApiRoutes(server: FastifyInstance, deps: ServerDependencies) {
  // SSE endpoint — real-time push of new runs
  server.get('/api/events', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const unsubscribe = deps.events.subscribe((run) => {
      try {
        reply.raw.write(`data: ${JSON.stringify(run)}\n\n`);
      } catch {
        unsubscribe();
      }
    });

    request.raw.on('close', () => {
      unsubscribe();
    });
  });

  // GET /api/runs — run list
  server.get<{ Querystring: { limit?: string; offset?: string } }>('/api/runs', async (request) => {
    const limit = parseInt(request.query.limit || '50');
    const offset = parseInt(request.query.offset || '0');
    const runs = deps.buffer.getRuns(limit, offset);
    return { runs, total: deps.buffer.totalRuns() };
  });

  // GET /api/runs/:id — single run
  server.get<{ Params: { id: string } }>('/api/runs/:id', async (request, reply) => {
    const run = deps.buffer.getRun(request.params.id);
    if (!run) {
      return reply.status(404).send({ error: 'Run not found' });
    }
    return { run };
  });
}
