import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { staggerContainer, fadeUpItem } from '../lib/motion';
import { LAB_LABELS, LAB_BADGE_SEVERITY } from '../lib/lab';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import type { Transaction } from '../types';

const fieldClass =
  'rounded-xl border border-hairline bg-surface-2/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400 [color-scheme:dark]';

const statusColour = (s: string) => (s === 'RETURNED' ? 'SUCCESS' : s === 'OVERDUE' ? 'DANGER' : 'INFO');

// One "history" page instead of two near-identical ones:
//  - Admin/Lab Incharge see everything: chemical usage + attendance logs.
//  - A Student sees only their own usage (via /my/history), no export, no
//    other-student filters — same as the old MyHistoryPage, just reusing
//    this component instead of a near-duplicate file.
// Note: refill history used to be a tab here, but a refill is an inventory
// management action (an Incharge topping up a bottle), not a usage log —
// it's now a tab on the Inventory page instead, where it actually belongs.
export default function LogsPage() {
  const { isAdmin, isStudent } = useAuth();

  if (isStudent) return <MyUsageHistory />;

  return <AllLogsTab isAdmin={isAdmin} />;
}

// ───────────────────────── Student view ─────────────────────────

function MyUsageHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const { on } = useSocket();

  const fetchHistory = useCallback(() => {
    api
      .get('/my/history')
      .then((res) => setTransactions(res.data.data))
      .catch(() => toast.error('Could not load your usage history'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    const unsub = on('new_event', () => fetchHistory());
    return unsub;
  }, [on, fetchHistory]);

  const filtered = transactions.filter(
    (t) => !filter || t.bottle?.chemicalName.toLowerCase().includes(filter.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="w-64">
          <Input
            icon={<Search size={16} />}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by chemical…"
          />
        </div>
        <p className="text-sm text-slate-500">{filtered.length} records</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface-2/40">
              <tr>
                {['Chemical', 'Quantity Used', 'Lab', 'Purpose', 'Date Taken', 'Date Returned', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.map((tx) => (
                <tr key={tx.id} className="transition-colors hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-slate-100">
                    {tx.bottle?.chemicalName ?? <span className="text-slate-500 italic font-medium">Nil</span>}
                  </td>
                  <td className="px-4 py-3 tnum text-slate-200">
                    {tx.quantityUsed != null && tx.bottle?.unit ? `${tx.quantityUsed.toFixed(1)} ${tx.bottle.unit}` : <span className="text-slate-500 italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {tx.lab ? (
                      <Badge label={LAB_LABELS[tx.lab]} severity={LAB_BADGE_SEVERITY[tx.lab]} />
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{tx.purpose ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{new Date(tx.timeTaken).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {tx.timeReturned ? new Date(tx.timeReturned).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={tx.status} severity={statusColour(tx.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-12 text-center text-slate-500">No chemical usage recorded yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}

// ───────────────────────── Staff view ─────────────────────────

function AllLogsTab({ isAdmin }: { isAdmin: boolean }) {
  const [logs, setLogs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({ status: '', department: '', lab: '', from: '', to: '' });
  const { on } = useSocket();

  const LIMIT = 25;

  // Dashboard cards link here as "/logs?lab=LAB_A" or "/logs?lab=LAB_B" so
  // each card's "View all" shows only that lab's data instead of both labs
  // mixed together. Sync the filter to that query param — both on first
  // load and whenever it changes (e.g. clicking from Lab A's card straight
  // to Lab B's card without a full page reload).
  useEffect(() => {
    const labParam = searchParams.get('lab');
    if (labParam === 'LAB_A' || labParam === 'LAB_B') {
      setFilters((p) => ({ ...p, lab: labParam }));
    } else if (labParam === null) {
      setFilters((p) => ({ ...p, lab: '' }));
    }
  }, [searchParams]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(filters.status && { status: filters.status }),
        ...(filters.department && { department: filters.department }),
        ...(filters.lab && { lab: filters.lab }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      });
      const res = await api.get(`/logs?${params}`);
      setLogs(res.data.data);
      setTotal(res.data.meta?.total ?? 0);
      setError('');
    } catch (err: unknown) {
      console.error(err);
      let message = 'Failed to load logs. Is the server running?';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const e = err as { response?: { status?: number; data?: { error?: string } } };
        message = e.response?.data?.error || message;
        if (e.response?.status === 401) {
          message = 'Your session has expired. Please log in again.';
        }
      }
      setError(message);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    const unsub = on('new_event', () => fetchLogs());
    return unsub;
  }, [on, fetchLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `smartlab-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Logs exported');
    } catch {
      toast.error('Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              className={fieldClass}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="RETURNED">Returned</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <select
              value={filters.lab}
              onChange={(e) => setFilters((p) => ({ ...p, lab: e.target.value }))}
              className={fieldClass}
            >
              <option value="">All Labs</option>
              <option value="LAB_A">Lab A</option>
              <option value="LAB_B">Lab B</option>
            </select>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
              className={fieldClass}
            />
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
              className={fieldClass}
            />
            <Button
              variant="secondary"
              onClick={() => setFilters({ status: '', department: '', lab: '', from: '', to: '' })}
            >
              Clear
            </Button>
          </div>

          {isAdmin && (
            <Button variant="secondary" onClick={handleExport} loading={exporting}>
              <Download size={15} /> Export CSV
            </Button>
          )}
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm font-medium text-danger">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => fetchLogs()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-hairline bg-surface-2/40">
                <tr>
                  {['User', 'Roll No', 'Chemical', 'Lab', 'Taken', 'Returned', 'Used', 'Processed By', 'Status'].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <motion.tbody variants={staggerContainer} initial="initial" animate="enter" className="divide-y divide-hairline">
                {logs.map((log) => (
                  <motion.tr key={log.id} variants={fadeUpItem} className="transition-colors hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {log.student?.name ?? (
                        <span className="inline-flex items-center gap-1">
                          {log.labIncharge?.name}
                          <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-300">
                            Incharge
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{log.student?.rollNo ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-200">
                      {log.bottle?.chemicalName ?? <span className="text-slate-500 italic font-medium">Nil</span>}
                    </td>
                    <td className="px-4 py-3">
                      {log.lab ? (
                        <Badge label={LAB_LABELS[log.lab]} severity={LAB_BADGE_SEVERITY[log.lab]} />
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(log.timeTaken).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {log.timeReturned ? new Date(log.timeReturned).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 tnum text-slate-200">
                      {log.quantityUsed != null && log.bottle?.unit ? `${log.quantityUsed.toFixed(1)} ${log.bottle.unit}` : <span className="text-slate-500 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {log.student ? log.labIncharge?.name : <span className="text-slate-600 italic">Self</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={log.status} severity={statusColour(log.status)} />
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
            {logs.length === 0 && <p className="py-12 text-center text-slate-500">No logs found</p>}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
          <p className="text-sm text-slate-500">
            Showing {total === 0 ? 0 : (page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </Button>
            <Button variant="secondary" size="sm" disabled={page * LIMIT >= total} onClick={() => setPage((p) => p + 1)}>
              Next →
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}