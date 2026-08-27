import { cn } from '../../lib/cn';

export type Severity = 'SUCCESS' | 'DANGER' | 'INFO' | 'WARNING';

interface BadgeProps {
  label: string;
  severity?: Severity;
  /** Adds a pulsing status dot — use for live / active states. */
  pulse?: boolean;
  className?: string;
}

const STYLES: Record<Severity, { chip: string; dot: string }> = {
  SUCCESS: { chip: 'bg-success/15 text-success ring-1 ring-success/30', dot: 'bg-success' },
  DANGER: { chip: 'bg-danger/15 text-danger ring-1 ring-danger/30', dot: 'bg-danger' },
  WARNING: { chip: 'bg-warning/15 text-warning ring-1 ring-warning/30', dot: 'bg-warning' },
  INFO: { chip: 'bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30', dot: 'bg-brand-400' },
};

export function Badge({ label, severity = 'INFO', pulse, className }: BadgeProps) {
  const s = STYLES[severity] ?? STYLES.INFO;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        s.chip,
        className,
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', s.dot)} />
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', s.dot)} />
        </span>
      )}
      {label}
    </span>
  );
}
