import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

interface SectionHeaderProps {
  icon: ReactNode;
  /** Icon chip color — matches the accent palette used across StatCard/Badge. */
  accent?: 'brand' | 'cyan' | 'success' | 'warning' | 'danger';
  title: string;
  subtitle?: string;
  linkTo?: string;
  linkLabel?: string;
}

const ACCENT_CHIP: Record<NonNullable<SectionHeaderProps['accent']>, string> = {
  brand: 'bg-brand-500/15 text-brand-300',
  cyan: 'bg-accent-500/15 text-accent-400',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
};

/**
 * Shared card-header layout: a small colored icon chip next to the title,
 * an optional one-line subtitle (usually an item count), and a "View all"
 * link on the right. Pulling this into one component instead of repeating
 * the same `flex items-center justify-between` markup in every dashboard
 * card keeps that visual language actually consistent card-to-card.
 */
export function SectionHeader({ icon, accent = 'brand', title, subtitle, linkTo, linkLabel = 'View all' }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', ACCENT_CHIP[accent])}>
          {icon}
        </div>
        <div>
          <h2 className="font-display font-semibold text-slate-100">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {linkTo && (
        <Link to={linkTo} className="shrink-0 text-xs font-medium text-brand-400 hover:text-brand-300">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}