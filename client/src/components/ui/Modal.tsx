import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { modalVariants } from '../../lib/motion';
import { cn } from '../../lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className={cn(
              'glass relative w-full rounded-2xl p-6 shadow-card',
              sizeClasses[size],
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-slate-100">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            <div>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
