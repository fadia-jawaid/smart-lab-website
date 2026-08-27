import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Users, AlertTriangle, Bell } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import StatCard from '../ui/StatCard';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import api from '../../services/api';
import { staggerContainer, slideInTop } from '../../lib/motion';
import type { Transaction } from '../../types';

const statusSeverity = (s: string) =>
  s === 'RETURNED' ? 'SUCCESS' : s === 'OVERDUE' ? 'DANGER' : 'INFO';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ bottlesOut: 0, activeUsers: 0, lowStock: 0, openAlerts: 0 });
  const [feed, setFeed] = useState<Transaction[]>([]);
  const { on } = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activeTx, alertRes, invRes] = await Promise.all([
          api.get('/scan/active'),
          api.get('/alerts/count'),
          api.get('/inventory'),
        ]);
        setStats({
          bottlesOut: activeTx.data.data.length,
          activeUsers: new Set(
            activeTx.data.data.map((t: { studentId: string }) => t.studentId),
          ).size,
          lowStock: invRes.data.data.filter(
            (b: { currentQty: number; initialQty: number; lowStockPct: number }) =>
              (b.currentQty / b.initialQty) * 100 < b.lowStockPct,
          ).length,
          openAlerts: alertRes.data.data.count,
        });
        setFeed(activeTx.data.data.slice(0, 10));
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();

    const unsub = on('new_event', (tx: Transaction) => {
      setFeed((prev) => [tx, ...prev].slice(0, 20));
    });
    return unsub;
  }, [on]);

  const active = feed.filter((t) => t.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="enter"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard label="Bottles Out" value={stats.bottlesOut} icon={<FlaskConical size={20} />} accent="brand" />
        <StatCard label="Active Students" value={stats.activeUsers} icon={<Users size={20} />} accent="cyan" />
        <StatCard label="Low Stock" value={stats.lowStock} icon={<AlertTriangle size={20} />} accent="warning" />
        <StatCard label="Open Alerts" value={stats.openAlerts} icon={<Bell size={20} />} accent="danger" />
      </motion.div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Live Feed */}
        <Card className="p-6">
          <h2 className="mb-4 font-display font-semibold text-slate-100">Live Activity Feed</h2>
          {feed.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No activity yet</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {feed.map((tx) => (
                  <motion.div
                    key={tx.id}
                    layout
                    variants={slideInTop}
                    initial="initial"
                    animate="enter"
                    exit="exit"
                    className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2/40 p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
                      {tx.student?.name?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {tx.student?.name ?? 'Unknown'}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {tx.bottle?.chemicalName ?? 'Unknown chemical'}
                      </p>
                    </div>
                    <Badge label={tx.status} severity={statusSeverity(tx.status)} pulse={tx.status === 'ACTIVE'} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Card>

        {/* Active Sessions */}
        <Card className="p-6">
          <h2 className="mb-4 font-display font-semibold text-slate-100">Currently Checked Out</h2>
          {active.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">All chemicals returned</p>
          ) : (
            <div className="space-y-2">
              {active.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl border border-hairline p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">{tx.student?.name}</p>
                    <p className="text-xs text-slate-500">
                      {tx.student?.rollNo} · {tx.bottle?.chemicalName}
                    </p>
                  </div>
                  <p className="tnum text-xs text-slate-400">
                    {new Date(tx.timeTaken).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
