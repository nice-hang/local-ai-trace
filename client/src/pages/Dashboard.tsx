import { useTraces } from '../hooks/useTraces';
import RunCard from '../components/RunCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function Dashboard() {
  const { runs, total, loading, error } = useTraces();

  const successCount = runs.filter((r) => r.status === 'success').length;
  const avgDuration = runs.length > 0
    ? Math.round(runs.reduce((sum, r) => sum + r.durationMs, 0) / runs.length)
    : 0;
  const totalTokens = runs.reduce((sum, r) => sum + r.totalTokens, 0);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Local AI Trace</h1>
        <p className="text-muted-foreground text-sm mt-1">LLM request monitoring dashboard</p>
      </header>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Total Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Success Rate</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">
              {total > 0 ? Math.round((successCount / total) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{avgDuration}ms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Total Tokens</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Traces</h2>
        {loading && <p className="text-muted-foreground">Loading...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!loading && !error && runs.length === 0 && (
          <p className="text-muted-foreground">No traces yet. Make a request to the OpenAI-compatible API to see traces.</p>
        )}
        {runs.map((run) => (
          <RunCard key={run.id} run={run} />
        ))}
      </section>
    </div>
  );
}
