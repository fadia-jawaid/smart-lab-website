import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, CreditCard, CalendarClock } from 'lucide-react';
import StatCard from '../ui/StatCard';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { staggerContainer } from '../../lib/motion';
import type { Transaction } from '../../types';

type Profile = {
  _count?: { transactions?: number };
  rfidTag?: string | null;
  lastRfidScan?: string | null;
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profRes, histRes] = await Promise.all([
          api.get('/my/profile'),
          api.get('/my/history'),
        ]);
        setProfile(profRes.data.data);
        setRecent(histRes.data.data.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-xl font-bold text-white shadow-glow">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-50">
              Hello, {user?.name}! 👋
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {user?.rollNo} · {user?.department} · Batch {user?.batch}
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="enter"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <StatCard
          label="Total Uses"
          value={profile?._count?.transactions ?? 0}
          icon={<FlaskConical size={20} />}
          accent="brand"
        />
        <StatCard
          label="RFID Card"
          value={profile?.rfidTag ? 'Linked' : 'Not Linked'}
          icon={<CreditCard size={20} />}
          accent={profile?.rfidTag ? 'success' : 'warning'}
        />
        <StatCard
          label="Last Visit"
          value={
            profile?.lastRfidScan
              ? new Date(profile.lastRfidScan).toLocaleDateString()
              : 'Never'
          }
          icon={<CalendarClock size={20} />}
          accent="cyan"
        />
      </motion.div>

      {/* Recent */}
      <Card className="p-6">
        <h2 className="mb-4 font-display font-semibold text-slate-100">Recent Chemical Usage</h2>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No chemical usage recorded yet
          </p>
        ) : (
          <div className="divide-y divide-hairline">
            {recent.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">{tx.bottle?.chemicalName}</p>
                  <p className="text-xs text-slate-500">
                    {tx.quantityUsed
                      ? `${tx.quantityUsed.toFixed(1)} ${tx.bottle?.unit} used`
                      : 'In progress'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="tnum text-xs text-slate-400">
                    {new Date(tx.timeTaken).toLocaleDateString()}
                  </p>
                  <Badge
                    label={tx.status}
                    severity={tx.status === 'RETURNED' ? 'SUCCESS' : 'INFO'}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
