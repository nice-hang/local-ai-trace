import { describe, it, expect } from 'vitest';
import { TraceBuffer } from '../src/trace/buffer.js';
import { TraceEvents } from '../src/trace/events.js';
import { type Run } from '../src/trace/types.js';

function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    id: overrides.id || `run_${Date.now()}`,
    name: 'llm_call',
    type: 'llm',
    inputs: { messages: overrides.inputs?.messages ?? [] },
    status: 'success',
    durationMs: 100,
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('TraceBuffer', () => {
  it('should add and retrieve runs', () => {
    const buffer = new TraceBuffer({ maxRuns: 100 });
    const run = makeRun({ id: 'test-1' });
    buffer.addRun(run);
    expect(buffer.getRun('test-1')).toBeDefined();
    expect(buffer.getRuns(10)).toHaveLength(1);
  });

  it('should enforce maxRuns limit', () => {
    const buffer = new TraceBuffer({ maxRuns: 3 });
    for (let i = 0; i < 5; i++) {
      buffer.addRun(makeRun({ id: `run-${i}` }));
    }
    expect(buffer.getAllRuns()).toHaveLength(3);
    expect(buffer.getRun('run-0')).toBeUndefined();
    expect(buffer.getRun('run-4')).toBeDefined();
  });

  it('should update an existing run', () => {
    const buffer = new TraceBuffer();
    buffer.addRun(makeRun({ id: 'updatable', status: 'pending' }));
    buffer.updateRun('updatable', { status: 'success', outputs: { content: 'hello', finish_reason: 'stop' } });
    expect(buffer.getRun('updatable')!.status).toBe('success');
    expect(buffer.getRun('updatable')!.outputs?.content).toBe('hello');
  });

  it('should auto-link tool result to parent run', () => {
    const buffer = new TraceBuffer();
    buffer.addRun(makeRun({
      id: 'parent-1',
      name: 'llm_call',
      type: 'llm',
      toolCalls: [{ id: 'call_123', name: 'get_weather', arguments: '{"city":"北京"}', result: undefined }],
    }));
    buffer.addRun(makeRun({
      id: 'child-1',
      name: 'llm_call',
      type: 'llm',
      inputs: {
        messages: [{ role: 'tool', tool_call_id: 'call_123', content: '{"temp":22}' }],
      },
    }));
    expect(buffer.getRun('child-1')!.parentRunId).toBe('parent-1');
    expect(buffer.getRun('parent-1')!.toolCalls![0].result).toBe('{"temp":22}');
  });

  it('should not link when no tool_call_id matches', () => {
    const buffer = new TraceBuffer();
    buffer.addRun(makeRun({ id: 'p1', toolCalls: [{ id: 'call_a', name: 'x', arguments: '{}', result: undefined }] }));
    buffer.addRun(makeRun({ id: 'c1', inputs: { messages: [{ role: 'tool', tool_call_id: 'call_b', content: 'ok' }] } }));
    expect(buffer.getRun('c1')!.parentRunId).toBeUndefined();
  });

  it('should handle undefined messages without crashing', () => {
    const buffer = new TraceBuffer();
    expect(() => buffer.addRun(makeRun({ id: 'no-msg', inputs: {} as any }))).not.toThrow();
  });

  it('should fire onChange callback when runs are added', () => {
    const buffer = new TraceBuffer();
    const fired: Run[] = [];
    buffer.onChange((run) => fired.push(run));
    buffer.addRun(makeRun({ id: 'cb-test' }));
    expect(fired).toHaveLength(1);
    expect(fired[0].id).toBe('cb-test');
  });

  it('should fire onChange callback when runs are updated', () => {
    const buffer = new TraceBuffer();
    const fired: Run[] = [];
    buffer.onChange((run) => fired.push(run));
    buffer.addRun(makeRun({ id: 'cb-upd', status: 'pending' }));
    fired.length = 0; // reset
    buffer.updateRun('cb-upd', { status: 'success' });
    expect(fired).toHaveLength(1);
    expect(fired[0].status).toBe('success');
  });

  it('should support pagination with offset', () => {
    const buffer = new TraceBuffer({ maxRuns: 20 });
    for (let i = 1; i <= 10; i++) {
      buffer.addRun(makeRun({ id: `page-${i}` }));
    }
    // Most recent first: page-10, page-9, ..., page-1
    const firstPage = buffer.getRuns(3, 0);
    expect(firstPage).toHaveLength(3);
    expect(firstPage[0].id).toBe('page-10');

    const secondPage = buffer.getRuns(3, 3);
    expect(secondPage).toHaveLength(3);
    expect(secondPage[0].id).toBe('page-7');
  });

  it('should allow unsubscribing onChange listener', () => {
    const buffer = new TraceBuffer();
    let count = 0;
    const unsubscribe = buffer.onChange(() => count++);
    buffer.addRun(makeRun({ id: 'u1' }));
    expect(count).toBe(1);
    unsubscribe();
    buffer.addRun(makeRun({ id: 'u2' }));
    expect(count).toBe(1); // not incremented
  });
});

describe('TraceEvents', () => {
  it('should notify subscribers on emit', () => {
    const events = new TraceEvents();
    const received: Run[] = [];
    events.subscribe((run) => received.push(run));
    const run = makeRun({ id: 'evt-1' });
    events.emit(run);
    expect(received).toHaveLength(1);
    expect(received[0].id).toBe('evt-1');
  });

  it('should support unsubscribe', () => {
    const events = new TraceEvents();
    let count = 0;
    const unsubscribe = events.subscribe(() => count++);
    events.emit(makeRun({ id: 'e1' }));
    expect(count).toBe(1);
    unsubscribe();
    events.emit(makeRun({ id: 'e2' }));
    expect(count).toBe(1);
  });

  it('should notify all subscribers', () => {
    const events = new TraceEvents();
    let a = 0, b = 0;
    events.subscribe(() => a++);
    events.subscribe(() => b++);
    events.emit(makeRun({ id: 'e1' }));
    expect(a).toBe(1);
    expect(b).toBe(1);
  });
});
