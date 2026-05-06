import { type Run } from './types.js';

type Listener = (run: Run) => void;

export class TraceEvents {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(run: Run): void {
    for (const listener of this.listeners) {
      listener(run);
    }
  }
}
