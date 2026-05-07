import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { AIMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { tracerTools } from './tools.js';

/** OpenAI-compatible endpoint served by local-ai-trace */
export const LAT_BASE_URL = 'http://localhost:4321/v1';

const SYSTEM_PROMPT = [
  'You are a capable general-purpose agent. You can:',
  '- Read and write files on the local filesystem',
  '- Fetch web pages to get current information',
  '- Search the web for answers',
  '',
  "Use the tools available to you to accomplish the user's requests.",
  'When you have enough information, provide a clear summary.',
].join('\n');

export function createTracerModel() {
  return new ChatOpenAI({
    model: 'any',
    apiKey: 'not-needed',
    temperature: 0,
    configuration: { baseURL: LAT_BASE_URL },
  });
}

export function createTracerAgent() {
  return createAgent({
    model: createTracerModel(),
    tools: tracerTools,
    systemPrompt: SYSTEM_PROMPT,
  });
}

export function lastAssistantText(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m instanceof AIMessage || m._getType() === 'ai') {
      const { content } = m;
      if (typeof content === 'string' && content.trim()) return content;
      if (Array.isArray(content)) {
        const text = content
          .map((b) => (typeof b === 'object' && b && 'text' in b ? String((b as { text: string }).text) : ''))
          .join('');
        if (text.trim()) return text;
      }
    }
  }
  return '';
}

export async function runSingleTurn(
  agent: Awaited<ReturnType<typeof createTracerAgent>>,
  userText: string,
  priorMessages: BaseMessage[] = [],
): Promise<{ messages: BaseMessage[] }> {
  const messages = [...priorMessages, new HumanMessage(userText)];
  return agent.invoke({ messages }) as Promise<{ messages: BaseMessage[] }>;
}
