import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  hint?: string;
}

/**
 * Shared "nothing here yet" state for dashboard cards. Replaces plain
 * center-aligned gray text with an icon + heading + optional hint, so an
 * empty card reads as "this is a working feature, waiting for data" rather
 * than looking broken or unfinished.
 */
export function EmptyState({ icon, title, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2/60 text-slate-500">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-300">{title}</p>
        {hint && <p className="mt-1 max-w-xs text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}