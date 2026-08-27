import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface Step {
  key: string;
  label: string;
}

interface StepperProps {
  steps: Step[];
  /** Index of the active step (0-based). Steps before it render as complete. */
  current: number;
  className?: string;
}

/** Horizontal animated step indicator with a flowing connector. */
export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, i) => {
        const complete = i < current;
        const active = i === current;
        return (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                  complete && 'border-transparent bg-brand-gradient text-white',
                  active && 'border-accent-500 bg-accent-500/15 text-accent-400 shadow-glow-cyan',
                  !complete && !active && 'border-hairline bg-surface-2 text-slate-500',
                )}
              >
                {complete ? <Check size={18} /> : i + 1}
              </motion.div>
              <span
                className={cn(
                  'max-w-[7rem] text-center text-xs',
                  active ? 'text-slate-200' : 'text-slate-500',
                )}
              >
                {step.label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-slate-700/60">
                <motion.div
                  className="h-full bg-brand-gradient"
                  initial={false}
                  animate={{ width: complete ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
