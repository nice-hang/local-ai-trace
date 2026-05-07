import { loadConfig, saveConfig, type LocalModelConfig } from '../config/config.js';
import { BUILTIN_MODELS, getBuiltinModel, getModelsDir } from '../llm/registry.js';
import { downloadModel } from '../llm/downloader.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export async function listModels(): Promise<void> {
  const config = loadConfig();
  const installed = config.models;

  console.log('\n已安装的模型:');
  if (installed.length === 0) {
    console.log('  (无)');
  } else {
    for (const m of installed) {
      const isDefault = m.name === config.defaultModel;
      console.log(`  ${m.name}${isDefault ? ' (default)' : ''}`);
      console.log(`    路径: ${m.path}`);
      if (m.size) console.log(`    大小: ${m.size}`);
    }
  }

  const installedNames = new Set(installed.map((m) => m.name));
  const available = BUILTIN_MODELS.filter((m) => !installedNames.has(m.id));

  if (available.length > 0) {
    console.log('\n可用但未安装:');
    for (const m of available) {
      console.log(`  ${m.id.padEnd(20)} ${m.size.padEnd(10)} ${m.description}`);
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
    throw new Error(`Model "${id}" is already installed.`);
  }

  const builtin = getBuiltinModel(id);
  const url = options.url || builtin?.url;
  const filename = builtin?.filename || `${id}.gguf`;

  if (!url) {
    throw new Error(
      `Unknown model "${id}". Available: ${BUILTIN_MODELS.map((m) => m.id).join(', ')}. ` +
      `Or provide --url to add a custom model.`
    );
  }

  const modelsDir = getModelsDir();
  const destPath = join(modelsDir, filename);
  if (existsSync(destPath)) {
    console.log(`Model file already exists at ${destPath}, adding to config...`);
  } else {
    console.log(`Downloading ${builtin?.name || id} ...`);
    await downloadModel({
      url,
      filename,
      onProgress: (p) => {
        if (p.percent === 100) {
          console.log(`  ${'█'.repeat(20)} 100%`);
        } else {
          const bar = '█'.repeat(Math.floor(p.percent / 5)) + '░'.repeat(20 - Math.floor(p.percent / 5));
          process.stdout.write(`  ${bar} ${p.percent}% ${p.speed}\r`);
        }
      },
    });
    console.log('  下载完成！');
  }

  const modelConfig: LocalModelConfig = {
    name: id,
    path: destPath,
    quantization: builtin?.quantization,
    size: builtin?.size,
  };

  config.models.push(modelConfig);
  saveConfig(config);
  console.log(`Model "${id}" added to config.`);
}

export async function removeModel(id: string): Promise<void> {
  const config = loadConfig();
  const idx = config.models.findIndex((m) => m.name === id);

  if (idx === -1) {
    throw new Error(`Model "${id}" not found.`);
  }

  config.models.splice(idx, 1);

  if (config.defaultModel === id) {
    config.defaultModel = undefined;
  }

  saveConfig(config);
  console.log(`Model "${id}" removed from config.`);
  console.log('(模型文件保留在磁盘上，如需删除请手动操作)');
}

export async function setDefaultModel(id: string): Promise<void> {
  const config = loadConfig();
  const found = config.models.find((m) => m.name === id);

  if (!found) {
    throw new Error(`Model "${id}" not found. Install it first with: lat model add ${id}`);
  }

  config.defaultModel = id;
  saveConfig(config);
  console.log(`Default model set to "${id}".`);
}
