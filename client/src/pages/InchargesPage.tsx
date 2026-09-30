import { useState, useEffect } from 'react';
import { UserPlus, Eye, EyeOff, Copy, Check, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card }    from '../components/ui/Card';
import { Button }  from '../components/ui/Button';
import { Badge }   from '../components/ui/Badge';
import { Modal }   from '../components/ui/Modal';
import { Input }   from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import api         from '../services/api';
import type { LabIncharge } from '../types/index';

export default function InchargesPage() {
  const [incharges,         setIncharges]         = useState<LabIncharge[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [showAdd,           setShowAdd]           = useState(false);
  const [rfidModal,         setRfidModal]         = useState<LabIncharge | null>(null);
  const [rfidInput,         setRfidInput]         = useState('');
  const [newCreds,          setNewCreds]          = useState<{ name: string; password: string } | null>(null);
  const [copied,            setCopied]            = useState(false);
  const [deactivateTarget,  setDeactivateTarget]  = useState<LabIncharge | null>(null);
  const [deactivating,      setDeactivating]      = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', employeeId: '', department: '', phone: '',
  });

  // Password reveal state
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [revealLoading,     setRevealLoading]     = useState<Record<string, boolean>>({});
  const [visiblePasswords,  setVisiblePasswords]  = useState<Record<string, boolean>>({});

  const fetchIncharges = async () => {
    try {
      const res = await api.get('/incharges');
      setIncharges(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadIncharges = async () => {
      await fetchIncharges();
    };

    void loadIncharges();
  }, []);

  const handleAdd = async () => {
    try {
      const res = await api.post('/incharges', form);
      setShowAdd(false);
      setForm({ name: '', email: '', employeeId: '', department: '', phone: '' });
      if (res.data.data?.defaultPassword) {
        setNewCreds({ name: form.name, password: res.data.data.defaultPassword });
      }
      void fetchIncharges();
    } catch {
      toast.error('Failed to add lab incharge');
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await api.delete(`/incharges/${deactivateTarget.id}`);
      toast.success(`${deactivateTarget.name} deactivated`);
      setDeactivateTarget(null);
      void fetchIncharges();
    } catch {
      toast.error('Failed to deactivate lab incharge');
    } finally {
      setDeactivating(false);
    }
  };

  const handleAssignRfid = async () => {
    if (!rfidModal) return;
    try {
      await api.patch(`/incharges/${rfidModal.id}/rfid`, { rfidTag: rfidInput });
      setRfidModal(null);
      setRfidInput('');
      toast.success('RFID card assigned');
      void fetchIncharges();
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to assign RFID');
    }
  };

  const handleCopyPassword = () => {
    if (!newCreds) return;
    navigator.clipboard.writeText(newCreds.password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRevealPassword = async (incharge: LabIncharge) => {
    if (revealedPasswords[incharge.id]) {
      setVisiblePasswords(prev => ({ ...prev, [incharge.id]: !prev[incharge.id] }));
      return;
    }

    setRevealLoading(prev => ({ ...prev, [incharge.id]: true }));
    try {
      const res = await api.post(`/incharges/${incharge.id}/verify-password`, {});
      const pwd = res.data.data.password;
      setRevealedPasswords(prev => ({ ...prev, [incharge.id]: pwd }));
      setVisiblePasswords(prev => ({ ...prev, [incharge.id]: true }));
    } catch {
      toast.error('Failed to retrieve password');
    } finally {
      setRevealLoading(prev => ({ ...prev, [incharge.id]: false }));
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)}>
          <UserPlus size={16} /> Add Lab Incharge
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface-2/40">
              <tr>
                {['Name', 'Email', 'Employee ID', 'Department', 'RFID Card', 'Password', 'Transactions', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {incharges.map((i) => (
                <tr key={i.id} className="transition-colors hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-slate-100">{i.name}</td>
                  <td className="px-4 py-3 text-slate-400">{i.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{i.employeeId ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{i.department ?? '—'}</td>

                  {/* RFID */}
                  <td className="px-4 py-3">
                    {i.rfidTag
                      ? <Badge label={i.rfidTag} severity="SUCCESS" />
                      : <Badge label="Not assigned" severity="WARNING" />}
                    <button
                      onClick={() => { setRfidModal(i); setRfidInput(i.rfidTag ?? ''); }}
                      className="ml-2 rounded-lg border border-hairline px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {i.rfidTag ? 'Change' : 'Assign'}
                    </button>
                  </td>

                  {/* Password column */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-300 min-w-[80px]">
                        {visiblePasswords[i.id] && revealedPasswords[i.id]
                          ? revealedPasswords[i.id] === '••••••••'
                            ? <span className="text-slate-500 italic text-xs">Changed</span>
                            : revealedPasswords[i.id]
                          : '••••••••'}
                      </span>
                      <button
                        onClick={() => void handleRevealPassword(i)}
                        disabled={revealLoading[i.id]}
                        className="flex items-center gap-1 rounded-lg border border-hairline px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                      >
                        {revealLoading[i.id] ? (
                          <Spinner size="sm" />
                        ) : visiblePasswords[i.id] ? (
                          <><EyeOff size={12} /> Hide</>
                        ) : (
                          <><Eye size={12} /> Show</>
                        )}
                      </button>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center tnum text-slate-200">{i._count?.transactions ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge label={i.isActive ? 'Active' : 'Inactive'} severity={i.isActive ? 'SUCCESS' : 'INFO'} />
                  </td>
                  <td className="px-4 py-3">
                    {i.isActive && (
                      <Button size="sm" variant="danger" onClick={() => setDeactivateTarget(i)}>
                        Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {incharges.length === 0 && (
            <p className="py-12 text-center text-slate-500">No lab incharges yet</p>
          )}
        </div>
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Lab Incharge">
        <div className="space-y-4">
          <Input label="Full Name"   value={form.name}       onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input label="Email"       value={form.email}      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}       type="email" />
          <Input label="Employee ID" value={form.employeeId} onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))} />
          <Input label="Department"  value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
          <Input label="Phone"       value={form.phone}      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <p className="text-xs text-slate-500">Default password: incharge123</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Incharge</Button>
          </div>
        </div>
      </Modal>

      {/* Assign RFID Modal */}
      <Modal isOpen={!!rfidModal} onClose={() => setRfidModal(null)} title={`Assign RFID — ${rfidModal?.name}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Scan or type the RFID card UID that belongs to this lab incharge. The UID is printed on the back of the card.
          </p>
          <Input
            label="RFID Tag (Card UID)"
            value={rfidInput}
            onChange={(e) => setRfidInput(e.target.value.toUpperCase())}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setRfidModal(null)}>Cancel</Button>
            <Button onClick={handleAssignRfid}>Assign Card</Button>
          </div>
        </div>
      </Modal>

      {/* New Lab Incharge Credentials Modal */}
      <Modal isOpen={!!newCreds} onClose={() => setNewCreds(null)} title="Lab Incharge Created" size="sm">
        {newCreds && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Share this default password with <span className="font-medium text-slate-200">{newCreds.name}</span>{' '}
              securely. They can change it after logging in.
            </p>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface-2/60 px-4 py-3">
              <span className="font-mono text-sm text-slate-100">{newCreds.password}</span>
              <button
                onClick={handleCopyPassword}
                className="flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
              >
                {copied ? <><Check size={13} className="text-success" /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setNewCreds(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal isOpen={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} title="Deactivate Lab Incharge" size="sm">
        {deactivateTarget && (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
                <UserX size={18} />
              </span>
              <p className="text-sm text-slate-300">
                Deactivate <span className="font-medium text-slate-100">{deactivateTarget.name}</span>? They will
                no longer be able to log in or process scans. Their past transaction history is kept.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeactivateTarget(null)}>Cancel</Button>
              <Button onClick={handleDeactivate} loading={deactivating} className="!bg-danger hover:!bg-danger/90">
                Deactivate
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}