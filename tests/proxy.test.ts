import { describe, it, expect, vi } from 'vitest';
import { proxyChatCompletion } from '../src/server/proxy.js';

vi.mock('openai', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    id: 'chatcmpl-test',
    choices: [{
      message: { content: 'Hello!', tool_calls: undefined },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    model: 'gpt-4o',
  });

  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

describe('proxyChatCompletion', () => {
  it('should proxy request and return result', async () => {
    const result = await proxyChatCompletion(
      { name: 'openai', apiKey: 'sk-test', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o'] },
      { messages: [{ role: 'user', content: 'Hi' }], model: 'gpt-4o' }
    );

    expect(result.outputs.content).toBe('Hello!');
    expect(result.promptTokens).toBe(10);
    expect(result.completionTokens).toBe(5);
    expect(result.totalTokens).toBe(15);
  });
});
