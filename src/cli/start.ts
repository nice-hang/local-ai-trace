import { loadConfig } from '../config/config.js';
import { TraceBuffer } from '../trace/buffer.js';
import { TraceEvents } from '../trace/events.js';
import { createServer } from '../server/server.js';
import { isFirstRun, runFirstRunSetup } from './first-run.js';
import { type Run } from '../trace/types.js';
import { modelManager } from '../llm/inference.js';

export interface StartOptions {
  port: number;
}

export async function startServer(options: StartOptions): Promise<void> {
  // 首次运行检测
  if (isFirstRun()) {
    await runFirstRunSetup();
  }

  const config = loadConfig();
  config.port = options.port || config.port;

  // 打印默认模型信息
  if (config.defaultModel) {
    console.log(`  📦  默认模型: ${config.defaultModel}`);
  }

  const buffer = new TraceBuffer({ maxRuns: config.maxRuns });
  const events = new TraceEvents();

  buffer.onChange((run: Run) => {
    if (run.status !== 'pending') {
      events.emit(run);
    }
  });

  // 如果有本地模型，预初始化推理引擎
  if (config.models.length > 0 && !modelManager.isInitialized()) {
    await modelManager.warmup();
  }

  const server = await createServer({ config, buffer, events });

  console.log(`  🚀  local-ai-trace server starting...`);
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
