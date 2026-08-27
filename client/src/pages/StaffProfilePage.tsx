import { useState, useEffect } from 'react';
import { KeyRound, CheckCircle2, User, Mail, Building2, Phone, BadgeCheck, Calendar } from 'lucide-react';
import { Card }    from '../components/ui/Card';
import { Badge }   from '../components/ui/Badge';
import { Button }  from '../components/ui/Button';
import { Input }   from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import axios       from 'axios';
import api         from '../services/api';

type StaffProfile = {
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

export default function StaffProfilePage() {
  useAuth();
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Change password
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [currentPwd,  setCurrentPwd]  = useState('');
  const [newPwd,      setNewPwd]      = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [pwdLoading,  setPwdLoading]  = useState(false);
  const [pwdError,    setPwdError]    = useState('');
  const [pwdSuccess,  setPwdSuccess]  = useState(false);

  useEffect(() => {
    api
      .get('/my/staff-profile')
      .then((res) => setProfile(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
      await api.patch('/my/staff-change-password', {
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

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );

  if (!profile) return null;

  const isAdmin      = profile.role === 'ADMIN';
  const isIncharge   = profile.role === 'LAB_INCHARGE';

  const rows = [
    { label: 'Full Name',   value: profile.name,       icon: <User size={14} /> },
    { label: 'Email',       value: profile.email,      icon: <Mail size={14} /> },
    ...(isIncharge && profile.employeeId
      ? [{ label: 'Employee ID', value: profile.employeeId, icon: <BadgeCheck size={14} /> }]
      : []),
    ...(isIncharge && profile.department
      ? [{ label: 'Department', value: profile.department, icon: <Building2 size={14} /> }]
      : []),
    ...(isIncharge && profile.phone
      ? [{ label: 'Phone', value: profile.phone, icon: <Phone size={14} /> }]
      : []),
    {
      label: 'Last Login',
      value: profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'Never',
      icon: <Calendar size={14} />,
    },
    {
      label: 'Member Since',
      value: new Date(profile.createdAt).toLocaleDateString(),
      icon: <Calendar size={14} />,
    },
    ...(isIncharge && profile._count
      ? [{ label: 'Scans Processed', value: profile._count.transactions ?? 0, icon: <BadgeCheck size={14} /> }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-lg space-y-4">

      {/* Avatar card */}
      <Card className="relative overflow-hidden p-8 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-brand-500/10 blur-2xl" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-gradient text-3xl font-bold text-white shadow-glow">
            {profile.name?.[0]?.toUpperCase()}
          </div>
          <h2 className="font-display text-xl font-bold text-slate-50">{profile.name}</h2>
          <p className="mt-1 text-sm text-slate-400">{profile.email}</p>
          <div className="mt-3 flex justify-center">
            <Badge
              label={isAdmin ? 'Administrator' : 'Lab Incharge'}
              severity={isAdmin ? 'DANGER' : 'SUCCESS'}
            />
          </div>
        </div>
      </Card>

      {/* Details */}
      <Card>
        <div className="divide-y divide-hairline">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-600">{row.icon}</span>
                <span className="text-sm">{row.label}</span>
              </div>
              <span className="text-sm font-medium text-slate-100">{row.value}</span>
            </div>
          ))}

          {/* Status row */}
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-slate-400">Account Status</span>
            <Badge
              label={profile.isActive ? 'Active' : 'Inactive'}
              severity={profile.isActive ? 'SUCCESS' : 'INFO'}
            />
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
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

            <div className="flex gap-3 justify-end pt-2">
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