import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, DoorOpen } from 'lucide-react';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { SectionHeader } from '../ui/SectionHeader';
import { EmptyState } from '../ui/EmptyState';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/api';
import { staggerContainer, fadeUpItem } from '../../lib/motion';
import type { Transaction } from '../../types';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

// Lab B records student RFID check-ins as Transactions with bottleId: null
// (see mqttService.handleAttendanceEvent). The /logs?lab=LAB_B filter keeps
// this feed to attendance only — Lab A chemical usage never leaks in here,
// and this feed never leaks into Lab A's chemical activity list either.
export default function AttendanceFeed() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await api.get('/logs', { params: { lab: 'LAB_B', limit: 8 } });
      setItems(res.data.data);
    } catch (err) {
      console.error('Dashboard: failed to load Lab B attendance', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
    const unsub = on('new_event', fetchAttendance);
    return unsub;
  }, [on, fetchAttendance]);

  return (
    <Card className="p-6">
      <SectionHeader
        icon={<UserCheck size={16} />}
        accent="cyan"
        title="Lab B — Attendance Activity"
        subtitle={`${items.length} recent check-in${items.length === 1 ? '' : 's'}`}
        linkTo="/logs?lab=LAB_B"
      />

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<DoorOpen size={20} />}
          title="No check-ins yet"
          hint="Student RFID scans in Lab B will appear here."
        />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="enter" className="divide-y divide-hairline">
          {items.map((tx) => (
            <motion.div key={tx.id} variants={fadeUpItem} className="flex items-center gap-3 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
                <UserCheck size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{tx.student?.name ?? 'Unknown student'}</p>
                <p className="truncate text-xs text-slate-500">
                  {tx.student?.rollNo ? `${tx.student.rollNo} · ` : ''}
                  {tx.student?.department ?? ''}
                </p>
              </div>
              <p className="shrink-0 text-xs text-slate-500">{timeAgo(tx.timeReturned ?? tx.timeTaken)}</p>
            </motion.div>
          ))}
        </motion.div>
      )}
    </Card>
  );
}