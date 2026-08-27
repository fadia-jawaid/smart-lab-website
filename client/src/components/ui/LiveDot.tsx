import { cn } from '../../lib/cn';

interface LiveDotProps {
  label?: string;
  /** false renders a muted/grey dot (disconnected). */
  active?: boolean;
  className?: string;
}

/** A pulsing status dot used for "system live / connected" indicators. */
export function LiveDot({ label, active = true, className }: LiveDotProps) {
  const color = active ? 'bg-accent-500' : 'bg-slate-500';
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs text-slate-400', className)}>
      <span className="relative flex h-2 w-2">
        {active && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-75" />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', color)} />
      </span>
      {label}
    </span>
  );
}
