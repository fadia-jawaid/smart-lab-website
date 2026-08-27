import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

type Props = {
  current: number;
  initial: number;
  unit: string;
  lowStockPct?: number;
  className?: string;
};

export function QuantityBar({ current, initial, unit, lowStockPct = 20, className }: Props) {
  const percent = initial ? Math.max(0, Math.min(100, (current / initial) * 100)) : 0;

  // > 50% healthy · 20–50% medium · < lowStockPct% low (pulsing)
  const level = percent > 50 ? 'full' : percent > lowStockPct ? 'medium' : 'low';
  const fill =
    level === 'full'
      ? 'bg-gradient-to-r from-brand-500 to-accent-500'
      : level === 'medium'
        ? 'bg-gradient-to-r from-warning to-amber-300'
        : 'bg-gradient-to-r from-danger to-red-400';

  return (
    <div className={cn('w-full', className)}>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-700/60">
        <motion.div
          className={cn('h-full rounded-full', fill, level === 'low' && 'shadow-glow-danger')}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-400">
        <span className="tnum text-slate-200">{current.toFixed(1)}</span> / {initial} {unit}
        <span className="ml-1 text-slate-500">({percent.toFixed(0)}%)</span>
      </p>
    </div>
  );
}
