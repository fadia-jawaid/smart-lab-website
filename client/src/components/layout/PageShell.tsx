import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { PageTransition } from '../PageTransition';

export default function PageShell({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-canvas bg-grid-canvas">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>{children}</PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
