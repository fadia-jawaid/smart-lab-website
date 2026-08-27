export type UserRole = 'ADMIN' | 'LAB_INCHARGE' | 'STUDENT';

export interface AuthUser {
  id:         string;
  name:       string;
  email:      string;
  role:       UserRole;
  rollNo?:    string;   // students only
  batch?:     string;   // students only
  department?:string;   // students only
}

export interface Student {
  id:          string;
  name:        string;
  rollNo:      string;
  email:       string | null;
  batch:       string;
  department:  string;
  phone:       string | null;
  rfidTag:     string | null;
  isActive:    boolean;
  lastLogin:   string | null;
  lastRfidScan:string | null;
  createdAt:   string;
  _count?:     { transactions: number };
}

export interface LabIncharge {
  id:         string;
  name:       string;
  email:      string;
  employeeId: string | null;
  department: string | null;
  phone:      string | null;
  isActive:   boolean;
  lastLogin:  string | null;
}

export interface Bottle {
  id:          string;
  rfidTag:     string;
  chemicalName:string;
  description: string | null;
  unit:        string;
  initialQty:  number;
  currentQty:  number;
  lowStockPct: number;
  location:    string | null;
  supplier:    string | null;
  isActive:    boolean;
  qtyLevel:    'full' | 'medium' | 'low';
}

export interface Transaction {
  id:            string;
  studentId:     string;
  bottleId:      string;
  labInchargeId: string;
  initialWeight: number;
  finalWeight:   number | null;
  quantityUsed:  number | null;
  timeTaken:     string;
  timeReturned:  string | null;
  status:        'ACTIVE' | 'RETURNED' | 'OVERDUE';
  notes:         string | null;
  purpose:       string | null;
  student?:      Pick<Student, 'id' | 'name' | 'rollNo' | 'department'>;
  bottle?:       Pick<Bottle, 'id' | 'chemicalName' | 'unit'>;
  labIncharge?:  Pick<LabIncharge, 'id' | 'name'>;
}

export interface Alert {
  id:         string;
  type:       'UNAUTHORIZED_ACCESS' | 'LOW_STOCK' | 'NOT_RETURNED' | 'LEAKAGE' | 'ANOMALY';
  severity:   'INFO' | 'WARNING' | 'DANGER';
  message:    string;
  isResolved: boolean;
  createdAt:  string;
}