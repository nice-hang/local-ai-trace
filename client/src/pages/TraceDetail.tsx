import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { type Run, fetchRun } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import TraceTree from '../components/TraceTree';
import { cn } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function TraceDetail() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchRun(id)
      .then(setRun)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-muted-foreground">Loading trace...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!run) return <div className="p-6 text-muted-foreground">Trace not found</div>;

  const statusColors: Record<string, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    pending: 'bg-yellow-500',
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <Link to="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn('w-3 h-3 rounded-full', statusColors[run.status] || 'bg-gray-500')} />
              <CardTitle className="font-mono text-sm">{run.id}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Model</span>
              <p className="font-medium">{run.model || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Provider</span>
              <p className="font-medium">{run.provider || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Duration</span>
              <p className="font-medium">{run.durationMs}ms</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tokens</span>
              <p className="font-medium">{run.totalTokens} (prompt: {run.promptTokens}, completion: {run.completionTokens})</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {run.error && (
        <Card className="mb-6 border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto">{run.error}</pre>
          </CardContent>
        </Card>
      )}

      {/* Trace Tree */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Trace Tree</CardTitle>
        </CardHeader>
        <CardContent>
          <TraceTree run={run} />
        </CardContent>
      </Card>

      {/* Request */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Request</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto max-h-96 overflow-y-auto">
            {JSON.stringify(run.inputs, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Response */}
      {run.outputs && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto max-h-96 overflow-y-auto">
              {JSON.stringify(run.outputs, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Tool Calls */}
      {run.toolCalls && run.toolCalls.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tool Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {run.toolCalls.map((tc) => (
                <div key={tc.id} className="border rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{tc.id}</span>
                    <span className="font-medium text-sm">{tc.name}</span>
                  </div>
                  <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">{tc.arguments}</pre>
                  {tc.result && (
                    <>
                      <p className="text-xs text-muted-foreground mt-2 mb-1">Result:</p>
                      <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-h-40 overflow-y-auto">{tc.result}</pre>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
