import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FlaskConical, Radio, Bell, ScanLine } from 'lucide-react';
import StatCard from '../ui/StatCard';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/api';
import { staggerContainer } from '../../lib/motion';
import type { Transaction } from '../../types';

export default function LabDashboard() {
  const [active, setActive] = useState<Transaction[]>([]);
  const [count, setCount] = useState({ out: 0, today: 0, alerts: 0 });
  const { on } = useSocket();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/scan/active');
        setActive(res.data.data);
        setCount((prev) => ({ ...prev, out: res.data.data.length }));
      } catch (error) {
        console.error(error);
      }
    };
    fetch();
    const unsub = on('new_event', fetch);
    return unsub;
  }, [on]);

  return (
    <div className="space-y-6">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="enter"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <StatCard label="Bottles Out Now" value={count.out} icon={<FlaskConical size={20} />} accent="brand" />
        <StatCard label="Today's Scans" value={count.today} icon={<Radio size={20} />} accent="cyan" />
        <StatCard label="Open Alerts" value={count.alerts} icon={<Bell size={20} />} accent="danger" />
      </motion.div>

      {/* Quick scan CTA */}
      <Card interactive className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-500/20 blur-2xl" />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-100">Ready to scan</h2>
            <p className="mt-1 text-sm text-slate-400">
              Start a new RFID scan session to check chemicals in or out.
            </p>
          </div>
          <Link to="/scan">
            <Button size="lg" className="gap-2">
              <ScanLine size={18} /> Start Scan Session
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-display font-semibold text-slate-100">
          Currently Out ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No chemicals currently checked out
          </p>
        ) : (
          <div className="divide-y divide-hairline">
            {active.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {tx.student?.name}{' '}
                    <span className="text-slate-500">({tx.student?.rollNo})</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {tx.bottle?.chemicalName} — {tx.bottle?.unit}
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
  );
}
