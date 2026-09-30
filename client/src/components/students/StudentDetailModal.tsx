import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import StatCard from '../ui/StatCard';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { staggerContainer, fadeUpItem } from '../../lib/motion';
import api from '../../services/api';
import type { Student, Transaction } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const BAR_COLORS = ['#3B82F6', '#06B6D4', '#60A5FA', '#22D3EE', '#2563EB'];

// Same content the old, standalone StudentDetailPage rendered — just
// inside a modal now instead of its own route. A student's usage
// history is one more thing to glance at while managing the roster,
// not a separate destination someone navigates to on its own.
export default function StudentDetailModal({
  studentId,
  onClose,
}: {
  studentId: string | null;
  onClose: () => void;
}) {
  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    setStudent(null);
    setHistory([]);

    const load = async () => {
      try {
        const [studentRes, histRes] = await Promise.all([
          api.get(`/students/${studentId}`),
          api.get(`/students/${studentId}/history`),
        ]);
        setStudent(studentRes.data.data);
        setHistory(histRes.data.data);
      } catch {
        onClose();
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const totalQty = history.reduce((s, t) => s + (t.quantityUsed ?? 0), 0);
  const lastVisit = history[0]?.timeTaken ? new Date(history[0].timeTaken).toLocaleDateString() : 'Never';

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
    <Modal isOpen={!!studentId} onClose={onClose} title={student ? student.name : 'Student Detail'} size="lg">
      {loading || !student ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
          {/* Student info */}
          <Card className="relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-500/15 blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-xl font-bold text-white shadow-glow">
                {student.name[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-400">
                  <span className="font-mono">{student.rollNo}</span> · {student.department} · Batch {student.batch}
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
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <StatCard label="Total Uses" value={history.length} accent="brand" />
            <StatCard label="Total Quantity Used" value={Number(totalQty.toFixed(1))} accent="cyan" hint="all chemicals" />
            <StatCard label="Last Visit" value={lastVisit} accent="success" />
          </motion.div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 font-display text-sm font-semibold text-slate-100">Most Used Chemicals</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="#64748B" fontSize={11} />
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
            <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
              <h3 className="font-display text-sm font-semibold text-slate-100">Usage History</h3>
              {history.length > 0 && (
                <span className="text-xs text-slate-500">
                  {history.length} record{history.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2/40">
                  <tr>
                    {['Chemical', 'Quantity', 'Purpose', 'Processed By', 'Taken', 'Status'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <motion.tbody variants={staggerContainer} initial="initial" animate="enter" className="divide-y divide-hairline">
                  {history.map((tx) => (
                    <motion.tr key={tx.id} variants={fadeUpItem} className="transition-colors hover:bg-white/5">
                      <td className="px-3 py-2 text-slate-100">{tx.bottle?.chemicalName}</td>
                      <td className="px-3 py-2 tnum text-slate-200">
                        {tx.quantityUsed != null ? `${tx.quantityUsed.toFixed(1)} ${tx.bottle?.unit}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{tx.purpose ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{tx.labIncharge?.name ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-400">{new Date(tx.timeTaken).toLocaleDateString()}</td>
                      <td className="px-3 py-2">
                        <Badge
                          label={tx.status}
                          severity={tx.status === 'RETURNED' ? 'SUCCESS' : tx.status === 'OVERDUE' ? 'DANGER' : 'INFO'}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
              {history.length === 0 && (
                <p className="py-10 text-center text-slate-500">No usage history yet</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </Modal>
  );
}
