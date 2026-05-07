import { loadConfig, saveConfig, type LocalModelConfig } from '../config/config.js';
import { BUILTIN_MODELS, getBuiltinModel, getModelsDir } from '../llm/registry.js';
import { downloadModel } from '../llm/downloader.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  bold, cyan, green, red, yellow, gray, dim, success, error, highlight,
} from './color.js';

export async function listModels(): Promise<void> {
  const config = loadConfig();
  const installed = config.models;

  console.log(`\n${bold('已安装的模型')}`);
  if (installed.length === 0) {
    console.log(`  ${gray('(无)')}`);
  } else {
    for (const m of installed) {
      const isDefault = m.name === config.defaultModel;
      const badge = isDefault ? green(' ● default') : '';
      console.log(`  ${cyan(m.name)}${badge}`);
      console.log(`    ${dim('路径:')} ${m.path}`);
      if (m.size) console.log(`    ${dim('大小:')} ${m.size}`);
      const builtin = getBuiltinModel(m.name);
      if (builtin?.contextLength) {
        console.log(`    ${dim('上下文:')} ${(builtin.contextLength / 1024).toFixed(0)}K tokens`);
      }
    }
  }

  const installedNames = new Set(installed.map((m) => m.name));
  const available = BUILTIN_MODELS.filter((m) => !installedNames.has(m.id));

  if (available.length > 0) {
    console.log(`\n${bold('可用但未安装')}`);
    for (const m of available) {
      const ctx = m.contextLength ? `${(m.contextLength / 1024).toFixed(0)}K ctx` : '';
      console.log(`  ${highlight(m.id.padEnd(25))} ${yellow(m.size.padEnd(10))} ${gray(ctx.padEnd(12))} ${dim(m.description)}`);
    }
  }
  console.log();
}

export async function addModel(
  id: string,
  options: { url?: string; name?: string }
): Promise<void> {
  const config = loadConfig();

  if (config.models.some((m) => m.name === id)) {
    throw new Error(error(`Model "${id}" is already installed.`));
  }

  const builtin = getBuiltinModel(id);
  const url = options.url || builtin?.url;
  const filename = builtin?.filename || `${id}.gguf`;

  if (!url) {
    throw new Error(
      error(
        `Unknown model "${id}". Available: ${BUILTIN_MODELS.map((m) => highlight(m.id)).join(', ')}. ` +
        `Or provide --url to add a custom model.`
      )
    );
  }

  const modelsDir = getModelsDir();
  const destPath = join(modelsDir, filename);
  if (existsSync(destPath)) {
    console.log(success(`Model file already exists at ${destPath}, adding to config...`));
  } else {
    console.log(`\n${bold('⬇  Downloading')} ${highlight(builtin?.name || id)} ...\n`);
    await downloadModel({
      url,
      filename,
      onProgress: (p) => {
        const bar = green('█'.repeat(Math.floor(p.percent / 5))) + gray('░'.repeat(20 - Math.floor(p.percent / 5)));
        process.stdout.write(`  ${bar} ${bold(String(p.percent))}% ${gray(p.speed || '')}\r`);
        if (p.percent === 100) {
          process.stdout.write('\n');
        }
      },
    });
    console.log(`  ${success('下载完成！')}`);
  }

  const modelConfig: LocalModelConfig = {
    name: id,
    path: destPath,
    quantization: builtin?.quantization,
    size: builtin?.size,
  };

  config.models.push(modelConfig);
  saveConfig(config);
  console.log(`  ${success(`Model "${id}" added to config.`)}`);
}

export async function removeModel(id: string): Promise<void> {
  const config = loadConfig();
  const idx = config.models.findIndex((m) => m.name === id);

  if (idx === -1) {
    throw new Error(error(`Model "${id}" not found.`));
  }

  config.models.splice(idx, 1);

  if (config.defaultModel === id) {
    config.defaultModel = undefined;
  }

  saveConfig(config);
  console.log(`  ${success(`Model "${id}" removed from config.`)}`);
  console.log(`  ${dim('(模型文件保留在磁盘上，如需删除请手动操作)')}`);
}

export async function setDefaultModel(id: string): Promise<void> {
  const config = loadConfig();
  const found = config.models.find((m) => m.name === id);

  if (!found) {
    throw new Error(error(`Model "${id}" not found. Install it first with: lat model add ${id}`));
  }

  config.defaultModel = id;
  saveConfig(config);
  console.log(`  ${success(`Default model set to "${id}".`)}`);
}
