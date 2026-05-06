import { Link } from 'react-router-dom';
import { type Run } from '../api';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';

interface RunCardProps {
  run: Run;
}

const statusColors: Record<string, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  pending: 'bg-yellow-500',
};

export default function RunCard({ run }: RunCardProps) {
  const time = new Date(run.createdAt).toLocaleTimeString();
  const duration = run.durationMs < 1000
    ? `${run.durationMs}ms`
    : `${(run.durationMs / 1000).toFixed(2)}s`;

  return (
    <Link to={`/traces/${run.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer mb-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn('w-2 h-2 rounded-full shrink-0', statusColors[run.status] || 'bg-gray-500')} />
              <span className="font-mono text-sm font-medium">{run.model || 'unknown'}</span>
              <span className="text-xs text-muted-foreground">{run.provider}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{duration}</span>
              <span>{run.totalTokens} tokens</span>
              <span>{time}</span>
            </div>
          </div>
          {run.error && (
            <p className="mt-2 text-xs text-red-500 truncate">{run.error}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
