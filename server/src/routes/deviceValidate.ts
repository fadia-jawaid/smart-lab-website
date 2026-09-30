import { Router, Request, Response } from 'express';
import { db } from '../config/db';
import { emitEvent } from '../services/socketService';
import { env } from '../config/env';

const router = Router();

function checkDeviceKey(req: Request): boolean {
  const configured = (env as any).ESP32_API_KEY as string | undefined;
  if (!configured) return true; // local development: no key configured
  const supplied = req.headers['x-device-key'] ?? req.body?.apiKey;
  return typeof supplied === 'string' && supplied === configured;
}

/**
 * POST /api/validate
 * Compatibility endpoint for the ESP32 firmware.
 * Expected body: { "uid": "13C71995", "lab": "LAB_A" }
 * Optional: { "deviceId": "bench-1", "apiKey": "..." }
 *
 * Response intentionally contains both `allowed` and `authorized` so older
 * firmware versions can consume the result without a firmware-side change.
 */
router.post('/', async (req: Request, res: Response) => {
  if (!checkDeviceKey(req)) {
    return res.status(401).json({
      allowed: false,
      authorized: false,
      success: false,
      message: 'Invalid device API key',
    });
  }

  const uid = String(req.body?.uid ?? req.body?.rfidUser ?? req.body?.rfidTag ?? '')
    .trim()
    .toUpperCase();
  const lab = String(req.body?.lab ?? 'LAB_A').trim().toUpperCase();
  const deviceId = req.body?.deviceId ? String(req.body.deviceId) : null;

  if (!uid) {
    return res.status(400).json({
      allowed: false,
      authorized: false,
      success: false,
      message: 'RFID UID is required',
    });
  }

  if (!['LAB_A', 'LAB_B'].includes(lab)) {
    return res.status(400).json({
      allowed: false,
      authorized: false,
      success: false,
      message: 'Invalid lab. Use LAB_A or LAB_B.',
    });
  }

  try {
    const student = await db.student.findUnique({
      where: { rfidTag: uid },
      select: {
        id: true,
        name: true,
        rollNo: true,
        department: true,
        batch: true,
        rfidTag: true,
        isActive: true,
      },
    });

    // A student card wasn't found — before treating this as a genuinely
    // unknown tag, check whether it's actually a Lab Incharge card (they
    // scan in the same way as students at the validation station) or a
    // bottle's own RFID tag (scanned by mistake at the wrong reader).
    if (!student) {
      const incharge = await db.labIncharge.findUnique({
        where: { rfidTag: uid },
        select: { id: true, name: true, employeeId: true, department: true, isActive: true },
      });

      if (incharge) {
        if (!incharge.isActive) {
          console.warn(`⚠️ Validation denied — inactive incharge: ${incharge.name} (${uid})`);
          return res.status(200).json({
            allowed: false,
            authorized: false,
            success: true,
            uid,
            lab,
            incharge: { id: incharge.id, name: incharge.name },
            message: 'Lab Incharge account is deactivated',
          });
        }

        // Note: unlike Student, LabIncharge has no lastRfidScan column in the
        // schema, so there's nothing to update here beyond the scan event.
        emitEvent('rfid_incharge_scanned', {
          rfidTag: uid,
          inchargeId: incharge.id,
          name: incharge.name,
          department: incharge.department,
          lab,
          deviceId,
        });

        console.log(`✅ Validation allowed — ${incharge.name} (${incharge.employeeId}) [${uid}] in ${lab}`);
        return res.status(200).json({
          allowed: true,
          authorized: true,
          success: true,
          uid,
          lab,
          incharge: {
            id: incharge.id,
            name: incharge.name,
            employeeId: incharge.employeeId,
            department: incharge.department,
          },
          message: 'Access granted',
        });
      }

      const bottle = await db.bottle.findUnique({ where: { rfidTag: uid }, select: { id: true, chemicalName: true } });
      if (bottle) {
        console.warn(`⚠️ Validation denied — a bottle tag was scanned at the user reader: ${bottle.chemicalName} [${uid}] (${lab})`);
        return res.status(200).json({
          allowed: false,
          authorized: false,
          success: true,
          uid,
          lab,
          message: `This is a chemical bottle's RFID tag (${bottle.chemicalName}), not a user card. Scan your student or incharge card instead.`,
        });
      }

      const alert = await db.alert.create({
        data: {
          type: 'UNKNOWN_TAG',
          severity: 'DANGER',
          message: `Unknown RFID card scanned: ${uid} in ${lab}`,
        },
      });

      emitEvent('alert_triggered', alert);
      emitEvent('rfid_unknown_scanned', { rfidTag: uid, lab, deviceId });

      console.warn(`⚠️ Validation denied — unknown RFID: ${uid} (${lab})`);
      return res.status(200).json({
        allowed: false,
        authorized: false,
        success: true,
        uid,
        lab,
        message: 'RFID card not registered',
      });
    }

    if (!student.isActive) {
      console.warn(`⚠️ Validation denied — inactive student: ${student.name} (${uid})`);
      return res.status(200).json({
        allowed: false,
        authorized: false,
        success: true,
        uid,
        lab,
        student: { id: student.id, name: student.name, rollNo: student.rollNo },
        message: 'Student account is deactivated',
      });
    }

    await db.student.update({
      where: { id: student.id },
      data: { lastRfidScan: new Date() },
    });

    const result = {
      allowed: true,
      authorized: true,
      success: true,
      uid,
      lab,
      student: {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        department: student.department,
        batch: student.batch,
      },
      message: 'Access granted',
    };

    emitEvent('rfid_student_scanned', {
      rfidTag: uid,
      studentId: student.id,
      name: student.name,
      rollNo: student.rollNo,
      department: student.department,
      lab,
      deviceId,
    });

    console.log(`✅ Validation allowed — ${student.name} (${student.rollNo}) [${uid}] in ${lab}`);
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ RFID validation error:', error);
    return res.status(500).json({
      allowed: false,
      authorized: false,
      success: false,
      uid,
      lab,
      message: 'Server/database error while validating RFID',
    });
  }
});

export default router;