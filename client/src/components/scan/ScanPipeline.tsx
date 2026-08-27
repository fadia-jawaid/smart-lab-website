import { motion } from 'framer-motion';
import { IdCard, FlaskConical, Scale, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

const NODES: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'student', label: 'Student Card', icon: IdCard },
  { key: 'bottle', label: 'Chemical Bottle', icon: FlaskConical },
  { key: 'weigh', label: 'Weigh', icon: Scale },
  { key: 'record', label: 'Recorded', icon: CheckCircle2 },
];

/**
 * Animated horizontal tracking diagram — icon nodes joined by connectors that
 * "flow" a dashed line + travelling packet as each step completes.
 */
export function ScanPipeline({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between px-2">
      {NODES.map((node, i) => {
        const Icon = node.icon;
        const complete = i < current;
        const active = i === current;
        return (
          <div key={node.key} className="flex flex-1 items-center last:flex-none">
            {/* Node */}
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={{
                  scale: active ? [1, 1.12, 1] : 1,
                  y: active ? [0, -4, 0] : 0,
                }}
                transition={
                  active
                    ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                    : { type: 'spring', stiffness: 300, damping: 20 }
                }
                className={cn(
                  'relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors',
                  complete && 'border-transparent bg-brand-gradient text-white',
                  active && 'border-accent-500 bg-accent-500/15 text-accent-400 shadow-glow-cyan',
                  !complete && !active && 'border-hairline bg-surface-2 text-slate-600',
                )}
              >
                <Icon size={20} />
                {active && (
                  <span className="absolute inset-0 rounded-2xl ring-2 ring-accent-500/40 animate-pulse-ring" />
                )}
              </motion.div>
              <span
                className={cn(
                  'text-center text-[11px]',
                  active ? 'text-accent-400' : complete ? 'text-slate-300' : 'text-slate-600',
                )}
              >
                {node.label}
              </span>
            </div>

            {/* Connector */}
            {i < NODES.length - 1 && (
              <div className="relative mx-1 h-0.5 flex-1">
                <div className="absolute inset-0 rounded-full bg-slate-700/60" />
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-brand-gradient"
                  initial={false}
                  animate={{ width: complete ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
                {/* Travelling packet while this segment is the active edge */}
                {active && (
                  <motion.span
                    className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent-400 shadow-glow-cyan"
                    animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
