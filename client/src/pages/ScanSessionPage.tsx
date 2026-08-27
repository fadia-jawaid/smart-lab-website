// import { useState, useEffect, useCallback } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import toast from 'react-hot-toast';
// import { ArrowDownToLine, ArrowUpFromLine, Radio, ScanLine, FlaskConical, CheckCircle2 } from 'lucide-react';
// import { Card } from '../components/ui/Card';
// import { Button } from '../components/ui/Button';
// import { Input } from '../components/ui/Input';
// import { Badge } from '../components/ui/Badge';
// import { ScanPipeline } from '../components/scan/ScanPipeline';
// import { useSocket } from '../hooks/useSocket';
// import api from '../services/api';
// import { cn } from '../lib/cn';
// import type { AxiosError } from 'axios';

// type Mode = 'take' | 'return';
// type Step = 'student' | 'bottle' | 'select' | 'confirm';

// interface StudentInfo {
//   id?: string;
//   name?: string;
//   rollNo?: string;
//   department?: string;
//   rfidTag?: string;
// }

// interface ActiveTx {
//   id: string;
//   initialWeight: number;
//   timeTaken: string;
//   student?: { name: string; rollNo: string; department?: string };
//   bottle?: { chemicalName: string; unit: string };
// }

// interface ScanData {
//   transaction?: { bottle?: { chemicalName?: string }; student?: { name?: string } };
// }

// const STEP_INDEX: Record<Step, number> = { student: 0, bottle: 1, select: 1, confirm: 3 };

// export default function ScanSessionPage() {
//   const [mode, setMode] = useState<Mode>('take');
//   const [step, setStep] = useState<Step>('student');

//   const [student, setStudent] = useState<StudentInfo | null>(null);
//   const [scanData, setScanData] = useState<ScanData>({});
//   const [studentRfid, setStudentRfid] = useState('');
//   const [bottleRfid, setBottleRfid] = useState('');
//   const [weight, setWeight] = useState('');
//   const [purpose, setPurpose] = useState('');

//   const [activeTxns, setActiveTxns] = useState<ActiveTx[]>([]);
//   const [selectedTxn, setSelectedTxn] = useState<ActiveTx | null>(null);
//   const [returnResult, setReturnResult] = useState<{
//     quantityUsed: number;
//     remainingQty: number;
//     chemical?: string;
//     unit?: string;
//   } | null>(null);

//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [iotActive, setIotActive] = useState(false); // shows when real RFID scan detected

//   const { on } = useSocket();

//   // ── Auto-scan triggered by Socket.io (real IoT RFID reader) ──────
//   const handleAutoScanStudent = useCallback(async (rfidTag: string) => {
//     setIotActive(true);
//     setLoading(true);
//     setError('');
//     try {
//       const res = await api.get('/students');
//       const found: StudentInfo | undefined = res.data.data.find(
//         (s: { rfidTag?: string }) => s.rfidTag === rfidTag,
//       );
//       if (!found) {
//         setError('Student RFID not recognized. Card is not registered in the system.');
//         setIotActive(false);
//         return;
//       }
//       setStudent(found);
//       setStudentRfid(rfidTag);

//       if (mode === 'take') {
//         setStep('bottle');
//       } else {
//         const act = await api.get('/scan/active');
//         const mine: ActiveTx[] = act.data.data.filter(
//           (t: ActiveTx) => t.student?.rollNo === found.rollNo,
//         );
//         setActiveTxns(mine);
//         setStep('select');
//       }
//     } catch {
//       setError('Failed to verify student');
//     } finally {
//       setLoading(false);
//       setTimeout(() => setIotActive(false), 2000);
//     }
//   }, [mode]);

//   // ── Socket.io listeners for real RFID hardware ───────────────────
//   useEffect(() => {
//     // Student card scanned on physical RFID reader
//     const unsubStudent = on('rfid_student_scanned', (data: { rfidTag: string }) => {
//       if (step === 'student') {
//         setStudentRfid(data.rfidTag.toUpperCase());
//         void handleAutoScanStudent(data.rfidTag.toUpperCase());
//       }
//     });

//     // Bottle tag scanned on physical RFID reader (also carries weight from load cell)
//     const unsubBottle = on('rfid_bottle_scanned', (data: { rfidTag: string; weight?: number }) => {
//       if (step === 'bottle') {
//         setBottleRfid(data.rfidTag.toUpperCase());
//         if (data.weight !== undefined && data.weight > 0) {
//           setWeight(String(data.weight));
//           toast.success(`Bottle scanned — weight: ${data.weight}g`);
//         }
//       }
//     });

 

//     return () => {
//       unsubStudent();
//       unsubBottle();
//     };
//   }, [step, on, handleAutoScanStudent]);

//   const reset = () => {
//     setStep('student');
//     setStudent(null);
//     setScanData({});
//     setStudentRfid('');
//     setBottleRfid('');
//     setWeight('');
//     setPurpose('');
//     setActiveTxns([]);
//     setSelectedTxn(null);
//     setReturnResult(null);
//     setError('');
//     setIotActive(false);
//   };

//   const switchMode = (m: Mode) => {
//     setMode(m);
//     reset();
//   };

//   // Step 1 — manual verify (fallback when no physical reader)
//   const handleScanStudent = async () => {
//     if (!studentRfid.trim()) {
//       setError('Enter the student RFID');
//       return;
//     }
//     setLoading(true);
//     setError('');
//     try {
//       const res = await api.get('/students');
//       const found: StudentInfo | undefined = res.data.data.find(
//         (s: { rfidTag?: string }) => s.rfidTag === studentRfid.toUpperCase().trim(),
//       );
//       if (!found) {
//         setError('Student RFID not recognized');
//         return;
//       }
//       setStudent(found);

//       if (mode === 'take') {
//         setStep('bottle');
//       } else {
//         const act = await api.get('/scan/active');
//         const mine: ActiveTx[] = act.data.data.filter(
//           (t: ActiveTx) => t.student?.rollNo === found.rollNo,
//         );
//         setActiveTxns(mine);
//         setStep('select');
//       }
//     } catch {
//       setError('Failed to verify student');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Take flow — record a new checkout
//   const handleScanBottle = async () => {
//     if (!bottleRfid.trim() || !weight.trim()) {
//       setError('Enter bottle RFID and weight');
//       return;
//     }
//     setLoading(true);
//     setError('');
//     try {
//       const res = await api.post('/scan/start', {
//         studentRfid: studentRfid.toUpperCase(),
//         bottleRfid: bottleRfid.toUpperCase(),
//         initialWeight: Number(weight),
//       });
//       setScanData(res.data.data);
//       setStep('confirm');
//       toast.success('Chemical checked out');
//     } catch (err) {
//       const e = err as AxiosError<{ error?: string }>;
//       const msg = e.response?.data?.error || 'Scan failed';
//       setError(
//         e.response?.status === 409
//           ? `${msg}. Switch to "Chemical Return" to check it back in.`
//           : msg,
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Return flow — complete an active checkout
//   const handleReturn = async () => {
//     if (!selectedTxn) {
//       setError('Select the chemical being returned');
//       return;
//     }
//     if (!weight.trim()) {
//       setError('Enter the final weight from the load cell');
//       return;
//     }
//     setLoading(true);
//     setError('');
//     try {
//       const res = await api.post('/scan/complete', {
//         transactionId: selectedTxn.id,
//         finalWeight: Number(weight),
//         purpose: purpose || undefined,
//       });
//       setReturnResult({
//         quantityUsed: res.data.data.quantityUsed,
//         remainingQty: res.data.data.remainingQty,
//         chemical: selectedTxn.bottle?.chemicalName,
//         unit: selectedTxn.bottle?.unit,
//       });
//       setStep('confirm');
//       toast.success('Chemical returned');
//     } catch (err) {
//       const e = err as AxiosError<{ error?: string }>;
//       setError(e.response?.data?.error || 'Return failed');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="mx-auto max-w-2xl space-y-6">
//       {/* Mode toggle */}
//       <div className="flex gap-3">
//         {(['take', 'return'] as const).map((m) => {
//           const Icon = m === 'take' ? ArrowUpFromLine : ArrowDownToLine;
//           return (
//             <button
//               key={m}
//               onClick={() => switchMode(m)}
//               className={cn(
//                 'flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all',
//                 mode === m
//                   ? 'bg-brand-gradient text-white shadow-glow'
//                   : 'border border-hairline bg-surface-2/40 text-slate-400 hover:text-slate-200',
//               )}
//             >
//               <Icon size={16} />
//               {m === 'take' ? 'Chemical Take' : 'Chemical Return'}
//             </button>
//           );
//         })}
//       </div>

//       {/* Animated tracking pipeline */}
//       <Card className="p-6">
//         <ScanPipeline current={STEP_INDEX[step]} />
//       </Card>

//       {/* IoT scan detected indicator */}
//       <AnimatePresence>
//         {iotActive && (
//           <motion.div
//             initial={{ opacity: 0, y: -6 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -6 }}
//             className="flex items-center gap-3 rounded-xl border border-accent-400/30 bg-accent-400/10 px-4 py-3"
//           >
//             <Radio size={16} className="animate-pulse text-accent-400" />
//             <span className="text-sm font-medium text-accent-400">
//               RFID card detected — verifying automatically…
//             </span>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {error && (
//         <motion.div
//           initial={{ opacity: 0, y: -6 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
//         >
//           {error}
//         </motion.div>
//       )}

//       {/* Verified student banner */}
//       {step !== 'student' && student && (
//         <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
//           <Card className="flex items-center gap-3 border-success/30 p-4">
//             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20 font-bold text-success">
//               {student.name?.[0]}
//             </div>
//             <div className="flex-1">
//               <p className="font-semibold text-slate-100">{student.name}</p>
//               <p className="text-sm text-slate-400">
//                 {student.rollNo} · {student.department}
//               </p>
//             </div>
//             <Badge label="Verified" severity="SUCCESS" pulse />
//           </Card>
//         </motion.div>
//       )}

//       <AnimatePresence mode="wait">
//         {/* Step 1 — scan student */}
//         {step === 'student' && (
//           <motion.div
//             key="student"
//             initial={{ opacity: 0, y: 12 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -12 }}
//           >
//             <Card className="p-6">
//               <div className="mb-4 flex items-center gap-2 text-accent-400">
//                 <Radio size={18} className="animate-pulse" />
//                 <h2 className="font-display text-lg font-semibold text-slate-100">
//                   Step 1 · Scan Student RFID Card
//                 </h2>
//               </div>
//               <p className="mb-4 text-sm text-slate-400">
//                 {mode === 'take'
//                   ? 'Tap the student card on the reader, or enter the UID manually.'
//                   : 'Scan the returning student to see what they have checked out.'}
//               </p>

//               {/* Real-time IoT RFID scan indicator */}
//               <div className="mb-5 flex items-center gap-2 rounded-xl border border-accent-400/20 bg-accent-400/5 px-4 py-3">
//                 <Radio size={14} className="animate-pulse text-accent-400" />
//                 <span className="text-xs text-slate-400">
//                   Waiting for RFID reader scan — or enter UID manually below
//                 </span>
//               </div>

//               <Input
//                 label="Student RFID Card UID"
//                 value={studentRfid}
//                 onChange={(e) => setStudentRfid(e.target.value.toUpperCase())}
//                 placeholder="e.g. A3F2B1C4"
//                 autoFocus
//               />
//               <div className="mt-4">
//                 <Button
//                   onClick={handleScanStudent}
//                   loading={loading}
//                   className="w-full"
//                   size="lg"
//                 >
//                   <ScanLine size={18} /> Verify Student Card
//                 </Button>
//               </div>
//             </Card>
//           </motion.div>
//         )}

//         {/* Step 2 (take) — scan bottle + initial weight */}
//         {step === 'bottle' && (
//           <motion.div
//             key="bottle"
//             initial={{ opacity: 0, y: 12 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -12 }}
//           >
//             <Card className="p-6">
//               <div className="mb-4 flex items-center gap-2 text-accent-400">
//                 <Radio size={18} className="animate-pulse" />
//                 <h2 className="font-display text-lg font-semibold text-slate-100">
//                   Step 2 · Scan Chemical Bottle
//                 </h2>
//               </div>
//               <p className="mb-4 text-sm text-slate-400">
//                 Scan the bottle's RFID tag — the load cell weight will auto-fill if connected.
//               </p>

//               {/* IoT bottle scan indicator */}
//               <div className="mb-5 flex items-center gap-2 rounded-xl border border-accent-400/20 bg-accent-400/5 px-4 py-3">
//                 <Radio size={14} className="animate-pulse text-accent-400" />
//                 <span className="text-xs text-slate-400">
//                   Waiting for bottle RFID scan — weight auto-fills from load cell
//                 </span>
//               </div>

//               <div className="space-y-4">
//                 <Input
//                   label="Bottle RFID Tag"
//                   value={bottleRfid}
//                   onChange={(e) => setBottleRfid(e.target.value.toUpperCase())}
//                   placeholder="e.g. BTL-HCL-01"
//                   autoFocus
//                 />
//                 <Input
//                   label="Initial Weight (grams)"
//                   type="number"
//                   value={weight}
//                   onChange={(e) => setWeight(e.target.value)}
//                   placeholder="e.g. 850"
//                 />
//               </div>
//               <div className="mt-6 flex gap-3">
//                 <Button variant="secondary" onClick={() => setStep('student')}>
//                   ← Back
//                 </Button>
//                 <Button
//                   onClick={handleScanBottle}
//                   loading={loading}
//                   className="flex-1"
//                 >
//                   Confirm &amp; Record →
//                 </Button>
//               </div>
//             </Card>
//           </motion.div>
//         )}

//         {/* Step 2 (return) — pick the checked-out bottle + final weight */}
//         {step === 'select' && (
//           <motion.div
//             key="select"
//             initial={{ opacity: 0, y: 12 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -12 }}
//           >
//             <Card className="p-6">
//               <h2 className="mb-4 font-display text-lg font-semibold text-slate-100">
//                 Step 2 · Select Chemical to Return
//               </h2>

//               {activeTxns.length === 0 ? (
//                 <p className="py-6 text-center text-sm text-slate-500">
//                   This student has no chemicals currently checked out.
//                 </p>
//               ) : (
//                 <>
//                   <div className="space-y-2">
//                     {activeTxns.map((t) => (
//                       <button
//                         key={t.id}
//                         onClick={() => setSelectedTxn(t)}
//                         className={cn(
//                           'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
//                           selectedTxn?.id === t.id
//                             ? 'border-brand-500/60 bg-brand-500/10 shadow-glow'
//                             : 'border-hairline bg-surface-2/40 hover:border-slate-600',
//                         )}
//                       >
//                         <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
//                           <FlaskConical size={18} />
//                         </span>
//                         <div className="flex-1">
//                           <p className="text-sm font-medium text-slate-100">
//                             {t.bottle?.chemicalName}
//                           </p>
//                           <p className="text-xs text-slate-500">
//                             Taken {new Date(t.timeTaken).toLocaleString()} · initial{' '}
//                             {t.initialWeight} g
//                           </p>
//                         </div>
//                         {selectedTxn?.id === t.id && (
//                           <CheckCircle2 size={18} className="text-accent-400" />
//                         )}
//                       </button>
//                     ))}
//                   </div>

//                   <div className="mt-4">
//                     <Input
//                       label="Final Weight (grams)"
//                       type="number"
//                       value={weight}
//                       onChange={(e) => setWeight(e.target.value)}
//                       placeholder="e.g. 820"
//                     />
//                   </div>
//                   <div className="mt-4">
//                     <Input
//                       label="Purpose / Experiment (optional)"
//                       value={purpose}
//                       onChange={(e) => setPurpose(e.target.value)}
//                       placeholder="e.g. Titration experiment"
//                     />
//                   </div>
//                 </>
//               )}

//               <div className="mt-6 flex gap-3">
//                 <Button variant="secondary" onClick={() => setStep('student')}>
//                   ← Back
//                 </Button>
//                 {activeTxns.length > 0 && (
//                   <Button
//                     onClick={handleReturn}
//                     loading={loading}
//                     className="flex-1"
//                     disabled={!selectedTxn}
//                   >
//                     Confirm Return →
//                   </Button>
//                 )}
//               </div>
//             </Card>
//           </motion.div>
//         )}

//         {/* Step 3 — confirmation */}
//         {step === 'confirm' && (
//           <motion.div
//             key="confirm"
//             initial={{ opacity: 0, scale: 0.97 }}
//             animate={{ opacity: 1, scale: 1 }}
//             exit={{ opacity: 0 }}
//           >
//             <Card className="p-6">
//               {mode === 'take' ? (
//                 <>
//                   <h2 className="mb-4 font-display text-lg font-semibold text-success">
//                     ✅ Chemical Checked Out
//                   </h2>
//                   <div className="mb-6 space-y-1">
//                     {[
//                       ['Chemical', scanData.transaction?.bottle?.chemicalName],
//                       ['Student',  scanData.transaction?.student?.name],
//                       ['Initial Weight', `${weight} g`],
//                       ['Time', new Date().toLocaleTimeString()],
//                     ].map(([label, value]) => (
//                       <div
//                         key={label as string}
//                         className="flex justify-between border-b border-hairline py-2 text-sm"
//                       >
//                         <span className="text-slate-400">{label}</span>
//                         <span className="font-medium text-slate-100">{value}</span>
//                       </div>
//                     ))}
//                   </div>
//                 </>
//               ) : (
//                 <>
//                   <h2 className="mb-4 font-display text-lg font-semibold text-success">
//                     ✅ Chemical Returned
//                   </h2>
//                   <div className="mb-4 rounded-2xl border border-hairline bg-surface-2/40 p-4 text-center">
//                     <p className="text-xs uppercase tracking-wide text-slate-500">Quantity Used</p>
//                     <p className="tnum mt-1 text-4xl font-semibold text-accent-400">
//                       {returnResult?.quantityUsed.toFixed(1)}{' '}
//                       <span className="text-lg text-slate-400">{returnResult?.unit}</span>
//                     </p>
//                   </div>
//                   <div className="mb-6 space-y-1">
//                     {[
//                       ['Chemical', returnResult?.chemical],
//                       ['Student',  student?.name],
//                       ['Final Weight', `${weight} g`],
//                       ['Remaining Stock', `${returnResult?.remainingQty?.toFixed(1)} ${returnResult?.unit}`],
//                     ].map(([label, value]) => (
//                       <div
//                         key={label as string}
//                         className="flex justify-between border-b border-hairline py-2 text-sm"
//                       >
//                         <span className="text-slate-400">{label}</span>
//                         <span className="font-medium text-slate-100">{value}</span>
//                       </div>
//                     ))}
//                   </div>
//                 </>
//               )}
//               <Button onClick={reset} className="w-full" size="lg">
//                 Start New Scan Session
//               </Button>
//             </Card>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   )
// }

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowDownToLine, ArrowUpFromLine, Radio, ScanLine, FlaskConical, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ScanPipeline } from '../components/scan/ScanPipeline';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import { cn } from '../lib/cn';
import type { AxiosError } from 'axios';

type Mode = 'take' | 'return';
type Step = 'student' | 'bottle' | 'select' | 'confirm';

interface StudentInfo {
  id?: string;
  name?: string;
  rollNo?: string;
  department?: string;
  rfidTag?: string;
}

interface ActiveTx {
  id: string;
  initialWeight: number;
  timeTaken: string;
  student?: { name: string; rollNo: string; department?: string };
  bottle?: { chemicalName: string; unit: string };
}

interface ScanData {
  transaction?: { bottle?: { chemicalName?: string }; student?: { name?: string } };
}

const STEP_INDEX: Record<Step, number> = { student: 0, bottle: 1, select: 1, confirm: 3 };

export default function ScanSessionPage() {
  const [mode, setMode] = useState<Mode>('take');
  const [step, setStep] = useState<Step>('student');

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [scanData, setScanData] = useState<ScanData>({});
  const [studentRfid, setStudentRfid] = useState('');
  const [bottleRfid, setBottleRfid] = useState('');
  const [weight, setWeight] = useState('');
  const [purpose, setPurpose] = useState('');

  const [activeTxns, setActiveTxns] = useState<ActiveTx[]>([]);
  const [selectedTxn, setSelectedTxn] = useState<ActiveTx | null>(null);
  const [returnResult, setReturnResult] = useState<{
    quantityUsed: number;
    remainingQty: number;
    chemical?: string;
    unit?: string;
  } | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [iotActive, setIotActive] = useState(false); // shows when real RFID scan detected

  const { on } = useSocket();

  // ── Auto-scan triggered by Socket.io (real IoT RFID reader) ──────
  const handleAutoScanStudent = useCallback(async (rfidTag: string) => {
    setIotActive(true);
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/students');
      const found: StudentInfo | undefined = res.data.data.find(
        (s: { rfidTag?: string }) => s.rfidTag === rfidTag,
      );
      if (!found) {
        setError('Student RFID not recognized. Card is not registered in the system.');
        setIotActive(false);
        return;
      }
      setStudent(found);
      setStudentRfid(rfidTag);

      if (mode === 'take') {
        setStep('bottle');
      } else {
        const act = await api.get('/scan/active');
        const mine: ActiveTx[] = act.data.data.filter(
          (t: ActiveTx) => t.student?.rollNo === found.rollNo,
        );
        setActiveTxns(mine);
        setStep('select');
      }
    } catch {
      setError('Failed to verify student');
    } finally {
      setLoading(false);
      setTimeout(() => setIotActive(false), 2000);
    }
  }, [mode]);

  // ── Socket.io listeners for real RFID hardware ───────────────────
  useEffect(() => {
    // Student card scanned on physical RFID reader
    const unsubStudent = on('rfid_student_scanned', (data: { rfidTag: string }) => {
      if (step === 'student') {
        setStudentRfid(data.rfidTag.toUpperCase());
        void handleAutoScanStudent(data.rfidTag.toUpperCase());
      }
    });

    // Bottle tag scanned / load cell weight event on physical hardware.
    // Fires in BOTH flows:
    //  - Take (step === 'bottle'): sets the bottle RFID tag AND the weight.
    //  - Return (step === 'select'): a chemical must already be selected
    //    (selectedTxn set) before we accept a weight reading.
    const unsubBottle = on('rfid_bottle_scanned', (data: { rfidTag: string; weight?: number }) => {
      if (step === 'bottle') {
        setBottleRfid(data.rfidTag.toUpperCase());
        if (data.weight !== undefined && data.weight > 0) {
          setWeight(String(data.weight));
          toast.success(`Bottle scanned — weight: ${data.weight}g`);
        }
      } else if (step === 'select' && selectedTxn) {
        if (data.weight !== undefined && data.weight > 0) {
          setWeight(String(data.weight));
          toast.success(`Weight detected: ${data.weight}g`);
        }
      }
    });

    return () => {
      unsubStudent();
      unsubBottle();
    };
  }, [step, on, handleAutoScanStudent, selectedTxn]);

  const reset = () => {
    setStep('student');
    setStudent(null);
    setScanData({});
    setStudentRfid('');
    setBottleRfid('');
    setWeight('');
    setPurpose('');
    setActiveTxns([]);
    setSelectedTxn(null);
    setReturnResult(null);
    setError('');
    setIotActive(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    reset();
  };

  // Step 1 — manual verify (fallback when no physical reader)
  const handleScanStudent = async () => {
    if (!studentRfid.trim()) {
      setError('Enter the student RFID');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/students');
      const found: StudentInfo | undefined = res.data.data.find(
        (s: { rfidTag?: string }) => s.rfidTag === studentRfid.toUpperCase().trim(),
      );
      if (!found) {
        setError('Student RFID not recognized');
        return;
      }
      setStudent(found);

      if (mode === 'take') {
        setStep('bottle');
      } else {
        const act = await api.get('/scan/active');
        const mine: ActiveTx[] = act.data.data.filter(
          (t: ActiveTx) => t.student?.rollNo === found.rollNo,
        );
        setActiveTxns(mine);
        setStep('select');
      }
    } catch {
      setError('Failed to verify student');
    } finally {
      setLoading(false);
    }
  };

  // Take flow — record a new checkout
  const handleScanBottle = async () => {
    if (!bottleRfid.trim() || !weight.trim()) {
      setError('Enter bottle RFID and weight');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/scan/start', {
        studentRfid: studentRfid.toUpperCase(),
        bottleRfid: bottleRfid.toUpperCase(),
        initialWeight: Number(weight),
      });
      setScanData(res.data.data);
      setStep('confirm');
      toast.success('Chemical checked out');
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      const msg = e.response?.data?.error || 'Scan failed';
      setError(
        e.response?.status === 409
          ? `${msg}. Switch to "Chemical Return" to check it back in.`
          : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  // Return flow — complete an active checkout
  const handleReturn = async () => {
    if (!selectedTxn) {
      setError('Select the chemical being returned');
      return;
    }
    if (!weight.trim()) {
      setError('Enter the final weight from the load cell');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/scan/complete', {
        transactionId: selectedTxn.id,
        finalWeight: Number(weight),
        purpose: purpose || undefined,
      });
      setReturnResult({
        quantityUsed: res.data.data.quantityUsed,
        remainingQty: res.data.data.remainingQty,
        chemical: selectedTxn.bottle?.chemicalName,
        unit: selectedTxn.bottle?.unit,
      });
      setStep('confirm');
      toast.success('Chemical returned');
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setError(e.response?.data?.error || 'Return failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-3">
        {(['take', 'return'] as const).map((m) => {
          const Icon = m === 'take' ? ArrowUpFromLine : ArrowDownToLine;
          return (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all',
                mode === m
                  ? 'bg-brand-gradient text-white shadow-glow'
                  : 'border border-hairline bg-surface-2/40 text-slate-400 hover:text-slate-200',
              )}
            >
              <Icon size={16} />
              {m === 'take' ? 'Chemical Take' : 'Chemical Return'}
            </button>
          );
        })}
      </div>

      {/* Animated tracking pipeline */}
      <Card className="p-6">
        <ScanPipeline current={STEP_INDEX[step]} />
      </Card>

      {/* IoT scan detected indicator */}
      <AnimatePresence>
        {iotActive && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-3 rounded-xl border border-accent-400/30 bg-accent-400/10 px-4 py-3"
          >
            <Radio size={16} className="animate-pulse text-accent-400" />
            <span className="text-sm font-medium text-accent-400">
              RFID card detected — verifying automatically…
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </motion.div>
      )}

      {/* Verified student banner */}
      {step !== 'student' && student && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="flex items-center gap-3 border-success/30 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20 font-bold text-success">
              {student.name?.[0]}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-100">{student.name}</p>
              <p className="text-sm text-slate-400">
                {student.rollNo} · {student.department}
              </p>
            </div>
            <Badge label="Verified" severity="SUCCESS" pulse />
          </Card>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1 — scan student */}
        {step === 'student' && (
          <motion.div
            key="student"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2 text-accent-400">
                <Radio size={18} className="animate-pulse" />
                <h2 className="font-display text-lg font-semibold text-slate-100">
                  Step 1 · Scan Student RFID Card
                </h2>
              </div>
              <p className="mb-4 text-sm text-slate-400">
                {mode === 'take'
                  ? 'Tap the student card on the reader, or enter the UID manually.'
                  : 'Scan the returning student to see what they have checked out.'}
              </p>

              {/* Real-time IoT RFID scan indicator */}
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-accent-400/20 bg-accent-400/5 px-4 py-3">
                <Radio size={14} className="animate-pulse text-accent-400" />
                <span className="text-xs text-slate-400">
                  Waiting for RFID reader scan — or enter UID manually below
                </span>
              </div>

              <Input
                label="Student RFID Card UID"
                value={studentRfid}
                onChange={(e) => setStudentRfid(e.target.value.toUpperCase())}
                placeholder="e.g. A3F2B1C4"
                autoFocus
              />
              <div className="mt-4">
                <Button
                  onClick={handleScanStudent}
                  loading={loading}
                  className="w-full"
                  size="lg"
                >
                  <ScanLine size={18} /> Verify Student Card
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 2 (take) — scan bottle + initial weight */}
        {step === 'bottle' && (
          <motion.div
            key="bottle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2 text-accent-400">
                <Radio size={18} className="animate-pulse" />
                <h2 className="font-display text-lg font-semibold text-slate-100">
                  Step 2 · Scan Chemical Bottle
                </h2>
              </div>
              <p className="mb-4 text-sm text-slate-400">
                Scan the bottle's RFID tag — the load cell weight will auto-fill if connected.
              </p>

              {/* IoT bottle scan indicator */}
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-accent-400/20 bg-accent-400/5 px-4 py-3">
                <Radio size={14} className="animate-pulse text-accent-400" />
                <span className="text-xs text-slate-400">
                  Waiting for bottle RFID scan — weight auto-fills from load cell
                </span>
              </div>

              <div className="space-y-4">
                <Input
                  label="Bottle RFID Tag"
                  value={bottleRfid}
                  onChange={(e) => setBottleRfid(e.target.value.toUpperCase())}
                  placeholder="e.g. BTL-HCL-01"
                  autoFocus
                />
                <Input
                  label="Initial Weight (grams)"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 850"
                />
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="secondary" onClick={() => setStep('student')}>
                  ← Back
                </Button>
                <Button
                  onClick={handleScanBottle}
                  loading={loading}
                  className="flex-1"
                >
                  Confirm &amp; Record →
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 2 (return) — pick the checked-out bottle + final weight */}
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2 text-accent-400">
                <Radio size={18} className="animate-pulse" />
                <h2 className="font-display text-lg font-semibold text-slate-100">
                  Step 2 · Select &amp; Weigh Bottle for Return
                </h2>
              </div>
              <p className="mb-4 text-sm text-slate-400">
                Select the chemical being returned, then place the bottle on the load
                cell — the final weight will auto-fill if connected.
              </p>

              {activeTxns.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  This student has no chemicals currently checked out.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    {activeTxns.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTxn(t)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
                          selectedTxn?.id === t.id
                            ? 'border-brand-500/60 bg-brand-500/10 shadow-glow'
                            : 'border-hairline bg-surface-2/40 hover:border-slate-600',
                        )}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                          <FlaskConical size={18} />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-100">
                            {t.bottle?.chemicalName}
                          </p>
                          <p className="text-xs text-slate-500">
                            Taken {new Date(t.timeTaken).toLocaleString()} · initial{' '}
                            {t.initialWeight} g
                          </p>
                        </div>
                        {selectedTxn?.id === t.id && (
                          <CheckCircle2 size={18} className="text-accent-400" />
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedTxn && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-accent-400/20 bg-accent-400/5 px-4 py-3">
                      <Radio size={14} className="animate-pulse text-accent-400" />
                      <span className="text-xs text-slate-400">
                        Waiting for bottle on load cell — weight auto-fills from load cell
                      </span>
                    </div>
                  )}

                  <div className="mt-4">
                    <Input
                      label="Final Weight (grams)"
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 820"
                    />
                  </div>
                  <div className="mt-4">
                    <Input
                      label="Purpose / Experiment (optional)"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="e.g. Titration experiment"
                    />
                  </div>
                </>
              )}

              <div className="mt-6 flex gap-3">
                <Button variant="secondary" onClick={() => setStep('student')}>
                  ← Back
                </Button>
                {activeTxns.length > 0 && (
                  <Button
                    onClick={handleReturn}
                    loading={loading}
                    className="flex-1"
                    disabled={!selectedTxn}
                  >
                    Confirm Return →
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 3 — confirmation */}
        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-6">
              {mode === 'take' ? (
                <>
                  <h2 className="mb-4 font-display text-lg font-semibold text-success">
                    ✅ Chemical Checked Out
                  </h2>
                  <div className="mb-6 space-y-1">
                    {[
                      ['Chemical', scanData.transaction?.bottle?.chemicalName],
                      ['Student',  scanData.transaction?.student?.name],
                      ['Initial Weight', `${weight} g`],
                      ['Time', new Date().toLocaleTimeString()],
                    ].map(([label, value]) => (
                      <div
                        key={label as string}
                        className="flex justify-between border-b border-hairline py-2 text-sm"
                      >
                        <span className="text-slate-400">{label}</span>
                        <span className="font-medium text-slate-100">{value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mb-4 font-display text-lg font-semibold text-success">
                    ✅ Chemical Returned
                  </h2>
                  <div className="mb-4 rounded-2xl border border-hairline bg-surface-2/40 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Quantity Used</p>
                    <p className="tnum mt-1 text-4xl font-semibold text-accent-400">
                      {returnResult?.quantityUsed.toFixed(1)}{' '}
                      <span className="text-lg text-slate-400">{returnResult?.unit}</span>
                    </p>
                  </div>
                  <div className="mb-6 space-y-1">
                    {[
                      ['Chemical', returnResult?.chemical],
                      ['Student',  student?.name],
                      ['Final Weight', `${weight} g`],
                      ['Remaining Stock', `${returnResult?.remainingQty?.toFixed(1)} ${returnResult?.unit}`],
                    ].map(([label, value]) => (
                      <div
                        key={label as string}
                        className="flex justify-between border-b border-hairline py-2 text-sm"
                      >
                        <span className="text-slate-400">{label}</span>
                        <span className="font-medium text-slate-100">{value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <Button onClick={reset} className="w-full" size="lg">
                Start New Scan Session
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}