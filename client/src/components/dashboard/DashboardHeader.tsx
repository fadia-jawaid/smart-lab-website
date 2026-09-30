import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { CalendarDays, Clock3 } from 'lucide-react';

interface DashboardHeaderProps {
  /** Short context line under the greeting — what this dashboard is showing. */
  subtitle: ReactNode;
  /** Right-aligned actions, e.g. a "Generate Report" button. */
  children?: ReactNode;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator',
  LAB_INCHARGE: 'Lab Incharge',
  STUDENT: 'Student',
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** First letters of up to the first two words — "Dr. Ayesha Khan" → "DA",
 * a single-word name → its first letter. Keeps the avatar readable for any
 * name length instead of overflowing a circle with a full name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * The one greeting/context header shared by all three dashboards (Admin,
 * Lab Incharge, Student). Shows a live clock and full date alongside the
 * role-specific subtitle, giving the dashboard an always-up-to-date feel.
 */
export default function DashboardHeader({ subtitle, children }: DashboardHeaderProps) {
  const { user } = useAuth();
  // Full name, not first word — staff names like "Dr. Ayesha Khan" would
  // otherwise be greeted as just "Dr.".
  const displayName = user?.name ?? '';
  const roleLabel = user?.role ? ROLE_LABEL[user.role] : undefined;

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3.5">
        {/* Identity avatar — gives every dashboard a personal, "signed in as"
            anchor instead of a plain text greeting floating on its own. */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-base font-bold text-white shadow-glow">
          {initials(displayName)}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[26px] font-bold tracking-tight text-slate-50">
              {greeting()},{' '}
              <span className="bg-gradient-to-r from-brand-400 via-brand-300 to-accent-400 bg-clip-text text-transparent">
                {displayName}
              </span>
            </h1>
            {roleLabel && (
              <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-300">
                {roleLabel}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Live date + time pill */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-hairline bg-surface-2/60 px-3 py-2 text-xs text-slate-400 backdrop-blur-sm">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} className="text-brand-400" />
            {formatDate(now)}
          </span>
          <span className="h-3 w-px bg-hairline" />
          <span className="flex items-center gap-1.5 font-mono tabular-nums text-accent-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-400" />
            </span>
            <Clock3 size={13} />
            {formatTime(now)}
          </span>
        </div>

        {/* Slot for action buttons (e.g. "Generate Report") */}
        {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}