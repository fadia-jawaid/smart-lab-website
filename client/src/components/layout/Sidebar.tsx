// import { Link, useLocation } from 'react-router-dom';
// import { motion } from 'framer-motion';
// import {
//   LayoutDashboard,
//   Boxes,
//   FileText,
//   Bell,
//   Users,
//   UserCheck,
//   Settings,
//   ScanLine,
//   GraduationCap,
//   User,
//   LogOut,
//   FlaskConical,
// } from 'lucide-react';
// import type { LucideIcon } from 'lucide-react';
// import { useAuth } from '../../hooks/useAuth';
// import { useAlerts } from '../../hooks/useAlerts';
// import { cn } from '../../lib/cn';

// interface NavItem {
//   name: string;
//   path: string;
//   icon: LucideIcon;
//   badge?: number;
// }

// export default function Sidebar() {
//   const location = useLocation();
//   const { user, logout } = useAuth();
//   const { count: alertCount } = useAlerts();

//   const role = user?.role;

//   const adminNav: NavItem[] = [
//     { name: 'Dashboard', path: '/', icon: LayoutDashboard },
//     { name: 'Inventory', path: '/inventory', icon: Boxes },
//     { name: 'Logs', path: '/logs', icon: FileText },
//     { name: 'Alerts', path: '/alerts', icon: Bell, badge: alertCount },
//     { name: 'Students', path: '/students', icon: Users },
//     { name: 'Lab Incharges', path: '/incharges', icon: UserCheck },
//     { name: 'Settings', path: '/settings', icon: Settings },
//   ];

// const inchargeNav: NavItem[] = [
//   { name: 'Dashboard',    path: '/',          icon: LayoutDashboard },
//   { name: 'Scan Session', path: '/scan',       icon: ScanLine },
//   { name: 'Inventory',    path: '/inventory',  icon: Boxes },
//   { name: 'Logs',         path: '/logs',       icon: FileText },
//   { name: 'Students',     path: '/students',   icon: Users },
//   { name: 'Alerts',       path: '/alerts',     icon: Bell, badge: alertCount },
//       { name: 'Settings', path: '/settings', icon: Settings },

// ];

//   const studentNav: NavItem[] = [
//     { name: 'My Dashboard', path: '/', icon: LayoutDashboard },
//     { name: 'My Usage History', path: '/my-history', icon: FileText },
//     { name: 'My Profile', path: '/my-profile', icon: User },
//   ];

//   const menu =
//     role === 'ADMIN' ? adminNav : role === 'LAB_INCHARGE' ? inchargeNav : studentNav;

//   const roleLabel =
//     role === 'ADMIN'
//       ? 'Admin Portal'
//       : role === 'LAB_INCHARGE'
//         ? 'Lab Incharge'
//         : 'Student Portal';

//   const RoleIcon = role === 'STUDENT' ? GraduationCap : role === 'ADMIN' ? FlaskConical : ScanLine;

//   return (
//     <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-hairline bg-surface/60 backdrop-blur-md">
//       {/* Brand */}
//       <div className="flex items-center gap-3 border-b border-hairline p-5">
//         <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
//           <FlaskConical size={20} className="text-white" />
//         </div>
//         <div>
//           <h1 className="font-display text-base font-bold text-slate-50">SmartLab</h1>
//           <p className="text-[11px] text-slate-400">Chemical Tracking</p>
//         </div>
//       </div>

//       {/* Role chip */}
//       <div className="px-4 pt-4">
//         <div className="flex items-center gap-2 rounded-xl border border-hairline bg-surface-2/50 px-3 py-2">
//           <RoleIcon size={16} className="text-accent-400" />
//           <span className="text-xs font-medium text-slate-300">{roleLabel}</span>
//         </div>
//       </div>

//       {/* Nav */}
//       <nav className="flex-1 space-y-1 overflow-y-auto p-3">
//         {menu.map((item) => {
//           const Icon = item.icon;
//           const active =
//             item.path === '/'
//               ? location.pathname === '/'
//               : location.pathname.startsWith(item.path);

//           return (
//             <Link
//               key={item.path}
//               to={item.path}
//               className={cn(
//                 'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
//                 active ? 'text-white' : 'text-slate-400 hover:text-slate-100',
//               )}
//             >
//               {active && (
//                 <motion.span
//                   layoutId="sidebar-active"
//                   className="absolute inset-0 -z-0 rounded-xl bg-brand-500/15 ring-1 ring-brand-500/40"
//                   transition={{ type: 'spring', stiffness: 400, damping: 32 }}
//                 />
//               )}
//               <Icon
//                 size={18}
//                 className={cn(
//                   'relative z-10 transition-colors',
//                   active ? 'text-accent-400' : 'text-slate-500 group-hover:text-slate-300',
//                 )}
//               />
//               <span className="relative z-10 text-sm font-medium">{item.name}</span>
//               {item.badge ? (
//                 <span className="relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white shadow-glow-danger">
//                   {item.badge}
//                 </span>
//               ) : null}
//             </Link>
//           );
//         })}
//       </nav>

//       {/* User + logout */}
//       <div className="border-t border-hairline p-3">
//         <div className="mb-2 flex items-center gap-3 px-2">
//           <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
//             {user?.name?.charAt(0).toUpperCase() ?? '?'}
//           </div>
//           <div className="min-w-0">
//             <p className="truncate text-sm font-medium text-slate-200">{user?.name}</p>
//             <p className="truncate text-[11px] text-slate-500">
//               {user?.rollNo ?? user?.email}
//             </p>
//           </div>
//         </div>
//         <button
//           onClick={logout}
//           className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-danger/10 hover:text-danger"
//         >
//           <LogOut size={18} />
//           Sign out
//         </button>
//       </div>
//     </aside>
//   );
// }







import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Boxes,
  FileText,
  Bell,
  Users,
  UserCheck,
  Settings,
  ScanLine,
  GraduationCap,
  User,
  LogOut,
  FlaskConical,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth }   from '../../hooks/useAuth';
import { useAlerts } from '../../hooks/useAlerts';
import { cn }        from '../../lib/cn';

interface NavItem {
  name:   string;
  path:   string;
  icon:   LucideIcon;
  badge?: number;
}

export default function Sidebar() {
  const location              = useLocation();
  const { user, logout }      = useAuth();
  const { count: alertCount } = useAlerts();

  const role = user?.role;

  const adminNav: NavItem[] = [
    { name: 'Dashboard',    path: '/',          icon: LayoutDashboard },
    { name: 'Inventory',    path: '/inventory', icon: Boxes },
    { name: 'Logs',         path: '/logs',      icon: FileText },
    { name: 'Alerts',       path: '/alerts',    icon: Bell, badge: alertCount },
    { name: 'Students',     path: '/students',  icon: Users },
    { name: 'Lab Incharges',path: '/incharges', icon: UserCheck },
    { name: 'Settings',     path: '/settings',  icon: Settings },
    { name: 'My Profile',   path: '/my-account',icon: User },
  ];

  const inchargeNav: NavItem[] = [
    { name: 'Dashboard',    path: '/',           icon: LayoutDashboard },
    { name: 'Scan Session', path: '/scan',        icon: ScanLine },
    { name: 'Inventory',    path: '/inventory',   icon: Boxes },
    { name: 'Logs',         path: '/logs',        icon: FileText },
    { name: 'Students',     path: '/students',    icon: Users },
    { name: 'Alerts',       path: '/alerts',      icon: Bell, badge: alertCount },
    { name: 'Settings',     path: '/settings',    icon: Settings },
    { name: 'My Profile',   path: '/my-account',  icon: User },
  ];

  const studentNav: NavItem[] = [
    { name: 'My Dashboard',     path: '/',           icon: LayoutDashboard },
    { name: 'My Usage History', path: '/my-history', icon: FileText },
    { name: 'My Profile',       path: '/my-profile', icon: User },
  ];

  const menu =
    role === 'ADMIN'        ? adminNav    :
    role === 'LAB_INCHARGE' ? inchargeNav :
    studentNav;

  const roleLabel =
    role === 'ADMIN'        ? 'Admin Portal'  :
    role === 'LAB_INCHARGE' ? 'Lab Incharge'  :
    'Student Portal';

  const RoleIcon =
    role === 'STUDENT' ? GraduationCap :
    role === 'ADMIN'   ? FlaskConical  :
    ScanLine;

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-hairline bg-surface/60 backdrop-blur-md">

      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-hairline p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
          <FlaskConical size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-base font-bold text-slate-50">SmartLab</h1>
          <p className="text-[11px] text-slate-400">Chemical Tracking</p>
        </div>
      </div>

      {/* Role chip */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl border border-hairline bg-surface-2/50 px-3 py-2">
          <RoleIcon size={16} className="text-accent-400" />
          <span className="text-xs font-medium text-slate-300">{roleLabel}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {menu.map((item) => {
          const Icon   = item.icon;
          const active =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                active ? 'text-white' : 'text-slate-400 hover:text-slate-100',
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 -z-0 rounded-xl bg-brand-500/15 ring-1 ring-brand-500/40"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon
                size={18}
                className={cn(
                  'relative z-10 transition-colors',
                  active ? 'text-accent-400' : 'text-slate-500 group-hover:text-slate-300',
                )}
              />
              <span className="relative z-10 text-sm font-medium">{item.name}</span>
              {item.badge ? (
                <span className="relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white shadow-glow-danger">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-hairline p-3">
        <div className="mb-2 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-200">{user?.name}</p>
            <p className="truncate text-[11px] text-slate-500">
              {user?.rollNo ?? user?.email}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}