import { useState, useEffect } from 'react';
import { type Run, fetchRuns, subscribeToEvents } from '../api';

export interface TracesState {
  runs: Run[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useTraces() {
  const [state, setState] = useState<TracesState>({
    runs: [],
    total: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetchRuns(100, 0)
      .then((data) => {
        setState({ runs: data.runs, total: data.total, loading: false, error: null });
      })
      .catch((err) => {
        setState((prev) => ({ ...prev, loading: false, error: err.message }));
      });
  }, []);

  // SSE: prepend new runs
  useEffect(() => {
    const unsubscribe = subscribeToEvents((run) => {
      setState((prev) => {
        if (prev.runs.some((r) => r.id === run.id)) return prev;
        return {
          runs: [run, ...prev.runs].slice(0, 100),
          total: prev.total + 1,
          loading: false,
          error: null,
        };
      });
    });
    return unsubscribe;
  }, []);

  return { ...state };
}
