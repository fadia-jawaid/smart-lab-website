// scripts/normalize-bottle-units.ts
//
// One-time fix: the "Add Chemical Bottle" form used to let a Lab Incharge
// pick a unit of "g" or "ml" per bottle, and the API never validated it —
// so bottles created before this fix may still have unit = "ml" (or
// anything else) saved in the database. The whole system is standardized
// on grams now (the load cell hardware only ever measures weight), and
// routes/inventory.ts no longer accepts any other value for new/edited
// bottles. This script sweeps existing rows and corrects any leftovers.
//
// IMPORTANT: this only rewrites the unit LABEL, not the numbers. The raw
// currentQty/initialQty values already came from the same weight sensor
// regardless of what unit label was picked at creation time, so they don't
// need to change — only the (wrong) "ml" text next to them does.
//
// Run once from the `server` folder:
//   npx tsx scripts/normalize-bottle-units.ts

import { db } from '../src/config/db';

const STANDARD_UNIT = 'g';

async function main() {
  console.log('🔧 Normalizing all bottle units to grams (g)...\n');

  const mismatched = await db.bottle.findMany({
    where: { unit: { not: STANDARD_UNIT } },
    select: { id: true, chemicalName: true, rfidTag: true, unit: true },
  });

  if (mismatched.length === 0) {
    console.log('✅ Nothing to fix — every bottle already uses "g".');
    return;
  }

  for (const bottle of mismatched) {
    await db.bottle.update({
      where: { id: bottle.id },
      data: { unit: STANDARD_UNIT },
    });
    console.log(
      `  ✅ ${bottle.chemicalName} (${bottle.rfidTag}): "${bottle.unit}" -> "${STANDARD_UNIT}"`,
    );
  }

  console.log(`\n${mismatched.length} bottle(s) fixed.`);
}

main()
  .catch((err) => {
    console.error('❌ Failed to normalize bottle units:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });