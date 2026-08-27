import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FlaskConical } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { QuantityBar } from '../components/ui/QuantityBar';
import { Spinner } from '../components/ui/Spinner';
import { fadeUpItem, staggerContainer } from '../lib/motion';
import api from '../services/api';

type Bottle = {
  id: string;
  chemicalName: string;
  rfidTag: string;
  location?: string;
  unit: string;
  currentQty: number;
  initialQty: number;
  lowStockPct?: number;
  isActive?: boolean;
};

export default function InventoryPage() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/inventory');
        setBottles(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = bottles.filter((b) =>
    b.chemicalName.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="max-w-md">
        <Input
          icon={<Search size={16} />}
          placeholder="Search chemical…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="enter"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <AnimatePresence>
          {filtered.map((bottle) => {
            const percent = (bottle.currentQty / bottle.initialQty) * 100;
            const low = bottle.lowStockPct ?? 20;
            return (
              <motion.div key={bottle.id} variants={fadeUpItem} layout exit={{ opacity: 0, scale: 0.95 }}>
                <Card interactive className="p-5" onClick={() => navigate(`/inventory/${bottle.id}`)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                        <FlaskConical size={18} />
                      </span>
                      <div>
                        <h2 className="font-medium text-slate-100">{bottle.chemicalName}</h2>
                        <p className="font-mono text-[11px] text-slate-500">{bottle.rfidTag}</p>
                      </div>
                    </div>
                    <Badge
                      label={percent > 50 ? 'Full' : percent > low ? 'Medium' : 'Low'}
                      severity={percent > 50 ? 'SUCCESS' : percent > low ? 'WARNING' : 'DANGER'}
                      pulse={percent <= low}
                    />
                  </div>

                  <div className="mt-4">
                    <QuantityBar
                      current={bottle.currentQty}
                      initial={bottle.initialQty}
                      unit={bottle.unit}
                      lowStockPct={low}
                    />
                  </div>

                  {bottle.location && (
                    <p className="mt-3 text-xs text-slate-500">📍 {bottle.location}</p>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <Card className="p-16 text-center text-slate-500">No chemicals found</Card>
      )}
    </div>
  );
}
