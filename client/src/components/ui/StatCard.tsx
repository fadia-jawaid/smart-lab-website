import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';
import { fadeUpItem } from '../../lib/motion';
import { cn } from '../../lib/cn';

type Accent = 'brand' | 'cyan' | 'success' | 'warning' | 'danger' | 'purple';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  /** Either an accent name, or a legacy Tailwind bg class (e.g. "bg-red-100"). */
  color?: string;
  accent?: Accent;
  hint?: string;
  subtext?: string;
  badge?: string;
  /** When set, the whole card is clickable and navigates to this route. */
  to?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    text: string;
  };
  className?: string;
}

// Each accent carries its own chip color, icon glow, top accent-bar gradient,
// and hover border tint — one lookup keeps every stat card across all three
// dashboards (Admin / Lab Incharge / Student) visually consistent instead of
// each screen inventing its own shade of "warning orange".
const ACCENTS: Record<Accent, { chip: string; value: string; border: string; glow: string; bar: string }> = {
  brand: {
    chip: 'bg-brand-500/15 text-brand-300',
    value: 'text-white',
    border: 'hover:border-brand-500/40',
    glow: 'shadow-[0_0_16px_rgba(59,130,246,0.35)]',
    bar: 'from-brand-500 to-brand-400',
  },
  cyan: {
    chip: 'bg-accent-500/15 text-accent-400',
    value: 'text-white',
    border: 'hover:border-accent-500/40',
    glow: 'shadow-[0_0_16px_rgba(6,182,212,0.35)]',
    bar: 'from-accent-500 to-accent-400',
  },
  success: {
    chip: 'bg-success/15 text-success',
    value: 'text-white',
    border: 'hover:border-success/40',
    glow: 'shadow-[0_0_16px_rgba(16,185,129,0.30)]',
    bar: 'from-emerald-500 to-success',
  },
  // Warning / danger tint the number itself, so a problem reads at a glance.
  warning: {
    chip: 'bg-warning/15 text-warning',
    value: 'text-warning',
    border: 'hover:border-warning/40',
    glow: 'shadow-[0_0_16px_rgba(245,158,11,0.30)]',
    bar: 'from-amber-500 to-warning',
  },
  danger: {
    chip: 'bg-danger/15 text-danger',
    value: 'text-danger',
    border: 'hover:border-danger/40',
    glow: 'shadow-glow-danger',
    bar: 'from-rose-500 to-danger',
  },
  purple: {
    chip: 'bg-purple-500/15 text-purple-300',
    value: 'text-white',
    border: 'hover:border-purple-500/40',
    glow: 'shadow-[0_0_16px_rgba(168,85,247,0.30)]',
    bar: 'from-purple-500 to-purple-400',
  },
};

/** Maps a legacy "bg-xxx-100" color prop onto an accent. */
function colorToAccent(color?: string): Accent {
  if (!color) return 'brand';
  if (color.includes('red')) return 'danger';
  if (color.includes('amber') || color.includes('yellow')) return 'warning';
  if (color.includes('green') || color.includes('emerald')) return 'success';
  if (color.includes('cyan')) return 'cyan';
  if (color.includes('purple')) return 'purple';
  return 'brand';
}

function AnimatedValue({ value }: { value: number }) {
  const v = useCountUp(value);
  return <>{Math.round(v).toLocaleString()}</>;
}

export default function StatCard({ label, value, icon, color, accent, hint, subtext, badge, to, trend, className }: StatCardProps) {
  const a = ACCENTS[accent ?? colorToAccent(color)] ?? ACCENTS.brand;
  const isNumber = typeof value === 'number';

  return (
    <motion.div
      variants={fadeUpItem}
      whileHover={to ? { y: -3, transition: { duration: 0.2 } } : undefined}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-hairline bg-surface/70 p-5 backdrop-blur-md transition-colors duration-200 shadow-card',
        to && a.border,
        to && 'cursor-pointer',
        className,
      )}
    >
      {/* Thin gradient accent bar along the top edge — a quiet way to color-
          code each card at a glance without tinting the whole surface. */}
      <span
        aria-hidden
        className={cn('absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-80', a.bar)}
      />

      {/* A very soft accent-tinted wash that fades in across the whole
          card on hover — only for clickable cards, so hovering actually
          feels like something responded, not just the border. */}
      {to && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-[0.06]',
            a.bar,
          )}
        />
      )}

      {/* Label gets the card's full width; the icon sits beside the number. */}
      <div className="flex items-center gap-2">
        <p className="line-clamp-2 min-w-0 text-xs font-semibold uppercase tracking-wider leading-snug text-slate-400">{label}</p>
        {badge && (
          <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <h3 className={cn('tnum text-3xl font-semibold tracking-tight', a.value)}>
          {isNumber ? <AnimatedValue value={value as number} /> : value}
        </h3>

        {icon && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 [&>svg]:h-[18px] [&>svg]:w-[18px]',
              a.chip,
              a.glow,
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {(hint || subtext) && (
        <p className="mt-1 text-xs leading-snug text-slate-500">{hint || subtext}</p>
      )}

      {trend && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'font-medium',
              trend.direction === 'up' && 'text-emerald-400',
              trend.direction === 'down' && 'text-rose-400',
              trend.direction === 'neutral' && 'text-slate-400',
            )}
          >
            {trend.text}
          </span>
        </div>
      )}

      {/* Clickable card: a full-size link laid over the card, so the whole
          card is the click target without changing its layout. */}
      {to && (
        <>
          <Link
            to={to}
            aria-label={`${label} — view details`}
            className="absolute inset-0 z-10 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60"
          />
          <ArrowUpRight
            size={15}
            aria-hidden
            className="pointer-events-none absolute bottom-4 right-4 text-slate-600 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-200 group-hover:opacity-100"
          />
        </>
      )}
    </motion.div>
  );
}