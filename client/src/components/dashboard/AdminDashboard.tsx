import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FlaskConical,
  Boxes,
  AlertTriangle,
  Bell,
  Printer,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import StatCard from '../ui/StatCard';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import api from '../../services/api';
import { staggerContainer } from '../../lib/motion';
import DashboardHeader from './DashboardHeader';
import SystemStatusCard from './SystemStatusCard';
import ChemicalMonitoring from './ChemicalMonitoring';
import LabAnalytics from './LabAnalytics';
import RecentActivityTable from './RecentActivityTable';
import AlertsPanel from './AlertsPanel';
import LabReportModal from '../reports/LabReportModal';

interface DashboardStats {
  totalChemicals: number;
  availableBottles: number;
  lowStock: number;
  totalUsage: number;
  activeAlerts: number;
  totalRefills: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalChemicals: 0,
    availableBottles: 0,
    lowStock: 0,
    totalUsage: 0,
    activeAlerts: 0,
    totalRefills: 0,
  });
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const { on } = useSocket();

  const fetchDashboardData = useCallback(async () => {
    try {
      const [invRes, logsRes, alertCountRes, restockRes] = await Promise.allSettled([
        api.get('/inventory'),
        api.get('/logs', { params: { limit: 1 } }),
        api.get('/alerts/count'),
        api.get('/restock-logs/summary'),
      ]);

      let totalChemicals = 0;
      let availableBottles = 0;
      let lowStock = 0;

      if (invRes.status === 'fulfilled') {
        const bottles = invRes.value.data.data || [];
        totalChemicals = new Set(bottles.map((b: { chemicalName: string }) => b.chemicalName)).size;
        availableBottles = bottles.filter((b: { isActive?: boolean; currentQty: number }) => b.isActive !== false && b.currentQty > 0).length;
        lowStock = bottles.filter(
          (b: { currentQty: number; initialQty: number; lowStockPct?: number }) =>
            b.initialQty > 0 && (b.currentQty / b.initialQty) * 100 <= (b.lowStockPct ?? 20),
        ).length;
      }

      const totalUsage = logsRes.status === 'fulfilled' ? (logsRes.value.data.meta?.total ?? logsRes.value.data.data.length ?? 0) : 0;
      const activeAlerts = alertCountRes.status === 'fulfilled' ? (alertCountRes.value.data.data?.count ?? 0) : 0;
      const totalRefills = restockRes.status === 'fulfilled' ? (restockRes.value.data.data?.totalRefills ?? 0) : 0;

      setStats({
        totalChemicals,
        availableBottles,
        lowStock,
        totalUsage,
        activeAlerts,
        totalRefills,
      });
    } catch (err) {
      console.error('AdminDashboard: failed to load stats', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const unsubEvent = on('new_event', fetchDashboardData);
    const unsubAlert = on('alert_triggered', fetchDashboardData);
    const unsubInventory = on('inventory_update', fetchDashboardData);
    const unsubRestock = on('restock_logged', fetchDashboardData);

    return () => {
      unsubEvent();
      unsubAlert();
      unsubInventory();
      unsubRestock();
    };
  }, [on, fetchDashboardData]);

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>

        {/* Stat card skeletons */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-hairline bg-surface/70 p-5">
              <Skeleton className="h-3 w-24" />
              <div className="mt-3 flex items-center justify-between">
                <Skeleton className="h-8 w-14" />
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
              <Skeleton className="mt-3 h-3 w-32" />
            </div>
          ))}
        </div>

        {/* Hardware status skeleton */}
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Ambient glow — the same atmospheric depth treatment already used
          on the Student dashboard's header, previously missing here even
          though this is the page people land on most. A soft dual-tone
          (brand blue + cyan) wash behind the header, not a hard shape, so
          it reads as depth rather than decoration. */}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 left-1/4 -z-10 h-72 w-[36rem] rounded-full bg-brand-gradient opacity-[0.10] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 right-1/4 -z-10 h-56 w-[28rem] rounded-full bg-accent-500 opacity-[0.07] blur-3xl"
        />

        <DashboardHeader subtitle="Full system overview across Lab A (Chemical Dispensing) and Lab B (RFID Turnstiles).">
          <Button
            variant="primary"
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-2"
          >
            <Printer size={16} />
            <span>Generate Lab Report</span>
          </Button>
        </DashboardHeader>
      </div>

      {/* Summary cards — each one links to its page */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="enter"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
      >
        {/* Card 1: Total Chemicals */}
        <StatCard
          label="Total Chemicals"
          to="/inventory"
          value={stats.totalChemicals}
          icon={<FlaskConical size={20} />}
          accent="brand"
          subtext="Monitored reagents"
        />

        {/* Card 2: Available Bottles */}
        <StatCard
          label="Available Bottles"
          to="/inventory"
          value={stats.availableBottles}
          icon={<Boxes size={20} />}
          accent="cyan"
          subtext="Active bench stations"
        />

        {/* Card 3: Low Stock Chemicals */}
        <StatCard
          label="Low Stock"
          to="/inventory"
          value={stats.lowStock}
          icon={<AlertTriangle size={20} />}
          accent={stats.lowStock > 0 ? 'warning' : 'success'}
          subtext={stats.lowStock > 0 ? 'Containers below limit' : 'All stocks healthy'}
        />

        {/* Card 4: Total Usage */}
        <StatCard
          label="Total Usage"
          to="/logs"
          value={stats.totalUsage}
          icon={<Activity size={20} />}
          accent="brand"
          subtext="Total logged sessions"
        />

        {/* Card 5: Active Alerts */}
        <StatCard
          label="Active Alerts"
          to="/alerts"
          value={stats.activeAlerts}
          icon={<Bell size={20} />}
          accent={stats.activeAlerts > 0 ? 'danger' : 'success'}
          subtext={stats.activeAlerts > 0 ? 'Action required' : 'All systems nominal'}
        />

        {/* Card 6: Total Refills */}
        <StatCard
          label="Total Refills"
          to="/inventory?tab=refills"
          value={stats.totalRefills}
          icon={<RefreshCw size={20} />}
          accent="success"
          subtext="Restock operations"
        />
      </motion.div>

      {/* Hardware / network health — compact strip below the KPIs */}
      <SystemStatusCard />

      {/* Live chemical containers */}
      <ChemicalMonitoring />

      {/* Analytics get the full width so the chart has room to breathe */}
      <LabAnalytics />

      {/* Active alerts */}
      <AlertsPanel />

      {/* Recent activity */}
      <RecentActivityTable />

      {/* Report Modal */}
      <LabReportModal isOpen={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}