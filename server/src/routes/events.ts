import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/db';
import { validate } from '../middleware/validate';
import { ok, fail } from '../utils/response';
import { emitEvent, SOCKET_EVENTS } from '../services/socketService';
import { checkAlerts } from '../services/alertService';
import { env } from '../config/env';

const router = Router();

const eventSchema = z.object({
  rfidUser:   z.string().min(1),
  rfidBottle: z.string().min(1),
  weight:     z.number(),
  event:      z.enum(['taken', 'returned']),
  deviceId:   z.string().optional(),
  apiKey:     z.string().optional(),
});

/** Middleware: validate ESP32 API key */
function verifyDeviceKey(req: Request, res: Response, next: Function): void {
  const key = req.headers['x-device-key'] ?? req.body?.apiKey;
  if (!key || key !== (env as any).ESP32_API_KEY) {
    res.status(401).json({ success: false, error: 'Invalid device API key' });
    return;
  }
  next();
}

/**
 * POST /api/events
 * Receives RFID + weight events from ESP32 over HTTP.
 * Uses API key instead of JWT (devices cannot do browser-based auth).
 */
router.post('/', verifyDeviceKey, validate(eventSchema), async (req: Request, res: Response) => {
  const { rfidUser, rfidBottle, weight, event } = req.body;

  const student = await db.student.findUnique({ where: { rfidTag: rfidUser.toUpperCase() } });
  if (!student || !student.isActive) {
    const alert = await db.alert.create({
      data: {
        type:     'UNAUTHORIZED_ACCESS',
        severity: 'DANGER',
        message:  `Unknown or inactive RFID card: ${rfidUser}`,
      },
    });
    emitEvent(SOCKET_EVENTS.ALERT_TRIGGERED, alert);
    return fail(res, 404, 'Student RFID not recognized');
  }

  const bottle = await db.bottle.findUnique({ where: { rfidTag: rfidBottle.toUpperCase() } });
  if (!bottle || !bottle.isActive) return fail(res, 404, 'Bottle RFID not recognized');

  await db.student.update({ where: { id: student.id }, data: { lastRfidScan: new Date() } });

  if (event === 'taken') {
    // Find default lab incharge (first active one) for MQTT-originated events
    const defaultIncharge = await db.labIncharge.findFirst({ where: { isActive: true } });
    if (!defaultIncharge) return fail(res, 500, 'No active lab incharge found to assign transaction');

    const transaction = await db.transaction.create({
      data: {
        studentId:     student.id,
        bottleId:      bottle.id,
        labInchargeId: defaultIncharge.id,
        initialWeight: weight,
        status:        'ACTIVE',
      },
      include: {
        student:     { select: { id: true, name: true, rollNo: true } },
        bottle:      { select: { id: true, chemicalName: true, unit: true } },
        labIncharge: { select: { id: true, name: true } },
      },
    });
    emitEvent(SOCKET_EVENTS.NEW_EVENT, transaction);
    emitEvent(SOCKET_EVENTS.USER_SCAN, { userId: student.id, timestamp: new Date() });
    return ok(res, { message: 'Chemical taken recorded', transaction });
  }

  if (event === 'returned') {
    const openTx = await db.transaction.findFirst({
      where: { studentId: student.id, bottleId: bottle.id, status: 'ACTIVE' },
      orderBy: { timeTaken: 'desc' },
    });
    if (!openTx) return fail(res, 400, 'No active transaction found for this student and bottle');

    const quantityUsed = Math.max(0, openTx.initialWeight - weight);
    const transaction  = await db.transaction.update({
      where: { id: openTx.id },
      data: {
        finalWeight:  weight,
        quantityUsed,
        timeReturned: new Date(),
        status:       'RETURNED',
      },
      include: {
        student:     { select: { id: true, name: true, rollNo: true } },
        bottle:      { select: { id: true, chemicalName: true, unit: true } },
        labIncharge: { select: { id: true, name: true } },
      },
    });
    const updatedBottle = await db.bottle.update({
      where: { id: bottle.id },
      data:  { currentQty: { decrement: quantityUsed } },
    });
    await checkAlerts(updatedBottle, transaction);
    emitEvent(SOCKET_EVENTS.NEW_EVENT, transaction);
    emitEvent(SOCKET_EVENTS.INVENTORY_UPDATE, updatedBottle);
    return ok(res, { message: 'Chemical return recorded', quantityUsed, transaction });
  }

  return fail(res, 400, 'Invalid event type');
});

export default router;