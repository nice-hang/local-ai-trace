import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { type AppConfig } from '../config/config.js';
import { type TraceBuffer } from '../trace/buffer.js';
import { type TraceEvents } from '../trace/events.js';
import { registerOpenAIRoutes } from './routes/openai.js';
import { registerTraceApiRoutes } from './routes/trace-api.js';

export interface ServerDependencies {
  config: AppConfig;
  buffer: TraceBuffer;
  events: TraceEvents;
}

export async function createServer(deps: ServerDependencies) {
  const server = Fastify({ logger: true });

  await server.register(cors, { origin: true });

  // Health check
  server.get('/health', async () => ({ status: 'ok' }));

  // Routes
  await registerOpenAIRoutes(server, deps);
  await registerTraceApiRoutes(server, deps);

  // Serve UI in production (client/dist built by Vite)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const uiDir = join(__dirname, '../../client/dist');

  if (existsSync(uiDir)) {
    await server.register(fastifyStatic, {
      root: uiDir,
    });

    // SPA fallback — serve index.html for non-API routes
    server.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api') || request.url.startsWith('/v1')) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return server;
}
