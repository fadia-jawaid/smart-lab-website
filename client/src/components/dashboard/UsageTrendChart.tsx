import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { SectionHeader } from '../ui/SectionHeader';
import { EmptyState } from '../ui/EmptyState';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/api';
import type { Transaction } from '../../types';

type DayBucket = { key: string; label: string; labA: number; labB: number };

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildLastSevenDays(): DayBucket[] {
  const days: DayBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      key: localDateKey(d),
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      labA: 0,
      labB: 0,
    });
  }
  return days;
}

// Last-7-days activity, Lab A vs Lab B, side by side — gives an
// at-a-glance sense of "how much work is happening" without needing to
// open Logs and read raw rows. Built entirely from the existing
// /logs?lab=... endpoint (no backend changes), grouped into local-day
// buckets on the client.
export default function UsageTrendChart() {
  const [data, setData] = useState<DayBucket[] | null>(null);
  const { on } = useSocket();

  const fetchTrend = useCallback(async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setHours(0, 0, 0, 0);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    try {
      const [labARes, labBRes] = await Promise.all([
        api.get('/logs', { params: { lab: 'LAB_A', from: sevenDaysAgo.toISOString(), limit: 200 } }),
        api.get('/logs', { params: { lab: 'LAB_B', from: sevenDaysAgo.toISOString(), limit: 200 } }),
      ]);

      const buckets = buildLastSevenDays();
      const byKey = new Map(buckets.map((b) => [b.key, b]));

      (labARes.data.data as Transaction[]).forEach((tx) => {
        const key = localDateKey(new Date(tx.timeTaken));
        const bucket = byKey.get(key);
        if (bucket) bucket.labA += 1;
      });

      (labBRes.data.data as Transaction[]).forEach((tx) => {
        const key = localDateKey(new Date(tx.timeReturned ?? tx.timeTaken));
        const bucket = byKey.get(key);
        if (bucket) bucket.labB += 1;
      });

      setData(buckets);
    } catch (err) {
      console.error('Dashboard: failed to load usage trend', err);
      setData(buildLastSevenDays()); // show an honest empty chart rather than nothing
    }
  }, []);

  useEffect(() => {
    fetchTrend();
    const unsub = on('new_event', fetchTrend);
    return unsub;
  }, [on, fetchTrend]);

  const isEmpty = data !== null && data.every((d) => d.labA === 0 && d.labB === 0);

  return (
    <Card className="p-6">
      <SectionHeader
        icon={<TrendingUp size={16} />}
        accent="cyan"
        title="Usage Trend — Last 7 Days"
        subtitle="Lab A chemical activity vs Lab B attendance, per day"
      />

      {data === null ? (
        <div className="flex justify-center py-16">
          <Spinner size="md" />
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={<TrendingUp size={20} />}
          title="No activity in the last 7 days yet"
          hint="Usage and attendance will appear here as they happen."
        />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} barGap={4}>
            <defs>
              <linearGradient id="labAGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="labBGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity={1} />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
            <XAxis dataKey="label" stroke="#64748B" fontSize={12} />
            <YAxis stroke="#64748B" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(148,163,184,0.15)',
                borderRadius: 12,
                color: '#E2E8F0',
              }}
              cursor={{ fill: 'rgba(148,163,184,0.06)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
            <Bar dataKey="labA" name="Lab A (chemical use)" fill="url(#labAGradient)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="labB" name="Lab B (attendance)" fill="url(#labBGradient)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}