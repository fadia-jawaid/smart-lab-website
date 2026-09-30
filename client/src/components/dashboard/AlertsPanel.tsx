import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Weight,
  Droplets,
  Ban,
  PackagePlus,
  CreditCard,
  HelpCircle,
  Clock,
  CheckCircle2,
  PackageX,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/api';
import { cn } from '../../lib/cn';
import { slideInTop } from '../../lib/motion';

export interface AlertItem {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'DANGER';
  message: string;
  createdAt: string;
  bottleId?: string | null;
  bottle?: { chemicalName: string } | null;
  isResolved: boolean;
}

const typeIconMap: Record<string, LucideIcon> = {
  LOW_STOCK: TrendingDown,
  CRITICAL_STOCK: TrendingDown,
  EMPTY_STOCK: PackageX,
  OVERFILL: TrendingUp,
  OVERLOAD: Weight,
  OVERWEIGHT: Weight,
  EXCESSIVE_USAGE: Droplets,
  LEAKAGE: Droplets,
  UNAUTHORIZED_USAGE: Ban,
  UNAUTHORIZED_ACCESS: Ban,
  UNTRACKED_USAGE: AlertTriangle,
  UNTRACKED_REFILL: PackagePlus,
  WRONG_RFID: CreditCard,
  UNKNOWN_TAG: HelpCircle,
  UNAUTHORIZED_REFILL: Ban,
  NOT_RETURNED: Clock,
};

function formatAlertLabel(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'DANGER' | 'WARNING'>('ALL');
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get('/alerts', { params: { isResolved: 'false' } });
      setAlerts(res.data.data || []);
    } catch (err) {
      console.error('AlertsPanel: failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const unsubAlert = on('alert_triggered', (newAlert: AlertItem) => {
      setAlerts((prev) => {
        if (prev.some((a) => a.id === newAlert.id)) return prev;
        return [newAlert, ...prev];
      });
    });
    return unsubAlert;
  }, [on, fetchAlerts]);

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'ALL') return true;
    return a.severity === filter;
  });

  // Several rounds of the SAME underlying condition (e.g. one card being
  // scanned repeatedly, or an ongoing leak reported every few minutes)
  // used to render as that many separate, visually-identical cards in a
  // row — which reads as broken/glitchy, not like real monitoring data.
  // Grouping by (type, bottle) collapses that into one card with a "×N"
  // count and the most recent occurrence, the way a real notification
  // center (Slack, GitHub) rolls up repeats of the same event. The full
  // Alerts page still lists every individual alert for actually
  // resolving them one at a time — this only affects this compact widget.
  const groupedAlerts = useMemo(() => {
    const groups = new Map<string, AlertItem[]>();
    for (const alert of filteredAlerts) {
      const key = `${alert.type}:${alert.bottleId ?? 'none'}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(alert);
    }
    return Array.from(groups.values())
      .map((items) => {
        const sorted = [...items].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        return { latest: sorted[0], count: sorted.length };
      })
      .sort((a, b) => new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime());
  }, [filteredAlerts]);

  const dangerCount = alerts.filter((a) => a.severity === 'DANGER').length;
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length;

  return (
    <Card className="flex flex-col justify-between p-6">
      <div>
        {/* Header & Filter Controls */}
        <div className="flex items-center justify-between gap-3 border-b border-hairline pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-danger/15 text-danger">
              <ShieldAlert size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-white">
                  Active System Alerts
                </h3>
                {alerts.length > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white shadow-glow-danger">
                    {alerts.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Safety alarms, chemical threshold breaches & hardware anomalies.
              </p>
            </div>
          </div>

          <Link
            to="/alerts"
            className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            <span>Alerts Page</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="mt-3 flex items-center gap-1.5">
          <button
            onClick={() => setFilter('ALL')}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
              filter === 'ALL'
                ? 'bg-slate-700 text-white font-semibold'
                : 'text-slate-400 hover:text-white',
            )}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('DANGER')}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
              filter === 'DANGER'
                ? 'bg-danger/20 text-danger border border-danger/40 font-semibold'
                : 'text-slate-400 hover:text-danger',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-danger" />
            Critical ({dangerCount})
          </button>
          <button
            onClick={() => setFilter('WARNING')}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
              filter === 'WARNING'
                ? 'bg-warning/20 text-warning border border-warning/40 font-semibold'
                : 'text-slate-400 hover:text-warning',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            Warnings ({warningCount})
          </button>
        </div>

        {/* List of alerts */}
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner size="md" />
            </div>
          ) : groupedAlerts.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={24} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-300">All Systems Nominal</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {filter === 'ALL'
                  ? 'No active safety, leakage, or inventory alerts detected.'
                  : `No unresolved ${filter.toLowerCase()} alerts.`}
              </p>
            </div>
          ) : (
            <div className="grid max-h-96 grid-cols-1 content-start gap-2.5 overflow-y-auto pr-1 lg:grid-cols-2">
              <AnimatePresence initial={false}>
                {groupedAlerts.map(({ latest: alert, count }) => {
                  const Icon = typeIconMap[alert.type] || AlertTriangle;
                  const isCritical = alert.severity === 'DANGER';

                  return (
                    <motion.div
                      key={`${alert.type}:${alert.bottleId ?? 'none'}`}
                      layout
                      variants={slideInTop}
                      initial="initial"
                      animate="enter"
                      exit="exit"
                      className={cn(
                        'rounded-xl border p-3 transition-all',
                        isCritical
                          ? 'border-danger/30 bg-danger/5 hover:border-danger/60'
                          : 'border-warning/30 bg-warning/5 hover:border-warning/60',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                              isCritical ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning',
                            )}
                          >
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white">
                              {formatAlertLabel(alert.type)}
                            </span>
                            {alert.bottle?.chemicalName && (
                              <span className="ml-1.5 text-xs text-slate-400 font-medium">
                                · {alert.bottle.chemicalName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {count > 1 && (
                            <span
                              className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                                isCritical ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning',
                              )}
                              title={`${count} occurrences of this alert`}
                            >
                              ×{count}
                            </span>
                          )}
                          <Badge
                            label={alert.severity}
                            severity={alert.severity}
                            pulse={isCritical}
                          />
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-slate-300 pl-9 leading-relaxed">
                        {alert.message}
                      </p>
                      <p className="mt-1 pl-9 text-[11px] text-slate-500">
                        {count > 1 ? `Most recent: ${timeAgo(alert.createdAt)}` : timeAgo(alert.createdAt)}
                      </p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Footer link */}
      <div className="mt-4 pt-3 border-t border-hairline/60 flex items-center justify-between text-xs text-slate-400">
        <span>Continuous monitoring active</span>
        <Link
          to="/alerts"
          className="font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
        >
          <span>View Triage Logs</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </Card>
  );
}