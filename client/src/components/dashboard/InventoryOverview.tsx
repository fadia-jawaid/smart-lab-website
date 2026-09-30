import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tag, MapPin, FlaskConical, Boxes } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { SectionHeader } from '../ui/SectionHeader';
import { EmptyState } from '../ui/EmptyState';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/api';
import { staggerContainer, fadeUpItem } from '../../lib/motion';

type Bottle = {
  id: string;
  chemicalName: string;
  unit: string;
  currentQty: number;
  initialQty: number;
  maxCapacity: number | null;
  lowStockPct?: number;
  rfidTag?: string | null;
  location?: string | null;
};

// Same 4-tier wording as the main Inventory page (Full / Medium / Low /
// Empty) and BottleDetailPage — this widget used to say "Healthy" /
// "Critical" instead, which didn't match anywhere else in the app.
function stockStatus(b: Bottle): { label: string; severity: 'SUCCESS' | 'WARNING' | 'DANGER'; pct: number } {
  const pct = b.initialQty ? Math.max(0, Math.min(100, (b.currentQty / b.initialQty) * 100)) : 0;
  const lowStockPct = b.lowStockPct ?? 20;

  if (b.currentQty <= 0) return { label: 'Empty', severity: 'DANGER', pct };
  if (pct <= lowStockPct) return { label: 'Low', severity: 'DANGER', pct };
  if (pct <= 50) return { label: 'Medium', severity: 'WARNING', pct };
  return { label: 'Full', severity: 'SUCCESS', pct };
}

// Full inventory overview — every active bottle at a glance, front and
// centre on the dashboard, so anyone can see the whole lab's stock
// situation without navigating to the Inventory page. That page still
// owns the detailed add/edit/refill workflows; this is just the summary.
export default function InventoryOverview() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  const fetchBottles = useCallback(async () => {
    try {
      const res = await api.get('/inventory');
      setBottles(res.data.data);
    } catch (err) {
      console.error('Dashboard: failed to load inventory overview', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBottles();
    const unsubInventory = on('inventory_update', fetchBottles);
    const unsubRestock   = on('restock_logged', fetchBottles);
    return () => {
      unsubInventory();
      unsubRestock();
    };
  }, [on, fetchBottles]);

  const sorted = [...bottles].sort((a, b) => {
    const pctA = a.initialQty ? a.currentQty / a.initialQty : 1;
    const pctB = b.initialQty ? b.currentQty / b.initialQty : 1;
    return pctA - pctB; // lowest stock first, so what needs attention is up top
  });

  return (
    <Card className="p-6">
      <SectionHeader
        icon={<Boxes size={16} />}
        accent="brand"
        title="Inventory Overview"
        subtitle={`${bottles.length} chemical${bottles.length === 1 ? '' : 's'} tracked`}
        linkTo="/inventory"
        linkLabel="Manage inventory"
      />

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<FlaskConical size={20} />}
          title="No chemicals registered yet"
          hint="Add a bottle from the Inventory page to see it here."
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="enter"
          className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {sorted.map((b) => {
            const status = stockStatus(b);
            return (
              <motion.div key={b.id} variants={fadeUpItem}>
                <Link
                  to={`/inventory/${b.id}`}
                  className="block h-full rounded-xl border border-hairline bg-surface-2/20 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/40 hover:bg-white/5 hover:shadow-glow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-100">
                      <FlaskConical size={14} className="shrink-0 text-slate-500" />
                      <span className="truncate">{b.chemicalName}</span>
                    </p>
                    <Badge label={status.label} severity={status.severity} pulse={status.severity !== 'SUCCESS'} />
                  </div>

                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-700/60">
                    <div
                      className={
                        'h-full rounded-full ' +
                        (status.severity === 'DANGER'
                          ? 'bg-gradient-to-r from-danger to-red-400'
                          : status.severity === 'WARNING'
                          ? 'bg-gradient-to-r from-warning to-amber-400'
                          : 'bg-gradient-to-r from-success to-emerald-400')
                      }
                      style={{ width: `${status.pct}%` }}
                    />
                  </div>
                  <p className="mt-1 tnum text-xs text-slate-500">
                    {b.currentQty.toFixed(1)} / {b.initialQty.toFixed(1)} {b.unit} ({status.pct.toFixed(0)}%)
                    {/* maxCapacity can come back null/undefined for bottles created
                        before this field existed — calling .toFixed on that crashes
                        the whole dashboard render, not just this row. */}
                    {b.maxCapacity != null && (
                      <span className="text-slate-600"> · max {b.maxCapacity.toFixed(0)} {b.unit}</span>
                    )}
                  </p>

                  {(b.rfidTag || b.location) && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      {b.rfidTag && (
                        <span className="flex items-center gap-1">
                          <Tag size={11} /> {b.rfidTag}
                        </span>
                      )}
                      {b.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} /> {b.location}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </Card>
  );
}