// One-time fix: old Alert rows still have the pre-rename type values
// (UNAUTHORIZED_ACCESS, ANOMALY, OVERWEIGHT), which no longer exist in
// the AlertType enum after the recent rename. Prisma throws a validation
// error trying to read them, which is why /alerts was failing to load
// even though /alerts/count (which never reads the `type` column)
// worked fine.
//
// Run once from the `server` folder:
//   npx tsx fix-alert-types.ts
// (or: npx ts-node fix-alert-types.ts)

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const RENAMES: Record<string, string> = {
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_USAGE',
  ANOMALY:              'UNTRACKED_USAGE',
  OVERWEIGHT:           'OVERLOAD',
};

async function main() {
  let totalUpdated = 0;

  for (const [oldType, newType] of Object.entries(RENAMES)) {
    const result = await db.$executeRawUnsafe(
      `UPDATE "Alert" SET "type" = ? WHERE "type" = ?`,
      newType,
      oldType,
    );
    console.log(`  ${oldType} → ${newType}: ${result} row(s) updated`);
    totalUpdated += Number(result);
  }

  console.log(`\n✅ Done. ${totalUpdated} alert row(s) fixed.`);
}

main()
  .catch((err) => {
    console.error('❌ Fix script failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());