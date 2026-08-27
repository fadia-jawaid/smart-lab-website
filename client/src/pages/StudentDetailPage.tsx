import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import { Spinner } from '../components/ui/Spinner';
import { staggerContainer } from '../lib/motion';
import api from '../services/api';
import type { Student, Transaction } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const BAR_COLORS = ['#3B82F6', '#06B6D4', '#60A5FA', '#22D3EE', '#2563EB'];

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [listRes, histRes] = await Promise.all([
          api.get('/students'),
          api.get(`/students/${id}/history`),
        ]);
        setStudent(listRes.data.data.find((s: Student) => s.id === id) ?? null);
        setHistory(histRes.data.data);
      } catch {
        navigate('/students');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!student) return null;

  const totalQty = history.reduce((s, t) => s + (t.quantityUsed ?? 0), 0);
  const lastVisit = history[0]?.timeTaken
    ? new Date(history[0].timeTaken).toLocaleDateString()
    : 'Never';

  // Most-used chemicals (by count)
  const byChem = history.reduce<Record<string, number>>((acc, t) => {
    const name = t.bottle?.chemicalName ?? 'Unknown';
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(byChem)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/students')}
        className="flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-slate-200"
      >
        <ArrowLeft size={14} /> Back to Students
      </button>

      {/* Student info */}
      <Card className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-2xl font-bold text-white shadow-glow">
            {student.name[0]}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold text-slate-50">{student.name}</h1>
            <p className="mt-1 text-sm text-slate-400">
              <span className="font-mono">{student.rollNo}</span> · {student.department} · Batch{' '}
              {student.batch}
            </p>
          </div>
          {student.rfidTag ? (
            <Badge label={`RFID ${student.rfidTag}`} severity="SUCCESS" pulse />
          ) : (
            <Badge label="No RFID Card" severity="WARNING" />
          )}
        </div>
      </Card>

      {/* Stats */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="enter"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <StatCard label="Total Uses" value={history.length} accent="brand" />
        <StatCard label="Total Quantity Used" value={Number(totalQty.toFixed(1))} accent="cyan" hint="all chemicals" />
        <StatCard label="Last Visit" value={lastVisit} accent="success" />
      </motion.div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 font-display font-semibold text-slate-100">Most Used Chemicals</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
              <YAxis allowDecimals={false} stroke="#64748B" fontSize={12} />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                contentStyle={{
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(148,163,184,0.15)',
                  borderRadius: 12,
                  color: '#E2E8F0',
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* History table */}
      <Card>
        <div className="border-b border-hairline px-6 py-4">
          <h2 className="font-display font-semibold text-slate-100">Usage History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/40">
              <tr>
                {['Chemical', 'Quantity', 'Purpose', 'Processed By', 'Date', 'Status'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {history.map((tx) => (
                <tr key={tx.id} className="transition-colors hover:bg-white/5">
                  <td className="px-4 py-3 text-slate-100">{tx.bottle?.chemicalName}</td>
                  <td className="px-4 py-3 tnum text-slate-200">
                    {tx.quantityUsed != null ? `${tx.quantityUsed.toFixed(1)} ${tx.bottle?.unit}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{tx.purpose ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{tx.labIncharge?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(tx.timeTaken).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={tx.status}
                      severity={tx.status === 'RETURNED' ? 'SUCCESS' : tx.status === 'OVERDUE' ? 'DANGER' : 'INFO'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && (
            <p className="py-12 text-center text-slate-500">No usage history yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
