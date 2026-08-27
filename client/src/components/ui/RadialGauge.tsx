import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface RadialGaugeProps {
  /** 0–100 */
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  lowStockPct?: number;
  className?: string;
}

/** Animated SVG ring for a single percentage (stock remaining, completion…). */
export function RadialGauge({
  percent,
  size = 120,
  stroke = 10,
  label,
  sublabel,
  lowStockPct = 20,
  className,
}: RadialGaugeProps) {
  const p = Math.max(0, Math.min(100, percent));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - p / 100);

  const color = p > 50 ? '#3B82F6' : p > lowStockPct ? '#F59E0B' : '#EF4444';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(148,163,184,0.15)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="tnum text-2xl font-semibold text-slate-50">{Math.round(p)}%</span>
        {label && <span className="text-[11px] font-medium text-slate-300">{label}</span>}
        {sublabel && <span className="text-[10px] text-slate-500">{sublabel}</span>}
      </div>
    </div>
  );
}
