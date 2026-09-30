import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ban, TrendingDown, TrendingUp, Clock, Droplets, AlertTriangle, CheckCircle2, Weight,
  PackageX, ShieldAlert, CreditCard, HelpCircle, KeyRound, PackagePlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { slideInTop } from '../lib/motion';
import { cn } from '../lib/cn';
import api from '../services/api';

type Alert = {
  id: string;
  type: string;
  severity: string;
  message: string;
  createdAt: string;
  isResolved: boolean;
  bottle?: { chemicalName: string } | null;
};

const typeIcon: Record<string, LucideIcon> = {
  LOW_STOCK: TrendingDown,
  CRITICAL_STOCK: TrendingDown,
  EMPTY_STOCK: PackageX,
  OVERFILL: TrendingUp,
  OVERLOAD: Weight,
  EXCESSIVE_USAGE: Droplets,
  LEAKAGE: Droplets,
  UNAUTHORIZED_USAGE: Ban,
  UNTRACKED_USAGE: AlertTriangle,
  UNTRACKED_REFILL: PackagePlus,
  WRONG_RFID: CreditCard,
  UNKNOWN_TAG: HelpCircle,
  UNAUTHORIZED_REFILL: KeyRound,
  NOT_RETURNED: Clock,
};

// Fallback for anyone still viewing an old, pre-rename alert row that's
// sitting in the database from before this alert-type cleanup.
const legacyTypeIcon: Record<string, LucideIcon> = {
  UNAUTHORIZED_ACCESS: Ban,
  ANOMALY: AlertTriangle,
  OVERWEIGHT: Weight,
};

const getTypeIcon = (type: string): LucideIcon =>
  typeIcon[type] ?? legacyTypeIcon[type] ?? ShieldAlert;

// "UNAUTHORIZED_USAGE" → "Unauthorized Usage" — the raw enum name read
// fine as a developer, but shouty ALL_CAPS reads as a bug/placeholder to
// anyone else glancing at the alert feed.
const formatTypeLabel = (type: string): string =>
  type
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');

const mapSeverity = (s: string): 'SUCCESS' | 'DANGER' | 'INFO' | 'WARNING' => {
  switch (s) {
    case 'INFO':
      return 'INFO';
    case 'WARNING':
      return 'WARNING';
    case 'DANGER':
      return 'DANGER';
    default:
      return 'INFO';
  }
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNRESOLVED' | 'RESOLVED'>('UNRESOLVED');

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { on } = useSocket();

  const filterParam =
    filter === 'ALL' ? '' : filter === 'UNRESOLVED' ? 'isResolved=false' : 'isResolved=true';

  useEffect(() => {
    const loadAlerts = async () => {
      setLoading(true);
      try {
        const query = filterParam ? `?${filterParam}` : '';
        const res = await api.get(`/alerts${query}`);
        setAlerts(res.data.data);
        setHasMore(Boolean(res.data.meta?.hasMore));
      } catch (err) {
        console.error('Failed to load alerts:', err);
        toast.error('Failed to load alerts');
      } finally {
        setLoading(false);
      }
    };
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Previously the alerts list always showed only the 200 newest matching
  // alerts with no way to reach anything older — this fetches the next
  // page and appends it, so an alert that's been open for a while (e.g.
  // from before a fix was deployed) can still be found and resolved
  // instead of being permanently stuck off-screen.
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const sep = filterParam ? '&' : '?';
      const res = await api.get(`/alerts${filterParam ? `?${filterParam}` : ''}${sep}skip=${alerts.length}`);
      setAlerts((prev) => [...prev, ...res.data.data]);
      setHasMore(Boolean(res.data.meta?.hasMore));
    } catch (err) {
      console.error('Failed to load more alerts:', err);
      toast.error('Failed to load more alerts');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const unsubTriggered = on('alert_triggered', (alert: Alert) => {
      setAlerts((prev) => {
        // Guard against the same alert arriving twice (e.g. a duplicate
        // socket emit, or it was already in the initial fetch) — without
        // this, React sees two elements with the same `key` and warns,
        // and Framer Motion's enter/exit animation glitches on it.
        if (prev.some((a) => a.id === alert.id)) return prev;
        // A freshly triggered alert is unresolved by definition. If the
        // current tab is showing only RESOLVED alerts, don't inject it —
        // it doesn't belong in that filtered list.
        if (filter === 'RESOLVED') return prev;
        return [alert, ...prev];
      });
    });

    const unsubResolved = on('alert_resolved', (alert: Alert) => {
      setAlerts((prev) => {
        if (filter === 'UNRESOLVED') {
          // Resolved elsewhere (another tab/user) — it no longer belongs
          // in the unresolved list.
          return prev.filter((a) => a.id !== alert.id);
        }
        // ALL / RESOLVED views: just reflect the new resolved state instead
        // of removing it, so counts/context stay accurate.
        return prev.map((a) => (a.id === alert.id ? { ...a, isResolved: true } : a));
      });
    });

    return () => {
      unsubTriggered();
      unsubResolved();
    };
  }, [on, filter]);

  const handleResolve = async (id: string) => {
    try {
      await api.patch(`/alerts/${id}/resolve`);
      setAlerts((prev) =>
        filter === 'UNRESOLVED'
          ? prev.filter((a) => a.id !== id)
          : prev.map((a) => (a.id === id ? { ...a, isResolved: true } : a)),
      );
    } catch (err: unknown) {
      let message = 'Failed to resolve alert';

      if (err instanceof Error) {
        message = err.message;
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as Record<string, unknown>).response === 'object' &&
        (err as Record<string, unknown>).response !== null
      ) {
        const response = (err as { response?: { data?: { error?: string } } }).response;
        message = response?.data?.error ?? message;
      }

      toast.error(message);
      console.error('Failed to resolve alert:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {(['ALL', 'UNRESOLVED', 'RESOLVED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium transition-all',
              filter === f
                ? 'bg-brand-gradient text-white shadow-glow'
                : 'border border-hairline bg-surface-2/40 text-slate-400 hover:text-slate-200',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : alerts.length === 0 ? (
        <Card className="p-16 text-center text-slate-500">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-success" />
          <p>No alerts — the lab is calm</p>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {alerts.map((alert) => {
              const Icon = getTypeIcon(alert.type);
              return (
                <motion.div
                  key={alert.id}
                  layout
                  variants={slideInTop}
                  initial="initial"
                  animate="enter"
                  exit="exit"
                >
                  <Card className={cn('p-4', alert.isResolved && 'opacity-60')}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-xl',
                            mapSeverity(alert.severity) === 'DANGER'
                              ? 'bg-danger/15 text-danger'
                              : mapSeverity(alert.severity) === 'WARNING'
                                ? 'bg-warning/15 text-warning'
                                : 'bg-brand-500/15 text-brand-300',
                          )}
                        >
                          <Icon size={18} />
                        </span>
                        <div>
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <Badge label={alert.severity} severity={mapSeverity(alert.severity)} />
                            {alert.bottle?.chemicalName && (
                              <Badge label={alert.bottle.chemicalName} severity="INFO" />
                            )}
                            <span className="text-xs text-slate-500">
                              {formatTypeLabel(alert.type)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-200">{alert.message}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {alert.isResolved ? (
                            <Badge label="Resolved" severity="SUCCESS" />
                          ) : (isAdmin || user?.role === 'LAB_INCHARGE') ? (
                            <Button variant="ghost" size="sm" onClick={() => handleResolve(alert.id)}>
                              Resolve
                            </Button>
                          ) : null}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <Spinner size="sm" /> : 'Load more alerts'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}