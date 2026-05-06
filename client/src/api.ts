export interface Run {
  id: string;
  parentRunId?: string;
  name: string;
  type: 'llm' | 'tool' | 'chain';
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  status: 'pending' | 'success' | 'error';
  error?: string;
  durationMs: number;
  model?: string;
  provider?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  toolCalls?: Array<{ id: string; name: string; arguments: string; result?: string }>;
  createdAt: number;
}

export interface RunsResponse {
  runs: Run[];
  total: number;
}

export async function fetchRuns(limit = 50, offset = 0): Promise<RunsResponse> {
  const res = await fetch(`/api/runs?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`Failed to fetch runs: ${res.statusText}`);
  return res.json();
}

export async function fetchRun(id: string): Promise<Run> {
  const res = await fetch(`/api/runs/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch run: ${res.statusText}`);
  const data = await res.json();
  return data.run;
}

export function subscribeToEvents(onRun: (run: Run) => void): () => void {
  const eventSource = new EventSource('/api/events');

  eventSource.onmessage = (event) => {
    try {
      const run = JSON.parse(event.data) as Run;
      onRun(run);
    } catch {
      // ignore malformed events
    }
  };

  return () => {
    eventSource.close();
  };
}
