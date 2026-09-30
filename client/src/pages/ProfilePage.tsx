import { useState, useEffect } from 'react';
import {
  KeyRound, CheckCircle2, User, Mail, Building2, Phone, BadgeCheck, Calendar, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card }    from '../components/ui/Card';
import { Badge }   from '../components/ui/Badge';
import { Button }  from '../components/ui/Button';
import { Input }   from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import axios       from 'axios';
import api         from '../services/api';

type StudentProfile = {
  kind:          'STUDENT';
  name:          string;
  rollNo:        string;
  email?:        string;
  batch:         string;
  department:    string;
  phone?:        string;
  rfidTag?:      string | null;
  lastRfidScan?: string | null;
  _count?:       { transactions?: number };
};

type StaffProfile = {
  kind:        'ADMIN' | 'LAB_INCHARGE';
  id:          string;
  name:        string;
  email:       string;
  role:        string;
  employeeId?: string;
  department?: string;
  phone?:      string;
  isActive:    boolean;
  lastLogin?:  string | null;
  createdAt:   string;
  _count?:     { transactions?: number };
};

type Profile = StudentProfile | StaffProfile;

type Row = { label: string; value: React.ReactNode; icon?: React.ReactNode; isRfid?: boolean };

// One Profile page for all three roles instead of two near-identical
// pages (MyProfilePage for students, StaffProfilePage for admin/incharge).
// The only real difference between them was which endpoint to call and
// which fields apply to that role — the avatar card, details list, and
// change-password flow were otherwise the same UI, just duplicated.
export default function ProfilePage() {
  const { isStudent } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [showPwdForm, setShowPwdForm] = useState(false);
  const [currentPwd,  setCurrentPwd]  = useState('');
  const [newPwd,      setNewPwd]      = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [pwdLoading,  setPwdLoading]  = useState(false);
  const [pwdError,    setPwdError]    = useState('');
  const [pwdSuccess,  setPwdSuccess]  = useState(false);

  useEffect(() => {
    const endpoint = isStudent ? '/my/profile' : '/my/staff-profile';
    api
      .get(endpoint)
      .then((res) => setProfile({ ...res.data.data, kind: isStudent ? 'STUDENT' : res.data.data.role }))
      .catch(() => {
        setLoadError(true);
        if (!isStudent) toast.error('Could not load your profile');
      })
      .finally(() => setLoading(false));
  }, [isStudent]);

  const handleChangePassword = async () => {
    setPwdError('');
    setPwdSuccess(false);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('All fields are required');
      return;
    }
    if (newPwd.length < 6) {
      setPwdError('New password must be at least 6 characters');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('New passwords do not match');
      return;
    }
    if (currentPwd === newPwd) {
      setPwdError('New password must be different from current password');
      return;
    }

    setPwdLoading(true);
    try {
      // Students and staff hash/verify passwords in separate tables, so
      // this is the one place the merge still needs a role branch.
      await api.patch(isStudent ? '/my/change-password' : '/my/staff-change-password', {
        currentPassword: currentPwd,
        newPassword:     newPwd,
      });
      setPwdSuccess(true);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => {
        setShowPwdForm(false);
        setPwdSuccess(false);
      }, 2000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setPwdError(err.response?.data?.error || 'Failed to change password');
      } else {
        setPwdError('Failed to change password');
      }
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-center">
        <AlertTriangle size={24} className="text-danger" />
        <p className="text-sm text-slate-400">
          {loadError ? 'Could not load your profile. Please refresh the page.' : 'Profile not found.'}
        </p>
      </div>
    );
  }

  const isAdmin = !isStudent && (profile as StaffProfile).role === 'ADMIN';
  const isIncharge = !isStudent && (profile as StaffProfile).role === 'LAB_INCHARGE';

  const rows: Row[] = isStudent
    ? (() => {
        const p = profile as StudentProfile;
        return [
          { label: 'Full Name',   value: p.name },
          { label: 'Roll Number', value: p.rollNo },
          { label: 'Email',       value: p.email ?? '—' },
          { label: 'Batch',       value: p.batch },
          { label: 'Department',  value: p.department },
          { label: 'Phone',       value: p.phone ?? '—' },
          { label: 'RFID Card',   value: p.rfidTag ?? null, isRfid: true },
          { label: 'Total Uses',  value: p._count?.transactions ?? 0 },
          {
            label: 'Last Visit',
            value: p.lastRfidScan ? new Date(p.lastRfidScan).toLocaleString() : 'Never',
          },
        ];
      })()
    : (() => {
        const p = profile as StaffProfile;
        return [
          { label: 'Full Name', value: p.name,  icon: <User size={14} /> },
          { label: 'Email',     value: p.email, icon: <Mail size={14} /> },
          ...(isIncharge && p.employeeId
            ? [{ label: 'Employee ID', value: p.employeeId, icon: <BadgeCheck size={14} /> }]
            : []),
          ...(isIncharge && p.department
            ? [{ label: 'Department', value: p.department, icon: <Building2 size={14} /> }]
            : []),
          ...(isIncharge && p.phone
            ? [{ label: 'Phone', value: p.phone, icon: <Phone size={14} /> }]
            : []),
          {
            label: 'Last Login',
            value: p.lastLogin ? new Date(p.lastLogin).toLocaleString() : 'Never',
            icon: <Calendar size={14} />,
          },
          {
            label: 'Member Since',
            value: new Date(p.createdAt).toLocaleDateString(),
            icon: <Calendar size={14} />,
          },
          ...(isIncharge && p._count
            ? [{ label: 'Scans Processed', value: p._count.transactions ?? 0, icon: <BadgeCheck size={14} /> }]
            : []),
        ];
      })();

  const initials = profile.name?.[0]?.toUpperCase();
  const subtitle = isStudent
    ? `${(profile as StudentProfile).rollNo} · ${(profile as StudentProfile).department}`
    : (profile as StaffProfile).email;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Avatar card */}
      <Card className="relative overflow-hidden p-8 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-brand-500/10 blur-2xl" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-gradient text-3xl font-bold text-white shadow-glow">
            {initials}
          </div>
          <h2 className="font-display text-xl font-bold text-slate-50">{profile.name}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          {!isStudent && (
            <div className="mt-3 flex justify-center">
              <Badge
                label={isAdmin ? 'Administrator' : 'Lab Incharge'}
                severity={isAdmin ? 'DANGER' : 'SUCCESS'}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Details */}
      <Card>
        <div className="divide-y divide-hairline">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-2 text-slate-400">
                {row.icon && <span className="text-slate-600">{row.icon}</span>}
                <span className="text-sm">{row.label}</span>
              </div>
              {row.isRfid ? (
                row.value
                  ? <Badge label={row.value as string} severity="SUCCESS" />
                  : <Badge label="Not Assigned" severity="INFO" />
              ) : (
                <span className="text-sm font-medium text-slate-100">{row.value}</span>
              )}
            </div>
          ))}

          {!isStudent && (
            <div className="flex items-center justify-between px-6 py-3">
              <span className="text-sm text-slate-400">Account Status</span>
              <Badge
                label={(profile as StaffProfile).isActive ? 'Active' : 'Inactive'}
                severity={(profile as StaffProfile).isActive ? 'SUCCESS' : 'INFO'}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Change Password */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-accent-400" />
            <h3 className="font-semibold text-slate-100">Change Password</h3>
          </div>
          {!showPwdForm && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => { setShowPwdForm(true); setPwdError(''); setPwdSuccess(false); }}
            >
              Change
            </Button>
          )}
        </div>

        {!showPwdForm && (
          <p className="text-sm text-slate-500">
            Click "Change" to update your password. You will need your current password for security.
          </p>
        )}

        {showPwdForm && (
          <div className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="Enter your current password"
            />
            <Input
              label="New Password"
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="At least 6 characters"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Repeat new password"
            />

            {pwdError && (
              <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
                {pwdError}
              </p>
            )}

            {pwdSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-sm text-success">
                <CheckCircle2 size={16} />
                Password changed successfully!
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPwdForm(false);
                  setCurrentPwd('');
                  setNewPwd('');
                  setConfirmPwd('');
                  setPwdError('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleChangePassword} loading={pwdLoading}>
                Update Password
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
