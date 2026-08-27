import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  /** Adds a hover lift + brand glow — use for clickable/interactive cards. */
  interactive?: boolean;
}

export function Card({ children, className = '', onClick, interactive }: CardProps) {
  const clickable = interactive || !!onClick;
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass rounded-2xl shadow-card transition-all duration-200',
        clickable &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-glow',
        className,
      )}
    >
      {children}
    </div>
  );
}
