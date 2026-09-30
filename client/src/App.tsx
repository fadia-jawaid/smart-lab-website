import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Spinner } from './components/ui/Spinner';

// Login and the Dashboard are the two things almost every visit needs
// immediately, so they load eagerly. Everything past that is lazy — a
// student who only ever opens Logs shouldn't have to download the
// Inventory, Alerts, Students and Settings code on their very first paint.
import LoginPage         from './pages/LoginPage';
import DashboardPage     from './pages/DashboardPage';
import PageShell         from './components/layout/PageShell';

const InventoryPage    = lazy(() => import('./pages/InventoryPage'));
const BottleDetailPage = lazy(() => import('./pages/BottleDetailPage'));
const LogsPage         = lazy(() => import('./pages/LogsPage'));
const AlertsPage       = lazy(() => import('./pages/AlertsPage'));
const StudentsPage     = lazy(() => import('./pages/StudentsPage'));
const InchargesPage    = lazy(() => import('./pages/InchargesPage'));
const ProfilePage      = lazy(() => import('./pages/ProfilePage'));
const SettingsPage     = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage     = lazy(() => import('./pages/NotFoundPage'));

function RouteFallback() {
  return (
    <div className="flex justify-center py-24">
      <Spinner size="lg" />
    </div>
  );
}

function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public route */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* ALL protected routes — inside PageShell so sidebar always shows */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <PageShell>
              <Suspense fallback={<RouteFallback />}>
                <Outlet />
              </Suspense>
            </PageShell>
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route
          path="inventory"
          element={
            <ProtectedRoute roles={['ADMIN', 'LAB_INCHARGE']}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/:id"
          element={
            <ProtectedRoute roles={['ADMIN', 'LAB_INCHARGE']}>
              <BottleDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="logs"
          element={
            <ProtectedRoute roles={['ADMIN', 'LAB_INCHARGE', 'STUDENT']}>
              <LogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="alerts"
          element={
            <ProtectedRoute roles={['ADMIN', 'LAB_INCHARGE']}>
              <AlertsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="students"
          element={
            <ProtectedRoute roles={['ADMIN', 'LAB_INCHARGE']}>
              <StudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="incharges"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <InchargesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute roles={['ADMIN', 'LAB_INCHARGE', 'STUDENT']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute roles={['ADMIN', 'LAB_INCHARGE']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch all — a real 404 instead of a silent redirect, so an
          unknown/removed URL says so instead of pretending nothing
          happened. Public (no auth gate) since a logged-out visitor
          hitting a bad link deserves the same clear answer. */}
      <Route
        path="*"
        element={
          <Suspense fallback={<RouteFallback />}>
            <NotFoundPage />
          </Suspense>
        }
      />
    </Routes>
  );
}