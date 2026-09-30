import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  UserCheck,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/api';
import type { Transaction } from '../../types';
import { cn } from '../../lib/cn';

interface RestockItem {
  id: string;
  bottleId: string;
  amountAdded: number;
  newQty: number;
  createdAt: string;
  bottle: { chemicalName: string; unit: string };
  labIncharge: { name: string; employeeId?: string | null } | null;
}

type UnifiedActivity = {
  id: string;
  type: 'usage' | 'refill' | 'attendance';
  user: string;
  userSubtitle: string;
  isStaff: boolean;
  chemicalOrRoom: string;
  quantityStr: string;
  lab: 'LAB_A' | 'LAB_B' | null;
  timestamp: string;
  status: string;
  statusSeverity: 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO';
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function RecentActivityTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refills, setRefills] = useState<RestockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'USAGE' | 'REFILL' | 'ATTENDANCE'>('ALL');
  const [search, setSearch] = useState('');
  const { on } = useSocket();

  const fetchActivities = useCallback(async () => {
    try {
      const [logsRes, refillsRes] = await Promise.allSettled([
        api.get('/logs', { params: { limit: 40 } }),
        api.get('/restock-logs'),
      ]);

      if (logsRes.status === 'fulfilled') {
        setTransactions(logsRes.value.data.data || []);
      }
      if (refillsRes.status === 'fulfilled') {
        setRefills(refillsRes.value.data.data || []);
      }
    } catch (err) {
      console.error('RecentActivityTable: failed to load feed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    const unsubEvent = on('new_event', fetchActivities);
    const unsubRestock = on('restock_logged', fetchActivities);

    return () => {
      unsubEvent();
      unsubRestock();
    };
  }, [on, fetchActivities]);

  // Combine into unified chronological rows
  const combinedActivities = useMemo(() => {
    const list: UnifiedActivity[] = [];

    // Transactions (usage and attendance)
    transactions.forEach((tx) => {
      const isAttendance = tx.lab === 'LAB_B' || !tx.bottle;
      const isStaff = !tx.student && !!tx.labIncharge;
      const userName = tx.student?.name || tx.labIncharge?.name || 'Authorized User';
      const userSub = tx.student?.rollNo
        ? `${tx.student.rollNo} · ${tx.student.department || 'Student'}`
        : isStaff
          ? 'Lab Staff / Incharge'
          : 'User';

      if (isAttendance) {
        list.push({
          id: `att-${tx.id}`,
          type: 'attendance',
          user: userName,
          userSubtitle: userSub,
          isStaff,
          chemicalOrRoom: 'Lab B Attendance Check-in',
          quantityStr: '—',
          lab: 'LAB_B',
          timestamp: tx.timeReturned || tx.timeTaken,
          status: 'CHECKED IN',
          statusSeverity: 'INFO',
        });
      } else {
        list.push({
          id: `use-${tx.id}`,
          type: 'usage',
          user: userName,
          userSubtitle: userSub,
          isStaff,
          chemicalOrRoom: tx.bottle?.chemicalName || 'Chemical Reagent',
          quantityStr:
            tx.quantityUsed != null && tx.bottle?.unit
              ? `${tx.quantityUsed.toFixed(1)} ${tx.bottle.unit}`
              : 'In use',
          lab: tx.lab || 'LAB_A',
          timestamp: tx.timeReturned || tx.timeTaken,
          status: tx.status,
          statusSeverity:
            tx.status === 'RETURNED' ? 'SUCCESS' : tx.status === 'OVERDUE' ? 'DANGER' : 'INFO',
        });
      }
    });

    // Refills
    refills.forEach((rf) => {
      list.push({
        id: `ref-${rf.id}`,
        type: 'refill',
        user: rf.labIncharge?.name || 'Lab Incharge',
        userSubtitle: rf.labIncharge?.employeeId ? `ID: ${rf.labIncharge.employeeId}` : 'Lab Incharge Staff',
        isStaff: true,
        chemicalOrRoom: rf.bottle?.chemicalName || 'Chemical Reagent',
        quantityStr: `+${rf.amountAdded.toFixed(1)} ${rf.bottle?.unit || 'g'}`,
        lab: 'LAB_A',
        timestamp: rf.createdAt,
        status: 'RESTOCKED',
        statusSeverity: 'SUCCESS',
      });
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, refills]);

  // Apply filters and search
  const filtered = useMemo(() => {
    return combinedActivities.filter((item) => {
      if (filterType === 'USAGE' && item.type !== 'usage') return false;
      if (filterType === 'REFILL' && item.type !== 'refill') return false;
      if (filterType === 'ATTENDANCE' && item.type !== 'attendance') return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          item.user.toLowerCase().includes(query) ||
          item.chemicalOrRoom.toLowerCase().includes(query) ||
          item.userSubtitle.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [combinedActivities, filterType, search]);

  return (
    <Card className="p-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold text-white">
              Recent Laboratory Activity Log
            </h3>
            <span className="flex items-center gap-1 rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
              Live Feed
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time chemical withdrawals, top-up restocks, and RFID turnstile attendance.
          </p>
        </div>

        <Link
          to="/logs"
          className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors shrink-0"
        >
          <span>All Logs Archive</span>
          <ExternalLink size={12} />
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-hairline bg-surface-2/60 p-1 w-full md:w-auto">
          <button
            onClick={() => setFilterType('ALL')}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
              filterType === 'ALL'
                ? 'bg-brand-500 text-white shadow-glow'
                : 'text-slate-400 hover:text-white',
            )}
          >
            Recent Events ({combinedActivities.length})
          </button>
          <button
            onClick={() => setFilterType('USAGE')}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
              filterType === 'USAGE'
                ? 'bg-brand-500 text-white shadow-glow'
                : 'text-slate-400 hover:text-white',
            )}
          >
            Chemical Usage
          </button>
          <button
            onClick={() => setFilterType('REFILL')}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
              filterType === 'REFILL'
                ? 'bg-brand-500 text-white shadow-glow'
                : 'text-slate-400 hover:text-white',
            )}
          >
            Refills & Restocks
          </button>
          <button
            onClick={() => setFilterType('ATTENDANCE')}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
              filterType === 'ATTENDANCE'
                ? 'bg-brand-500 text-white shadow-glow'
                : 'text-slate-400 hover:text-white',
            )}
          >
            Attendance
          </button>
        </div>

        {/* Quick search */}
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search student or chemical…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-hairline bg-surface-2/40 py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="md" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Activity size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No activity records match your filter.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-hairline text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-2 font-semibold">Event Type</th>
                <th className="pb-3 font-semibold">User / Operator</th>
                <th className="pb-3 font-semibold">Chemical / Room</th>
                <th className="pb-3 font-semibold">Quantity</th>
                <th className="pb-3 font-semibold">Bench / Lab</th>
                <th className="pb-3 font-semibold">Time</th>
                <th className="pb-3 pr-2 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/60">
              {filtered.slice(0, 10).map((row) => {
                return (
                  <tr key={row.id} className="transition-colors hover:bg-surface-2/40">
                    {/* Event Type Icon */}
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                            row.type === 'refill'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : row.type === 'usage'
                                ? 'bg-brand-500/15 text-brand-300'
                                : 'bg-cyan-500/15 text-cyan-400',
                          )}
                        >
                          {row.type === 'refill' ? (
                            <ArrowUpCircle size={14} />
                          ) : row.type === 'usage' ? (
                            <ArrowDownCircle size={14} />
                          ) : (
                            <UserCheck size={14} />
                          )}
                        </div>
                        <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-300">
                          {row.type}
                        </span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="py-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-200">{row.user}</span>
                          {row.isStaff && (
                            <span className="rounded bg-brand-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-brand-300">
                              Staff
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">{row.userSubtitle}</p>
                      </div>
                    </td>

                    {/* Chemical / Room */}
                    <td className="py-3 font-medium text-slate-200">
                      {row.chemicalOrRoom}
                    </td>

                    {/* Quantity */}
                    <td className="py-3 font-mono font-bold text-slate-200">
                      <span
                        className={cn(
                          row.type === 'refill'
                            ? 'text-emerald-400'
                            : row.type === 'usage'
                              ? 'text-brand-300'
                              : 'text-slate-500',
                        )}
                      >
                        {row.quantityStr}
                      </span>
                    </td>

                    {/* Lab */}
                    <td className="py-3">
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-[10px] font-bold',
                          row.lab === 'LAB_A'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
                        )}
                      >
                        {row.lab === 'LAB_A' ? 'Lab A (Chemical)' : 'Lab B (Turnstile)'}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="py-3 text-slate-400">
                      <span>{timeAgo(row.timestamp)}</span>
                      <span className="block text-[10px] text-slate-500">
                        {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 pr-2 text-right">
                      <Badge
                        label={row.status}
                        severity={row.statusSeverity}
                        pulse={row.status === 'ACTIVE'}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
