import { useAuth } from '../hooks/useAuth';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import LabDashboard from '../components/dashboard/LabDashboard';
import StudentDashboard from '../components/dashboard/StudentDashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === 'LAB_INCHARGE') return <LabDashboard />;
  if (user?.role === 'STUDENT') return <StudentDashboard />;
  return <AdminDashboard />;
}
