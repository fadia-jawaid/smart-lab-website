import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Printer, LogOut, Shield, FlaskConical, GraduationCap } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { LiveDot } from '../ui/LiveDot';
import { Button } from '../ui/Button';

const TITLES: Record<string, string> = {
  '/': 'Smart Laboratory Dashboard',
  '/inventory': 'Chemical Inventory & Bottles',
  '/logs': 'Activity & Usage Logs',
  '/alerts': 'System & Safety Alerts',
  '/students': 'Student Directory',
  '/incharges': 'Lab Incharges',
  '/settings': 'System Settings',
  '/profile': 'User Profile',
};

function titleFor(pathname: string, isStudent: boolean): string {
  if (pathname === '/logs' && isStudent) return 'My Chemical Usage History';
  if (pathname === '/' && isStudent) return 'Student Portal Dashboard';
  if (TITLES[pathname]) return TITLES[pathname];
  const base = '/' + pathname.split('/')[1];
  if (base === '/inventory') return 'Chemical Container Details';
  return TITLES[base] ?? 'SmartLab Tracker';
}

export interface TopbarProps {
  onToggleMobile?: () => void;
  onOpenReport?: () => void;
}

export default function Topbar({ onToggleMobile, onOpenReport }: TopbarProps) {
  const location = useLocation();
  const { connected } = useSocket();
  const { user, isStudent, isAdmin, isLabIncharge, logout } = useAuth();
  const title = titleFor(location.pathname, isStudent);

  // Synchronize document title
  useEffect(() => {
    document.title = title === 'SmartLab Tracker' ? 'SmartLab · Chemical Tracking' : `${title} · SmartLab`;
  }, [title]);

  const roleLabel = isAdmin ? 'Admin' : isLabIncharge ? 'Lab Incharge' : 'Student';
  // Same role icons the sidebar uses: Admin = shield, Lab Incharge = flask, Student = cap
  const RoleIcon = isStudent ? GraduationCap : isAdmin ? Shield : FlaskConical;

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-hairline bg-surface/80 px-4 md:px-6 backdrop-blur-md print:hidden">
      {/* Left side: Mobile menu toggle + Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-hairline bg-surface-2/60 text-slate-300 transition-colors hover:bg-surface-2 hover:text-white lg:hidden"
          aria-label="Open sidebar menu"
        >
          <Menu size={18} />
        </button>

        <div>
          <h2 className="font-display text-base md:text-lg font-bold text-slate-100">
            {title}
          </h2>
          <p className="hidden md:block text-[11px] text-slate-400">
            Smart Laboratory Management & Chemical Tracking System
          </p>
        </div>
      </div>

      {/* Right side: Report button (staff only), Live socket indicator, user profile chip */}
      <div className="flex items-center gap-3">
        {/* Lab Report Generator button (Admin and Lab Incharge only). Hidden on the
            dashboard, which already has its own report button in the page header. */}
        {!isStudent && onOpenReport && location.pathname !== '/' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenReport}
            className="hidden h-10 items-center gap-2 border-hairline bg-surface-2/60 text-slate-200 hover:bg-surface-2 hover:border-brand-500/40 sm:flex"
          >
            <Printer size={15} className="text-brand-400" />
            <span className="text-xs">Generate Report</span>
          </Button>
        )}

        {/* Live Socket Status */}
        <div className="flex h-10 items-center rounded-xl border border-hairline bg-surface-2/40 px-3.5">
          {/* Dot only on phones, full label from sm up — keeps the topbar from overflowing */}
          <LiveDot active={connected} className="sm:hidden" />
          <LiveDot
            active={connected}
            label={connected ? 'Hardware Online' : 'Connecting…'}
            className="hidden sm:inline-flex"
          />
        </div>

        {/* Profile — role icon + role name (no user name), one line, same
            height as the other controls. The full name is in the tooltip. */}
        <Link
          to="/profile"
          title={`${user?.name ?? 'My profile'} · ${roleLabel}`}
          aria-label="My profile"
          className="flex h-10 items-center gap-2 rounded-xl border border-hairline bg-surface-2/40 px-2 transition-colors hover:border-brand-500/30 hover:bg-surface-2/70 md:pr-3.5"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-accent-400">
            <RoleIcon size={16} />
          </div>
          {/* Label hidden on phones so the topbar doesn't overflow */}
          <span className="hidden text-xs font-medium text-slate-200 md:inline">{roleLabel}</span>
        </Link>

        {/* Logout — always visible in the topbar, so it never depends on
            the sidebar footer being on-screen (short laptop screens, or a
            collapsed / closed mobile drawer). */}
        <button
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          className="flex h-10 items-center gap-2 rounded-xl border border-hairline bg-surface-2/40 px-3.5 text-xs font-medium text-slate-300 transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
        >
          <LogOut size={15} />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}