// scripts/fix-plaintext-passwords.ts
//
// One-time fix: some Student rows were created directly via Prisma
// Studio, which just stores whatever text you type — it does NOT run
// the app's normal signup logic that calls hashPassword(). Login always
// compares with bcrypt.compare(), so a plaintext password can never
// match, no matter what you type in the portal ("Invalid credentials").
//
// This script finds any Student (and, just in case, LabIncharge/Admin)
// row whose password does NOT already look like a bcrypt hash
// (bcrypt hashes always start with "$2a$", "$2b$", or "$2y$"), and
// re-hashes it in place with the same settings the app itself uses.
// Rows that are already hashed (like the one created through the real
// signup/add-student flow) are left completely untouched.
//
// Run once from the `server` folder:
//   npx tsx scripts/fix-plaintext-passwords.ts

import { db } from '../src/config/db';
import { hashPassword } from '../src/utils/password';

const BCRYPT_PREFIX = /^\$2[aby]\$/;

async function fixTable(
  label: string,
  findMany: () => Promise<{ id: string; password: string; name?: string; rollNo?: string }[]>,
  update: (id: string, hashed: string) => Promise<unknown>,
) {
  const rows = await findMany();
  let fixed = 0;

  for (const row of rows) {
    if (BCRYPT_PREFIX.test(row.password)) {
      continue; // already a real bcrypt hash — leave it alone
    }

    const plainPassword = row.password;
    const hashed = await hashPassword(plainPassword);
    await update(row.id, hashed);

    fixed++;
    console.log(
      `  ✅ ${label} "${row.name ?? row.rollNo ?? row.id}": ` +
      `plaintext "${plainPassword}" -> hashed`,
    );
  }

  console.log(`${label}: ${fixed} row(s) fixed, ${rows.length - fixed} already OK.\n`);
}

async function main() {
  console.log('🔧 Fixing any plaintext passwords left over from manual Prisma Studio entries...\n');

  await fixTable(
    'Student',
    () => db.student.findMany({ select: { id: true, password: true, name: true, rollNo: true } }),
    (id, hashed) => db.student.update({ where: { id }, data: { password: hashed } }),
  );

  await fixTable(
    'LabIncharge',
    () => db.labIncharge.findMany({ select: { id: true, password: true, name: true } }),
    (id, hashed) => db.labIncharge.update({ where: { id }, data: { password: hashed } }),
  );

  await fixTable(
    'Admin',
    () => db.admin.findMany({ select: { id: true, password: true, name: true } }),
    (id, hashed) => db.admin.update({ where: { id }, data: { password: hashed } }),
  );

  console.log('✅ Done. Everyone can now log in with the password shown in the "plaintext" line above.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});