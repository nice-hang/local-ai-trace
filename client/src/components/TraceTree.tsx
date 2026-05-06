import { type Run } from '../api';
import { cn } from '../lib/utils';

interface TraceTreeProps {
  run: Run;
}

const statusColors: Record<string, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  pending: 'bg-yellow-500',
};

export default function TraceTree({ run }: TraceTreeProps) {
  // In a real app we'd fetch the full run graph from the API.
  // For MVP, we show the current run and a placeholder for future children.
  const hasToolCalls = run.toolCalls && run.toolCalls.length > 0;

  return (
    <div className="space-y-2">
      <div className={cn(
        'flex items-center gap-2 p-2 rounded-md text-sm bg-accent',
      )}>
        <span className={cn('w-2 h-2 rounded-full shrink-0', statusColors[run.status] || 'bg-gray-500')} />
        <span className="font-medium">{run.name}</span>
        <span className="text-muted-foreground">{run.model}</span>
        <span className="text-xs text-muted-foreground ml-auto">{run.durationMs}ms</span>
      </div>
      {hasToolCalls && (
        <div className="ml-6 pl-4 border-l-2 border-border space-y-2">
          {run.toolCalls!.map((tc) => (
            <div key={tc.id} className="flex items-center gap-2 p-2 rounded-md text-sm hover:bg-accent/50">
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              <span className="font-medium">tool_call</span>
              <span className="text-muted-foreground">{tc.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {tc.result ? 'completed' : 'pending'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
