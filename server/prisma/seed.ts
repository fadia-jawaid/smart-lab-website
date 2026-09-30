import pkg from '@prisma/client';
import bcrypt from 'bcrypt';

const { PrismaClient } = pkg as any;
const prisma = new PrismaClient();

async function main() {
  // ── Clean slate ──────────────────────────────────────────────────
  // Remove old demo inventory data before creating the prototype data.
  // Foreign-key dependent records are deleted first.

  await prisma.alert.deleteMany();
  await prisma.restockLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.bottle.deleteMany();
  await prisma.labIncharge.deleteMany();

  // ── Admin ────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 12);

  await prisma.admin.upsert({
    where: {
      email: 'admin@smartlab.com',
    },
    update: {
      name: 'Lab Admin',
      isActive: true,
    },
    create: {
      name: 'Lab Admin',
      email: 'admin@smartlab.com',
      password: adminHash,
    },
  });

  // ── Lab Incharge ─────────────────────────────────────────────────
  const inchargeHash = await bcrypt.hash('incharge123', 12);

  await prisma.labIncharge.upsert({
    where: {
      email: 'incharge@smartlab.com',
    },
    update: {
      name: 'Dr. Ahmed',
      employeeId: 'EMP-001',
      department: 'Chemistry',
      phone: '0300-1112233',
      rfidTag: '2369D694',
      isActive: true,
    },
    create: {
      name: 'Dr. Ahmed',
      email: 'incharge@smartlab.com',
      employeeId: 'EMP-001',
      department: 'Chemistry',
      phone: '0300-1112233',
      rfidTag: '2369D694',
      password: inchargeHash,
    },
  });

  // ── Demo Student ─────────────────────────────────────────────────
  // The login page advertises "Student: 21-CS-45 / student123" as a demo
  // account, but this record never actually existed in the seed data, so
  // that demo login always failed with "Invalid credentials".
  const studentHash = await bcrypt.hash('student123', 12);

  await prisma.student.upsert({
    where: {
      rollNo: '21-CS-45',
    },
    update: {
      name: 'Ali Hassan',
      batch: '2021-2025',
      department: 'Computer Science',
      isActive: true,
    },
    create: {
      name: 'Ali Hassan',
      rollNo: '21-CS-45',
      email: 'ali.hassan@student.smartlab.com',
      password: studentHash,
      batch: '2021-2025',
      department: 'Computer Science',
    },
  });

  // ── Prototype Bottles ────────────────────────────────────────────
  //
  // LAB A prototype inventory
  //
  // Quantities are in GRAMS (see Fix 3 — bottles are weighed by HX711
  // load cells, never measured by volume). Values below are reconciled
  // with Lab A firmware's real calibration ceilings:
  //   HCL_MAX_NET_GRAMS = 92, ETHANOL_MAX_NET_GRAMS = 93
  // and the firmware author's note that bottles are normally topped up
  // to ~50g (not filled to the physical maximum).
  //
  // HCl:
  // Initial = 50 g   |   maxCapacity = 92 g
  // Current = 50 g
  // Low stock = 20% = 18.4 g
  //
  // Ethanol:
  // Initial = 50 g   |   maxCapacity = 93 g
  // Current = 50 g
  // Low stock = 15% = 13.95 g

  const bottleData = [
    {
      rfidTag: 'BTL-HCL-01',
      chemicalName: 'Hydrochloric Acid',
      unit: 'g',

      // Starting quantity
      initialQty: 50,

      // Current available quantity
      currentQty: 50,

      // Real calibrated ceiling from Lab A firmware (HCL_MAX_NET_GRAMS)
      maxCapacity: 92,

      location: 'Shelf A-2',
      supplier: 'Merck',

      // Low stock at 20%
      // 92 g × 20% = 18.4 g
      lowStockPct: 20,

      description: 'HCl 37% laboratory grade',
    },

    {
      rfidTag: 'BTL-ETOH-01',
      chemicalName: 'Ethanol',
      unit: 'g',

      // Starting quantity
      initialQty: 50,

      // Current available quantity
      currentQty: 50,

      // Real calibrated ceiling from Lab A firmware (ETHANOL_MAX_NET_GRAMS)
      maxCapacity: 93,

      location: 'Shelf A-1',
      supplier: 'Honeywell',

      // Low stock at 15%
      // 93 g × 15% = 13.95 g
      lowStockPct: 15,

      description: 'Absolute ethanol 99.9%',
    },
  ];

  // ── Create / Update Bottles ──────────────────────────────────────
  for (const bottle of bottleData) {
    await prisma.bottle.upsert({
      where: {
        rfidTag: bottle.rfidTag,
      },
      update: {
        ...bottle,
      },
      create: {
        ...bottle,
      },
    });
  }

  // ── Settings ─────────────────────────────────────────────────────
  const defaults = [
    {
      key: 'ALERT_OVERDUE_MINUTES',
      value: '30',
    },
    {
      key: 'ALERT_LOW_STOCK_PCT',
      value: '7',
    },
    {
      key: 'ALERT_LEAKAGE_GRAMS',
      value: '5',
    },
  ];

  for (const setting of defaults) {
    await prisma.setting.upsert({
      where: {
        key: setting.key,
      },
      update: {},
      create: setting,
    });
  }

  // ── Final Counts ─────────────────────────────────────────────────
  const counts = {
    admins: await prisma.admin.count(),
    incharges: await prisma.labIncharge.count(),
    students: await prisma.student.count(),
    bottles: await prisma.bottle.count(),
  };

  // ── Final Output ─────────────────────────────────────────────────
  console.log('');
  console.log('========================================');
  console.log('       SMART LAB TRACKER SEED');
  console.log('========================================');

  console.log('');
  console.log('Admin:', counts.admins);
  console.log('Lab Incharge:', counts.incharges);
  console.log('Students:', counts.students);
  console.log('Bottles:', counts.bottles);

  console.log('');
  console.log('🧪 CHEMICAL INVENTORY');
  console.log('----------------------------------------');

  console.log('🧪 HCl      : 20 mL');
  console.log('   Low Stock: 4 mL or below');

  console.log('');

  console.log('🧪 Ethanol  : 20 mL');
  console.log('   Low Stock: 3 mL or below');

  console.log('');
  console.log('----------------------------------------');

  console.log('Admin Login');
  console.log('Email: admin@smartlab.com');
  console.log('Password: admin123');

  console.log('');
  console.log('Lab Incharge Login');
  console.log('Email: incharge@smartlab.com');
  console.log('Password: incharge123');
  console.log('RFID: 2369D694');

  console.log('');
  console.log('Student Login (demo)');
  console.log('Roll No: 21-CS-45');
  console.log('Password: student123');

  console.log('');
  console.log('========================================');
  console.log('✅ Prototype seed complete');
  console.log('========================================');
  console.log('Add students and their real RFID UIDs from Admin panel.');
}

main()
  .catch((error) => {
    console.error('');
    console.error('❌ Seed failed:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });