// import { useState, useEffect } from 'react';
// import { Search } from 'lucide-react';
// import { Card } from '../components/ui/Card';
// import { Badge } from '../components/ui/Badge';
// import { Input } from '../components/ui/Input';
// import { Spinner } from '../components/ui/Spinner';
// import api from '../services/api';
// import type { Transaction } from '../types';

// export default function MyHistoryPage() {
//   const [transactions, setTransactions] = useState<Transaction[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState('');

//   useEffect(() => {
//     api
//       .get('/my/history')
//       .then((res) => setTransactions(res.data.data))
//       .catch(() => {})
//       .finally(() => setLoading(false));
//   }, []);

//   const filtered = transactions.filter(
//     (t) => !filter || t.bottle?.chemicalName.toLowerCase().includes(filter.toLowerCase()),
//   );

//   if (loading)
//     return (
//       <div className="flex justify-center py-20">
//         <Spinner size="lg" />
//       </div>
//     );

//   return (
//     <div className="space-y-4">
//       <div className="flex items-center justify-between gap-4">
//         <div className="w-64">
//           <Input
//             icon={<Search size={16} />}
//             value={filter}
//             onChange={(e) => setFilter(e.target.value)}
//             placeholder="Filter by chemical…"
//           />
//         </div>
//         <p className="text-sm text-slate-500">{filtered.length} records</p>
//       </div>

//       <Card>
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead className="border-b border-hairline bg-surface-2/40">
//               <tr>
//                 {['Chemical', 'Quantity Used', 'Purpose', 'Date Taken', 'Date Returned', 'Status'].map((h) => (
//                   <th
//                     key={h}
//                     className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
//                   >
//                     {h}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-hairline">
//               {filtered.map((tx) => (
//                 <tr key={tx.id} className="transition-colors hover:bg-white/5">
//                   <td className="px-4 py-3 font-medium text-slate-100">{tx.bottle?.chemicalName}</td>
//                   <td className="px-4 py-3 tnum text-slate-200">
//                     {tx.quantityUsed != null ? `${tx.quantityUsed.toFixed(1)} ${tx.bottle?.unit}` : '—'}
//                   </td>
//                   <td className="px-4 py-3 text-slate-400">{tx.purpose ?? '—'}</td>
//                   <td className="px-4 py-3 text-xs text-slate-400">{new Date(tx.timeTaken).toLocaleString()}</td>
//                   <td className="px-4 py-3 text-xs text-slate-400">
//                     {tx.timeReturned ? new Date(tx.timeReturned).toLocaleString() : '—'}
//                   </td>
//                   <td className="px-4 py-3">
//                     <Badge
//                       label={tx.status}
//                       severity={tx.status === 'RETURNED' ? 'SUCCESS' : tx.status === 'OVERDUE' ? 'DANGER' : 'INFO'}
//                     />
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           {filtered.length === 0 && (
//             <p className="py-12 text-center text-slate-500">No chemical usage recorded yet</p>
//           )}
//         </div>
//       </Card>
//     </div>
//   );
// }


// new updated code

// import { useState, useEffect } from 'react';
// import { Search } from 'lucide-react';
// import { Card } from '../components/ui/Card';
// import { Badge } from '../components/ui/Badge';
// import { Input } from '../components/ui/Input';
// import { Spinner } from '../components/ui/Spinner';
// import { LAB_LABELS } from '../lib/lab';
// import api from '../services/api';
// import type { Transaction } from '../types';

// export default function MyHistoryPage() {
//   const [transactions, setTransactions] = useState<Transaction[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState('');

//   useEffect(() => {
//     api
//       .get('/my/history')
//       .then((res) => setTransactions(res.data.data))
//       .catch(() => {})
//       .finally(() => setLoading(false));
//   }, []);

//   const filtered = transactions.filter(
//     (t) => !filter || t.bottle?.chemicalName.toLowerCase().includes(filter.toLowerCase()),
//   );

//   if (loading)
//     return (
//       <div className="flex justify-center py-20">
//         <Spinner size="lg" />
//       </div>
//     );

//   return (
//     <div className="space-y-4">
//       <div className="flex items-center justify-between gap-4">
//         <div className="w-64">
//           <Input
//             icon={<Search size={16} />}
//             value={filter}
//             onChange={(e) => setFilter(e.target.value)}
//             placeholder="Filter by chemical…"
//           />
//         </div>
//         <p className="text-sm text-slate-500">{filtered.length} records</p>
//       </div>

//       <Card>
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead className="border-b border-hairline bg-surface-2/40">
//               <tr>
//                 {['Chemical', 'Quantity Used', 'Purpose', 'Date Taken', 'Date Returned', 'Status'].map((h) => (
//                   <th
//                     key={h}
//                     className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
//                   >
//                     {h}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-hairline">
//               {filtered.map((tx) => (
//                 <tr key={tx.id} className="transition-colors hover:bg-white/5">
//                   <td className="px-4 py-3 font-medium text-slate-100">{tx.bottle?.chemicalName}</td>
//                   <td className="px-4 py-3 tnum text-slate-200">
//                     {tx.quantityUsed != null ? `${tx.quantityUsed.toFixed(1)} ${tx.bottle?.unit}` : '—'}
//                     {tx.lab && <span className="ml-1 text-slate-500">({LAB_LABELS[tx.lab]})</span>}
//                   </td>
//                   <td className="px-4 py-3 text-slate-400">{tx.purpose ?? '—'}</td>
//                   <td className="px-4 py-3 text-xs text-slate-400">{new Date(tx.timeTaken).toLocaleString()}</td>
//                   <td className="px-4 py-3 text-xs text-slate-400">
//                     {tx.timeReturned ? new Date(tx.timeReturned).toLocaleString() : '—'}
//                   </td>
//                   <td className="px-4 py-3">
//                     <Badge
//                       label={tx.status}
//                       severity={tx.status === 'RETURNED' ? 'SUCCESS' : tx.status === 'OVERDUE' ? 'DANGER' : 'INFO'}
//                     />
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           {filtered.length === 0 && (
//             <p className="py-12 text-center text-slate-500">No chemical usage recorded yet</p>
//           )}
//         </div>
//       </Card>
//     </div>
//   );
// }

//new updated codeee
// import { useState, useEffect } from 'react';
// import { Search } from 'lucide-react';
// import { Card } from '../components/ui/Card';
// import { Badge } from '../components/ui/Badge';
// import { Input } from '../components/ui/Input';
// import { Spinner } from '../components/ui/Spinner';
// import { LAB_LABELS, LAB_BADGE_SEVERITY } from '../lib/lab';
// import api from '../services/api';
// import type { Transaction } from '../types';

// export default function MyHistoryPage() {
//   const [transactions, setTransactions] = useState<Transaction[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [filter, setFilter] = useState('');

//   useEffect(() => {
//     api
//       .get('/my/history')
//       .then((res) => setTransactions(res.data.data))
//       .catch(() => {})
//       .finally(() => setLoading(false));
//   }, []);

//   const filtered = transactions.filter(
//     (t) => !filter || t.bottle?.chemicalName.toLowerCase().includes(filter.toLowerCase()),
//   );

//   if (loading)
//     return (
//       <div className="flex justify-center py-20">
//         <Spinner size="lg" />
//       </div>
//     );

//   return (
//     <div className="space-y-4">
//       <div className="flex items-center justify-between gap-4">
//         <div className="w-64">
//           <Input
//             icon={<Search size={16} />}
//             value={filter}
//             onChange={(e) => setFilter(e.target.value)}
//             placeholder="Filter by chemical…"
//           />
//         </div>
//         <p className="text-sm text-slate-500">{filtered.length} records</p>
//       </div>

//       <Card>
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead className="border-b border-hairline bg-surface-2/40">
//               <tr>
//                 {['Chemical', 'Quantity Used', 'Lab', 'Purpose', 'Date Taken', 'Date Returned', 'Status'].map((h) => (
//                   <th
//                     key={h}
//                     className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
//                   >
//                     {h}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-hairline">
//               {filtered.map((tx) => (
//                 <tr key={tx.id} className="transition-colors hover:bg-white/5">
//                   <td className="px-4 py-3 font-medium text-slate-100">{tx.bottle?.chemicalName}</td>
//                   <td className="px-4 py-3 tnum text-slate-200">
//                     {tx.quantityUsed != null ? `${tx.quantityUsed.toFixed(1)} ${tx.bottle?.unit}` : '—'}
//                   </td>
//                   <td className="px-4 py-3">
//                     {tx.lab ? (
//                       <Badge label={LAB_LABELS[tx.lab]} severity={LAB_BADGE_SEVERITY[tx.lab]} />
//                     ) : (
//                       <span className="text-xs text-slate-600">—</span>
//                     )}
//                   </td>
//                   <td className="px-4 py-3 text-slate-400">{tx.purpose ?? '—'}</td>
//                   <td className="px-4 py-3 text-xs text-slate-400">{new Date(tx.timeTaken).toLocaleString()}</td>
//                   <td className="px-4 py-3 text-xs text-slate-400">
//                     {tx.timeReturned ? new Date(tx.timeReturned).toLocaleString() : '—'}
//                   </td>
//                   <td className="px-4 py-3">
//                     <Badge
//                       label={tx.status}
//                       severity={tx.status === 'RETURNED' ? 'SUCCESS' : tx.status === 'OVERDUE' ? 'DANGER' : 'INFO'}
//                     />
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           {filtered.length === 0 && (
//             <p className="py-12 text-center text-slate-500">No chemical usage recorded yet</p>
//           )}
//         </div>
//       </Card>
//     </div>
//   );
// }

//new
import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { LAB_LABELS, LAB_BADGE_SEVERITY } from '../lib/lab';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import type { Transaction } from '../types';

export default function MyHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const { on } = useSocket();

  const fetchHistory = useCallback(() => {
    api
      .get('/my/history')
      .then((res) => setTransactions(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Live update — re-fetch whenever any scan happens anywhere
  useEffect(() => {
    const unsub = on('new_event', () => {
      fetchHistory();
    });
    return unsub;
  }, [on, fetchHistory]);

  const filtered = transactions.filter(
    (t) => !filter || t.bottle?.chemicalName.toLowerCase().includes(filter.toLowerCase()),
  );

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );

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
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
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
                    <Badge
                      label={tx.status}
                      severity={tx.status === 'RETURNED' ? 'SUCCESS' : tx.status === 'OVERDUE' ? 'DANGER' : 'INFO'}
                    />
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