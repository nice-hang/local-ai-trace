import { type Run, type TraceBufferOptions } from './types.js';

type Listener = (run: Run) => void;

export class TraceBuffer {
  private runs: Run[] = [];
  private maxRuns: number;
  private listeners: Set<Listener> = new Set();

  constructor(options: Partial<TraceBufferOptions> = {}) {
    this.maxRuns = options.maxRuns ?? 1000;
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  addRun(run: Run): void {
    this.runs.push(run);
    if (this.runs.length > this.maxRuns) {
      this.runs.shift();
    }
    this.tryLinkToParent(run);
    this.notify(run);
  }

  updateRun(id: string, updates: Partial<Run>): void {
    const idx = this.runs.findIndex((r) => r.id === id);
    if (idx === -1) return;
    this.runs[idx] = { ...this.runs[idx], ...updates };
    this.notify(this.runs[idx]);
  }

  getRun(id: string): Run | undefined {
    return this.runs.find((r) => r.id === id);
  }

  getRuns(limit = 50, offset = 0): Run[] {
    return this.runs
      .slice(Math.max(0, this.runs.length - offset - limit), this.runs.length - offset)
      .reverse();
  }

  getAllRuns(): Run[] {
    return [...this.runs];
  }

  totalRuns(): number {
    return this.runs.length;
  }

  private notify(run: Run): void {
    for (const listener of this.listeners) {
      try { listener(run); } catch { /* swallow to keep other listeners working */ }
    }
  }

  /**
   * Auto-infer parent-child relationships:
   * If a new run's messages contain {role: "tool", tool_call_id: "call_xxx"},
   * search backwards for a parent LLM run whose toolCalls[].id matches.
   * If matched: 1) set the new run's parentRunId 2) backfill the tool result into parent's toolCalls
   */
  private tryLinkToParent(run: Run): void {
    const messages = run.inputs.messages;
    const toolMessages = Array.isArray(messages)
      ? (messages as Array<{ role: string; tool_call_id?: string; content?: string }>)
          .filter((m): m is { role: string; tool_call_id: string; content?: string } =>
            typeof m === 'object' && m !== null && (m as any).role === 'tool' && (m as any).tool_call_id
          )
      : [];

    if (toolMessages.length === 0) return;

    for (const toolMsg of toolMessages) {
      // Search backwards for the nearest unmatched parent run
      for (let i = this.runs.length - 2; i >= 0; i--) {
        const parent = this.runs[i];
        const toolCall = parent.toolCalls?.find((tc) => tc.id === toolMsg.tool_call_id);
        if (toolCall && !toolCall.result) {
          run.parentRunId = parent.id;
          toolCall.result = toolMsg.content || '';
          break;
        }
      }
    }
  }
}
