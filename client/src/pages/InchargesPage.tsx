import { useState, useEffect } from 'react';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
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
        alert(`Lab Incharge created!\nDefault password: ${res.data.data.defaultPassword}\nPlease share this securely.`);
      }
      void fetchIncharges();
    } catch {
      alert('Failed to add incharge');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this lab incharge?')) return;
    await api.delete(`/incharges/${id}`);
    void fetchIncharges();
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
      alert('Failed to retrieve password');
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
                {['Name', 'Email', 'Employee ID', 'Department', 'Password', 'Transactions', 'Status', 'Actions'].map((h) => (
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
                      <Button size="sm" variant="danger" onClick={() => handleDeactivate(i.id)}>
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
    </div>
  );
}