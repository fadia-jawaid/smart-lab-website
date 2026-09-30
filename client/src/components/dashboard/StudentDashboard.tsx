import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FlaskConical,
  CreditCard,
  CalendarClock,
  History,
  FlaskRound,
  GraduationCap,
  ExternalLink,
  Droplet,
  Tag,
} from 'lucide-react';
import StatCard from '../ui/StatCard';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { staggerContainer } from '../../lib/motion';
import type { Transaction } from '../../types';
import DashboardHeader from './DashboardHeader';

type Profile = {
  _count?: { transactions?: number };
  rfidTag?: string | null;
  lastRfidScan?: string | null;
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profRes, histRes] = await Promise.all([
          api.get('/my/profile'),
          api.get('/my/history'),
        ]);
        setProfile(profRes.data.data);
        setHistory(histRes.data.data || []);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalVolumeUsed = useMemo(() => {
    return history.reduce((acc, curr) => acc + (curr.quantityUsed || 0), 0);
  }, [history]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>

        <Skeleton className="h-20 w-full rounded-2xl" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-hairline bg-surface/70 p-5">
              <Skeleton className="h-3 w-24" />
              <div className="mt-3 flex items-center justify-between">
                <Skeleton className="h-8 w-14" />
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
              <Skeleton className="mt-3 h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-brand-gradient opacity-[0.09] blur-3xl"
        />

        <DashboardHeader
          subtitle={`${user?.rollNo || 'Student'} · ${user?.department || 'Department'} · Batch ${user?.batch || '2021-2025'}`}
        />

        {/* Student Badge Card */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface/70 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white font-bold text-lg shadow-glow">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-white">{user?.name}</h2>
                <span className="rounded-md bg-accent-500/20 px-2 py-0.5 text-[10px] font-bold text-accent-400 border border-accent-500/30">
                  {user?.rollNo}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Authorized for Lab A (Chemical Dispenser) & Lab B (Turnstile Attendance)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-slate-400">
              <Tag size={12} className="text-slate-500" />
              RFID Card:
            </span>
            {profile?.rfidTag ? (
              <span className="font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                {profile.rfidTag}
              </span>
            ) : (
              <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                Not Assigned
              </span>
            )}
          </div>
        </div>

        {/* 4 Stats Cards */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="enter"
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            label="Total Lab Sessions"
            to="/logs"
            value={profile?._count?.transactions ?? history.length}
            icon={<FlaskConical size={20} />}
            accent="brand"
            subtext="Chemical usage sessions"
          />

          <StatCard
            label="Quantity Dispensed"
            to="/logs"
            value={`${totalVolumeUsed.toFixed(1)} g`}
            icon={<Droplet size={20} />}
            accent="cyan"
            subtext="Cumulative reagent weight"
          />

          <StatCard
            label="Smart RFID Pass"
            to="/profile"
            value={profile?.rfidTag ? 'Active' : 'Unlinked'}
            icon={<CreditCard size={20} />}
            accent={profile?.rfidTag ? 'success' : 'warning'}
            subtext={profile?.rfidTag ? `Tag: ${profile.rfidTag}` : 'Contact Lab Incharge'}
          />

          <StatCard
            label="Last Lab Visit"
            to="/logs"
            value={
              profile?.lastRfidScan
                ? new Date(profile.lastRfidScan).toLocaleDateString()
                : history[0]?.timeTaken
                  ? new Date(history[0].timeTaken).toLocaleDateString()
                  : 'First Visit'
            }
            icon={<CalendarClock size={20} />}
            accent="purple"
            subtext="Most recent bench check-in"
          />
        </motion.div>
      </div>

      {/* Recent Activity Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
              <History size={16} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">
                My Chemical Usage & Attendance History
              </h3>
              <p className="text-xs text-slate-400">
                Showing {history.length} logged experiment transactions.
              </p>
            </div>
          </div>

          <Link
            to="/logs"
            className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            <span>Full History</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        {history.length === 0 ? (
          <EmptyState
            icon={<FlaskRound size={24} />}
            title="No chemical usage recorded yet"
            hint="Scan your student RFID card at the Lab bench scale to automatically record usage."
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-hairline text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pl-2 font-semibold">Chemical Reagent</th>
                  <th className="pb-3 font-semibold">Quantity Used</th>
                  <th className="pb-3 font-semibold">Laboratory Bench</th>
                  <th className="pb-3 font-semibold">Purpose / Experiment</th>
                  <th className="pb-3 font-semibold">Date & Time</th>
                  <th className="pb-3 pr-2 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline/60">
                {history.slice(0, 8).map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-surface-2/40">
                    <td className="py-3 pl-2 font-medium text-slate-100">
                      {tx.bottle?.chemicalName ?? <span className="text-slate-500 italic">Nil (Attendance)</span>}
                    </td>
                    <td className="py-3 font-mono font-bold text-slate-200">
                      {tx.quantityUsed != null && tx.bottle?.unit ? (
                        <span className="text-brand-300">
                          {tx.quantityUsed.toFixed(1)} {tx.bottle.unit}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="rounded bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-hairline">
                        {tx.lab === 'LAB_A' ? 'Lab A (Chemical)' : 'Lab B (Turnstile)'}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">
                      {tx.purpose || 'Laboratory Experiment'}
                    </td>
                    <td className="py-3 text-slate-400">
                      <span>{new Date(tx.timeTaken).toLocaleDateString()}</span>
                      <span className="block text-[10px] text-slate-500">
                        {new Date(tx.timeTaken).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <Badge
                        label={tx.status}
                        severity={tx.status === 'RETURNED' ? 'SUCCESS' : tx.status === 'OVERDUE' ? 'DANGER' : 'INFO'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}