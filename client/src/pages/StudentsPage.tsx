import { useState, useEffect } from 'react';
import { Search, UserPlus, Eye, EyeOff, Copy, Check, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card }    from '../components/ui/Card';
import { Button }  from '../components/ui/Button';
import { Badge }   from '../components/ui/Badge';
import { Modal }   from '../components/ui/Modal';
import { Input }   from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import StudentDetailModal from '../components/students/StudentDetailModal';
import api         from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Student }    from '../types';
import type { AxiosError } from 'axios';

export default function StudentsPage() {
  const [students,  setStudents]  = useState<Student[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [showAdd,   setShowAdd]   = useState(false);
  const [rfidModal, setRfidModal] = useState<Student | null>(null);
  const [rfidInput, setRfidInput] = useState('');
  const [newCreds,  setNewCreds]  = useState<{ name: string; password: string } | null>(null);
  const [copied,    setCopied]    = useState(false);
  const [detailId,  setDetailId]  = useState<string | null>(null);
  // Deactivate — same pattern as InchargesPage.tsx. The backend endpoint
  // (DELETE /api/students/:id) already existed; there was just no button
  // anywhere in this page to actually call it.
  const [deactivateTarget, setDeactivateTarget] = useState<Student | null>(null);
  const [deactivating,     setDeactivating]     = useState(false);
  const [form, setForm] = useState({
    name: '', rollNo: '', email: '',
    batch: '', department: '', phone: '',
  });

  // Password reveal state: { [studentId]: string }
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [revealLoading,     setRevealLoading]     = useState<Record<string, boolean>>({});
  const [visiblePasswords,  setVisiblePasswords]  = useState<Record<string, boolean>>({});

  const { isAdmin } = useAuth();

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadStudents = async () => {
      await fetchStudents();
    };

    void loadStudents();
  }, []);

  const handleAdd = async () => {
    try {
      const res = await api.post('/students', form);
      setShowAdd(false);
      setForm({ name: '', rollNo: '', email: '', batch: '', department: '', phone: '' });
      // Show the default password in a proper modal (copyable, doesn't
      // block the page like a native alert()) instead of a jarring
      // browser popup.
      if (res.data.data?.defaultPassword) {
        setNewCreds({ name: form.name, password: res.data.data.defaultPassword });
      }
      void fetchStudents();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      toast.error(error.response?.data?.error || 'Failed to add student');
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await api.delete(`/students/${deactivateTarget.id}`);
      toast.success(`${deactivateTarget.name} deactivated`);
      setDeactivateTarget(null);
      void fetchStudents();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
      toast.error(error.response?.data?.error || 'Failed to deactivate student');
    } finally {
      setDeactivating(false);
    }
  };

  const handleAssignRfid = async () => {
    if (!rfidModal) return;
    try {
      await api.patch(`/students/${rfidModal.id}/rfid`, { rfidTag: rfidInput });
      setRfidModal(null);
      setRfidInput('');
      toast.success('RFID card assigned');
      void fetchStudents();
    } catch (err) {
      const error = err as AxiosError<{ error?: string }>;
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

  const handleRevealPassword = async (student: Student) => {
    // If already revealed, just toggle visibility
    if (revealedPasswords[student.id]) {
      setVisiblePasswords(prev => ({ ...prev, [student.id]: !prev[student.id] }));
      return;
    }

    setRevealLoading(prev => ({ ...prev, [student.id]: true }));
    try {
      const res = await api.post(`/students/${student.id}/verify-password`, {});
      const pwd = res.data.data.password;
      setRevealedPasswords(prev => ({ ...prev, [student.id]: pwd }));
      setVisiblePasswords(prev => ({ ...prev, [student.id]: true }));
    } catch {
      toast.error('Failed to retrieve password');
    } finally {
      setRevealLoading(prev => ({ ...prev, [student.id]: false }));
    }
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="w-72">
          <Input
            icon={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or roll no…"
          />
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <UserPlus size={16} /> Add Student
        </Button>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface-2/40">
              <tr>
                {['Student', 'Roll No', 'Dept / Batch', 'RFID Card', 'Password', 'Uses', 'Last Scan', 'Status', 'Actions'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-white/5">
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
                        {s.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-100">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.email ?? '—'}</p>
                      </div>
                    </div>
                  </td>

                  {/* Roll No */}
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{s.rollNo}</td>

                  {/* Dept / Batch */}
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {s.department}<br />{s.batch}
                  </td>

                  {/* RFID */}
                  <td className="px-4 py-3">
                    {s.rfidTag
                      ? <Badge label={s.rfidTag} severity="SUCCESS" />
                      : <Badge label="Not Assigned" severity="INFO" />}
                  </td>

                  {/* Password column */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-300 min-w-[80px]">
                        {visiblePasswords[s.id] && revealedPasswords[s.id]
                          ? revealedPasswords[s.id] === '••••••••'
                            ? <span className="text-slate-500 italic text-xs">Changed</span>
                            : revealedPasswords[s.id]
                          : '••••••••'}
                      </span>
                      <button
                        onClick={() => void handleRevealPassword(s)}
                        disabled={revealLoading[s.id]}
                        className="flex items-center gap-1 rounded-lg border border-hairline px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                      >
                        {revealLoading[s.id] ? (
                          <Spinner size="sm" />
                        ) : visiblePasswords[s.id] ? (
                          <><EyeOff size={12} /> Hide</>
                        ) : (
                          <><Eye size={12} /> Show</>
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Uses */}
                  <td className="px-4 py-3 text-center tnum text-slate-200">
                    {s._count?.transactions ?? 0}
                  </td>

                  {/* Last Scan */}
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {s.lastRfidScan ? new Date(s.lastRfidScan).toLocaleDateString() : 'Never'}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge
                      label={s.isActive ? 'Active' : 'Inactive'}
                      severity={s.isActive ? 'SUCCESS' : 'INFO'}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => setDetailId(s.id)}>
                          View
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { setRfidModal(s); setRfidInput(s.rfidTag ?? ''); }}
                      >
                        RFID
                      </Button>
                      {isAdmin && s.isActive && (
                        <Button size="sm" variant="danger" onClick={() => setDeactivateTarget(s)}>
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-12 text-center text-slate-500">No students found</p>
          )}
        </div>
      </Card>

      {/* Add Student Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Student">
        <div className="space-y-4">
          <Input label="Full Name"   value={form.name}   onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input label="Roll Number" value={form.rollNo} onChange={(e) => setForm((p) => ({ ...p, rollNo: e.target.value }))} placeholder="e.g. 21-CS-45" />
          <Input label="Email"       value={form.email}  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} type="email" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Batch"      value={form.batch}      onChange={(e) => setForm((p) => ({ ...p, batch: e.target.value }))}      placeholder="2021-2025" />
            <Input label="Department" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} placeholder="Chemistry" />
          </div>
          <Input label="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <p className="text-xs text-slate-500">
            Default password = roll number. It will be shown after creation.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Student</Button>
          </div>
        </div>
      </Modal>

      {/* Assign RFID Modal */}
      <Modal isOpen={!!rfidModal} onClose={() => setRfidModal(null)} title={`Assign RFID — ${rfidModal?.name}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Scan or type the RFID card UID that belongs to this student. The UID is printed on the back of the card.
          </p>
          <Input
            label="RFID Tag (Card UID)"
            value={rfidInput}
            onChange={(e) => setRfidInput(e.target.value.toUpperCase())}
            placeholder="e.g. A3F2B1C4"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRfidModal(null)}>Cancel</Button>
            <Button onClick={handleAssignRfid}>Assign Card</Button>
          </div>
        </div>
      </Modal>

      {/* New Student Credentials Modal */}
      <Modal isOpen={!!newCreds} onClose={() => setNewCreds(null)} title="Student Created" size="sm">
        {newCreds && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Share this default password with <span className="font-medium text-slate-200">{newCreds.name}</span>.
              They can change it after logging in.
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

      {/* Student Detail Modal — replaces the old separate /students/:id route */}
      <StudentDetailModal studentId={detailId} onClose={() => setDetailId(null)} />

      {/* Deactivate Confirmation Modal */}
      <Modal isOpen={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} title="Deactivate Student" size="sm">
        {deactivateTarget && (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
                <UserX size={18} />
              </span>
              <p className="text-sm text-slate-300">
                Deactivate <span className="font-medium text-slate-100">{deactivateTarget.name}</span> ({deactivateTarget.rollNo})?
                They will no longer be able to log in or scan chemicals. Their past transaction history is kept, and
                their RFID card is freed up to assign to someone else.
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