import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Compose conditional Tailwind class names and resolve conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
