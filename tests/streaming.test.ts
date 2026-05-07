import { describe, it, expect, vi, beforeEach } from 'vitest';
import { modelManager } from '../src/llm/inference.js';

// Use vi.hoisted to define mocks before vi.mock (which is hoisted to top)
const { mockOnTextChunk, mockPrompt, mockGetSequence, mockCreateContext, mockLoadModel } = vi.hoisted(() => ({
  mockOnTextChunk: vi.fn(),
  mockPrompt: vi.fn(),
  mockGetSequence: vi.fn().mockReturnValue({}),
  mockCreateContext: vi.fn().mockResolvedValue({
    getSequence: vi.fn().mockReturnValue({}),
  }),
  mockLoadModel: vi.fn(),
}));

vi.mock('node-llama-cpp', () => ({
  getLlama: vi.fn().mockResolvedValue({
    loadModel: mockLoadModel,
  }),
  LlamaModel: vi.fn().mockImplementation(() => ({
    createContext: mockCreateContext,
  })),
  LlamaChatSession: vi.fn().mockImplementation(() => ({
    prompt: mockPrompt,
  })),
}));

describe('ModelManager.inferStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: prompt calls onTextChunk with chunks, then returns full response
    mockPrompt.mockImplementation(async (_prompt: string, opts: any) => {
      if (opts?.onTextChunk) {
        opts.onTextChunk('Hello');
        opts.onTextChunk(' World');
      }
      return 'Hello World';
    });

    mockLoadModel.mockResolvedValue({
      createContext: mockCreateContext,
    });
  });

  it('should call onChunk for each text chunk', async () => {
    const onChunk = vi.fn();
    await modelManager.inferStream(
      '/fake/path/to/model.gguf',
      { messages: [{ role: 'user', content: 'Hi' }] },
      onChunk,
    );

    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello');
    expect(onChunk).toHaveBeenNthCalledWith(2, ' World');
  });

  it('should return full concatenated response', async () => {
    const result = await modelManager.inferStream(
      '/fake/path/to/model.gguf',
      { messages: [{ role: 'user', content: 'Hi' }] },
      () => {},
    );

    expect(result.outputs.content).toBe('Hello World');
    expect(result.outputs.finish_reason).toBe('stop');
  });

  it('should estimate token counts', async () => {
    const result = await modelManager.inferStream(
      '/fake/path/to/model.gguf',
      { messages: [{ role: 'user', content: 'Hello' }] },
      () => {},
    );

    expect(result.promptTokens).toBeGreaterThan(0);
    expect(result.completionTokens).toBeGreaterThan(0);
    expect(result.totalTokens).toBe(result.promptTokens + result.completionTokens);
  });
});
