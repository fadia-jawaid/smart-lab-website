import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Printer, FlaskConical, AlertTriangle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

type Bottle = {
  id: string;
  chemicalName: string;
  unit: string;
  currentQty: number;
  initialQty: number;
  maxCapacity: number;
  lowStockPct?: number;
  location?: string | null;
  rfidTag?: string | null;
};

type Transaction = {
  id: string;
  quantityUsed?: number;
  timeTaken: string;
  bottle?: { chemicalName: string; unit: string } | null;
  student?: { name: string } | null;
};

type Alert = {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'DANGER';
  message: string;
  createdAt: string;
  isResolved: boolean;
  bottle?: { chemicalName: string } | null;
};

const REPORT_WINDOW_DAYS = 30;

// Same wording used everywhere else in the app (Inventory page, Dashboard,
// Bottle detail): Full / Medium / Low / Empty. This report used to print
// "Healthy" / "Critical" instead — the one place a supervisor is most
// likely to actually read closely, since it's the printed document.
function stockStatusLabel(b: Bottle): string {
  const pct = b.initialQty ? (b.currentQty / b.initialQty) * 100 : 0;
  const low = b.lowStockPct ?? 20;
  if (b.currentQty <= 0) return 'Empty';
  if (pct <= low) return 'Low';
  if (pct <= 50) return 'Medium';
  return 'Full';
}

const formatTypeLabel = (type: string): string =>
  type.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

// The Lab Report as an on-demand modal instead of its own page/route —
// "generate a report" is an occasional action, not a place someone
// navigates to and lives on, so it doesn't need a permanent nav slot or
// its own page in the page count. Triggered from a Dashboard button.
//
// Printing a fixed-position overlay is unreliable across browsers, so on
// print this drops the backdrop/chrome entirely and lets the white
// report body flow as a normal, unconstrained document (print:static,
// no max-height) — same technique used for the app shell's Sidebar/
// Topbar, which also hide via print:hidden.
export default function LabReportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const since = new Date();
    since.setDate(since.getDate() - REPORT_WINDOW_DAYS);

    Promise.all([
      api.get('/inventory'),
      api.get('/logs', { params: { lab: 'LAB_A', from: since.toISOString(), limit: 500 } }),
      api.get('/alerts', { params: { isResolved: 'false' } }),
    ])
      .then(([invRes, logsRes, alertsRes]) => {
        setBottles(invRes.data.data);
        setTransactions(logsRes.data.data);
        setAlerts(alertsRes.data.data);
      })
      .catch(() => toast.error('Could not load report data'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const usageByChemical = transactions.reduce<Record<string, { count: number; qty: number; unit: string }>>(
    (acc, tx) => {
      const name = tx.bottle?.chemicalName;
      if (!name) return acc;
      if (!acc[name]) acc[name] = { count: 0, qty: 0, unit: tx.bottle?.unit ?? '' };
      acc[name].count += 1;
      acc[name].qty += tx.quantityUsed ?? 0;
      return acc;
    },
    {},
  );
  const topChemicals = Object.entries(usageByChemical)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  const alertsByType = alerts.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1;
    return acc;
  }, {});

  const generatedAt = new Date();
  const since = new Date();
  since.setDate(since.getDate() - REPORT_WINDOW_DAYS);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto print:static print:overflow-visible print:block print:h-auto">
          {/* Backdrop + toolbar chrome — gone entirely when printing */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm print:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div className="relative flex min-h-full flex-col items-center px-4 py-8 print:block print:p-0">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="mb-4 flex w-full max-w-4xl items-center justify-between print:hidden"
            >
              <p className="text-sm text-slate-300">
                Last {REPORT_WINDOW_DAYS} days of Lab A activity, plus current inventory and open alerts.
              </p>
              <div className="flex items-center gap-2">
                <Button onClick={() => window.print()}>
                  <Printer size={16} /> Print / Save as PDF
                </Button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </motion.div>

            {/* The report itself — a light "document" even inside the dark
                app shell, since that's what it looks like printed. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-4xl rounded-2xl bg-white p-10 text-slate-900 shadow-2xl print:m-0 print:max-w-none print:rounded-none print:p-0 print:shadow-none"
            >
              {loading ? (
                <div className="flex justify-center py-24">
                  <Spinner size="lg" />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                    <div>
                      <h1 className="font-display text-2xl font-bold text-slate-900">SmartLab — Lab Report</h1>
                      <p className="mt-1 text-sm text-slate-500">
                        {since.toLocaleDateString()} – {generatedAt.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <p>Generated {generatedAt.toLocaleString()}</p>
                      <p>By {user?.name ?? 'Unknown'} ({user?.role})</p>
                    </div>
                  </div>

                  {/* Inventory summary */}
                  <section className="mt-8">
                    <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-slate-900">
                      <FlaskConical size={18} /> Inventory Summary
                    </h2>
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="py-2 pr-3">Chemical</th>
                          <th className="py-2 pr-3">Location</th>
                          <th className="py-2 pr-3 text-right">Current</th>
                          <th className="py-2 pr-3 text-right">Normal Fill</th>
                          <th className="py-2 pr-3 text-right">Max Capacity</th>
                          <th className="py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bottles.map((b) => (
                          <tr key={b.id} className="border-b border-slate-100">
                            <td className="py-2 pr-3 font-medium">{b.chemicalName}</td>
                            <td className="py-2 pr-3 text-slate-500">{b.location ?? '—'}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{b.currentQty.toFixed(1)} {b.unit}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-slate-500">{b.initialQty.toFixed(1)} {b.unit}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-slate-500">{b.maxCapacity.toFixed(1)} {b.unit}</td>
                            <td className="py-2 text-right font-medium">{stockStatusLabel(b)}</td>
                          </tr>
                        ))}
                        {bottles.length === 0 && (
                          <tr><td colSpan={6} className="py-4 text-center text-slate-400">No chemicals registered</td></tr>
                        )}
                      </tbody>
                    </table>
                  </section>

                  {/* Usage summary */}
                  <section className="mt-8 break-inside-avoid">
                    <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-slate-900">
                      <TrendingUp size={18} /> Usage Summary — Lab A (last {REPORT_WINDOW_DAYS} days)
                    </h2>
                    <p className="mb-3 text-sm text-slate-500">{transactions.length} chemical dispense events recorded.</p>
                    {topChemicals.length > 0 ? (
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="py-2 pr-3">Chemical</th>
                            <th className="py-2 pr-3 text-right">Times Used</th>
                            <th className="py-2 text-right">Total Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topChemicals.map(([name, stat]) => (
                            <tr key={name} className="border-b border-slate-100">
                              <td className="py-2 pr-3 font-medium">{name}</td>
                              <td className="py-2 pr-3 text-right tabular-nums">{stat.count}</td>
                              <td className="py-2 text-right tabular-nums">{stat.qty.toFixed(1)} {stat.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-slate-400">No usage recorded in this period.</p>
                    )}
                  </section>

                  {/* Open alerts */}
                  <section className="mt-8 break-inside-avoid">
                    <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-slate-900">
                      <AlertTriangle size={18} /> Open Alerts ({alerts.length})
                    </h2>
                    {Object.keys(alertsByType).length > 0 && (
                      <p className="mb-3 text-sm text-slate-500">
                        {Object.entries(alertsByType).map(([type, count], i) => (
                          <span key={type}>
                            {i > 0 && ' · '}
                            {formatTypeLabel(type)}: {count}
                          </span>
                        ))}
                      </p>
                    )}
                    {alerts.length > 0 ? (
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="py-2 pr-3">Type</th>
                            <th className="py-2 pr-3">Chemical</th>
                            <th className="py-2 pr-3">Message</th>
                            <th className="py-2 text-right">Raised</th>
                          </tr>
                        </thead>
                        <tbody>
                          {alerts.map((a) => (
                            <tr key={a.id} className="border-b border-slate-100 align-top">
                              <td className="py-2 pr-3 font-medium">{formatTypeLabel(a.type)}</td>
                              <td className="py-2 pr-3 text-slate-500">{a.bottle?.chemicalName ?? '—'}</td>
                              <td className="py-2 pr-3 text-slate-600">{a.message}</td>
                              <td className="py-2 whitespace-nowrap text-right text-slate-500">
                                {new Date(a.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-slate-400">No open alerts — lab is all clear.</p>
                    )}
                  </section>

                  <p className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
                    Generated automatically by SmartLab — Chemical Tracking System
                  </p>
                </>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}