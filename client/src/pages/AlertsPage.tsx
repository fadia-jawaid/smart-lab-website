import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban, TrendingDown, Clock, Droplets, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
};

const typeIcon: Record<string, LucideIcon> = {
  UNAUTHORIZED_ACCESS: Ban,
  LOW_STOCK: TrendingDown,
  NOT_RETURNED: Clock,
  LEAKAGE: Droplets,
  ANOMALY: AlertTriangle,
};

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
  const [filter, setFilter] = useState<'ALL' | 'UNRESOLVED' | 'RESOLVED'>('UNRESOLVED');

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { on } = useSocket();

  useEffect(() => {
    const loadAlerts = async () => {
      setLoading(true);
      try {
        const params =
          filter === 'ALL' ? '' : filter === 'UNRESOLVED' ? '?isResolved=false' : '?isResolved=true';
        const res = await api.get(`/alerts${params}`);
        setAlerts(res.data.data);
      } catch (err) {
        console.error('Failed to load alerts:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAlerts();
  }, [filter]);

  useEffect(() => {
    const unsub = on('alert_triggered', (alert: Alert) => {
      setAlerts((prev) => [alert, ...prev]);
    });
    return unsub;
  }, [on]);

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

              alert(message);
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
              const Icon = typeIcon[alert.type] ?? AlertTriangle;
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
                          <div className="mb-1 flex items-center gap-2">
                            <Badge label={alert.severity} severity={mapSeverity(alert.severity)} />
                            <span className="text-xs text-slate-500">
                              {alert.type.replace(/_/g, ' ')}
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
        </div>
      )}
    </div>
  );
}
