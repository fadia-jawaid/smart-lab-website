// import { useState, useEffect } from 'react';
// import { motion } from 'framer-motion';
// import { Card } from '../components/ui/Card';
// import { Badge } from '../components/ui/Badge';
// import { Button } from '../components/ui/Button';
// import { Spinner } from '../components/ui/Spinner';
// import { staggerContainer, fadeUpItem } from '../lib/motion';
// import api from '../services/api';
// import type { Transaction } from '../types';

// const fieldClass =
//   'rounded-xl border border-hairline bg-surface-2/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400 [color-scheme:dark]';

// export default function LogsPage() {
//   const [logs, setLogs] = useState<Transaction[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(1);
//   const [total, setTotal] = useState(0);
//   const [filters, setFilters] = useState({ status: '', department: '', from: '', to: '' });

//   const LIMIT = 25;

//   useEffect(() => {
//     const fetchLogs = async () => {
//       setLoading(true);
//       try {
//         const params = new URLSearchParams({
//           page: String(page),
//           limit: String(LIMIT),
//           ...(filters.status && { status: filters.status }),
//           ...(filters.department && { department: filters.department }),
//           ...(filters.from && { from: filters.from }),
//           ...(filters.to && { to: filters.to }),
//         });
//         const res = await api.get(`/logs?${params}`);
//         setLogs(res.data.data);
//         setTotal(res.data.meta?.total ?? 0);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchLogs();
//   }, [page, filters]);

//   const statusColour = (s: string) => (s === 'RETURNED' ? 'SUCCESS' : s === 'OVERDUE' ? 'DANGER' : 'INFO');

//   return (
//     <div className="space-y-4">
//       {/* Filters */}
//       <Card className="p-4">
//         <div className="flex flex-wrap items-end gap-3">
//           <select
//             value={filters.status}
//             onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
//             className={fieldClass}
//           >
//             <option value="">All Status</option>
//             <option value="ACTIVE">Active</option>
//             <option value="RETURNED">Returned</option>
//             <option value="OVERDUE">Overdue</option>
//           </select>
//           <input
//             type="date"
//             value={filters.from}
//             onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
//             className={fieldClass}
//           />
//           <input
//             type="date"
//             value={filters.to}
//             onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
//             className={fieldClass}
//           />
//           <Button
//             variant="secondary"
//             onClick={() => setFilters({ status: '', department: '', from: '', to: '' })}
//           >
//             Clear
//           </Button>
//         </div>
//       </Card>

//       {/* Table */}
//       <Card>
//         {loading ? (
//           <div className="flex justify-center py-16">
//             <Spinner size="lg" />
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead className="border-b border-hairline bg-surface-2/40">
//                 <tr>
//                   {['Student', 'Roll No', 'Chemical', 'Taken', 'Returned', 'Used', 'Processed By', 'Status'].map(
//                     (h) => (
//                       <th
//                         key={h}
//                         className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
//                       >
//                         {h}
//                       </th>
//                     ),
//                   )}
//                 </tr>
//               </thead>
//               <motion.tbody
//                 variants={staggerContainer}
//                 initial="initial"
//                 animate="enter"
//                 className="divide-y divide-hairline"
//               >
//                 {logs.map((log) => (
//                   <motion.tr key={log.id} variants={fadeUpItem} className="transition-colors hover:bg-white/5">
//                     <td className="px-4 py-3 font-medium text-slate-100">{log.student?.name}</td>
//                     <td className="px-4 py-3 font-mono text-xs text-slate-400">{log.student?.rollNo}</td>
//                     <td className="px-4 py-3 text-slate-200">{log.bottle?.chemicalName}</td>
//                     <td className="px-4 py-3 text-xs text-slate-400">
//                       {new Date(log.timeTaken).toLocaleString()}
//                     </td>
//                     <td className="px-4 py-3 text-xs text-slate-400">
//                       {log.timeReturned ? new Date(log.timeReturned).toLocaleString() : '—'}
//                     </td>
//                     <td className="px-4 py-3 tnum text-slate-200">
//                       {log.quantityUsed != null ? `${log.quantityUsed.toFixed(1)} ${log.bottle?.unit}` : '—'}
//                     </td>
//                     <td className="px-4 py-3 text-slate-400">{log.labIncharge?.name}</td>
//                     <td className="px-4 py-3">
//                       <Badge label={log.status} severity={statusColour(log.status)} />
//                     </td>
//                   </motion.tr>
//                 ))}
//               </motion.tbody>
//             </table>
//             {logs.length === 0 && <p className="py-12 text-center text-slate-500">No logs found</p>}
//           </div>
//         )}

//         {/* Pagination */}
//         <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
//           <p className="text-sm text-slate-500">
//             Showing {total === 0 ? 0 : (page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
//           </p>
//           <div className="flex gap-2">
//             <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
//               ← Prev
//             </Button>
//             <Button
//               variant="secondary"
//               size="sm"
//               disabled={page * LIMIT >= total}
//               onClick={() => setPage((p) => p + 1)}
//             >
//               Next →
//             </Button>
//           </div>
//         </div>
//       </Card>
//     </div>
//   );
// }

// new updated code

// import { useState, useEffect } from 'react';
// import { motion } from 'framer-motion';
// import { Card } from '../components/ui/Card';
// import { Badge } from '../components/ui/Badge';
// import { Button } from '../components/ui/Button';
// import { Spinner } from '../components/ui/Spinner';
// import { staggerContainer, fadeUpItem } from '../lib/motion';
// import { LAB_LABELS, LAB_BADGE_SEVERITY } from '../lib/lab';
// import api from '../services/api';
// import type { Transaction } from '../types';

// const fieldClass =
//   'rounded-xl border border-hairline bg-surface-2/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400 [color-scheme:dark]';

// export default function LogsPage() {
//   const [logs, setLogs] = useState<Transaction[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(1);
//   const [total, setTotal] = useState(0);
//   const [filters, setFilters] = useState({ status: '', department: '', from: '', to: '' });

//   const LIMIT = 25;

//   useEffect(() => {
//     const fetchLogs = async () => {
//       setLoading(true);
//       try {
//         const params = new URLSearchParams({
//           page: String(page),
//           limit: String(LIMIT),
//           ...(filters.status && { status: filters.status }),
//           ...(filters.department && { department: filters.department }),
//           ...(filters.from && { from: filters.from }),
//           ...(filters.to && { to: filters.to }),
//         });
//         const res = await api.get(`/logs?${params}`);
//         setLogs(res.data.data);
//         setTotal(res.data.meta?.total ?? 0);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchLogs();
//   }, [page, filters]);

//   const statusColour = (s: string) => (s === 'RETURNED' ? 'SUCCESS' : s === 'OVERDUE' ? 'DANGER' : 'INFO');

//   return (
//     <div className="space-y-4">
//       {/* Filters */}
//       <Card className="p-4">
//         <div className="flex flex-wrap items-end gap-3">
//           <select
//             value={filters.status}
//             onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
//             className={fieldClass}
//           >
//             <option value="">All Status</option>
//             <option value="ACTIVE">Active</option>
//             <option value="RETURNED">Returned</option>
//             <option value="OVERDUE">Overdue</option>
//           </select>
//           <input
//             type="date"
//             value={filters.from}
//             onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
//             className={fieldClass}
//           />
//           <input
//             type="date"
//             value={filters.to}
//             onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
//             className={fieldClass}
//           />
//           <Button
//             variant="secondary"
//             onClick={() => setFilters({ status: '', department: '', from: '', to: '' })}
//           >
//             Clear
//           </Button>
//         </div>
//       </Card>

//       {/* Table */}
//       <Card>
//         {loading ? (
//           <div className="flex justify-center py-16">
//             <Spinner size="lg" />
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead className="border-b border-hairline bg-surface-2/40">
//                 <tr>
//                   {['Student', 'Roll No', 'Chemical', 'Lab', 'Taken', 'Returned', 'Used', 'Processed By', 'Status'].map(
//                     (h) => (
//                       <th
//                         key={h}
//                         className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
//                       >
//                         {h}
//                       </th>
//                     ),
//                   )}
//                 </tr>
//               </thead>
//               <motion.tbody
//                 variants={staggerContainer}
//                 initial="initial"
//                 animate="enter"
//                 className="divide-y divide-hairline"
//               >
//                 {logs.map((log) => (
//                   <motion.tr key={log.id} variants={fadeUpItem} className="transition-colors hover:bg-white/5">
//                     <td className="px-4 py-3 font-medium text-slate-100">{log.student?.name}</td>
//                     <td className="px-4 py-3 font-mono text-xs text-slate-400">{log.student?.rollNo}</td>
//                     <td className="px-4 py-3 text-slate-200">{log.bottle?.chemicalName}</td>
//                     <td className="px-4 py-3">
//                       {log.lab ? (
//                         <Badge label={LAB_LABELS[log.lab]} severity={LAB_BADGE_SEVERITY[log.lab]} />
//                       ) : (
//                         <span className="text-xs text-slate-600">—</span>
//                       )}
//                     </td>
//                     <td className="px-4 py-3 text-xs text-slate-400">
//                       {new Date(log.timeTaken).toLocaleString()}
//                     </td>
//                     <td className="px-4 py-3 text-xs text-slate-400">
//                       {log.timeReturned ? new Date(log.timeReturned).toLocaleString() : '—'}
//                     </td>
//                     <td className="px-4 py-3 tnum text-slate-200">
//                       {log.quantityUsed != null ? `${log.quantityUsed.toFixed(1)} ${log.bottle?.unit}` : '—'}
//                     </td>
//                     <td className="px-4 py-3 text-slate-400">{log.labIncharge?.name}</td>
//                     <td className="px-4 py-3">
//                       <Badge label={log.status} severity={statusColour(log.status)} />
//                     </td>
//                   </motion.tr>
//                 ))}
//               </motion.tbody>
//             </table>
//             {logs.length === 0 && <p className="py-12 text-center text-slate-500">No logs found</p>}
//           </div>
//         )}

//         {/* Pagination */}
//         <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
//           <p className="text-sm text-slate-500">
//             Showing {total === 0 ? 0 : (page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
//           </p>
//           <div className="flex gap-2">
//             <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
//               ← Prev
//             </Button>
//             <Button
//               variant="secondary"
//               size="sm"
//               disabled={page * LIMIT >= total}
//               onClick={() => setPage((p) => p + 1)}
//             >
//               Next →
//             </Button>
//           </div>
//         </div>
//       </Card>
//     </div>
//   );
// }
// new
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { staggerContainer, fadeUpItem } from '../lib/motion';
import { LAB_LABELS, LAB_BADGE_SEVERITY } from '../lib/lab';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import type { Transaction } from '../types';

const fieldClass =
  'rounded-xl border border-hairline bg-surface-2/60 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-400 [color-scheme:dark]';

export default function LogsPage() {
  const [logs, setLogs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', department: '', from: '', to: '' });
  const { on } = useSocket();

  const LIMIT = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(filters.status && { status: filters.status }),
        ...(filters.department && { department: filters.department }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      });
      const res = await api.get(`/logs?${params}`);
      setLogs(res.data.data);
      setTotal(res.data.meta?.total ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Live update — re-fetch the current page whenever any scan happens anywhere
  useEffect(() => {
    const unsub = on('new_event', () => {
      fetchLogs();
    });
    return unsub;
  }, [on, fetchLogs]);

  const statusColour = (s: string) => (s === 'RETURNED' ? 'SUCCESS' : s === 'OVERDUE' ? 'DANGER' : 'INFO');

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
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
            onClick={() => setFilters({ status: '', department: '', from: '', to: '' })}
          >
            Clear
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-hairline bg-surface-2/40">
                <tr>
                  {['Student', 'Roll No', 'Chemical', 'Lab', 'Taken', 'Returned', 'Used', 'Processed By', 'Status'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer}
                initial="initial"
                animate="enter"
                className="divide-y divide-hairline"
              >
                {logs.map((log) => (
                  <motion.tr key={log.id} variants={fadeUpItem} className="transition-colors hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-slate-100">{log.student?.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{log.student?.rollNo}</td>
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
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(log.timeTaken).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {log.timeReturned ? new Date(log.timeReturned).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 tnum text-slate-200">
                      {log.quantityUsed != null && log.bottle?.unit ? `${log.quantityUsed.toFixed(1)} ${log.bottle.unit}` : <span className="text-slate-500 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{log.labIncharge?.name}</td>
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

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
          <p className="text-sm text-slate-500">
            Showing {total === 0 ? 0 : (page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page * LIMIT >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}