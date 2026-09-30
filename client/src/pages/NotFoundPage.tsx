import { Link } from 'react-router-dom';
import { FlaskConical, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

// A dedicated 404 instead of silently bouncing every unknown URL back to
// "/" — a bad link (typo, stale bookmark, shared link to a since-removed
// bottle) should tell the person what happened, not pretend nothing did.
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
        <FlaskConical size={28} />
      </div>
      <div>
        <p className="font-display text-6xl font-bold text-slate-100">404</p>
        <h1 className="mt-2 text-lg font-semibold text-slate-200">Page not found</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          The page you're looking for doesn't exist, or may have been moved.
        </p>
      </div>
      <Link to="/">
        <Button>
          <Home size={16} /> Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}