import { useState, useEffect } from 'react';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { Card }    from '../components/ui/Card';
import { Badge }   from '../components/ui/Badge';
import { Button }  from '../components/ui/Button';
import { Input }   from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import axios       from 'axios';
import api         from '../services/api';

type Profile = {
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

export default function MyProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Change password form state
  const [showPwdForm,   setShowPwdForm]   = useState(false);
  const [currentPwd,    setCurrentPwd]    = useState('');
  const [newPwd,        setNewPwd]        = useState('');
  const [confirmPwd,    setConfirmPwd]    = useState('');
  const [pwdLoading,    setPwdLoading]    = useState(false);
  const [pwdError,      setPwdError]      = useState('');
  const [pwdSuccess,    setPwdSuccess]    = useState(false);

  useEffect(() => {
    api
      .get('/my/profile')
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
      await api.patch('/my/change-password', {
        currentPassword: currentPwd,
        newPassword:     newPwd,
      });
      setPwdSuccess(true);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => setShowPwdForm(false), 2000);
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

  const rows = [
    { label: 'Full Name',   value: profile.name },
    { label: 'Roll Number', value: profile.rollNo },
    { label: 'Email',       value: profile.email ?? '—' },
    { label: 'Batch',       value: profile.batch },
    { label: 'Department',  value: profile.department },
    { label: 'Phone',       value: profile.phone ?? '—' },
    { label: 'RFID Card',   value: profile.rfidTag ?? null, isRfid: true },
    { label: 'Total Uses',  value: profile._count?.transactions ?? 0 },
    {
      label: 'Last Visit',
      value: profile.lastRfidScan
        ? new Date(profile.lastRfidScan).toLocaleString()
        : 'Never',
    },
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
          <p className="mt-1 text-sm text-slate-400">
            {profile.rollNo} · {profile.department}
          </p>
        </div>
      </Card>

      {/* Details */}
      <Card>
        <div className="divide-y divide-hairline">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between px-6 py-3">
              <span className="text-sm text-slate-400">{row.label}</span>
              {'isRfid' in row && row.isRfid ? (
                row.value
                  ? <Badge label={row.value as string} severity="SUCCESS" />
                  : <Badge label="Not Assigned" severity="INFO" />
              ) : (
                <span className="text-sm font-medium text-slate-100">{row.value}</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Change Password Section */}
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
            Click "Change" to update your password. You will need your current password.
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
              <Button
                onClick={handleChangePassword}
                loading={pwdLoading}
              >
                Update Password
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}