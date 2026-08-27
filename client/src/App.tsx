import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Spinner } from './components/ui/Spinner';

import LoginPage         from './pages/LoginPage';
import DashboardPage     from './pages/DashboardPage';
import InventoryPage     from './pages/InventoryPage';
import BottleDetailPage  from './pages/BottleDetailPage';
import LogsPage          from './pages/LogsPage';
import AlertsPage        from './pages/AlertsPage';
import StudentsPage      from './pages/StudentsPage';
import StudentDetailPage from './pages/StudentDetailPage';
import InchargesPage     from './pages/InchargesPage';
import ScanSessionPage   from './pages/ScanSessionPage';
import MyHistoryPage     from './pages/MyHistoryPage';
import MyProfilePage     from './pages/MyProfilePage';
import SettingsPage      from './pages/SettingsPage';
import StaffProfilePage  from './pages/StaffProfilePage';
import PageShell         from './components/layout/PageShell';

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
              <Outlet />
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
            <ProtectedRoute roles={['ADMIN', 'LAB_INCHARGE']}>
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
          path="students/:id"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <StudentDetailPage />
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
          path="scan"
          element={
            <ProtectedRoute roles={['ADMIN', 'LAB_INCHARGE']}>
              <ScanSessionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-history"
          element={
            <ProtectedRoute roles={['STUDENT']}>
              <MyHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-profile"
          element={
            <ProtectedRoute roles={['STUDENT']}>
              <MyProfilePage />
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

        {/* ✅ my-account is NOW inside PageShell — sidebar will show */}
        <Route
          path="my-account"
          element={
            <ProtectedRoute roles={['ADMIN', 'LAB_INCHARGE']}>
              <StaffProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}