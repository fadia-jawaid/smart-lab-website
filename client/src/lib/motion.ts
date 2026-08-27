import type { Variants, Transition } from 'framer-motion';

/** Shared motion tokens — keep all timing/easing uniform across the app. */
export const DURATION = { fast: 0.15, base: 0.25, slow: 0.4 } as const;

export const spring: Transition = { type: 'spring', stiffness: 260, damping: 24 };

/** Page-level fade + slide-up, used by the route transition wrapper. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.fast, ease: 'easeIn' } },
};

/** Container that staggers its children (KPI rows, card grids, table rows). */
export const staggerContainer: Variants = {
  initial: {},
  enter: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

/** Single item revealed inside a stagger container. */
export const fadeUpItem: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.fast } },
};

/** Stream item that slides in from the top (live feed, alerts, toasts). */
export const slideInTop: Variants = {
  initial: { opacity: 0, y: -16, scale: 0.98 },
  enter: { opacity: 1, y: 0, scale: 1, transition: spring },
  exit: { opacity: 0, x: 24, transition: { duration: DURATION.fast } },
};

/** Modal / drawer content spring. */
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  enter: { opacity: 1, scale: 1, y: 0, transition: spring },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: DURATION.fast } },
};
