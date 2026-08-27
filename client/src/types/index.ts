// export type UserRole = 'ADMIN' | 'LAB_INCHARGE' | 'STUDENT';

// /* ===================== STUDENT ===================== */
// export interface Student {
//   id: string;
//   name: string;
//   rollNo: string;
//   email?: string;
//   batch: string;
//   department: string;
//   phone?: string;
//   rfidTag?: string;
//   isActive: boolean;
//   lastRfidScan?: string;

//   _count?: {
//     transactions: number;
//   };
// }

// /* ===================== LAB INCHARGE (NEW) ===================== */
// export interface LabIncharge {
//   id: string;
//   name: string;
//   email: string;
//   employeeId?: string;
//   department?: string;
//   phone?: string;
//   isActive: boolean;

//   _count?: {
//     transactions: number;
//   };
// }

// /* ===================== TRANSACTION ===================== */
// export interface Transaction {
//   id: string;

//   quantityUsed?: number;
//   purpose?: string;

//   timeTaken: string;
//   timeReturned?: string | null;

//   status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';

//   bottle?: {
//     id?: string;
//     chemicalName: string;
//     unit: string;
//   };

//   student?: {
//     id?: string;
//     name: string;
//     rollNo?: string;
//   };

//   labIncharge?: {
//     id?: string;
//     name?: string;
//   };
// }

// /* ===================== ALERT (NEW FIX) ===================== */
// export interface Alert {
//   id: string;

//   type:
//     | 'UNAUTHORIZED_ACCESS'
//     | 'LOW_STOCK'
//     | 'NOT_RETURNED'
//     | 'LEAKAGE'
//     | 'ANOMALY';

//   severity: 'INFO' | 'WARNING' | 'DANGER';

//   message: string;

//   createdAt: string;

//   isResolved: boolean;
// }

//new updated code 
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

  _count?: {
    transactions: number;
  };
}

/* ===================== TRANSACTION ===================== */
export interface Transaction {
  id: string;

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
    | 'UNAUTHORIZED_ACCESS'
    | 'LOW_STOCK'
    | 'NOT_RETURNED'
    | 'LEAKAGE'
    | 'ANOMALY';

  severity: 'INFO' | 'WARNING' | 'DANGER';

  message: string;

  createdAt: string;

  isResolved: boolean;
}