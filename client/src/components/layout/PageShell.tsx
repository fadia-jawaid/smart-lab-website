import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { PageTransition } from '../PageTransition';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import LabReportModal from '../reports/LabReportModal';

type RestockLogEvent = {
  amountAdded: number;
  newQty: number;
  bottle: { chemicalName: string; unit: string };
  labIncharge: { name: string } | null;
};

export default function PageShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { on } = useSocket();
  const { user } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Close mobile sidebar on route navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Site-wide refill notification for staff
  useEffect(() => {
    if (user?.role === 'STUDENT') return;

    const off = on('restock_logged', (log: RestockLogEvent) => {
      const who = log.labIncharge?.name ?? 'A lab incharge';
      toast.success(
        `${who} refilled ${log.bottle.chemicalName}: +${log.amountAdded.toFixed(1)} ${log.bottle.unit} ` +
        `(now ${log.newQty.toFixed(1)} ${log.bottle.unit})`,
        { duration: 5000 },
      );
    });
    return off;
  }, [on, user?.role]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas bg-grid-canvas">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          onToggleMobile={() => setMobileOpen((prev) => !prev)}
          onOpenReport={() => setReportOpen(true)}
        />

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>{children}</PageTransition>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Lab Report Modal opened from the Topbar button */}
      <LabReportModal isOpen={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}