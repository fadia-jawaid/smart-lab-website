import { cn } from '../../lib/cn';

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-slate-600 border-t-brand-400',
        sizeClass,
        className,
      )}
    />
  );
}
