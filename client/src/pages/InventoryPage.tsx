// import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion';
// import { Search, FlaskConical } from 'lucide-react';
// import { Card } from '../components/ui/Card';
// import { Badge } from '../components/ui/Badge';
// import { Input } from '../components/ui/Input';
// import { QuantityBar } from '../components/ui/QuantityBar';
// import { Spinner } from '../components/ui/Spinner';
// import { fadeUpItem, staggerContainer } from '../lib/motion';
// import api from '../services/api';

// type Bottle = {
//   id: string;
//   chemicalName: string;
//   rfidTag: string;
//   location?: string;
//   unit: string;
//   currentQty: number;
//   initialQty: number;
//   lowStockPct?: number;
//   isActive?: boolean;
// };

// export default function InventoryPage() {
//   const [bottles, setBottles] = useState<Bottle[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState('');
//   const navigate = useNavigate();

//   useEffect(() => {
//     const load = async () => {
//       try {
//         const res = await api.get('/inventory');
//         setBottles(res.data.data);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     load();
//   }, []);

//   const filtered = bottles.filter((b) =>
//     b.chemicalName.toLowerCase().includes(search.toLowerCase()),
//   );

//   if (loading) {
//     return (
//       <div className="flex justify-center py-20">
//         <Spinner size="lg" />
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-5">
//       <div className="max-w-md">
//         <Input
//           icon={<Search size={16} />}
//           placeholder="Search chemical…"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//         />
//       </div>

//       <motion.div
//         variants={staggerContainer}
//         initial="initial"
//         animate="enter"
//         className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
//       >
//         <AnimatePresence>
//           {filtered.map((bottle) => {
//             const percent = (bottle.currentQty / bottle.initialQty) * 100;
//             const low = bottle.lowStockPct ?? 20;
//             return (
//               <motion.div key={bottle.id} variants={fadeUpItem} layout exit={{ opacity: 0, scale: 0.95 }}>
//                 <Card interactive className="p-5" onClick={() => navigate(`/inventory/${bottle.id}`)}>
//                   <div className="flex items-start justify-between">
//                     <div className="flex items-center gap-2">
//                       <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
//                         <FlaskConical size={18} />
//                       </span>
//                       <div>
//                         <h2 className="font-medium text-slate-100">{bottle.chemicalName}</h2>
//                         <p className="font-mono text-[11px] text-slate-500">{bottle.rfidTag}</p>
//                       </div>
//                     </div>
//                     <Badge
//                       label={percent > 50 ? 'Full' : percent > low ? 'Medium' : 'Low'}
//                       severity={percent > 50 ? 'SUCCESS' : percent > low ? 'WARNING' : 'DANGER'}
//                       pulse={percent <= low}
//                     />
//                   </div>

//                   <div className="mt-4">
//                     <QuantityBar
//                       current={bottle.currentQty}
//                       initial={bottle.initialQty}
//                       unit={bottle.unit}
//                       lowStockPct={low}
//                     />
//                   </div>

//                   {bottle.location && (
//                     <p className="mt-3 text-xs text-slate-500">📍 {bottle.location}</p>
//                   )}
//                 </Card>
//               </motion.div>
//             );
//           })}
//         </AnimatePresence>
//       </motion.div>

//       {filtered.length === 0 && (
//         <Card className="p-16 text-center text-slate-500">No chemicals found</Card>
//       )}
//     </div>
//   );
// }










import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, FlaskConical, Plus, X, Trash2, Pencil } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { QuantityBar } from '../components/ui/QuantityBar';
import { Spinner } from '../components/ui/Spinner';
import { fadeUpItem, staggerContainer } from '../lib/motion';
import api from '../services/api';
import type { AxiosError } from 'axios';

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

// Fixed load cell positions — match the tags baked into the Arduino firmware
// (BOTTLE_TAG_POS_1 / BOTTLE_TAG_POS_2). Update these if the hardware wiring changes.
const LOAD_CELL_POSITIONS = [
  { label: 'Position 1', rfidTag: '5BD32107' },
  { label: 'Position 2', rfidTag: '893BCC01' },
];

const UNIT_OPTIONS = ['ml', 'g'];

const EMPTY_ADD_FORM = {
  chemicalName: '',
  position: '',
  unit: 'ml',
  initialQty: '',
  location: '',
  lowStockPct: '',
};

export default function InventoryPage() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // ── Add Bottle modal state ──────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');

  // ── Edit / Refill modal state ────────────────────────────────────
  const [editTarget, setEditTarget] = useState<Bottle | null>(null);
  const [editForm, setEditForm] = useState({
    currentQty: '',
    location: '',
    lowStockPct: '',
  });
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  // ── Delete confirmation state ────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Bottle | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      const res = await api.post('/inventory', {
        rfidTag: positionOption.rfidTag,
        chemicalName: addForm.chemicalName.trim(),
        unit: addForm.unit,
        initialQty: Number(addForm.initialQty),
        location: addForm.location.trim() || undefined,
        lowStockPct: addForm.lowStockPct ? Number(addForm.lowStockPct) : undefined,
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
    setEditForm({
      currentQty: String(bottle.currentQty),
      location: bottle.location ?? '',
      lowStockPct: bottle.lowStockPct !== undefined ? String(bottle.lowStockPct) : '',
    });
    setEditError('');
  };

  const closeEditModal = () => {
    if (updating) return;
    setEditTarget(null);
  };

  const handleRefillFull = () => {
    if (!editTarget) return;
    setEditForm((f) => ({ ...f, currentQty: String(editTarget.initialQty) }));
  };

  const handleUpdateBottle = async () => {
    if (!editTarget) return;
    if (editForm.currentQty.trim() === '' || Number(editForm.currentQty) < 0) {
      setEditError('Enter a valid current quantity');
      return;
    }

    setUpdating(true);
    setEditError('');
    try {
      const res = await api.patch(`/inventory/${editTarget.id}`, {
        currentQty: Number(editForm.currentQty),
        location: editForm.location.trim() || undefined,
        lowStockPct: editForm.lowStockPct ? Number(editForm.lowStockPct) : undefined,
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
            const percent = (bottle.currentQty / bottle.initialQty) * 100;
            const low = bottle.lowStockPct ?? 20;
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
                      label="Initial Quantity"
                      type="number"
                      value={addForm.initialQty}
                      onChange={updateAddField('initialQty')}
                      placeholder="e.g. 500"
                    />
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-300">
                        Unit
                      </label>
                      <select
                        value={addForm.unit}
                        onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))}
                        className="w-full rounded-xl border border-hairline bg-surface-2/40 px-4 py-2.5 text-sm text-slate-100 focus:border-brand-500/60 focus:outline-none"
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Input
                    label="Location (optional)"
                    value={addForm.location}
                    onChange={updateAddField('location')}
                    placeholder="e.g. Shelf C-1"
                  />
                  <Input
                    label="Low Stock % (optional)"
                    type="number"
                    value={addForm.lowStockPct}
                    onChange={updateAddField('lowStockPct')}
                    placeholder="Default: 20"
                  />
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
                        Refill to full ({editTarget.initialQty} {editTarget.unit})
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
                  <Input
                    label="Location"
                    value={editForm.location}
                    onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Shelf C-1"
                  />
                  <Input
                    label="Low Stock %"
                    type="number"
                    value={editForm.lowStockPct}
                    onChange={(e) => setEditForm((f) => ({ ...f, lowStockPct: e.target.value }))}
                    placeholder="Default: 20"
                  />
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
