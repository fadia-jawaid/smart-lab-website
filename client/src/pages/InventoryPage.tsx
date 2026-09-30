import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, FlaskConical, Plus, X, Trash2, Pencil, TriangleAlert, RefreshCw, User, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { QuantityBar } from '../components/ui/QuantityBar';
import { Spinner } from '../components/ui/Spinner';
import { fadeUpItem, staggerContainer, slideInTop } from '../lib/motion';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import type { AxiosError } from 'axios';

type Bottle = {
  id: string;
  chemicalName: string;
  rfidTag: string;
  location?: string;
  unit: string;
  currentQty: number;
  initialQty: number;
  maxCapacity: number;
  lowStockPct?: number;
  isActive?: boolean;
};

// Shape of the alert the server broadcasts on 'alert_triggered' — only the
// fields this page actually uses (student-refill-blocked, incharge
// excessive-refill, capacity-clamped, etc). Any alert tied to a specific
// bottleId gets shown right on that bottle's card, not just the Alerts page.
type BottleAlertEvent = {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'DANGER';
  message: string;
  bottleId?: string | null;
  isResolved?: boolean;
  // Only present when a refill got capped for exceeding rated capacity —
  // lets the card offer an immediate "Update Capacity" fix. Persisted on
  // the alert row itself, so these survive a page refresh — Prisma returns
  // null (not undefined) for an unset nullable column once fetched over
  // the REST API, so checks below treat null and undefined the same way.
  suggestedCapacity?: number | null;
  actualQty?: number | null;
  // Only present on a blocked student-refill anomaly or a card-less
  // (untracked) refill — the load cell's real reading at that moment, so
  // an Incharge can apply it in one click after confirming the bottle
  // really was topped up.
  suggestedQty?: number | null;
};

// Fixed load cell positions — match the tags baked into the Arduino firmware
// (BOTTLE_TAG_POS_1 / BOTTLE_TAG_POS_2). Update these if the hardware wiring changes.
const LOAD_CELL_POSITIONS = [
  { label: 'Position 1', rfidTag: '5BD32107' },
  { label: 'Position 2', rfidTag: '893BCC01' },
];

// The whole system is standardized on grams (g) — the load cell hardware
// only ever measures weight, never volume, so "unit" is a fixed constant
// rather than something each bottle can choose independently. Previously
// this was a dropdown offering 'g' or 'ml', which let different bottles
// disagree on unit and silently broke any total that summed quantities
// across bottles (e.g. a student's "Volume Dispensed" stat card).
const FIXED_UNIT = 'g';

const EMPTY_ADD_FORM = {
  chemicalName: '',
  position: '',
  unit: FIXED_UNIT,
  initialQty: '',
  maxCapacity: '',
  location: '',
  lowStockVolume: '',
};

// Only alerts that offer a one-click fix ("Confirm & Apply Refill" or
// "Update Capacity") get shown as a banner right on the Inventory card —
// that's what a Lab Incharge standing at this bottle actually needs to
// act on. Everything else tied to a bottle (Low/Critical/Empty Stock,
// Overfill, wrong-card, not-returned, etc.) is still visible — just on
// the Alerts page instead, so the inventory grid doesn't get cluttered
// with alerts that have nothing to click here.
const isActionableAlert = (alert: BottleAlertEvent): boolean =>
  alert.suggestedQty != null || alert.suggestedCapacity != null;

// Refill history was previously a tab on the Logs page — but a refill is an
// inventory management action (an Incharge topping up a bottle), not a
// usage "log" (a student taking/returning a chemical). It lives here now,
// as a second tab alongside the bottle grid, since this is the page that's
// actually about managing stock.
type RestockLog = {
  id: string;
  bottleId: string;
  labInchargeId: string | null;
  amountAdded: number;
  previousQty: number;
  newQty: number;
  createdAt: string;
  bottle: { chemicalName: string; unit: string; location?: string | null };
  labIncharge: { name: string; employeeId?: string | null } | null;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [view, setView] = useState<'bottles' | 'refills'>(tabParam === 'refills' ? 'refills' : 'bottles');

  useEffect(() => {
    if (tabParam === 'refills') setView('refills');
    else if (tabParam === 'bottles') setView('bottles');
  }, [tabParam]);

  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // ── On-card alert banners (student refill blocked / incharge over-refill) ──
  const [bottleAlerts, setBottleAlerts] = useState<Record<string, BottleAlertEvent>>({});

  // ── Add Bottle modal state ──────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');

  // ── Edit / Refill modal state ────────────────────────────────────
  const [editTarget, setEditTarget] = useState<Bottle | null>(null);
  const [editForm, setEditForm] = useState({
    currentQty: '',
    initialQty: '',
    maxCapacity: '',
    location: '',
    lowStockVolume: '',
  });
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  // ── Delete confirmation state ────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Bottle | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [bottlesRes, alertsRes] = await Promise.allSettled([
          api.get('/inventory'),
          api.get('/alerts', { params: { isResolved: false } }),
        ]);

        if (bottlesRes.status === 'fulfilled') setBottles(bottlesRes.value.data.data);
        else console.error(bottlesRes.reason);

        // Re-populate the on-card banners from whatever's still actually
        // unresolved in the database — this is what makes them survive
        // navigating to another page and back, not just live socket
        // pushes received while this exact page happened to be open.
        // Only actionable (refill/capacity-fix) alerts get a banner here —
        // see isActionableAlert.
        if (alertsRes.status === 'fulfilled') {
          const persisted: Record<string, BottleAlertEvent> = {};
          for (const a of alertsRes.value.data.data as BottleAlertEvent[]) {
            if (a.bottleId && isActionableAlert(a)) persisted[a.bottleId] = a;
          }
          setBottleAlerts((prev) => ({ ...persisted, ...prev }));
        } else {
          console.error(alertsRes.reason);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Live-update quantities the instant the ESP32 reports usage or a
  // refill — no manual page refresh needed.
  const { on } = useSocket();
  useEffect(() => {
    const off = on('inventory_update', (updatedBottle: Bottle) => {
      setBottles((prev) => {
        const exists = prev.some((b) => b.id === updatedBottle.id);
        if (!exists) return [...prev, updatedBottle];
        return prev.map((b) => (b.id === updatedBottle.id ? updatedBottle : b));
      });
    });
    return off;
  }, [on]);

  // Student refill attempt (blocked) or Lab Incharge excessive/over-capacity
  // refill — show it right on that chemical's own card, not just the Alerts
  // page, so it's impossible to miss while looking at inventory. Only
  // actionable alerts (ones with a fix to apply) get a banner here — see
  // isActionableAlert.
  useEffect(() => {
    const off = on('alert_triggered', (alert: BottleAlertEvent) => {
      if (!alert.bottleId) return; // not tied to a specific bottle — Alerts page only
      const bottleId = alert.bottleId;
      setBottleAlerts((prev) => {
        // An auto-resolved alert (e.g. low stock cleared by a refill) is
        // broadcast on this same event — clear its banner instead of
        // displaying the now-resolved alert as if it were new.
        if (alert.isResolved) {
          if (!(bottleId in prev)) return prev;
          const next = { ...prev };
          delete next[bottleId];
          return next;
        }
        if (!isActionableAlert(alert)) return prev; // informational only — Alerts page shows it
        return { ...prev, [bottleId]: alert };
      });
    });
    return off;
  }, [on]);

  const dismissBottleAlert = async (bottleId: string) => {
    const alert = bottleAlerts[bottleId];
    // Optimistically hide it locally right away
    setBottleAlerts((prev) => {
      const next = { ...prev };
      delete next[bottleId];
      return next;
    });
    if (!alert) return;
    try {
      await api.patch(`/alerts/${alert.id}/resolve`);
    } catch {
      // Resolve failing silently is fine here — worst case it reappears
      // on the Alerts page as still-unresolved, nothing is lost.
    }
  };

  const [fixingCapacity, setFixingCapacity] = useState<string | null>(null);

  const fixBottleCapacity = async (bottle: Bottle, alert: BottleAlertEvent) => {
    if (!alert.suggestedCapacity) return;
    setFixingCapacity(bottle.id);
    try {
      const res = await api.patch(`/inventory/${bottle.id}`, {
        maxCapacity: alert.suggestedCapacity,
        currentQty: alert.actualQty ?? alert.suggestedCapacity,
      });
      setBottles((prev) => prev.map((b) => (b.id === bottle.id ? res.data.data : b)));
      dismissBottleAlert(bottle.id);
      toast.success(`${bottle.chemicalName}'s physical capacity updated to ${alert.suggestedCapacity} ${bottle.unit}`);
    } catch {
      toast.error('Could not update capacity — try again.');
    } finally {
      setFixingCapacity(null);
    }
  };

  // Incharge reviewed a student's blocked refill and confirmed the bottle
  // really was topped up — apply the load cell's real reading as the new
  // current quantity, exactly as if the Incharge had performed the refill
  // themselves.
  const applyBlockedRefill = async (bottle: Bottle, alert: BottleAlertEvent) => {
    if (alert.suggestedQty == null) return;
    setFixingCapacity(bottle.id);
    try {
      const res = await api.patch(`/inventory/${bottle.id}`, {
        currentQty: alert.suggestedQty,
      });
      setBottles((prev) => prev.map((b) => (b.id === bottle.id ? res.data.data : b)));
      dismissBottleAlert(bottle.id);
      toast.success(`${bottle.chemicalName} updated to ${alert.suggestedQty.toFixed(1)} ${bottle.unit}`);
    } catch {
      toast.error('Could not apply the update — try again.');
    } finally {
      setFixingCapacity(null);
    }
  };

  // Note: the refill toast notification itself now lives in PageShell.tsx
  // so it fires site-wide, not just while viewing this page.

  const filtered = bottles.filter((b) =>
    b.chemicalName.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Add Bottle handlers ──────────────────────────────────────────
  const openAddModal = () => {
    setAddForm(EMPTY_ADD_FORM);
    setAddError('');
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (saving) return;
    setShowAddModal(false);
  };

  const updateAddField = (field: keyof typeof EMPTY_ADD_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setAddForm((f) => ({ ...f, [field]: e.target.value }));

  const handleAddBottle = async () => {
    if (!addForm.chemicalName.trim() || !addForm.position || !addForm.initialQty.trim()) {
      setAddError('Chemical name, load cell position, and initial quantity are required');
      return;
    }
    if (Number(addForm.initialQty) <= 0) {
      setAddError('Initial quantity must be greater than 0');
      return;
    }

    const positionOption = LOAD_CELL_POSITIONS.find((p) => p.label === addForm.position);
    if (!positionOption) {
      setAddError('Select a valid load cell position');
      return;
    }

    setSaving(true);
    setAddError('');
    try {
      const lowStockPct =
        addForm.lowStockVolume.trim() !== ''
          ? Math.round((Number(addForm.lowStockVolume) / Number(addForm.initialQty)) * 100)
          : undefined;

      const res = await api.post('/inventory', {
        rfidTag: positionOption.rfidTag,
        chemicalName: addForm.chemicalName.trim(),
        unit: addForm.unit,
        initialQty: Number(addForm.initialQty),
        maxCapacity: addForm.maxCapacity.trim() !== '' ? Number(addForm.maxCapacity) : undefined,
        location: addForm.location.trim() || undefined,
        lowStockPct,
      });

      setBottles((prev) => [...prev, res.data.data]);
      toast.success(`${addForm.chemicalName} added to inventory`);
      setShowAddModal(false);
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      const msg = e.response?.data?.error || 'Failed to add bottle';
      setAddError(
        e.response?.status === 409
          ? `That load cell position is already assigned to another chemical`
          : msg,
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Edit / Refill handlers ───────────────────────────────────────
  const openEditModal = (bottle: Bottle) => {
    setEditTarget(bottle);
    // Show the low-stock threshold as a volume (what the person actually
    // thinks in — "alert me at 15ml"), converted from the stored
    // percentage, instead of making them do the % <-> volume math
    // themselves.
    const lowStockVolume =
      bottle.lowStockPct !== undefined && bottle.initialQty
        ? ((bottle.lowStockPct / 100) * bottle.initialQty).toFixed(1)
        : '';
    setEditForm({
      currentQty: String(bottle.currentQty),
      initialQty: String(bottle.initialQty),
      maxCapacity: String(bottle.maxCapacity),
      location: bottle.location ?? '',
      lowStockVolume,
    });
    setEditError('');
  };

  const closeEditModal = () => {
    if (updating) return;
    setEditTarget(null);
  };

  const handleRefillFull = () => {
    if (!editTarget) return;
    setEditForm((f) => ({ ...f, currentQty: f.initialQty || String(editTarget.initialQty) }));
  };

  const handleUpdateBottle = async () => {
    if (!editTarget) return;
    if (editForm.currentQty.trim() === '' || Number(editForm.currentQty) < 0) {
      setEditError('Enter a valid current quantity');
      return;
    }
    if (editForm.initialQty.trim() === '' || Number(editForm.initialQty) <= 0) {
      setEditError('Enter a valid normal fill reference (must be greater than 0)');
      return;
    }
    if (editForm.maxCapacity.trim() === '' || Number(editForm.maxCapacity) <= 0) {
      setEditError('Enter a valid physical capacity (must be greater than 0)');
      return;
    }
    if (Number(editForm.maxCapacity) < Number(editForm.initialQty)) {
      setEditError('Physical capacity must be greater than or equal to the normal fill reference');
      return;
    }

    setUpdating(true);
    setEditError('');
    try {
      // Convert the entered volume back into the percentage the backend
      // actually stores, against the (possibly just-edited) capacity.
      const lowStockPct =
        editForm.lowStockVolume.trim() !== ''
          ? Math.round((Number(editForm.lowStockVolume) / Number(editForm.initialQty)) * 100)
          : undefined;

      const res = await api.patch(`/inventory/${editTarget.id}`, {
        currentQty: Number(editForm.currentQty),
        initialQty: Number(editForm.initialQty),
        maxCapacity: Number(editForm.maxCapacity),
        location: editForm.location.trim() || undefined,
        lowStockPct,
      });

      setBottles((prev) =>
        prev.map((b) => (b.id === editTarget.id ? { ...b, ...res.data.data } : b)),
      );
      toast.success(`${editTarget.chemicalName} updated`);
      setEditTarget(null);
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setEditError(e.response?.data?.error || 'Failed to update bottle');
    } finally {
      setUpdating(false);
    }
  };

  // ── Delete handlers ───────────────────────────────────────────────
  const openDeleteConfirm = (bottle: Bottle) => {
    setDeleteTarget(bottle);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const handleDeleteBottle = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/inventory/${deleteTarget.id}`);
      setBottles((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      toast.success(`${deleteTarget.chemicalName} removed from inventory`);
      setDeleteTarget(null);
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      toast.error(e.response?.data?.error || 'Failed to remove bottle');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex w-fit gap-1 rounded-xl border border-hairline bg-surface-2/40 p-1">
        {([
          { key: 'bottles', label: 'Bottle Management' },
          { key: 'refills', label: 'Refill / Restock' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setView(t.key);
              setSearchParams({ tab: t.key });
            }}
            className={
              'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ' +
              (view === t.key ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400 hover:text-slate-200')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'refills' ? (
        <RefillHistoryTab />
      ) : (
      <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="max-w-md flex-1">
          <Input
            icon={<Search size={16} />}
            placeholder="Search chemical…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openAddModal}>
          <Plus size={16} /> Add Bottle
        </Button>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="enter"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <AnimatePresence>
          {filtered.map((bottle) => {
            const isEmpty = bottle.currentQty <= 0;
            const percent = bottle.initialQty ? Math.max(0, (bottle.currentQty / bottle.initialQty) * 100) : 0;
            const low = bottle.lowStockPct ?? 20;
            const alertForBottle = bottleAlerts[bottle.id];
            return (
              <motion.div key={bottle.id} variants={fadeUpItem} layout exit={{ opacity: 0, scale: 0.95 }}>
                <Card interactive className="relative p-5" onClick={() => navigate(`/inventory/${bottle.id}`)}>
                  <div className="absolute right-3 top-3 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(bottle);
                      }}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-brand-500/10 hover:text-brand-300"
                      aria-label={`Edit ${bottle.chemicalName}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteConfirm(bottle);
                      }}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-danger/10 hover:text-danger"
                      aria-label={`Remove ${bottle.chemicalName}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex items-start justify-between pr-16">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                        <FlaskConical size={18} />
                      </span>
                      <div>
                        <h2 className="font-medium text-slate-100">{bottle.chemicalName}</h2>
                      </div>
                    </div>
                    <Badge
                      label={isEmpty ? 'Empty' : percent > 50 ? 'Full' : percent > low ? 'Medium' : 'Low'}
                      severity={isEmpty ? 'DANGER' : percent > 50 ? 'SUCCESS' : percent > low ? 'WARNING' : 'DANGER'}
                      pulse={isEmpty || percent <= low}
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

                  {alertForBottle && (
                    <div
                      className={
                        'mt-3 rounded-xl border px-3 py-2.5 text-xs ' +
                        (alertForBottle.severity === 'DANGER'
                          ? 'border-danger/30 bg-danger/10 text-danger'
                          : alertForBottle.severity === 'WARNING'
                          ? 'border-warning/30 bg-warning/10 text-warning'
                          : 'border-brand-500/30 bg-brand-500/10 text-brand-300')
                      }
                    >
                      <div className="flex items-start gap-2">
                        <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                        <p className="flex-1 leading-snug">{alertForBottle.message}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissBottleAlert(bottle.id);
                          }}
                          className="shrink-0 opacity-60 hover:opacity-100"
                          aria-label="Dismiss"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      {alertForBottle.suggestedCapacity && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fixBottleCapacity(bottle, alertForBottle);
                          }}
                          disabled={fixingCapacity === bottle.id}
                          className="mt-2 w-full rounded-lg border border-current/40 bg-current/10 py-1.5 text-center text-xs font-medium hover:bg-current/20 disabled:opacity-50"
                        >
                          {fixingCapacity === bottle.id
                            ? 'Updating…'
                            : `Update Capacity to ${alertForBottle.suggestedCapacity} ${bottle.unit}`}
                        </button>
                      )}

                      {alertForBottle.suggestedQty != null && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            applyBlockedRefill(bottle, alertForBottle);
                          }}
                          disabled={fixingCapacity === bottle.id}
                          className="mt-2 w-full rounded-lg border border-current/40 bg-current/10 py-1.5 text-center text-xs font-medium hover:bg-current/20 disabled:opacity-50"
                        >
                          {fixingCapacity === bottle.id
                            ? 'Applying…'
                            : `Confirm & Apply ${
                                alertForBottle.type === 'UNTRACKED_REFILL' ? 'Refill' : 'Correction'
                              } (${alertForBottle.suggestedQty.toFixed(1)} ${bottle.unit})`}
                        </button>
                      )}
                    </div>
                  )}

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
      </>
      )}

      {/* ── Add Bottle Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={closeAddModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Card className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-accent-400">
                    <FlaskConical size={18} />
                    <h2 className="font-display text-lg font-semibold text-slate-100">
                      Add New Bottle
                    </h2>
                  </div>
                  <button
                    onClick={closeAddModal}
                    className="text-slate-500 hover:text-slate-300"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                {addError && (
                  <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {addError}
                  </div>
                )}

                <div className="space-y-4">
                  <Input
                    label="Chemical Name"
                    value={addForm.chemicalName}
                    onChange={updateAddField('chemicalName')}
                    placeholder="e.g. Ethanol"
                    autoFocus
                  />

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      Load Cell Position
                    </label>
                    <select
                      value={addForm.position}
                      onChange={(e) => setAddForm((f) => ({ ...f, position: e.target.value }))}
                      className="w-full rounded-xl border border-hairline bg-surface-2/40 px-4 py-2.5 text-sm text-slate-100 focus:border-brand-500/60 focus:outline-none"
                    >
                      <option value="">— Select a position —</option>
                      {LOAD_CELL_POSITIONS.map((p) => (
                        <option key={p.label} value={p.label}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Normal Fill Amount"
                      type="number"
                      value={addForm.initialQty}
                      onChange={updateAddField('initialQty')}
                      placeholder="e.g. 50"
                    />
                    <Input
                      label="Physical Capacity (optional)"
                      type="number"
                      value={addForm.maxCapacity}
                      onChange={updateAddField('maxCapacity')}
                      placeholder="Default: 92"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      Unit
                    </label>
                    {/* Fixed, not a choice — every bottle in the system is
                        tracked in grams because the load cell hardware only
                        measures weight. A per-bottle unit picker here used
                        to let 'g' and 'ml' bottles coexist, which silently
                        broke totals that summed quantities across bottles. */}
                    <div className="flex items-center gap-2 rounded-xl border border-hairline bg-surface-2/25 px-4 py-2.5 text-sm text-slate-400">
                      <span className="font-mono font-semibold text-slate-300">g</span>
                      <span className="text-xs text-slate-500">
                        Grams — fixed system-wide (load cell measures weight only)
                      </span>
                    </div>
                  </div>
                  <Input
                    label="Location (optional)"
                    value={addForm.location}
                    onChange={updateAddField('location')}
                    placeholder="e.g. Shelf C-1"
                  />
                  <Input
                    label={`Low Stock Alert At (${addForm.unit || 'g'}) — optional`}
                    type="number"
                    value={addForm.lowStockVolume}
                    onChange={updateAddField('lowStockVolume')}
                    placeholder={addForm.initialQty ? `Default: ${(Number(addForm.initialQty) * 0.2).toFixed(1)}` : 'e.g. 15'}
                  />
                  <p className="-mt-2 text-xs text-slate-500">
                    {addForm.lowStockVolume && addForm.initialQty
                      ? `= ${((Number(addForm.lowStockVolume) / Number(addForm.initialQty)) * 100).toFixed(0)}% of the normal fill amount`
                      : 'Leave blank to use the lab-wide default from Settings'}
                  </p>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button variant="secondary" onClick={closeAddModal}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddBottle} loading={saving} className="flex-1">
                    Save Bottle
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit / Refill Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {editTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={closeEditModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Card className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-accent-400">
                    <Pencil size={18} />
                    <h2 className="font-display text-lg font-semibold text-slate-100">
                      Edit {editTarget.chemicalName}
                    </h2>
                  </div>
                  <button
                    onClick={closeEditModal}
                    className="text-slate-500 hover:text-slate-300"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                {editError && (
                  <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {editError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-300">
                        Current Quantity ({editTarget.unit})
                      </label>
                      <button
                        onClick={handleRefillFull}
                        className="text-xs font-medium text-accent-400 hover:text-accent-300"
                      >
                        Refill to full ({editForm.initialQty || editTarget.initialQty} {editTarget.unit})
                      </button>
                    </div>
                    <Input
                      type="number"
                      value={editForm.currentQty}
                      onChange={(e) => setEditForm((f) => ({ ...f, currentQty: e.target.value }))}
                      placeholder="e.g. 500"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Set this manually after physically refilling the bottle.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      Normal Fill Amount ({editTarget.unit})
                    </label>
                    <Input
                      type="number"
                      value={editForm.initialQty}
                      onChange={(e) => setEditForm((f) => ({ ...f, initialQty: e.target.value }))}
                      placeholder="e.g. 50"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      The routine day-to-day fill level (e.g. 50g) — used for the stock % and Low/Critical/Empty
                      Stock alerts. Refilling above this is fine but raises an Overfill alert for review.
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">
                      Physical Capacity ({editTarget.unit})
                    </label>
                    <Input
                      type="number"
                      value={editForm.maxCapacity}
                      onChange={(e) => setEditForm((f) => ({ ...f, maxCapacity: e.target.value }))}
                      placeholder="e.g. 92"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      The bottle's true hardware/physical limit (e.g. 92g) — correct this any time an Overload
                      alert's suggested reading looks right but this number was stale.
                    </p>
                  </div>
                  <Input
                    label="Location"
                    value={editForm.location}
                    onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Shelf C-1"
                  />
                  <div>
                    <Input
                      label={`Low Stock Alert At (${editTarget.unit})`}
                      type="number"
                      value={editForm.lowStockVolume}
                      onChange={(e) => setEditForm((f) => ({ ...f, lowStockVolume: e.target.value }))}
                      placeholder="e.g. 15"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      {editForm.lowStockVolume && editForm.initialQty
                        ? `= ${((Number(editForm.lowStockVolume) / Number(editForm.initialQty)) * 100).toFixed(0)}% of the normal fill amount — alert fires at or below this level`
                        : 'e.g. 15 g for a 50 g normal fill amount you want to top up at the halfway mark'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button variant="secondary" onClick={closeEditModal}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateBottle} loading={updating} className="flex-1">
                    Save Changes
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={closeDeleteConfirm}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm"
            >
              <Card className="p-6">
                <div className="mb-3 flex items-center gap-2 text-danger">
                  <Trash2 size={18} />
                  <h2 className="font-display text-lg font-semibold text-slate-100">
                    Remove Bottle
                  </h2>
                </div>
                <p className="mb-6 text-sm text-slate-400">
                  Remove <span className="font-medium text-slate-200">{deleteTarget.chemicalName}</span>{' '}
                  from inventory? This frees up its load cell position for a new chemical.
                  It won't appear in the dashboard or scan sessions anymore.
                </p>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={closeDeleteConfirm} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteBottle}
                    loading={deleting}
                    className="flex-1 !bg-danger hover:!bg-danger/90"
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── Refill History tab ─────────────────────────
// Moved here from the Logs page — refilling a bottle is something a Lab
// Incharge does to manage stock, not a chemical-usage session, so it
// belongs with the rest of inventory management rather than mixed in
// with student take/return logs.
function RefillHistoryTab() {
  const [logs, setLogs] = useState<RestockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/restock-logs');
        setLogs(res.data.data);
      } catch (err) {
        console.error('Failed to load refill history:', err);
        toast.error('Could not load refill history');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const off = on('restock_logged', (log: RestockLog) => {
      setLogs((prev) => [log, ...prev]);
    });
    return off;
  }, [on]);

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : logs.length === 0 ? (
        <Card className="p-16 text-center text-slate-500">
          <RefreshCw size={40} className="mx-auto mb-3 text-slate-600" />
          <p>No refills recorded yet</p>
        </Card>
      ) : (
        <AnimatePresence initial={false}>
          {logs.map((log) => {
            const increased = log.amountAdded >= 0;
            return (
              <motion.div key={log.id} layout variants={slideInTop} initial="initial" animate="enter" exit="exit">
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                        <FlaskConical size={18} />
                      </span>
                      <div>
                        <p className="font-medium text-slate-100">
                          {log.bottle.chemicalName}
                          {log.bottle.location ? (
                            <span className="ml-2 text-xs font-normal text-slate-500">{log.bottle.location}</span>
                          ) : null}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                          <User size={13} />
                          <span>{log.labIncharge?.name ?? 'Unknown incharge'}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(log.createdAt)}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={increased ? 'text-sm font-semibold text-success' : 'text-sm font-semibold text-warning'}>
                        {increased ? '+' : ''}
                        {log.amountAdded.toFixed(1)} {log.bottle.unit}
                      </p>
                      <div className="mt-1 flex items-center justify-end gap-1.5 text-xs text-slate-500">
                        <span>{log.previousQty.toFixed(1)}</span>
                        <ArrowRight size={12} />
                        <span className="text-slate-300">{log.newQty.toFixed(1)}</span>
                        <span>{log.bottle.unit}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}