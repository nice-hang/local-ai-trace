import { loadConfig } from '../config/config.js';
import { TraceBuffer } from '../trace/buffer.js';
import { TraceEvents } from '../trace/events.js';
import { createServer } from '../server/server.js';
import { type Run } from '../trace/types.js';

export interface StartOptions {
  port: number;
}

export async function startServer(options: StartOptions): Promise<void> {
  const config = loadConfig();
  config.port = options.port || config.port;

  const buffer = new TraceBuffer({ maxRuns: 1000 });
  const events = new TraceEvents();

  // Bridge buffer changes to SSE events (only non-pending runs)
  buffer.onChange((run: Run) => {
    if (run.status !== 'pending') {
      events.emit(run);
    }
  });

  const server = await createServer({ config, buffer, events });

  // Startup info
  console.log(`\n  🚀  local-ai-trace server starting...`);
  console.log(`\n  ── 接入方式 ──`);
  console.log(`  export OPENAI_BASE_URL=http://localhost:${config.port}/v1`);
  console.log(`  # 或在代码中:`);
  console.log(`  OpenAI(base_url="http://localhost:${config.port}/v1")`);
  console.log(`\n  ── 观测面板 ──`);
  console.log(`  http://localhost:${config.port}\n`);

  try {
    await server.listen({ port: config.port, host: '0.0.0.0' });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}
