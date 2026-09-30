import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Scale,
  MapPin,
  Tag,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  Flame,
  Biohazard,
  Shield,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { RadialGauge } from '../ui/RadialGauge';
import { Spinner } from '../ui/Spinner';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/api';
import { cn } from '../../lib/cn';
import { staggerContainer, fadeUpItem } from '../../lib/motion';

export interface Bottle {
  id: string;
  chemicalName: string;
  unit: string;
  currentQty: number;
  initialQty: number;
  maxCapacity: number | null;
  lowStockPct?: number;
  rfidTag?: string | null;
  location?: string | null;
  supplier?: string | null;
  description?: string | null;
  isActive?: boolean;
}

interface RestockSummary {
  bottleId: string;
  lastAmountAdded: number;
  lastRefilledAt: string;
  inchargeName: string;
}

// Scientific laboratory metadata
function getChemicalMetadata(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('hydrochloric') || lower.includes('hcl')) {
    return {
      formula: 'HCl',
      code: 'ACID-HCL-01',
      station: 'Lab A · Station 2 (GPIO 32/33)',
      color: '#3B82F6',
      hazard: 'Corrosive (GHS05)',
      hazardClass: 'Skin Corr. 1B (H314)',
      casNumber: '7647-01-0',
      molarMass: '36.46 g/mol',
      density: '1.18 g/cm³ (37% aqueous)',
      storage: 'Acid-Resistant Vented Cabinet',
      hazardIcon: Biohazard,
    };
  }
  if (lower.includes('ethanol') || lower.includes('etoh')) {
    return {
      formula: 'C₂H₅OH',
      code: 'SOLV-ETOH-01',
      station: 'Lab A · Station 1 (GPIO 25/26)',
      color: '#06B6D4',
      hazard: 'Flammable (GHS02)',
      hazardClass: 'Flam. Liq. 2 (H225)',
      casNumber: '64-17-5',
      molarMass: '46.07 g/mol',
      density: '0.789 g/cm³ (99.9% Absolute)',
      storage: 'Flammables Safety Locker',
      hazardIcon: Flame,
    };
  }
  if (lower.includes('methanol')) {
    return {
      formula: 'CH₃OH',
      code: 'SOLV-MEOH-01',
      station: 'Lab A · Station 3 (GPIO 12/14)',
      color: '#8B5CF6',
      hazard: 'Toxic / Flammable',
      hazardClass: 'Acute Tox. 3 (H301)',
      casNumber: '67-56-1',
      molarMass: '32.04 g/mol',
      density: '0.792 g/cm³',
      storage: 'Dedicated Solvent Storage',
      hazardIcon: Biohazard,
    };
  }
  return {
    formula: '',
    code: 'LAB-REAGENT',
    station: 'Lab A · Analytical Station',
    color: '#10B981',
    hazard: 'General Chemical',
    hazardClass: 'Lab Grade Reagent',
    casNumber: 'N/A',
    molarMass: 'Variable',
    density: '1.00 g/cm³',
    storage: 'Standard Reagent Shelf',
    hazardIcon: FlaskConical,
  };
}

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';

/**
 * Renders a chemical formula at one fixed size for every chemical — the
 * digits are set as real subscripts, so "C₂H₅OH" and "HCl" look alike
 * instead of the long one having to shrink.
 */
function FormulaText({ formula }: { formula: string }) {
  return (
    <>
      {formula.split(/([₀-₉]+)/).map((part, i) =>
        /[₀-₉]/.test(part) ? (
          <sub key={i} className="text-[0.7em] font-semibold leading-none">
            {[...part].map((ch) => SUBSCRIPT_DIGITS.indexOf(ch)).join('')}
          </sub>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default function ChemicalMonitoring() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [restockMap, setRestockMap] = useState<Record<string, RestockSummary>>({});
  const [expandedSpecs, setExpandedSpecs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  const toggleSpecs = (id: string) => {
    setExpandedSpecs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchData = useCallback(async () => {
    try {
      const [invRes, refillsRes] = await Promise.allSettled([
        api.get('/inventory'),
        api.get('/restock-logs'),
      ]);

      if (invRes.status === 'fulfilled') {
        setBottles(invRes.value.data.data);
      }

      if (refillsRes.status === 'fulfilled') {
        const refillLogs = refillsRes.value.data.data;
        const summary: Record<string, RestockSummary> = {};
        for (const log of refillLogs) {
          if (!summary[log.bottleId]) {
            summary[log.bottleId] = {
              bottleId: log.bottleId,
              lastAmountAdded: log.amountAdded,
              lastRefilledAt: log.createdAt,
              inchargeName: log.labIncharge?.name || 'Lab Staff',
            };
          }
        }
        setRestockMap(summary);
      }
    } catch (err) {
      console.error('ChemicalMonitoring: failed to load inventory', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const unsubInv = on('inventory_update', fetchData);
    const unsubRestock = on('restock_logged', fetchData);
    const unsubEvent = on('new_event', fetchData);

    return () => {
      unsubInv();
      unsubRestock();
      unsubEvent();
    };
  }, [on, fetchData]);

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Spinner size="md" className="mx-auto" />
        <p className="mt-2 text-xs text-slate-400">Loading live chemical load cell telemetry…</p>
      </Card>
    );
  }

  const sortedBottles = [...bottles].sort((a, b) => {
    const aName = a.chemicalName.toLowerCase();
    const bName = b.chemicalName.toLowerCase();
    const aPriority = aName.includes('hydrochloric') ? 1 : aName.includes('ethanol') ? 2 : 3;
    const bPriority = bName.includes('hydrochloric') ? 1 : bName.includes('ethanol') ? 2 : 3;
    return aPriority - bPriority;
  });

  if (sortedBottles.length === 0) {
    return (
      <Card className="p-8 text-center text-slate-500">
        <FlaskConical size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm font-medium text-slate-400">No chemical containers detected</p>
        <p className="text-xs text-slate-500 mt-1">Register chemical bottles in the Inventory section.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold text-white">
              Real-Time Chemical Monitoring
            </h2>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ESP32 Scale Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Continuous 24-bit HX711 mass measurements for hydrochloric acid, ethanol, and solvent reservoirs.
          </p>
        </div>

        <Link
          to="/inventory"
          className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
        >
          <span>All Containers ({bottles.length})</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Grid of Chemical Monitoring Cards */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="enter"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        {sortedBottles.map((bottle) => {
          const meta = getChemicalMetadata(bottle.chemicalName);
          const safeCurrent = Math.max(0, bottle.currentQty);
          const initial = bottle.initialQty || 20;
          const maxCap = bottle.maxCapacity || initial;
          const lowStockPct = bottle.lowStockPct ?? 20;
          const lowThresholdVol = (initial * lowStockPct) / 100;
          const percent = initial > 0 ? Math.min(100, Math.max(0, (safeCurrent / initial) * 100)) : 0;
          const isExpanded = !!expandedSpecs[bottle.id];

          const isCritical = safeCurrent <= 0;
          const isLowStock = !isCritical && safeCurrent <= lowThresholdVol;
          const isMedium = !isCritical && !isLowStock && percent <= 50;

          const statusBadge = isCritical
            ? { label: 'Empty Stock', severity: 'DANGER' as const, icon: AlertOctagon }
            : isLowStock
              ? { label: 'Low Stock Alert', severity: 'WARNING' as const, icon: AlertTriangle }
              : isMedium
                ? { label: 'Medium Stock', severity: 'WARNING' as const, icon: Info }
                : { label: 'Optimal Stock', severity: 'SUCCESS' as const, icon: CheckCircle2 };

          const lastRestock = restockMap[bottle.id];

          return (
            <motion.div
              key={bottle.id}
              variants={fadeUpItem}
              className={cn(
                'group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-surface/80 p-6 backdrop-blur-md transition-all shadow-card',
                isCritical
                  ? 'border-danger/40 shadow-glow-danger/20'
                  : isLowStock
                    ? 'border-warning/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : 'border-hairline hover:border-brand-500/40',
              )}
            >
              {/* Subtle ambient light */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
                style={{ backgroundColor: meta.color }}
              />

              {/* Chemical Card Header */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-2xl border border-white/10 font-mono text-sm font-bold leading-none tracking-tight text-white shadow-inner"
                      style={{ backgroundColor: `${meta.color}25`, borderColor: `${meta.color}50` }}
                      title={meta.formula || bottle.chemicalName}
                    >
                      {meta.formula ? <FormulaText formula={meta.formula} /> : <meta.hazardIcon size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base font-bold text-white group-hover:text-brand-300 transition-colors">
                          {bottle.chemicalName}
                        </h3>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-300 border border-slate-700">
                          CAS: {meta.casNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {meta.station}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge
                      label={statusBadge.label}
                      severity={statusBadge.severity}
                      pulse={isCritical || isLowStock}
                    />
                  </div>
                </div>

                {/* Main Gauge and Weight Readout */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-12 items-center gap-5 rounded-xl border border-hairline bg-surface-2/40 p-5">
                  {/* Circular Radial Gauge */}
                  <div className="sm:col-span-4 flex justify-center">
                    <RadialGauge
                      percent={percent}
                      size={100}
                      stroke={8}
                      label="Remaining"
                      lowStockPct={lowStockPct}
                    />
                  </div>

                  {/* Detailed Quantity Stats */}
                  <div className="sm:col-span-8 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="font-mono text-3xl font-extrabold text-white tracking-tight">
                          {safeCurrent.toFixed(1)}
                        </span>
                        <span className="ml-1 text-sm font-semibold text-slate-400">
                          {bottle.unit}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400">Reference:</span>
                        <p className="text-xs font-semibold text-slate-200">
                          {initial.toFixed(1)} {bottle.unit}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700',
                          isCritical
                            ? 'bg-gradient-to-r from-danger to-red-500 shadow-glow-danger'
                            : isLowStock
                              ? 'bg-gradient-to-r from-warning to-amber-400'
                              : isMedium
                                ? 'bg-gradient-to-r from-amber-400 to-cyan-400'
                                : 'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Threshold Subtitles */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Scale size={12} className="text-slate-500" />
                        <span>Limit: ≤ {lowThresholdVol.toFixed(1)} {bottle.unit} ({lowStockPct}%)</span>
                      </span>
                      <span className="text-slate-500">
                        Max: {maxCap.toFixed(0)} {bottle.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Collapsible Scientific & GHS SDS Specifications */}
                <div className="mt-5">
                  <button
                    onClick={() => toggleSpecs(bottle.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-hairline/60 bg-surface-2/30 px-3 py-2 text-[11px] font-medium text-slate-400 hover:bg-surface-2/60 hover:text-slate-200 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Shield size={12} className="text-brand-400" />
                      Physical & Safety Specifications (SDS / GHS)
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-hairline bg-slate-900/60 p-3 text-[11px] font-mono">
                          <div>
                            <span className="text-slate-500 block text-[9px] font-sans uppercase">Density</span>
                            <span className="text-slate-200">{meta.density}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] font-sans uppercase">Molar Mass</span>
                            <span className="text-slate-200">{meta.molarMass}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] font-sans uppercase">GHS Hazard</span>
                            <span className="text-amber-400 font-semibold">{meta.hazard}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] font-sans uppercase">Safe Storage</span>
                            <span className="text-slate-300">{meta.storage}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Status and Refill Audit Telemetry */}
              <div className="mt-5 pt-4 border-t border-hairline/70">
                <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px]">
                    {bottle.rfidTag && (
                      <span className="flex items-center gap-1 font-mono">
                        <Tag size={11} className="text-slate-500" />
                        {bottle.rfidTag}
                      </span>
                    )}
                    {bottle.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-500" />
                        {bottle.location}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    <RefreshCw size={12} className={cn(isLowStock ? 'text-warning animate-spin' : 'text-slate-500')} />
                    {lastRestock ? (
                      <span className="text-slate-300">
                        {lastRestock.lastAmountAdded >= 0 ? 'Refilled +' : 'Adjusted −'}
                        {Math.abs(lastRestock.lastAmountAdded).toFixed(1)} {bottle.unit} ({new Date(lastRestock.lastRefilledAt).toLocaleDateString()})
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        {isLowStock ? 'Refill Needed' : 'Inventory Balanced'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick link */}
                <div className="mt-4 flex items-center justify-end">
                  <Link
                    to={`/inventory/${bottle.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    <span>Manage Container</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}