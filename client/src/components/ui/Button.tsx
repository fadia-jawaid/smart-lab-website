import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export function Button({
  loading,
  size = 'md',
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variants = {
    primary:
      'bg-brand-gradient text-white shadow-glow hover:shadow-glow-cyan hover:brightness-110',
    secondary: 'bg-surface-2 text-slate-200 border border-hairline hover:bg-slate-700/60',
    ghost: 'bg-transparent text-slate-300 hover:bg-white/5',
    danger: 'bg-danger text-white hover:brightness-110 shadow-glow-danger',
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'transition-all duration-150 active:scale-95',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        sizes[size],
        variants[variant],
        className,
      )}
    >
      {loading && <Spinner size="sm" />}
      {loading ? 'Working…' : children}
    </button>
  );
}
