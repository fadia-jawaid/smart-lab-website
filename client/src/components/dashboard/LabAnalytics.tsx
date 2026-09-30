import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  RefreshCw,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/api';
import type { Transaction } from '../../types';
import { cn } from '../../lib/cn';

interface RestockRecord {
  id: string;
  amountAdded: number;
  newQty: number;
  createdAt: string;
  bottle: { chemicalName: string; unit: string };
  labIncharge: { name: string } | null;
}

interface AlertRecord {
  id: string;
  type: string;
  severity: string;
  createdAt: string;
}

type TabType = 'comparison' | 'usage' | 'refills' | 'alerts';

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildPastDays(numDays = 7) {
  const days: { key: string; label: string; hcl: number; ethanol: number; totalQty: number; txCount: number }[] = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      key: localDateKey(d),
      label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }),
      hcl: 0,
      ethanol: 0,
      totalQty: 0,
      txCount: 0,
    });
  }
  return days;
}

const PIE_COLORS = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function LabAnalytics() {
  const [activeTab, setActiveTab] = useState<TabType>('comparison');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refills, setRefills] = useState<RestockRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  const fetchAnalyticsData = useCallback(async () => {
    try {
      // Both charts that consume `transactions` (HCl vs Ethanol, Usage
      // Trend) only ever bucket the most recent 7 days — anything older
      // is silently dropped by buildPastDays(7)'s day-key lookup. Fetching
      // 14 days' worth every time meant pulling roughly double the data
      // the page actually uses, on every load and every live-update.
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [logsRes, refillsRes, alertsRes] = await Promise.allSettled([
        api.get('/logs', { params: { lab: 'LAB_A', from: sevenDaysAgo.toISOString(), limit: 500 } }),
        api.get('/restock-logs'),
        api.get('/alerts'),
      ]);

      if (logsRes.status === 'fulfilled') {
        setTransactions(logsRes.value.data.data || []);
      }
      if (refillsRes.status === 'fulfilled') {
        setRefills(refillsRes.value.data.data || []);
      }
      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value.data.data || []);
      }
    } catch (err) {
      console.error('LabAnalytics: failed to load data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
    const unsubEvent = on('new_event', fetchAnalyticsData);
    const unsubAlert = on('alert_triggered', fetchAnalyticsData);
    const unsubRestock = on('restock_logged', fetchAnalyticsData);

    return () => {
      unsubEvent();
      unsubAlert();
      unsubRestock();
    };
  }, [on, fetchAnalyticsData]);

  // Compute HCl vs Ethanol Daily Usage
  const comparisonData = useMemo(() => {
    const days = buildPastDays(7);
    const map = new Map(days.map((d) => [d.key, d]));

    transactions.forEach((tx) => {
      if (!tx.timeTaken) return;
      const key = localDateKey(new Date(tx.timeTaken));
      const bucket = map.get(key);
      if (!bucket) return;

      const chemName = (tx.bottle?.chemicalName || '').toLowerCase();
      const qty = tx.quantityUsed || 0;

      if (chemName.includes('hydrochloric') || chemName.includes('hcl')) {
        bucket.hcl += Number(qty.toFixed(1));
      } else if (chemName.includes('ethanol') || chemName.includes('etoh')) {
        bucket.ethanol += Number(qty.toFixed(1));
      }

      bucket.totalQty += Number(qty.toFixed(1));
      bucket.txCount += 1;
    });

    return days;
  }, [transactions]);

  // Compute Total HCl and Total Ethanol consumed
  const totals = useMemo(() => {
    let totalHcl = 0;
    let totalEthanol = 0;
    let totalVolume = 0;

    transactions.forEach((tx) => {
      const chemName = (tx.bottle?.chemicalName || '').toLowerCase();
      const qty = tx.quantityUsed || 0;
      if (chemName.includes('hydrochloric') || chemName.includes('hcl')) {
        totalHcl += qty;
      } else if (chemName.includes('ethanol') || chemName.includes('etoh')) {
        totalEthanol += qty;
      }
      totalVolume += qty;
    });

    return { totalHcl, totalEthanol, totalVolume };
  }, [transactions]);

  // Compute Refill Quantity by Chemical
  const refillChartData = useMemo(() => {
    // Group recent refills by day or chemical
    const byChemical: Record<string, number> = {};
    refills.slice(0, 30).forEach((r) => {
      const name = r.bottle?.chemicalName || 'Chemical';
      byChemical[name] = (byChemical[name] || 0) + (r.amountAdded || 0);
    });

    return Object.entries(byChemical).map(([chemical, amountAdded]) => ({
      chemical,
      amountAdded: Number(amountAdded.toFixed(1)),
    }));
  }, [refills]);

  // Compute Alert Distribution
  const alertDistData = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach((a) => {
      const typeLabel = a.type
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ');
      counts[typeLabel] = (counts[typeLabel] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [alerts]);

  return (
    <Card className="p-6">
      {/* Header & Tab Buttons */}
      <div className="flex flex-col gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
              <BarChart3 size={16} />
            </div>
            <h2 className="font-display text-base font-bold text-white">
              Laboratory analytics
            </h2>
            <span className="rounded bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-300">
              Lab A
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Chemical usage, restocks and alert trends.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border border-hairline bg-surface-2/60 p-1">
          <button
            onClick={() => setActiveTab('comparison')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
              activeTab === 'comparison'
                ? 'bg-brand-500 text-white'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <BarChart3 size={14} />
            <span>HCl vs Ethanol</span>
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
              activeTab === 'usage'
                ? 'bg-brand-500 text-white'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <TrendingUp size={14} />
            <span>Usage Trend</span>
          </button>
          <button
            onClick={() => setActiveTab('refills')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
              activeTab === 'refills'
                ? 'bg-brand-500 text-white'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <RefreshCw size={14} />
            <span>Refill History</span>
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
              activeTab === 'alerts'
                ? 'bg-brand-500 text-white'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <PieChartIcon size={14} />
            <span>Alert Stats</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="pt-4">
          {/* TAB 1: HCl vs Ethanol Comparison */}
          {activeTab === 'comparison' && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-hairline bg-surface-2/40 p-3">
                  <span className="text-xs font-medium text-slate-400">
                    Hydrochloric acid (HCl)
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-blue-400">
                      {totals.totalHcl.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">g consumed</span>
                  </div>
                </div>

                <div className="rounded-xl border border-hairline bg-surface-2/40 p-3">
                  <span className="text-xs font-medium text-slate-400">
                    Ethanol (C₂H₅OH)
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-cyan-400">
                      {totals.totalEthanol.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">g consumed</span>
                  </div>
                </div>

                <div className="rounded-xl border border-hairline bg-surface-2/40 p-3">
                  <span className="text-xs font-medium text-slate-400">
                    Combined quantity
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-emerald-400">
                      {totals.totalVolume.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">g dispensed</span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                    <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      unit=" g"
                      allowDecimals={true}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: 12,
                        color: '#E2E8F0',
                        fontSize: 12,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar
                      dataKey="hcl"
                      name="Hydrochloric Acid (g)"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={44}
                    />
                    <Bar
                      dataKey="ethanol"
                      name="Ethanol (g)"
                      fill="#06B6D4"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={44}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 2: Overall Chemical Usage Trend */}
          {activeTab === 'usage' && (
            <div className="space-y-4">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={comparisonData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                    <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} unit=" g" tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: 12,
                        color: '#E2E8F0',
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Area
                      type="monotone"
                      dataKey="totalQty"
                      name="Total Chemical Dispensed (g)"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 3: Refill History */}
          {activeTab === 'refills' && (
            <div className="space-y-4">
              {refillChartData.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No refill records logged yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Refills performed by Lab Incharges will appear here.</p>
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={refillChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="chemical" stroke="#64748B" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={11} unit=" g" tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          borderRadius: 12,
                          color: '#E2E8F0',
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar
                        dataKey="amountAdded"
                        name="Total Restock Added (g)"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      maxBarSize={44}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Alert Distribution */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {alertDistData.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <PieChartIcon size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No alerts recorded.</p>
                  <p className="text-xs text-emerald-400 mt-1">All systems operating within nominal parameters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 24, right: 36, bottom: 24, left: 36 }}>
                        <Pie
                          data={alertDistData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={42}
                          paddingAngle={3}
                          // Only the percentage here — the full category name
                          // is already shown right next to this chart in the
                          // "Alert Category Breakdown" list. Including the
                          // name in the label too made it long enough to run
                          // past the edge of this half-width chart and get
                          // clipped (e.g. "Untracked Refill: 8%" losing its
                          // first letters), especially for labels on the left
                          // side of the donut.
                          label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {alertDistData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: 12,
                            color: '#E2E8F0',
                            fontSize: 12,
                          }}
                          formatter={(value, name) => [`${value} event${value === 1 ? '' : 's'}`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Alert Category Breakdown
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {alertDistData.map((item, idx) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between rounded-lg border border-hairline bg-surface-2/30 px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                            />
                            <span className="font-medium text-slate-200">{item.name}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-300">{item.value} event{item.value === 1 ? '' : 's'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}