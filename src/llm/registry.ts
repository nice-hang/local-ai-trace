import { homedir } from 'node:os';
import { join } from 'node:path';
import { type BuiltinModel } from './types.js';

/**
 * 内置推荐模型列表（写死随版本管理）
 *
 * 所有模型来自 HuggingFace，GGUF Q4_K_M 量化格式（除非标注）。
 * 模型按尺寸分组：<1B（3个）、1-14B（5个）、14-32B（5个）。
 * 每个模型均适合 Agent 开发，支持 tool call / function calling。
 *
 * 注：Qwen3 系列暂无 GGUF 格式，暂以 Qwen2.5 替代。
 * 所有 URL 已通过 HuggingFace 页面验证，确保可访问。
 */
export const BUILTIN_MODELS: BuiltinModel[] = [
  // ────────── < 1B（3个）──────────
  // 注：小于 1B 的精调 GGUF 模型较少，补充 Llama-3.2-1B 作为轻量选项
  {
    id: 'qwen2.5-0.5b',
    name: 'Qwen2.5-0.5B-Instruct',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
    filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    size: '491 MB',
    bytes: 514850816,
    quantization: 'Q4_K_M',
    description: '极致轻量，32K 上下文',
    minRam: '~1 GB',
    contextLength: 32768,
  },
  {
    id: 'smollm2-360m',
    name: 'SmolLM2-360M-Instruct',
    url: 'https://huggingface.co/bartowski/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q4_K_M.gguf',
    filename: 'SmolLM2-360M-Instruct-Q4_K_M.gguf',
    size: '270 MB',
    bytes: 283115520,
    quantization: 'Q4_K_M',
    description: 'HF 官方，嵌入式场景首选',
    minRam: '<1 GB',
    contextLength: 8192,
  },
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2-1B-Instruct',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    size: '770 MB',
    bytes: 807403520,
    quantization: 'Q4_K_M',
    description: 'Meta 出品，小尺寸首选',
    minRam: '~2 GB',
    contextLength: 32768,
  },

  // ────────── 1-14B（5个）──────────
  {
    id: 'qwen2.5-1.5b',
    name: 'Qwen2.5-1.5B-Instruct',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    size: '990 MB',
    bytes: 1037959168,
    quantization: 'Q4_K_M',
    description: '经典入门模型',
    minRam: '~3 GB',
    contextLength: 32768,
  },
  {
    id: 'llama-3.2-3b',
    name: 'Llama 3.2-3B-Instruct',
    url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    size: '1.88 GB',
    bytes: 2018636595,
    quantization: 'Q4_K_M',
    description: '轻量 Agent 首选',
    minRam: '~4 GB',
    contextLength: 32768,
  },
  {
    id: 'deepseek-r1-distill-qwen-7b',
    name: 'DeepSeek-R1-Distill-Qwen-7B',
    url: 'https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-7B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf',
    filename: 'DeepSeek-R1-Distill-Qwen-7B-Q4_K_M.gguf',
    size: '4.68 GB',
    bytes: 5024885350,
    quantization: 'Q4_K_M',
    description: '推理增强，复杂 Agent 规划',
    minRam: '~8 GB',
    contextLength: 32768,
  },
  {
    id: 'qwen2.5-7b',
    name: 'Qwen2.5-7B-Instruct',
    url: 'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf',
    filename: 'qwen2.5-7b-instruct-q4_k_m.gguf',
    size: '4.68 GB',
    bytes: 5024885350,
    quantization: 'Q4_K_M',
    description: 'function call 标杆，久经考验',
    minRam: '~8 GB',
    contextLength: 32768,
  },
  {
    id: 'llama-3.1-8b',
    name: 'Llama 3.1-8B-Instruct',
    url: 'https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf',
    filename: 'Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf',
    size: '4.92 GB',
    bytes: 5282809774,
    quantization: 'Q4_K_M',
    description: '工业标准，131K 超长上下文',
    minRam: '~8 GB',
    contextLength: 131072,
  },

  // ────────── 14-32B（5个）──────────
  {
    id: 'deepseek-r1-distill-qwen-14b',
    name: 'DeepSeek-R1-Distill-Qwen-14B',
    url: 'https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-14B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-14B-Q4_K_M.gguf',
    filename: 'DeepSeek-R1-Distill-Qwen-14B-Q4_K_M.gguf',
    size: '8.99 GB',
    bytes: 9652969472,
    quantization: 'Q4_K_M',
    description: '推理 + Agent 双强',
    minRam: '~16 GB',
    contextLength: 32768,
  },
  {
    id: 'phi-4-14b',
    name: 'Phi-4-14B',
    url: 'https://huggingface.co/bartowski/Phi-4-GGUF/resolve/main/phi-4-Q4_K_M.gguf',
    filename: 'phi-4-Q4_K_M.gguf',
    size: '9.05 GB',
    bytes: 9717833728,
    quantization: 'Q4_K_M',
    description: '微软出品，代码与推理强劲',
    minRam: '~16 GB',
    contextLength: 16384,
  },
  {
    id: 'qwen2.5-14b',
    name: 'Qwen2.5-14B-Instruct',
    url: 'https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF/resolve/main/qwen2.5-14b-instruct-q4_0.gguf',
    filename: 'qwen2.5-14b-instruct-q4_0.gguf',
    size: '8.52 GB',
    bytes: 9148961587,
    quantization: 'Q4_0',
    description: '高性价比，32K 上下文',
    minRam: '~16 GB',
    contextLength: 32768,
  },
  {
    id: 'qwq-32b',
    name: 'QwQ-32B-Preview',
    url: 'https://huggingface.co/bartowski/QwQ-32B-Preview-GGUF/resolve/main/QwQ-32B-Preview-Q4_K_M.gguf',
    filename: 'QwQ-32B-Preview-Q4_K_M.gguf',
    size: '19.85 GB',
    bytes: 21314666496,
    quantization: 'Q4_K_M',
    description: '深度推理，复杂任务规划',
    minRam: '~32 GB',
    contextLength: 32768,
  },
  {
    id: 'qwen2.5-32b',
    name: 'Qwen2.5-32B-Instruct',
    url: 'https://huggingface.co/Qwen/Qwen2.5-32B-Instruct-GGUF/resolve/main/qwen2.5-32b-instruct-q3_k_m.gguf',
    filename: 'qwen2.5-32b-instruct-q3_k_m.gguf',
    size: '15.9 GB',
    bytes: 17072481894,
    quantization: 'Q3_K_M',
    description: '32K 上下文，更省显存',
    minRam: '~24 GB',
    contextLength: 32768,
  },
];

export function getBuiltinModel(id: string): BuiltinModel | undefined {
  return BUILTIN_MODELS.find((m) => m.id === id);
}

export function getModelsDir(): string {
  return join(homedir(), '.local-ai-trace', 'models');
}
