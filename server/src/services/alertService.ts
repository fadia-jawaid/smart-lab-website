import { db }                       from '../config/db';
import { env }                      from '../config/env';
import { emitEvent, SOCKET_EVENTS } from './socketService';
import { publishToDevice } from '../config/mqtt';

export async function checkAlerts(bottle: any, transaction: any): Promise<void> {
  await checkLowStock(bottle);
  await checkLeakage(bottle, transaction);
}

export async function checkLowStock(bottle: any): Promise<void> {
  if (bottle.initialQty <= 0) return;

  const pct = (bottle.currentQty / bottle.initialQty) * 100;

  if (pct <= bottle.lowStockPct) {
    // Avoid duplicate alerts
    const existing = await db.alert.findFirst({
      where: {
        type:      'LOW_STOCK',
        bottleId:  bottle.id,
        isResolved:false,
      },
    });

    if (!existing) {
      const alert = await db.alert.create({
        data: {
          type:      'LOW_STOCK',
          severity:  pct <= 10 ? 'DANGER' : 'WARNING',
          message:   `${bottle.chemicalName} is running low — ${pct.toFixed(0)}% remaining (${bottle.currentQty.toFixed(1)} ${bottle.unit})`,
          bottleId:  bottle.id,
        },
      });

      emitEvent(SOCKET_EVENTS.ALERT_TRIGGERED, alert);
publishToDevice(alert);
      console.log(`⚠️   Low stock alert: ${bottle.chemicalName} at ${pct.toFixed(0)}%`);
    }
  }
}

export async function checkLeakage(bottle: any, transaction: any): Promise<void> {
  if (!transaction.quantityUsed) return;

  const threshold = env.ALERT_LEAKAGE_GRAMS * 2;

  if (transaction.quantityUsed > threshold) {
    const alert = await db.alert.create({
      data: {
        type:      'LEAKAGE',
        severity:  'DANGER',
        message:   `Possible leakage or excessive use: ${transaction.quantityUsed.toFixed(1)} ${bottle.unit} of ${bottle.chemicalName} used in one session`,
        bottleId:  bottle.id,
        studentId: transaction.studentId,
      },
    });

    emitEvent(SOCKET_EVENTS.ALERT_TRIGGERED, alert);
publishToDevice(alert);
    console.log(`🚨  Leakage alert: ${bottle.chemicalName}`);
  }
}

export async function checkOverdueTransactions(): Promise<void> {
  try {
    const cutoffTime = new Date(Date.now() - env.ALERT_OVERDUE_MINUTES * 60 * 1000);

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
        const alert = await db.alert.create({
          data: {
            type:      'NOT_RETURNED',
            severity:  'WARNING',
            message:   `${tx.student.name} (${tx.student.rollNo}) has not returned ${tx.bottle?.chemicalName ?? 'item'} — overdue by ${env.ALERT_OVERDUE_MINUTES} minutes`,
            studentId: tx.studentId,
            bottleId:  tx.bottleId,
          },
        });

        emitEvent(SOCKET_EVENTS.ALERT_TRIGGERED, alert);
publishToDevice(alert);
        console.log(`⏰  Overdue alert: ${tx.student.name} — ${tx.bottle?.chemicalName ?? 'item'}`);
      }
    }

    if (overdueTransactions.length > 0) {
      console.log(`🔍  Overdue check: ${overdueTransactions.length} overdue transaction(s) found`);
    }
  } catch (err) {
    console.error('Overdue check error:', err);
  }
}