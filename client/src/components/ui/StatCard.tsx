import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useCountUp } from '../../hooks/useCountUp';
import { fadeUpItem } from '../../lib/motion';
import { cn } from '../../lib/cn';

type Accent = 'brand' | 'cyan' | 'success' | 'warning' | 'danger';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  /** Either an accent name, or a legacy Tailwind bg class (e.g. "bg-red-100"). */
  color?: string;
  accent?: Accent;
  hint?: string;
}

const ACCENTS: Record<Accent, { chip: string; glow: string }> = {
  brand: { chip: 'bg-brand-500/15 text-brand-300', glow: 'shadow-glow' },
  cyan: { chip: 'bg-accent-500/15 text-accent-400', glow: 'shadow-glow-cyan' },
  success: { chip: 'bg-success/15 text-success', glow: '' },
  warning: { chip: 'bg-warning/15 text-warning', glow: '' },
  danger: { chip: 'bg-danger/15 text-danger', glow: 'shadow-glow-danger' },
};

/** Maps a legacy "bg-xxx-100" color prop onto an accent. */
function colorToAccent(color?: string): Accent {
  if (!color) return 'brand';
  if (color.includes('red')) return 'danger';
  if (color.includes('amber') || color.includes('yellow')) return 'warning';
  if (color.includes('green') || color.includes('emerald')) return 'success';
  if (color.includes('cyan')) return 'cyan';
  return 'brand';
}

function AnimatedValue({ value }: { value: number }) {
  const v = useCountUp(value);
  return <>{Math.round(v).toLocaleString()}</>;
}

export default function StatCard({ label, value, icon, color, accent, hint }: StatCardProps) {
  const a = ACCENTS[accent ?? colorToAccent(color)];
  const isNumber = typeof value === 'number';

  return (
    <motion.div
      variants={fadeUpItem}
      className="glass rounded-2xl p-5 shadow-card transition-all hover:border-brand-500/30"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <h3 className="tnum mt-2 text-3xl font-semibold text-slate-50">
            {isNumber ? <AnimatedValue value={value as number} /> : value}
          </h3>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>

        {icon && (
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl',
              a.chip,
              a.glow,
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}
