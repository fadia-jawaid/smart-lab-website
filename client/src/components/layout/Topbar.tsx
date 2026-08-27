import { useLocation } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { LiveDot } from '../ui/LiveDot';

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/inventory': 'Inventory',
  '/logs': 'Activity Logs',
  '/alerts': 'Alerts',
  '/students': 'Students',
  '/incharges': 'Lab Incharges',
  '/settings': 'Settings',
  '/scan': 'Scan Session',
  '/my-history': 'My Usage History',
  '/my-profile': 'My Profile',
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const base = '/' + pathname.split('/')[1];
  if (base === '/inventory') return 'Bottle Detail';
  if (base === '/students') return 'Student Detail';
  return TITLES[base] ?? 'SmartLab';
}

export default function Topbar() {
  const location = useLocation();
  const { connected } = useSocket();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-hairline bg-canvas/70 px-6 py-4 backdrop-blur-md">
      <h2 className="font-display text-lg font-semibold text-slate-100">
        {titleFor(location.pathname)}
      </h2>
      <div className="flex items-center gap-4">
        <LiveDot active={connected} label={connected ? 'System Live' : 'Reconnecting…'} />
      </div>
    </header>
  );
}
