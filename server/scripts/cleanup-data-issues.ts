// scripts/cleanup-data-issues.ts
//
// One-time cleanup for three specific data problems found in an earlier
// audit of this database:
//
//   1. RFID tags with stray leading/trailing whitespace or lowercase
//      letters (e.g. "0B69E506 ") — the ESP32 always sends a trimmed,
//      uppercase tag, so a card saved with extra whitespace can never
//      match a real scan again, with no visible sign anything is wrong
//      (it looks identical in the admin UI).
//   2. Open stock alerts (LOW_STOCK/CRITICAL_STOCK/EMPTY_STOCK) left over
//      from before a bottle's quantity was corrected — these used to
//      never auto-resolve on a manual edit, so a bottle that's actually
//      fine can still show an old "Out of Stock" alert.
//   3. Negative refills (a RestockLog row where the bottle's quantity
//      went DOWN during what was logged as a "refill") — these can't be
//      safely auto-corrected without knowing what really happened at the
//      scale, so this only REPORTS them for a human to review; it does
//      not change any numbers.
//
// Run once from the `server` folder:
//   npx tsx scripts/cleanup-data-issues.ts

import { db } from '../src/config/db';
import { checkLowStock, resolveLowStockIfRecovered } from '../src/services/alertService';

function needsCleanup(tag: string | null): tag is string {
  return !!tag && tag.trim().toUpperCase() !== tag && !tag.includes('__DELETED__');
}

async function fixWhitespaceRfidTags() {
  console.log('── 1. Checking RFID tags for stray whitespace/casing ──\n');

  let fixedCount = 0;

  const students = await db.student.findMany({ where: { rfidTag: { not: null } } });
  for (const s of students) {
    if (!needsCleanup(s.rfidTag)) continue;
    const cleaned = s.rfidTag.trim().toUpperCase();
    console.log(`  ⚠️  student "${s.name}": "${s.rfidTag}" → "${cleaned}"`);
    await db.student.update({ where: { id: s.id }, data: { rfidTag: cleaned } });
    fixedCount++;
  }

  const incharges = await db.labIncharge.findMany({ where: { rfidTag: { not: null } } });
  for (const i of incharges) {
    if (!needsCleanup(i.rfidTag)) continue;
    const cleaned = i.rfidTag.trim().toUpperCase();
    console.log(`  ⚠️  labIncharge "${i.name}": "${i.rfidTag}" → "${cleaned}"`);
    await db.labIncharge.update({ where: { id: i.id }, data: { rfidTag: cleaned } });
    fixedCount++;
  }

  const bottles = await db.bottle.findMany();
  for (const b of bottles) {
    if (!needsCleanup(b.rfidTag)) continue;
    const cleaned = b.rfidTag.trim().toUpperCase();
    console.log(`  ⚠️  bottle "${b.chemicalName}": "${b.rfidTag}" → "${cleaned}"`);
    await db.bottle.update({ where: { id: b.id }, data: { rfidTag: cleaned } });
    fixedCount++;
  }

  console.log(fixedCount === 0 ? '  ✅ No whitespace/casing issues found.\n' : `  ✅ Fixed ${fixedCount} tag(s).\n`);
}

async function resolveStaleStockAlerts() {
  console.log('── 2. Re-checking stock alerts against current quantities ──\n');

  const bottles = await db.bottle.findMany({ where: { isActive: true } });
  let touched = 0;

  for (const bottle of bottles) {
    const before = await db.alert.count({
      where: { bottleId: bottle.id, isResolved: false, type: { in: ['LOW_STOCK', 'CRITICAL_STOCK', 'EMPTY_STOCK'] } },
    });
    await resolveLowStockIfRecovered(bottle);
    await checkLowStock(bottle);
    const after = await db.alert.count({
      where: { bottleId: bottle.id, isResolved: false, type: { in: ['LOW_STOCK', 'CRITICAL_STOCK', 'EMPTY_STOCK'] } },
    });
    if (before !== after) {
      console.log(`  ⚠️  ${bottle.chemicalName}: ${before} → ${after} open stock alert(s)`);
      touched++;
    }
  }

  console.log(touched === 0 ? '  ✅ No stale stock alerts found.\n' : `  ✅ Re-synced ${touched} bottle(s).\n`);
}

async function reportNegativeRefills() {
  console.log('── 3. Scanning for negative refills (review only, not auto-fixed) ──\n');

  const logs = await db.restockLog.findMany({
    where:   { amountAdded: { lt: 0 } },
    include: { bottle: { select: { chemicalName: true } }, labIncharge: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (logs.length === 0) {
    console.log('  ✅ No negative refills found.\n');
    return;
  }

  console.log(`  ⚠️  Found ${logs.length} negative refill(s) — these need a human to check what really`);
  console.log('     happened at the scale, so nothing was changed automatically:\n');
  for (const log of logs) {
    console.log(
      `     ${log.createdAt.toISOString().slice(0, 16).replace('T', ' ')}  ` +
      `${(log.bottle?.chemicalName ?? 'Unknown').padEnd(20)} ` +
      `${log.previousQty.toFixed(1)} → ${log.newQty.toFixed(1)} ` +
      `(${log.amountAdded.toFixed(1)}) by ${log.labIncharge?.name ?? 'Unknown'}`,
    );
  }
  console.log('');
}

async function main() {
  console.log('🧹 Running one-time data cleanup...\n');
  await fixWhitespaceRfidTags();
  await resolveStaleStockAlerts();
  await reportNegativeRefills();
  console.log('✅ Cleanup complete.');
}

main()
  .catch((err) => {
    console.error('❌ Cleanup failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });