import { homedir } from 'node:os';
import { join } from 'node:path';
import { type BuiltinModel } from './types.js';

/**
 * 内置推荐模型列表（写死随版本管理）
 *
 * 所有模型来自 HuggingFace，GGUF Q4_K_M 量化格式。
 * 用户可通过 `lat model add --url <url>` 添加不在列表中的模型。
 */
export const BUILTIN_MODELS: BuiltinModel[] = [
  {
    id: 'qwen2.5-1.5b',
    name: 'Qwen2.5-1.5B-Instruct',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    size: '990 MB',
    bytes: 1037959168,
    quantization: 'Q4_K_M',
    description: '通用推荐',
    minRam: '2-3 GB',
  },
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2-1B-Instruct',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    size: '770 MB',
    bytes: 807403520,
    quantization: 'Q4_K_M',
    description: '轻量首选',
    minRam: '~2 GB',
  },
  {
    id: 'qwen2.5-coder-1.5b',
    name: 'Qwen2.5-Coder-1.5B',
    url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    filename: 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
    size: '990 MB',
    bytes: 1037959168,
    quantization: 'Q4_K_M',
    description: '代码推荐',
    minRam: '2-3 GB',
  },
  {
    id: 'llama-3.2-3b',
    name: 'Llama 3.2-3B-Instruct',
    url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    size: '1.88 GB',
    bytes: 2018636595,
    quantization: 'Q4_K_M',
    description: '综合最强',
    minRam: '~3 GB',
  },
];

export function getBuiltinModel(id: string): BuiltinModel | undefined {
  return BUILTIN_MODELS.find((m) => m.id === id);
}

export function getModelsDir(): string {
  return join(homedir(), '.local-ai-trace', 'models');
}
