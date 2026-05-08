import { Agent } from '@mariozechner/pi-agent-core';
import type { Model } from '@mariozechner/pi-ai';
import { tools } from './tools.js';

const SYSTEM_PROMPT = [
  'You are a capable general-purpose agent with access to tools.',
  '',
  'Available tools:',
  ...tools.map(
    (t) =>
      `- ${t.name}: ${t.description}`,
  ),
  '',
  "Use these tools when you need to access external information. When the user asks about current information, web pages, or specific data, use the appropriate tool instead of relying on your training data.",
  'After receiving tool results, provide a clear summary.',
].join('\n');

/** Create a model config that reads from environment variables. */
function createLocalModel(): Model<'openai-completions'> {
  const baseUrl =
    process.env.OPENAI_BASE_URL || 'http://localhost:4321/v1';
  const isReasoningModel = process.env.LOCAL_MODEL_REASONING !== 'false';
  return {
    id: process.env.LOCAL_MODEL_ID || 'deepseek-r1-distill-qwen-7b',
    name: process.env.LOCAL_MODEL_ID || 'deepseek-r1-distill-qwen-7b',
    api: 'openai-completions',
    provider: 'openai',
    baseUrl,
    reasoning: isReasoningModel,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 32_768,
    maxTokens: 4_096,
    // 本地服务通常不支持 OpenAI 专属字段，显式覆盖 compat
    compat: {
      supportsStore: false,
      maxTokensField: 'max_tokens',
      supportsReasoningEffort: isReasoningModel,
      supportsDeveloperRole: false,
    },
  };
}

export function createPiAgent() {
  return new Agent({
    initialState: {
      systemPrompt: SYSTEM_PROMPT,
      model: createLocalModel(),
      tools,
      messages: [],
    },
    getApiKey: () => process.env.OPENAI_API_KEY || 'sk-local',
    // 本地服务可能不支持 content 数组格式，展平为纯文本
    convertToLlm: ((messages: any[]) =>
      (messages as any[])
        .filter(
          (m: any) =>
            m.role === 'user' ||
            m.role === 'assistant' ||
            m.role === 'toolResult',
        )
        .map((m: any) => ({
          ...m,
          content:
            m.role === 'user' && Array.isArray(m.content)
              ? m.content
                  .filter((b: any) => b?.type === 'text')
                  .map((b: any) => b.text)
                  .join('')
              : m.content,
        }))) as any,
  });
}
