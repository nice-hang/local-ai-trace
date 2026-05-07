import { join } from 'node:path';
import { loadConfig, saveConfig } from '../config/config.js';
import { TraceBuffer } from '../trace/buffer.js';
import { TraceEvents } from '../trace/events.js';
import { createServer } from '../server/server.js';
import { type Run } from '../trace/types.js';
import { modelManager } from '../llm/inference.js';
import { BUILTIN_MODELS, getModelsDir } from '../llm/registry.js';
import { type BuiltinModel } from '../llm/types.js';
import { downloadModel } from '../llm/downloader.js';
import { bold, cyan, green, yellow, dim, highlight, success, gray, red } from './color.js';
import { select, type SelectChoice } from './select.js';

async function promptModelSelection(): Promise<{ modelId: string; isNewDownload: boolean }> {
  const config = loadConfig();
  const installed = config.models;
  const installedSet = new Set(installed.map((m) => m.name));

  // ── Single unified list: installed section + all models section ──
  const choices: SelectChoice<string>[] = [];

  // Installed section
  if (installed.length > 0) {
    choices.push({ name: '── 已安装的模型 ──', value: '', disabled: true });
    for (const m of installed) {
      choices.push({
        name: `${m.name}${m.size ? `  ${gray(m.size)}` : ''}`,
        value: m.name,
      });
    }
  }

  // All models section
  choices.push({ name: `── 模型列表（共 ${BUILTIN_MODELS.length} 个）──`, value: '', disabled: true });
  for (const m of BUILTIN_MODELS) {
    const ctx = m.contextLength ? `${(m.contextLength / 1024).toFixed(0)}K` : '';
    const tag = installedSet.has(m.id) ? green(' ✓') : dim('   ');
    choices.push({
      name: `${m.name.padEnd(28)}${tag}  ${yellow(m.size.padEnd(10))} ${gray(ctx.padEnd(8))} ${dim(m.description)}`,
      value: m.id,
    });
  }

  const picked = await select('选择模型（↑↓ 切换，回车确认）', choices);
  return { modelId: picked, isNewDownload: !installedSet.has(picked) };
}

async function downloadAndInstall(model: BuiltinModel): Promise<string> {
  const modelsDir = getModelsDir();
  const destPath = join(modelsDir, model.filename);

  console.log(`\n${bold('⬇  正在下载')} ${highlight(model.name)} (${model.size}) ...\n`);

  await downloadModel({
    url: model.url,
    filename: model.filename,
    onProgress: (p) => {
      const bar = green('█'.repeat(Math.floor(p.percent / 5))) + gray('░'.repeat(20 - Math.floor(p.percent / 5)));
      process.stdout.write(`  ${bar} ${bold(String(p.percent))}% ${gray(p.speed || '')}\r`);
      if (p.percent === 100) process.stdout.write('\n');
    },
  });

  console.log(`  ${success(`${model.name} 下载完成！`)}`);
  return destPath;
}

export interface StartOptions {
  port: number;
}

export async function startServer(options: StartOptions): Promise<void> {
  const config = loadConfig();
  config.port = options.port || config.port;

  // ── Model selection ──
  const { modelId, isNewDownload } = await promptModelSelection();

  if (isNewDownload) {
    const builtin = BUILTIN_MODELS.find((m) => m.id === modelId);
    if (builtin) {
      const destPath = await downloadAndInstall(builtin);
      config.models.push({
        name: builtin.id,
        path: destPath,
        quantization: builtin.quantization,
        size: builtin.size,
      });
    }
  }

  // Update default model
  config.defaultModel = modelId;
  saveConfig(config);

  // ── Server startup ──
  console.log(`\n  ${cyan('📦')}  ${dim('使用模型:')} ${bold(modelId)}`);

  const buffer = new TraceBuffer({ maxRuns: config.maxRuns });
  const events = new TraceEvents();

  buffer.onChange((run: Run) => {
    if (run.status !== 'pending') {
      events.emit(run);
    }
  });

  if (config.models.length > 0 && !modelManager.isInitialized()) {
    await modelManager.warmup();
  }

  const server = await createServer({ config, buffer, events });

  console.log(`  ${green('🚀')}  ${bold(green('local-ai-trace server starting...'))}`);
  console.log(`\n  ${bold(yellow('── 接入方式 ──'))}`);
  console.log(`  ${dim('export')} OPENAI_BASE_URL=${highlight(`http://localhost:${config.port}/v1`)}`);
  console.log(`  ${dim('# 或在代码中:')}`);
  console.log(`  OpenAI(${dim('base_url=')}"${highlight(`http://localhost:${config.port}/v1`)}")`);
  console.log(`\n  ${bold(yellow('── 观测面板 ──'))}`);
  console.log(`  ${highlight(`http://localhost:${config.port}`)}\n`);

  try {
    await server.listen({ port: config.port, host: '0.0.0.0' });
  } catch (err) {
    console.error(red('Failed to start server:'), err);
    process.exit(1);
  }
}
