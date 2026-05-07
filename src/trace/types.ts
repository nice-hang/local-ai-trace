export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string
  result?: string;   // JSON string, filled when next request contains tool result
}

export interface RunInputs {
  messages: unknown[];
  tools?: unknown[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  [key: string]: unknown;
}

export interface RunOutputs {
  content: string | null;
  finish_reason: string | null;
  tool_calls?: ToolCall[];
  [key: string]: unknown;
}

export type RunType = 'llm' | 'tool' | 'chain';
export type RunStatus = 'pending' | 'success' | 'error';

export interface Run {
  id: string;
  parentRunId?: string;
  name: string;
  type: RunType;
  inputs: RunInputs;
  outputs?: RunOutputs;
  status: RunStatus;
  error?: string;
  durationMs: number;
  model?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  toolCalls?: ToolCall[];
  createdAt: number;
}

export interface TraceBufferOptions {
  maxRuns: number;
}
