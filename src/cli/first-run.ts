import * as readline from 'node:readline';
import { loadConfig, saveConfig } from '../config/config.js';
import { BUILTIN_MODELS } from '../llm/registry.js';
import { downloadModel } from '../llm/downloader.js';
import { getModelsDir } from '../llm/registry.js';
import { join } from 'node:path';
import { bold, cyan, green, yellow, gray, dim, highlight, success } from './color.js';

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function isFirstRun(): boolean {
  const config = loadConfig();
  return config.models.length === 0;
}

export async function runFirstRunSetup(): Promise<void> {
  console.log(`\n${bold(cyan('👋  欢迎使用 local-ai-trace！'))}`);
  console.log(`   ${gray('首次启动，请选择默认模型下载：')}\n`);

  console.log(`   ${bold('可用的内置模型:')}`);
  const choices = BUILTIN_MODELS.map((m, i) => {
    console.log(`  ${green(`${i + 1})`)} ${highlight(m.name.padEnd(25))} ${yellow(m.size.padEnd(10))} ${dim(m.description)}`);
    return m;
  });
  console.log(`  ${green(`${choices.length + 1})`)} ${gray('稍后再说')}`);
  console.log();

  let selection = '';
  while (true) {
    const answer = await askQuestion(`  ${dim('输入编号')} (1-${choices.length + 1}) [1]: `);
    const num = parseInt(answer || '1', 10);
    if (num >= 1 && num <= choices.length + 1) {
      selection = String(num);
      break;
    }
    console.log(`  ${yellow(`请输入 1-${choices.length + 1} 之间的数字`)}`);
  }

  const selectedIndex = parseInt(selection, 10);
  if (selectedIndex > choices.length) {
    console.log(`\n  ${gray('已跳过，可稍后通过')} ${highlight('lat add <id>')} ${gray('安装模型。')}\n`);
    return;
  }

  const selected = choices[selectedIndex - 1];
  console.log(`\n${bold('⬇  正在下载')} ${highlight(selected.name)} ...\n`);

  const modelsDir = getModelsDir();
  const destPath = join(modelsDir, selected.filename);

  await downloadModel({
    url: selected.url,
    filename: selected.filename,
    onProgress: (p) => {
      const bar = green('█'.repeat(Math.floor(p.percent / 5))) + gray('░'.repeat(20 - Math.floor(p.percent / 5)));
      process.stdout.write(`  ${bar} ${bold(String(p.percent))}% ${gray(p.speed || '')}\r`);
      if (p.percent === 100) {
        process.stdout.write('\n');
      }
    },
  });

  const config = loadConfig();
  config.models.push({
    name: selected.id,
    path: destPath,
    quantization: selected.quantization,
    size: selected.size,
  });
  config.defaultModel = selected.id;
  saveConfig(config);

  console.log(`\n  ${success(`${selected.name} 下载完成！已设为默认模型。`)}\n`);
}
