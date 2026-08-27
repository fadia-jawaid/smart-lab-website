import pkg from '@prisma/client';
import bcrypt from 'bcrypt';

const { PrismaClient } = pkg as any;
const prisma = new PrismaClient();

// ── date helpers ───────────────────────────────────────────────────
const daysAgo = (d: number, h = 10, m = 0) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(h, m, 0, 0);
  return x;
};
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000);
const minsAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

async function main() {
  // ── Admin ────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@smartlab.com' },
    update: { name: 'Lab Admin', isActive: true },
    create: { name: 'Lab Admin', email: 'admin@smartlab.com', password: adminHash },
  });

  // ── Lab Incharges ────────────────────────────────────────────────
  const inchargeHash = await bcrypt.hash('incharge123', 12);
  const inchargeData = [
    { name: 'Dr. Ahmed', email: 'incharge@smartlab.com', employeeId: 'EMP-001', department: 'Chemistry', phone: '0300-1112233' },
    { name: 'Ms. Sara Khan', email: 'sara@smartlab.com', employeeId: 'EMP-002', department: 'Chemistry', phone: '0301-2223344' },
    { name: 'Mr. Usman Ali', email: 'usman@smartlab.com', employeeId: 'EMP-003', department: 'Biology', phone: '0302-3334455' },
  ];
  const incharges: Record<string, any> = {};
  for (const i of inchargeData) {
    incharges[i.employeeId] = await prisma.labIncharge.upsert({
      where: { email: i.email },
      update: { name: i.name, employeeId: i.employeeId, department: i.department, phone: i.phone, isActive: true },
      create: { ...i, password: inchargeHash },
    });
  }

  // ── Students (all demo students share password "student123") ──────
  const studentHash = await bcrypt.hash('student123', 12);
  const studentData = [
    { name: 'Ali Hassan', rollNo: '21-CS-45', email: 'ali@student.com', batch: '2021-2025', department: 'Computer Science', rfidTag: 'A3F2B1C4', lastRfidScan: hoursAgo(2) },
    { name: 'Sara Iqbal', rollNo: '21-CS-12', email: 'sara.i@student.com', batch: '2021-2025', department: 'Computer Science', rfidTag: 'B7E4D9A1', lastRfidScan: hoursAgo(26) },
    { name: 'Bilal Ahmed', rollNo: '22-CH-08', email: 'bilal@student.com', batch: '2022-2026', department: 'Chemistry', rfidTag: 'C1F8E2B5', lastRfidScan: daysAgo(2, 11) },
    { name: 'Ayesha Noor', rollNo: '21-BIO-33', email: 'ayesha@student.com', batch: '2021-2025', department: 'Biology', rfidTag: 'D9A3C7F2', lastRfidScan: minsAgo(90) },
    { name: 'Hamza Tariq', rollNo: '23-CH-21', email: 'hamza@student.com', batch: '2023-2027', department: 'Chemistry', rfidTag: 'E5B1D8C3', lastRfidScan: daysAgo(1, 16) },
    { name: 'Fatima Zahra', rollNo: '22-BIO-15', email: 'fatima@student.com', batch: '2022-2026', department: 'Biology', rfidTag: null, lastRfidScan: null },
  ];
  const students: Record<string, any> = {};
  for (const s of studentData) {
    students[s.rollNo] = await prisma.student.upsert({
      where: { rollNo: s.rollNo },
      update: {
        name: s.name, email: s.email, batch: s.batch, department: s.department,
        rfidTag: s.rfidTag, lastRfidScan: s.lastRfidScan, password: studentHash, isActive: true,
      },
      create: { ...s, password: studentHash },
    });
  }

  // ── Bottles (some intentionally low to trigger low-stock visuals) ─
  const bottleData = [
    { rfidTag: 'BTL-HCL-01', chemicalName: 'Hydrochloric Acid', unit: 'ml', initialQty: 1000, currentQty: 850, location: 'Shelf B-3', supplier: 'Merck', lowStockPct: 20, description: 'HCl 37% laboratory grade' },
    { rfidTag: 'BTL-H2SO4-01', chemicalName: 'Sulfuric Acid', unit: 'ml', initialQty: 1000, currentQty: 120, location: 'Shelf B-1', supplier: 'Sigma-Aldrich', lowStockPct: 20, description: 'H2SO4 concentrated' },
    { rfidTag: 'BTL-NAOH-01', chemicalName: 'Sodium Hydroxide', unit: 'g', initialQty: 500, currentQty: 380, location: 'Cabinet A-2', supplier: 'Merck', lowStockPct: 20, description: 'NaOH pellets' },
    { rfidTag: 'BTL-ETOH-01', chemicalName: 'Ethanol', unit: 'ml', initialQty: 2000, currentQty: 1450, location: 'Shelf C-1', supplier: 'Honeywell', lowStockPct: 15, description: 'Absolute ethanol 99.9%' },
    { rfidTag: 'BTL-ACET-01', chemicalName: 'Acetone', unit: 'ml', initialQty: 1000, currentQty: 90, location: 'Shelf C-2', supplier: 'Honeywell', lowStockPct: 20, description: 'Acetone ACS reagent' },
    { rfidTag: 'BTL-MEOH-01', chemicalName: 'Methanol', unit: 'ml', initialQty: 1000, currentQty: 540, location: 'Shelf C-3', supplier: 'Sigma-Aldrich', lowStockPct: 20, description: 'Methanol HPLC grade' },
    { rfidTag: 'BTL-NH3-01', chemicalName: 'Ammonia Solution', unit: 'ml', initialQty: 500, currentQty: 460, location: 'Cabinet A-1', supplier: 'Merck', lowStockPct: 20, description: 'Ammonia 25%' },
    { rfidTag: 'BTL-H2O2-01', chemicalName: 'Hydrogen Peroxide', unit: 'ml', initialQty: 500, currentQty: 75, location: 'Shelf B-2', supplier: 'Merck', lowStockPct: 20, description: 'H2O2 30%' },
    { rfidTag: 'BTL-ACAC-01', chemicalName: 'Acetic Acid', unit: 'ml', initialQty: 1000, currentQty: 700, location: 'Shelf B-4', supplier: 'Sigma-Aldrich', lowStockPct: 20, description: 'Glacial acetic acid' },
  ];
  const bottles: Record<string, any> = {};
  for (const b of bottleData) {
    bottles[b.rfidTag] = await prisma.bottle.upsert({
      where: { rfidTag: b.rfidTag },
      update: { ...b },
      create: { ...b },
    });
  }

  // ── Reset dynamic data so re-seeding stays clean ──────────────────
  await prisma.transaction.deleteMany();
  await prisma.alert.deleteMany();

  // ── Transactions (logs / scan history) ────────────────────────────
  // status: RETURNED (done) · ACTIVE (out now) · OVERDUE (out too long)
  const txDefs: {
    roll: string; btl: string; emp: string; iw: number; fw: number | null;
    taken: Date; returned: Date | null; status: string; purpose: string;
  }[] = [
    { roll: '21-CS-45', btl: 'BTL-HCL-01', emp: 'EMP-001', iw: 980, fw: 955, taken: daysAgo(6, 9), returned: daysAgo(6, 11), status: 'RETURNED', purpose: 'Titration experiment' },
    { roll: '21-CS-45', btl: 'BTL-ETOH-01', emp: 'EMP-002', iw: 1500, fw: 1460, taken: daysAgo(4, 13), returned: daysAgo(4, 15), status: 'RETURNED', purpose: 'Extraction lab' },
    { roll: '21-CS-45', btl: 'BTL-ACET-01', emp: 'EMP-001', iw: 200, fw: null, taken: hoursAgo(3), returned: null, status: 'ACTIVE', purpose: 'Cleaning glassware' },
    { roll: '21-CS-45', btl: 'BTL-HCL-01', emp: 'EMP-002', iw: 955, fw: 930, taken: daysAgo(2, 9), returned: daysAgo(2, 10), status: 'RETURNED', purpose: 'Titration repeat' },
    { roll: '21-CS-45', btl: 'BTL-ETOH-01', emp: 'EMP-002', iw: 1455, fw: null, taken: minsAgo(45), returned: null, status: 'ACTIVE', purpose: 'Recrystallization' },
    { roll: '21-CS-12', btl: 'BTL-NAOH-01', emp: 'EMP-001', iw: 420, fw: 400, taken: daysAgo(5, 10), returned: daysAgo(5, 12), status: 'RETURNED', purpose: 'pH buffer prep' },
    { roll: '21-CS-12', btl: 'BTL-MEOH-01', emp: 'EMP-003', iw: 600, fw: 560, taken: daysAgo(2, 14), returned: daysAgo(2, 16), status: 'RETURNED', purpose: 'Chromatography' },
    { roll: '21-CS-12', btl: 'BTL-ACET-01', emp: 'EMP-001', iw: 150, fw: null, taken: hoursAgo(5), returned: null, status: 'ACTIVE', purpose: 'Residue removal' },
    { roll: '21-CS-12', btl: 'BTL-HCL-01', emp: 'EMP-001', iw: 930, fw: 910, taken: daysAgo(1, 13), returned: daysAgo(1, 14), status: 'RETURNED', purpose: 'Standardization' },
    { roll: '22-CH-08', btl: 'BTL-H2SO4-01', emp: 'EMP-001', iw: 300, fw: 250, taken: daysAgo(6, 11), returned: daysAgo(6, 13), status: 'RETURNED', purpose: 'Acid digestion' },
    { roll: '22-CH-08', btl: 'BTL-H2O2-01', emp: 'EMP-002', iw: 150, fw: null, taken: daysAgo(2, 10), returned: null, status: 'OVERDUE', purpose: 'Oxidation test' },
    { roll: '22-CH-08', btl: 'BTL-ETOH-01', emp: 'EMP-002', iw: 1470, fw: 1455, taken: hoursAgo(28), returned: hoursAgo(26), status: 'RETURNED', purpose: 'Tincture prep' },
    { roll: '22-CH-08', btl: 'BTL-MEOH-01', emp: 'EMP-001', iw: 560, fw: 545, taken: hoursAgo(6), returned: hoursAgo(5), status: 'RETURNED', purpose: 'Spectroscopy sample' },
    { roll: '21-BIO-33', btl: 'BTL-NH3-01', emp: 'EMP-003', iw: 480, fw: 460, taken: daysAgo(3, 9), returned: daysAgo(3, 10), status: 'RETURNED', purpose: 'Microbiology staining' },
    { roll: '21-BIO-33', btl: 'BTL-ETOH-01', emp: 'EMP-003', iw: 1480, fw: 1460, taken: daysAgo(1, 9), returned: daysAgo(1, 11), status: 'RETURNED', purpose: 'Sterilization' },
    { roll: '21-BIO-33', btl: 'BTL-ETOH-01', emp: 'EMP-003', iw: 1460, fw: null, taken: minsAgo(90), returned: null, status: 'ACTIVE', purpose: 'Cell fixation' },
    { roll: '21-BIO-33', btl: 'BTL-NAOH-01', emp: 'EMP-003', iw: 400, fw: 385, taken: daysAgo(6, 10), returned: daysAgo(6, 11), status: 'RETURNED', purpose: 'Gel preparation' },
    { roll: '23-CH-21', btl: 'BTL-HCL-01', emp: 'EMP-001', iw: 970, fw: 950, taken: daysAgo(3, 14), returned: daysAgo(3, 15), status: 'RETURNED', purpose: 'Neutralization' },
    { roll: '23-CH-21', btl: 'BTL-ACAC-01', emp: 'EMP-002', iw: 800, fw: 740, taken: daysAgo(5, 12), returned: daysAgo(5, 14), status: 'RETURNED', purpose: 'Ester synthesis' },
    { roll: '23-CH-21', btl: 'BTL-ACAC-01', emp: 'EMP-002', iw: 740, fw: 700, taken: daysAgo(1, 11), returned: daysAgo(1, 12), status: 'RETURNED', purpose: 'Esterification follow-up' },
    { roll: '23-CH-21', btl: 'BTL-H2SO4-01', emp: 'EMP-001', iw: 280, fw: null, taken: daysAgo(1, 16), returned: null, status: 'OVERDUE', purpose: 'Sulfonation' },
    { roll: '22-BIO-15', btl: 'BTL-MEOH-01', emp: 'EMP-003', iw: 580, fw: 540, taken: daysAgo(4, 10), returned: daysAgo(4, 12), status: 'RETURNED', purpose: 'Solvent prep' },
    { roll: '22-BIO-15', btl: 'BTL-NH3-01', emp: 'EMP-003', iw: 470, fw: 460, taken: daysAgo(2, 9), returned: daysAgo(2, 10), status: 'RETURNED', purpose: 'Buffer adjustment' },
    { roll: '22-CH-08', btl: 'BTL-H2O2-01', emp: 'EMP-001', iw: 100, fw: 75, taken: hoursAgo(20), returned: hoursAgo(18), status: 'RETURNED', purpose: 'Bleaching assay' },
  ];

  await prisma.transaction.createMany({
    data: txDefs.map((t) => ({
      studentId: students[t.roll].id,
      bottleId: bottles[t.btl].id,
      labInchargeId: incharges[t.emp].id,
      initialWeight: t.iw,
      finalWeight: t.fw,
      quantityUsed: t.fw == null ? null : t.iw - t.fw,
      timeTaken: t.taken,
      timeReturned: t.returned,
      status: t.status,
      purpose: t.purpose,
    })),
  });

  // ── Alerts (every type + severity, some resolved) ─────────────────
  await prisma.alert.createMany({
    data: [
      { type: 'LOW_STOCK', severity: 'DANGER', message: 'Sulfuric Acid is critically low (120 ml / 1000 ml — 12%)', bottleId: bottles['BTL-H2SO4-01'].id, isResolved: false, createdAt: daysAgo(1, 8) },
      { type: 'LOW_STOCK', severity: 'WARNING', message: 'Acetone running low (90 ml / 1000 ml — 9%)', bottleId: bottles['BTL-ACET-01'].id, isResolved: false, createdAt: hoursAgo(10) },
      { type: 'LOW_STOCK', severity: 'WARNING', message: 'Hydrogen Peroxide low (75 ml / 500 ml — 15%)', bottleId: bottles['BTL-H2O2-01'].id, isResolved: false, createdAt: daysAgo(2, 9) },
      { type: 'NOT_RETURNED', severity: 'WARNING', message: 'Bilal Ahmed (22-CH-08) has not returned Hydrogen Peroxide — overdue', studentId: students['22-CH-08'].id, bottleId: bottles['BTL-H2O2-01'].id, isResolved: false, createdAt: daysAgo(1, 12) },
      { type: 'UNAUTHORIZED_ACCESS', severity: 'DANGER', message: 'Unknown RFID card scanned at the reader: FF00AA99', isResolved: false, createdAt: hoursAgo(7) },
      { type: 'LEAKAGE', severity: 'DANGER', message: 'Possible leakage on Ethanol — 65 ml drop detected in a single session', bottleId: bottles['BTL-ETOH-01'].id, isResolved: true, resolvedBy: admin.id, resolvedAt: hoursAgo(30), createdAt: daysAgo(2, 15) },
      { type: 'ANOMALY', severity: 'INFO', message: 'Unusual usage: Hamza Tariq used 2.4× their average for Acetic Acid', studentId: students['23-CH-21'].id, bottleId: bottles['BTL-ACAC-01'].id, isResolved: false, createdAt: daysAgo(1, 13) },
      { type: 'NOT_RETURNED', severity: 'WARNING', message: 'Hamza Tariq (23-CH-21) has not returned Sulfuric Acid — overdue', studentId: students['23-CH-21'].id, bottleId: bottles['BTL-H2SO4-01'].id, isResolved: true, resolvedBy: admin.id, resolvedAt: hoursAgo(12), createdAt: daysAgo(1, 17) },
    ],
  });

  // ── Settings ──────────────────────────────────────────────────────
  const defaults = [
    { key: 'ALERT_OVERDUE_MINUTES', value: '30' },
    { key: 'ALERT_LOW_STOCK_PCT', value: '20' },
    { key: 'ALERT_LEAKAGE_GRAMS', value: '50' },
  ];
  for (const s of defaults) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  const counts = {
    admins: await prisma.admin.count(),
    incharges: await prisma.labIncharge.count(),
    students: await prisma.student.count(),
    bottles: await prisma.bottle.count(),
    transactions: await prisma.transaction.count(),
    alerts: await prisma.alert.count(),
  };
  console.log('Seed complete:', counts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
