import { db }                       from '../config/db';
import { env }                      from '../config/env';
import { emitEvent, SOCKET_EVENTS } from './socketService';
import { publishToDevice } from '../config/mqtt';

// Reads a numeric threshold from the Setting table — the table the
// Settings page's Save button actually writes to. Previously every
// alert check read straight from `env` (fixed at server startup, from
// the .env file) instead, so nothing an Admin typed and saved on the
// Settings page ever changed real behaviour: the page looked like it
// worked (it saved, and re-showed the saved value on refresh) but the
// actual overdue/leakage thresholds silently stayed at the .env
// defaults forever. Falls back to the given default if the key was
// never saved yet, or holds something non-numeric.
export async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const setting = await db.setting.findUnique({ where: { key } });
  if (!setting) return fallback;

  const parsed = Number(setting.value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const STOCK_ALERT_TYPES = ['EMPTY_STOCK', 'CRITICAL_STOCK', 'LOW_STOCK'] as const;

export async function checkAlerts(bottle: any, transaction: any): Promise<void> {
  await checkLowStock(bottle);
  await checkExcessiveUsage(bottle, transaction);
}

// Three distinct, non-overlapping stock tiers instead of one "LOW_STOCK"
// type that tried to represent low/critical/empty all at once via
// severity alone. Critical sits at half of the configured Low Stock %
// (e.g. lowStockPct=20 → critical at ≤10%) rather than a second
// standalone field, since it's always meant to be "meaningfully lower
// than low", not an independently-tuned number.
export async function checkLowStock(bottle: any): Promise<void> {
  if (bottle.initialQty <= 0) return;

  const pct = (bottle.currentQty / bottle.initialQty) * 100;
  const criticalPct = bottle.lowStockPct / 2;

  let type: (typeof STOCK_ALERT_TYPES)[number] | null = null;
  let severity: 'WARNING' | 'DANGER' = 'WARNING';
  let message = '';

  if (bottle.currentQty <= 0) {
    type = 'EMPTY_STOCK';
    severity = 'DANGER';
    message = `${bottle.chemicalName} is completely OUT OF STOCK (0 ${bottle.unit} remaining). Refill required immediately.`;
  } else if (pct <= criticalPct) {
    type = 'CRITICAL_STOCK';
    severity = 'DANGER';
    message = `${bottle.chemicalName} is critically low — only ${pct.toFixed(0)}% remaining (${bottle.currentQty.toFixed(1)} ${bottle.unit}). Refill required soon.`;
  } else if (pct <= bottle.lowStockPct) {
    type = 'LOW_STOCK';
    severity = 'WARNING';
    message = `${bottle.chemicalName} is running low — ${pct.toFixed(0)}% remaining (${bottle.currentQty.toFixed(1)} ${bottle.unit})`;
  }

  // Whichever tiers don't apply right now shouldn't stay open from an
  // earlier, different stock level (e.g. was Low, dropped to Critical —
  // the old LOW_STOCK alert should close, not sit open alongside it).
  const staleTypes = STOCK_ALERT_TYPES.filter((t) => t !== type);
  const staleAlerts = await db.alert.findMany({
    where: { bottleId: bottle.id, type: { in: staleTypes }, isResolved: false },
  });
  if (staleAlerts.length > 0) {
    await db.alert.updateMany({
      where: { id: { in: staleAlerts.map((a) => a.id) } },
      data:  { isResolved: true, resolvedAt: new Date() },
    });
    for (const stale of staleAlerts) {
      emitEvent(SOCKET_EVENTS.ALERT_RESOLVED, { ...stale, isResolved: true, resolvedAt: new Date() });
    }
  }

  if (!type) return;

  const existing = await db.alert.findFirst({
    where: { type, bottleId: bottle.id, isResolved: false },
  });
  if (existing) return;

  const alert = await db.alert.create({
    data: { type, severity, message, bottleId: bottle.id },
    include: { bottle: { select: { chemicalName: true } } },
  });

  emitEvent(SOCKET_EVENTS.ALERT_TRIGGERED, alert);
  publishToDevice(alert);
  console.log(`⚠️   ${type} alert: ${bottle.chemicalName} at ${pct.toFixed(0)}%`);
}

// Single-session excessive use — distinct from the physical, idle-time
// LEAKAGE alert (raised over in mqttService's handleIdleAlertEvent when
// weight slowly drops with no active session). This one fires when a
// STUDENT's own single take-and-return uses an unusually large amount.
export async function checkExcessiveUsage(bottle: any, transaction: any): Promise<void> {
  if (!transaction.quantityUsed) return;

  const leakageGrams = await getSettingNumber('ALERT_LEAKAGE_GRAMS', env.ALERT_LEAKAGE_GRAMS);
  const threshold = leakageGrams * 2;

  if (transaction.quantityUsed > threshold) {
    const alert = await db.alert.create({
      data: {
        type:      'EXCESSIVE_USAGE',
        severity:  'DANGER',
        message:   `Excessive usage: ${transaction.quantityUsed.toFixed(1)} ${bottle.unit} of ${bottle.chemicalName} used in a single session (threshold: ${threshold.toFixed(1)} ${bottle.unit})`,
        bottleId:  bottle.id,
        studentId: transaction.studentId,
      },
      include: { bottle: { select: { chemicalName: true } } },
    });

    emitEvent(SOCKET_EVENTS.ALERT_TRIGGERED, alert);
    publishToDevice(alert);
    console.log(`🚨  Excessive usage alert: ${bottle.chemicalName}`);
  }
}

export async function resolveLowStockIfRecovered(bottle: any): Promise<void> {
  if (bottle.initialQty <= 0) return;

  const pct = (bottle.currentQty / bottle.initialQty) * 100;

  if (pct <= bottle.lowStockPct) return; // still low/critical/empty — nothing to resolve

  const openStockAlerts = await db.alert.findMany({
    where: { bottleId: bottle.id, type: { in: [...STOCK_ALERT_TYPES] }, isResolved: false },
  });

  for (const open of openStockAlerts) {
    const resolved = await db.alert.update({
      where:   { id: open.id },
      data:    { isResolved: true, resolvedAt: new Date() },
      include: { bottle: { select: { chemicalName: true } } },
    });
    // This alert was RESOLVED, not triggered — emitting ALERT_TRIGGERED
    // here made the Alerts page's "newly triggered" handler treat it as
    // a fresh, still-open alert (since that handler only skips an alert
    // it already has, it never removes one), so a stock alert that had
    // genuinely recovered kept showing as active until the page was
    // manually refreshed.
    emitEvent(SOCKET_EVENTS.ALERT_RESOLVED, resolved);
  }

  if (openStockAlerts.length > 0) {
    console.log(`✅  Stock alert(s) auto-resolved for ${bottle.chemicalName} after refill`);
  }
}

export async function checkOverdueTransactions(): Promise<void> {
  try {
    const overdueMinutes = await getSettingNumber('ALERT_OVERDUE_MINUTES', env.ALERT_OVERDUE_MINUTES);
    const cutoffTime = new Date(Date.now() - overdueMinutes * 60 * 1000);

    const overdueTransactions = await db.transaction.findMany({
      where: {
        status:   'ACTIVE',
        timeTaken:{ lt: cutoffTime },
      },
      include: {
        student: { select: { name: true, rollNo: true } },
        bottle:  { select: { chemicalName: true } },
      },
    });

    for (const tx of overdueTransactions) {
      // Mark as overdue
      await db.transaction.update({
        where: { id: tx.id },
        data:  { status: 'OVERDUE' },
      });

      // Avoid duplicate alerts
      const existing = await db.alert.findFirst({
        where: {
          type:      'NOT_RETURNED',
          bottleId:  tx.bottleId,
          studentId: tx.studentId,
          isResolved:false,
        },
      });

      if (!existing) {
        const whoLabel = tx.student ? `${tx.student.name} (${tx.student.rollNo})` : 'A lab incharge';
        const alert = await db.alert.create({
          data: {
            type:      'NOT_RETURNED',
            severity:  'WARNING',
            message:   `${whoLabel} has not returned ${tx.bottle?.chemicalName ?? 'item'} — overdue by ${overdueMinutes} minutes`,
            studentId: tx.studentId,
            bottleId:  tx.bottleId,
          },
          include: { bottle: { select: { chemicalName: true } } },
        });

        emitEvent(SOCKET_EVENTS.ALERT_TRIGGERED, alert);
publishToDevice(alert);
        console.log(`⏰  Overdue alert: ${whoLabel} — ${tx.bottle?.chemicalName ?? 'item'}`);
      }
    }

    if (overdueTransactions.length > 0) {
      console.log(`🔍  Overdue check: ${overdueTransactions.length} overdue transaction(s) found`);
    }
  } catch (err) {
    console.error('Overdue check error:', err);
  }
}