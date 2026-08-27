import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '../lib/motion';

/** Wraps page content in the shared fade + slide-up route transition. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="enter" exit="exit">
      {children}
    </motion.div>
  );
}
