import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FlaskConical,
  FileText,
  Bell,
  UserCheck,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  GraduationCap,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAlerts } from '../../hooks/useAlerts';
import { cn } from '../../lib/cn';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  badge?: number;
  roles: ('ADMIN' | 'LAB_INCHARGE' | 'STUDENT')[];
}

export default function Sidebar({
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { count: alertCount } = useAlerts();

  const role = user?.role;

  // One continuous list — no group headings or dividers. Reports and Logout
  // are deliberately not here: Reports has its own button on the dashboard /
  // topbar, and Logout lives in the topbar.
  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'LAB_INCHARGE', 'STUDENT'],
    },
    {
      // Bottle Management and Refill / Restock are tabs inside this page.
      name: 'Chemical Inventory',
      path: '/inventory',
      icon: FlaskConical,
      roles: ['ADMIN', 'LAB_INCHARGE'],
    },
    {
      name: role === 'STUDENT' ? 'My Usage History' : 'Usage Transactions',
      path: '/logs',
      icon: FileText,
      roles: ['ADMIN', 'LAB_INCHARGE', 'STUDENT'],
    },
    {
      name: 'Alerts',
      path: '/alerts',
      icon: Bell,
      badge: alertCount > 0 ? alertCount : undefined,
      roles: ['ADMIN', 'LAB_INCHARGE'],
    },
    {
      name: 'Students',
      path: '/students',
      icon: GraduationCap,
      roles: ['ADMIN', 'LAB_INCHARGE'],
    },
    {
      name: 'Lab Incharges',
      path: '/incharges',
      icon: UserCheck,
      roles: ['ADMIN'],
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      roles: ['ADMIN', 'LAB_INCHARGE'],
    },
  ];

  const roleLabel =
    role === 'ADMIN'
      ? 'Administrator'
      : role === 'LAB_INCHARGE'
        ? 'Lab Incharge'
        : 'Student';

  const roleShortBadge =
    role === 'ADMIN' ? 'ADMIN' : role === 'LAB_INCHARGE' ? 'INCHARGE' : 'STUDENT';

  const RoleIcon =
    role === 'STUDENT' ? GraduationCap : role === 'ADMIN' ? Shield : FlaskConical;

  const formatBadge = (n: number) => (n > 99 ? '99+' : String(n));

  // `collapsed` is passed in (instead of read from props) so the mobile
  // drawer is always full-width with labels, even if the desktop sidebar
  // happens to be collapsed. `variant` keeps the two copies' animated
  // active-highlight from trying to animate into each other.
  const renderNav = (collapsed: boolean, variant: 'mobile' | 'desktop') => {
    const visibleItems = navItems.filter((item) => (role ? item.roles.includes(role) : false));

    return (
      <div className="flex h-full min-h-0 flex-col">
        {/* Brand header */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center gap-1 border-b border-hairline px-3',
            collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          {/* Desktop collapse/expand toggle — icon-only, living at the top
              next to the logo (the way Notion/Linear/Claude do it),
              instead of a full-width "< Collapse" text button that used
              to sit at the very bottom of the sidebar on its own. Always
              rendered here regardless of collapsed state, so there's one
              consistent place to find it. */}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-surface-2 hover:text-white lg:flex"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <Link
            to="/"
            onClick={onCloseMobile}
            className={cn(
              'flex min-w-0 items-center gap-3 overflow-hidden px-1 text-left',
              collapsed && 'lg:hidden',
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
              <FlaskConical size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-sm font-bold tracking-tight text-white">SmartLab</h1>
                <span className="rounded bg-brand-500/20 px-1 py-0.5 text-[9px] font-semibold text-brand-300">
                  IOT
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-400">Chemical Management</p>
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-surface-2 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Role pill */}
        {!collapsed && (
          <div className="shrink-0 px-3 pt-3">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-hairline bg-surface-2/40 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-500/20 text-brand-400">
                  <RoleIcon size={14} />
                </div>
                <span className="truncate text-xs font-medium text-slate-300">{roleLabel}</span>
              </div>
              <span className="shrink-0 rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-accent-400">
                {roleShortBadge}
              </span>
            </div>
          </div>
        )}

        {/* Nav — only this part scrolls, header and footer stay pinned */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            // startsWith keeps "Chemical Inventory" highlighted on
            // /inventory and on a single bottle's /inventory/:id page.
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onCloseMobile}
                title={collapsed ? item.name : undefined}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:bg-surface-2/50 hover:text-slate-100',
                  collapsed && 'justify-center px-2',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId={`sidebar-active-${variant}`}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-500/25 via-brand-500/10 to-transparent"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  >
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]" />
                  </motion.span>
                )}

                <Icon
                  size={18}
                  className={cn(
                    'relative z-10 shrink-0 transition-colors',
                    isActive ? 'text-accent-400' : 'text-slate-500 group-hover:text-slate-300',
                  )}
                />

                {!collapsed && <span className="relative z-10 truncate">{item.name}</span>}

                {!collapsed && item.badge ? (
                  <span className="relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger/90 px-1.5 text-[11px] font-semibold text-white">
                    {formatBadge(item.badge)}
                  </span>
                ) : null}
                {collapsed && item.badge ? (
                  <span className="absolute right-2 top-2 z-10 h-2 w-2 rounded-full bg-danger" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Drawer (always expanded) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-hairline bg-surface/95 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:hidden print:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {renderNav(false, 'mobile')}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-hairline bg-surface/75 backdrop-blur-md transition-all duration-300 lg:flex print:hidden',
          isCollapsed ? 'w-20' : 'w-64',
        )}
      >
        {renderNav(isCollapsed, 'desktop')}
      </aside>
    </>
  );
}