import { getLlama, LlamaModel, LlamaChatSession } from 'node-llama-cpp';
import { type RunInputs, type RunOutputs } from '../trace/types.js';

export interface InferenceResult {
  outputs: RunOutputs;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * 将 OpenAI 格式的 messages 转为简易 prompt 文本
 * TODO: 后续改用模型的 chat template 做更准确的格式化
 */
function messagesToText(messages: unknown[]): string {
  const parts: string[] = [];
  for (const msg of messages as Array<{ role: string; content?: string }>) {
    if (msg.role === 'system') {
      parts.push(`System: ${msg.content || ''}`);
    } else if (msg.role === 'user') {
      parts.push(`Human: ${msg.content || ''}`);
    } else if (msg.role === 'assistant') {
      parts.push(`Assistant: ${msg.content || ''}`);
    } else if (msg.role === 'tool') {
      parts.push(`Tool (${msg.content || ''})`);
    }
  }
  parts.push('Assistant:');
  return parts.join('\n');
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

export class ModelManager {
  private llama: Awaited<ReturnType<typeof getLlama>> | null = null;
  private loadedModels = new Map<string, LlamaModel>();
  private pendingLoads = new Map<string, Promise<LlamaModel>>();

  isInitialized(): boolean {
    return this.llama !== null;
  }

  async warmup(): Promise<void> {
    if (this.llama) return;
    console.log('  🔧  初始化本地推理引擎（首次需下载二进制文件）...');
    this.llama = await getLlama();
    console.log('  ✅  推理引擎就绪');
  }

  async getLlama(): Promise<Awaited<ReturnType<typeof getLlama>>> {
    if (!this.llama) {
      this.llama = await getLlama();
    }
    return this.llama;
  }

  isLoaded(modelPath: string): boolean {
    return this.loadedModels.has(modelPath);
  }

  async loadModel(modelPath: string, gpuLayers = 0, contextSize = 4096): Promise<LlamaModel> {
    const existing = this.loadedModels.get(modelPath);
    if (existing) return existing;

    const pending = this.pendingLoads.get(modelPath);
    if (pending) return pending;

    const promise = this._doLoad(modelPath, gpuLayers, contextSize);
    this.pendingLoads.set(modelPath, promise);
    try {
      const model = await promise;
      this.loadedModels.set(modelPath, model);
      return model;
    } finally {
      this.pendingLoads.delete(modelPath);
    }
  }

  private async _doLoad(modelPath: string, gpuLayers: number, contextSize: number): Promise<LlamaModel> {
    const llama = await this.getLlama();
    return await llama.loadModel({
      modelPath,
      gpuLayers,
    });
  }

  unloadModel(modelPath: string): void {
    this.loadedModels.delete(modelPath);
  }

  unloadAll(): void {
    this.loadedModels.clear();
  }

  async infer(
    modelPath: string,
    inputs: RunInputs,
    gpuLayers = 0,
    contextSize = 4096,
  ): Promise<InferenceResult> {
    const model = await this.loadModel(modelPath, gpuLayers, contextSize);
    const context = await model.createContext({ contextSize });
    const session = new LlamaChatSession({
      contextSequence: context.getSequence(),
    });

    const prompt = messagesToText(inputs.messages);
    const startedAt = Date.now();

    const response = await session.prompt(prompt, {
      temperature: (inputs.temperature as number) ?? 0.7,
      maxTokens: (inputs.max_tokens as number) ?? 2048,
    });

    const durationMs = Date.now() - startedAt;
    const promptTokens = estimateTokens(prompt);
    const completionTokens = estimateTokens(response);

    return {
      outputs: {
        content: response,
        finish_reason: 'stop',
      },
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  async inferStream(
    modelPath: string,
    inputs: RunInputs,
    onChunk: (text: string) => void,
    gpuLayers = 0,
    contextSize = 4096,
  ): Promise<InferenceResult> {
    const model = await this.loadModel(modelPath, gpuLayers, contextSize);
    const context = await model.createContext({ contextSize });
    const session = new LlamaChatSession({
      contextSequence: context.getSequence(),
    });

    const prompt = messagesToText(inputs.messages);
    let fullResponse = '';

    await session.prompt(prompt, {
      temperature: (inputs.temperature as number) ?? 0.7,
      maxTokens: (inputs.max_tokens as number) ?? 2048,
      onTextChunk: (text: string) => {
        fullResponse += text;
        onChunk(text);
      },
    });

    const promptTokens = estimateTokens(prompt);
    const completionTokens = estimateTokens(fullResponse);

    return {
      outputs: {
        content: fullResponse,
        finish_reason: 'stop',
      },
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }
}

/** 全局单例 */
export const modelManager = new ModelManager();
