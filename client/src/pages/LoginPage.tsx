import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ScanLine, GraduationCap, FlaskConical,
  Mail, IdCard, Lock, X, HelpCircle, ArrowLeft, CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api          from '../services/api';
import { Button }   from '../components/ui/Button';
import { Input }    from '../components/ui/Input';
import { cn }       from '../lib/cn';
import type { UserRole } from '../types';

const portals: { role: UserRole; label: string; icon: LucideIcon; desc: string }[] = [
  { role: 'ADMIN',        label: 'Admin',       icon: ShieldCheck,   desc: 'Full system access' },
  { role: 'LAB_INCHARGE', label: 'Lab Incharge',icon: ScanLine,      desc: 'Scan & manage' },
  { role: 'STUDENT',      label: 'Student',     icon: GraduationCap, desc: 'View your history' },
];

type ForgotStep = 'request' | 'verify' | 'reset' | 'done';
type ForgotRole = 'STUDENT' | 'LAB_INCHARGE' | 'ADMIN';

export default function LoginPage() {
  // Login state
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [email,        setEmail]        = useState('');
  const [rollNo,       setRollNo]       = useState('');
  const [password,     setPassword]     = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  // Forgot password state
  const [showForgot,    setShowForgot]    = useState(false);
  const [forgotRole,    setForgotRole]    = useState<ForgotRole>('STUDENT');
  const [forgotStep,    setForgotStep]    = useState<ForgotStep>('request');
  const [forgotEmail,   setForgotEmail]   = useState('');
  const [forgotRollNo,  setForgotRollNo]  = useState('');
  const [forgotCode,    setForgotCode]    = useState('');
  const [forgotPwd,     setForgotPwd]     = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [forgotMsg,     setForgotMsg]     = useState('');
  const [forgotMasked,  setForgotMasked]  = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError,   setForgotError]   = useState('');

  const { login } = useAuth();
  const navigate  = useNavigate();

  // ── Login ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email:  selectedRole !== 'STUDENT' ? email  : undefined,
        rollNo: selectedRole === 'STUDENT' ? rollNo : undefined,
        password,
        role:   selectedRole,
      });
      login(res.data.data.token, res.data.data.user);
      if (selectedRole === 'STUDENT')           navigate('/my-history');
      else if (selectedRole === 'LAB_INCHARGE') navigate('/scan');
      else                                       navigate('/');
    } catch (err: unknown) {
      let message = 'Login failed. Check your credentials.';
      if (typeof err === 'object' && err !== null) {
        const e = err as { response?: { data?: { error?: string } } };
        message = e.response?.data?.error || message;
      }
      setError(message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot: Step 1 — send code ───────────────────────────────────────────────
  const handleSendCode = async () => {
    setForgotError('');
    if (forgotRole === 'STUDENT' && !forgotRollNo && !forgotEmail) {
      setForgotError('Enter your roll number or email'); return;
    }
    if ((forgotRole === 'LAB_INCHARGE' || forgotRole === 'ADMIN') && !forgotEmail) {
      setForgotError('Enter your email address'); return;
    }

    setForgotLoading(true);
    try {
      const res = await api.post('/password-reset/send-code', {
        userType: forgotRole,
        rollNo:   forgotRole === 'STUDENT' ? forgotRollNo || undefined : undefined,
        email:    forgotEmail || undefined,
      });
      setForgotMasked(res.data.data.maskedEmail || '');
      setForgotMsg(res.data.data.message);
      setForgotStep('verify');
    } catch (err: unknown) {
      let message = 'Failed to send code. Please try again.';
      if (typeof err === 'object' && err !== null) {
        const e = err as { response?: { data?: { error?: string } } };
        message = e.response?.data?.error || message;
      }
      setForgotError(message);
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Forgot: Step 2 — verify code ─────────────────────────────────────────────
  const handleVerifyCode = async () => {
    setForgotError('');
    if (forgotCode.length !== 6) {
      setForgotError('Enter the 6-digit code from your email'); return;
    }
    setForgotLoading(true);
    try {
      await api.post('/password-reset/verify-code', {
        code:     forgotCode.trim(),
        userType: forgotRole,
      });
      setForgotStep('reset');
    } catch (err: unknown) {
      let message = 'Invalid or expired code';
      if (typeof err === 'object' && err !== null) {
        const e = err as { response?: { data?: { error?: string } } };
        message = e.response?.data?.error || message;
      }
      setForgotError(message);
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Forgot: Step 3 — set new password ────────────────────────────────────────
  const handleResetPassword = async () => {
    setForgotError('');
    if (!forgotPwd || !forgotConfirm) {
      setForgotError('Both password fields are required'); return;
    }
    if (forgotPwd.length < 6) {
      setForgotError('Password must be at least 6 characters'); return;
    }
    if (forgotPwd !== forgotConfirm) {
      setForgotError('Passwords do not match'); return;
    }

    setForgotLoading(true);
    try {
      await api.post('/password-reset/reset-password', {
        code:        forgotCode.trim(),
        userType:    forgotRole,
        newPassword: forgotPwd,
      });
      setForgotStep('done');
    } catch (err: unknown) {
      let message = 'Failed to reset password';
      if (typeof err === 'object' && err !== null) {
        const error = err as { response?: { data?: { error?: string } } };
        message = error.response?.data?.error ?? message;
      }
      setForgotError(message);
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotStep('request');
    setForgotEmail('');
    setForgotRollNo('');
    setForgotCode('');
    setForgotPwd('');
    setForgotConfirm('');
    setForgotError('');
    setForgotMsg('');
    setForgotMasked('');
  };

  const stepLabels = ['Enter Info', 'Verify Code', 'New Password'];
  const stepIndex  = forgotStep === 'request' ? 0 : forgotStep === 'verify' ? 1 : 2;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas bg-grid-canvas p-4">

      {/* Glow blobs */}
      <motion.div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="glass relative z-10 w-full max-w-md rounded-3xl p-8 shadow-card"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow">
            <FlaskConical size={26} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-50">SmartLab</h1>
          <p className="mt-1 text-sm text-slate-400">Chemical Management System</p>
        </div>

        {/* Portal selection */}
        <p className="mb-3 text-sm font-medium text-slate-300">Select your portal</p>
        <div className="mb-6 grid grid-cols-3 gap-2">
          {portals.map((p) => {
            const Icon   = p.icon;
            const active = selectedRole === p.role;
            return (
              <button
                key={p.role}
                type="button"
                onClick={() => { setSelectedRole(p.role); setError(''); }}
                className={cn(
                  'relative flex flex-col items-center rounded-2xl border p-3 text-center transition-all',
                  active
                    ? 'border-brand-500/60 bg-brand-500/10 shadow-glow'
                    : 'border-hairline bg-surface-2/40 hover:border-slate-600',
                )}
              >
                <Icon size={22} className={active ? 'text-accent-400' : 'text-slate-400'} />
                <span className="mt-1.5 text-xs font-medium text-slate-200">{p.label}</span>
                <span className="mt-0.5 text-[10px] text-slate-500">{p.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRole === 'STUDENT' ? 'roll' : 'email'}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
            >
              {selectedRole === 'STUDENT' ? (
                <Input
                  label="Roll Number"
                  icon={<IdCard size={16} />}
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="e.g. 21-CS-45"
                  required
                />
              ) : (
                <Input
                  label="Email Address"
                  type="email"
                  icon={<Mail size={16} />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@smartlab.com"
                  required
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div>
            <Input
              label="Password"
              type="password"
              icon={<Lock size={16} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
            {/* Forgot password link — now shown for ALL roles including Admin */}
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  setForgotRole(selectedRole as ForgotRole);
                  setShowForgot(true);
                }}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-accent-400 transition-colors"
              >
                <HelpCircle size={12} />
                Forgot password?
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
              transition={{ duration: 0.4 }}
              className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {error}
            </motion.p>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Sign In
          </Button>
        </form>

        {/* Demo credentials */}
        <div className="mt-5 rounded-xl border border-hairline bg-surface-2/40 p-3 text-xs text-slate-400">
          <p className="mb-1 font-medium text-slate-300">Demo accounts</p>
          <p>Admin: admin@smartlab.com / admin123</p>
          <p>Incharge: incharge@smartlab.com / incharge123</p>
          <p>Student: 21-CS-45 / student123</p>
        </div>
      </motion.div>

      {/* ── Forgot Password Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForgot && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeForgot}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="glass w-full max-w-sm rounded-2xl p-6 shadow-card">

                {/* Modal header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {forgotStep !== 'request' && forgotStep !== 'done' && (
                      <button
                        onClick={() => {
                          setForgotStep(
                            forgotStep === 'verify' ? 'request' : 'verify'
                          );
                          setForgotError('');
                        }}
                        className="rounded-lg p-1 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <ArrowLeft size={16} />
                      </button>
                    )}
                    <div>
                      <h2 className="font-display text-lg font-semibold text-slate-100">
                        {forgotStep === 'done' ? 'Password Reset!' : 'Forgot Password'}
                      </h2>
                      {forgotStep !== 'done' && (
                        <p className="text-[11px] text-slate-500">
                          Step {stepIndex + 1} of 3 — {stepLabels[stepIndex]}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={closeForgot}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Step indicator */}
                {forgotStep !== 'done' && (
                  <div className="mb-5 flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-all',
                          i <= stepIndex ? 'bg-brand-500' : 'bg-surface-2/60',
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* ── Step 1: Request ────────────────────────────────────────── */}
                {forgotStep === 'request' && (
                  <div className="space-y-4">
                    {/* Role tabs — now 3 roles */}
                    <div className="flex gap-2">
                      {(['STUDENT', 'LAB_INCHARGE', 'ADMIN'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => { setForgotRole(r); setForgotError(''); }}
                          className={cn(
                            'flex-1 rounded-xl border py-2 text-[11px] font-medium transition-all',
                            forgotRole === r
                              ? 'border-brand-500/60 bg-brand-500/10 text-accent-400'
                              : 'border-hairline text-slate-500 hover:text-slate-300',
                          )}
                        >
                          {r === 'STUDENT'
                            ? '👨‍🎓 Student'
                            : r === 'LAB_INCHARGE'
                              ? '👨‍🔬 Incharge'
                              : '🛡️ Admin'}
                        </button>
                      ))}
                    </div>

                    {forgotRole === 'STUDENT' ? (
                      <>
                        <Input
                          label="Roll Number"
                          icon={<IdCard size={16} />}
                          value={forgotRollNo}
                          onChange={(e) => setForgotRollNo(e.target.value)}
                          placeholder="e.g. 21-CS-45"
                        />
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-hairline" />
                          <span className="text-xs text-slate-600">or</span>
                          <div className="h-px flex-1 bg-hairline" />
                        </div>
                        <Input
                          label="Email Address"
                          type="email"
                          icon={<Mail size={16} />}
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="your@email.com"
                        />
                      </>
                    ) : (
                      <Input
                        label="Email Address"
                        type="email"
                        icon={<Mail size={16} />}
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                      />
                    )}

                    <p className="rounded-xl border border-hairline bg-surface-2/40 p-3 text-xs text-slate-500">
                      A 6-digit reset code will be sent to your registered email address.
                    </p>

                    {forgotError && (
                      <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                        {forgotError}
                      </p>
                    )}

                    <div className="flex gap-3">
                      <Button variant="secondary" className="flex-1" onClick={closeForgot}>
                        Cancel
                      </Button>
                      <Button className="flex-1" loading={forgotLoading} onClick={handleSendCode}>
                        Send Code
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Verify Code ────────────────────────────────────── */}
                {forgotStep === 'verify' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-hairline bg-surface-2/40 p-4 text-center">
                      <p className="text-sm text-slate-300">Code sent to</p>
                      <p className="mt-1 font-mono text-sm font-medium text-accent-400">
                        {forgotMasked || forgotEmail}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">Expires in 15 minutes</p>
                    </div>

                    {forgotMsg && (
                      <p className="rounded-xl border border-success/20 bg-success/10 px-3 py-2 text-xs text-success">
                        {forgotMsg}
                      </p>
                    )}

                    <Input
                      label="6-Digit Reset Code"
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="text-center text-2xl font-mono tracking-widest"
                      maxLength={6}
                    />

                    <button
                      type="button"
                      onClick={() => { setForgotStep('request'); setForgotCode(''); setForgotError(''); }}
                      className="w-full text-center text-xs text-slate-500 hover:text-accent-400 transition-colors"
                    >
                      Didn't receive it? Go back and try again
                    </button>

                    {forgotError && (
                      <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                        {forgotError}
                      </p>
                    )}

                    <Button
                      className="w-full"
                      loading={forgotLoading}
                      onClick={handleVerifyCode}
                      disabled={forgotCode.length !== 6}
                    >
                      Verify Code →
                    </Button>
                  </div>
                )}

                {/* ── Step 3: New Password ───────────────────────────────────── */}
                {forgotStep === 'reset' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-center">
                      <p className="text-sm font-medium text-success">✓ Identity Verified</p>
                      <p className="mt-0.5 text-xs text-slate-500">Now set your new password</p>
                    </div>

                    <Input
                      label="New Password"
                      type="password"
                      value={forgotPwd}
                      onChange={(e) => setForgotPwd(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      value={forgotConfirm}
                      onChange={(e) => setForgotConfirm(e.target.value)}
                      placeholder="Repeat new password"
                    />

                    {forgotError && (
                      <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                        {forgotError}
                      </p>
                    )}

                    <Button
                      className="w-full"
                      loading={forgotLoading}
                      onClick={handleResetPassword}
                    >
                      Reset Password
                    </Button>
                  </div>
                )}

                {/* ── Done ──────────────────────────────────────────────────── */}
                {forgotStep === 'done' && (
                  <div className="space-y-4 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
                      <CheckCircle2 size={32} className="text-success" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-100">Password Reset Successfully!</p>
                      <p className="mt-1 text-sm text-slate-400">
                        You can now log in with your new password.
                      </p>
                    </div>
                    <Button className="w-full" onClick={closeForgot}>
                      Back to Login
                    </Button>
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}