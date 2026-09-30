export type UserRole = 'ADMIN' | 'LAB_INCHARGE' | 'STUDENT';

/* ===================== STUDENT ===================== */
export interface Student {
  id: string;
  name: string;
  rollNo: string;
  email?: string;
  batch: string;
  department: string;
  phone?: string;
  rfidTag?: string;
  isActive: boolean;
  lastRfidScan?: string;

  _count?: {
    transactions: number;
  };
}

/* ===================== LAB INCHARGE (NEW) ===================== */
export interface LabIncharge {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  department?: string;
  phone?: string;
  isActive: boolean;
  rfidTag?: string | null;

  _count?: {
    transactions: number;
  };
}

/* ===================== TRANSACTION ===================== */
export interface Transaction {
  id: string;

  initialWeight?: number;
  finalWeight?: number | null;
  quantityUsed?: number;
  purpose?: string;

  timeTaken: string;
  timeReturned?: string | null;

  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';

  lab?: 'LAB_A' | 'LAB_B' | null;

  bottle?: {
    id?: string;
    chemicalName: string;
    unit: string;
  };

  student?: {
    id?: string;
    name: string;
    rollNo?: string;
    department?: string;
  };

  labIncharge?: {
    id?: string;
    name?: string;
  };
}

/* ===================== ALERT (NEW FIX) ===================== */
export interface Alert {
  id: string;

  type:
    | 'LOW_STOCK'
    | 'CRITICAL_STOCK'
    | 'EMPTY_STOCK'
    | 'OVERFILL'
    | 'OVERLOAD'
    | 'EXCESSIVE_USAGE'
    | 'LEAKAGE'
    | 'UNAUTHORIZED_USAGE'
    | 'UNTRACKED_USAGE'
    | 'WRONG_RFID'
    | 'UNKNOWN_TAG'
    | 'UNAUTHORIZED_REFILL'
    | 'NOT_RETURNED';

  severity: 'INFO' | 'WARNING' | 'DANGER';

  message: string;

  createdAt: string;

  isResolved: boolean;
}