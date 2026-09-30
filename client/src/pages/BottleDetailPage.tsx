import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, History } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { RadialGauge } from '../components/ui/RadialGauge';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { staggerContainer, fadeUpItem } from '../lib/motion';
import { LAB_LABELS, LAB_BADGE_SEVERITY } from '../lib/lab';
import api from '../services/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type Transaction = {
  id: string;
  timeTaken: string;
  timeReturned?: string | null;
  quantityUsed: number | null;
  purpose?: string;
  status: string;
  lab?: 'LAB_A' | 'LAB_B' | null;
  student?: { name: string; rollNo: string };
  labIncharge?: { name: string } | null;
};

type Bottle = {
  id: string;
  chemicalName: string;
  rfidTag: string;
  location?: string;
  unit: string;
  currentQty: number;
  initialQty: number;
  lowStockPct?: number;
  transactions: Transaction[];
};

export default function BottleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/inventory/${id}`)
      .then((res) => setBottle(res.data.data))
      .catch(() => navigate('/inventory'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!bottle) return null;

  const chartData =
    bottle.transactions
      ?.slice()
      .reverse()
      .map((tx) => ({
        date: new Date(tx.timeTaken).toLocaleDateString(),
        qty: tx.quantityUsed ?? 0,
      })) ?? [];

  // Guard against initialQty being 0 (or missing) — dividing by it produces
  // NaN, which breaks comparisons below (pct > 50 is always false, so the
  // badge silently reads "Low") and corrupts the RadialGauge's SVG arc math.
  const pct = bottle.initialQty > 0 ? (bottle.currentQty / bottle.initialQty) * 100 : 0;
  const low = bottle.lowStockPct ?? 20;
  const avg = bottle.transactions.length
    ? bottle.transactions.reduce((s, t) => s + (t.quantityUsed ?? 0), 0) / bottle.transactions.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/inventory')}
            className="mb-2 flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            <ArrowLeft size={14} /> Back to Inventory
          </button>
          <h1 className="font-display text-2xl font-bold text-slate-50">{bottle.chemicalName}</h1>
          <p className="mt-1 text-sm text-slate-400">
            <span className="font-mono">{bottle.rfidTag}</span> · {bottle.location ?? 'No location'}
          </p>
        </div>
        <Badge
          label={bottle.currentQty <= 0 ? 'Empty' : pct > 50 ? 'Full' : pct > low ? 'Medium' : 'Low'}
          severity={bottle.currentQty <= 0 ? 'DANGER' : pct > 50 ? 'SUCCESS' : pct > low ? 'WARNING' : 'DANGER'}
          pulse={bottle.currentQty <= 0 || pct <= low}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex items-center justify-center p-5">
          <RadialGauge
            percent={pct}
            label="remaining"
            sublabel={`${bottle.currentQty} ${bottle.unit}`}
            lowStockPct={low}
          />
        </Card>
        <Card className="flex flex-col items-center justify-center p-5 text-center">
          <p className="text-sm text-slate-400">Total Uses</p>
          <p className="tnum mt-2 text-4xl font-semibold text-slate-50">{bottle.transactions.length}</p>
        </Card>
        <Card className="flex flex-col items-center justify-center p-5 text-center">
          <p className="text-sm text-slate-400">Avg. per Use</p>
          <p className="tnum mt-2 text-4xl font-semibold text-slate-50">
            {avg ? avg.toFixed(1) : '—'}
            <span className="ml-1 text-sm text-slate-400">{bottle.unit}</span>
          </p>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 font-display font-semibold text-slate-100">Usage Over Time</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="qtyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="date" stroke="#64748B" fontSize={12} />
              <YAxis stroke="#64748B" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15,23,42,0.95)',
                  border: '1px solid rgba(148,163,184,0.15)',
                  borderRadius: 12,
                  color: '#E2E8F0',
                }}
              />
              <Area type="monotone" dataKey="qty" stroke="#3B82F6" strokeWidth={2} fill="url(#qtyFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="flex items-center gap-2 font-display font-semibold text-slate-100">
            <History size={17} className="text-accent-400" /> Usage History
          </h2>
          {bottle.transactions.length > 0 && (
            <span className="text-xs text-slate-500">
              {bottle.transactions.length} record{bottle.transactions.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {bottle.transactions.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">
            No usage recorded yet for this chemical.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/40">
                <tr>
                  {['User', 'Roll No', 'Lab', 'Quantity', 'Purpose', 'Taken', 'Returned', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer}
                initial="initial"
                animate="enter"
                className="divide-y divide-hairline"
              >
                {bottle.transactions.map((tx) => (
                  <motion.tr key={tx.id} variants={fadeUpItem} className="transition-colors hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {tx.student?.name ?? (
                        <span className="inline-flex items-center gap-1.5">
                          {tx.labIncharge?.name ?? 'Unknown'}
                          <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-300">
                            Incharge
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {tx.student?.rollNo ?? <span className="italic text-slate-600">Self</span>}
                    </td>
                    <td className="px-4 py-3">
                      {tx.lab ? (
                        <Badge label={LAB_LABELS[tx.lab]} severity={LAB_BADGE_SEVERITY[tx.lab]} />
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tnum text-slate-200">
                      {tx.quantityUsed != null ? `${tx.quantityUsed.toFixed(1)} ${bottle.unit}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{tx.purpose ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(tx.timeTaken).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {tx.timeReturned ? new Date(tx.timeReturned).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={tx.status}
                        severity={tx.status === 'RETURNED' ? 'SUCCESS' : tx.status === 'OVERDUE' ? 'DANGER' : 'INFO'}
                      />
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}