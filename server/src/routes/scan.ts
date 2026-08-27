// import { Router } from 'express';
// import { db }                               from '../config/db';
// import { authenticate, requireLabIncharge } from '../middleware/auth';
// import { ok, fail }                         from '../utils/response';
// import { emitEvent, SOCKET_EVENTS }         from '../services/socketService';
// import { checkAlerts }                      from '../services/alertService';

// const router = Router();

// // ─── POST /api/scan/start ─────────────────────────────────────────────────────
// // Called when lab incharge scans student card + bottle tag + records initial weight
// router.post('/start', authenticate, requireLabIncharge, async (req, res) => {
//   const { studentRfid, bottleRfid, initialWeight } = req.body;

//   if (!studentRfid || !bottleRfid || initialWeight === undefined) {
//     return fail(res, 400, 'studentRfid, bottleRfid, and initialWeight are required');
//   }

//   if (isNaN(Number(initialWeight)) || Number(initialWeight) < 0) {
//     return fail(res, 400, 'initialWeight must be a positive number');
//   }

//   try {
//     // 1. Verify student by RFID
//     const student = await db.student.findUnique({
//       where: { rfidTag: studentRfid.toUpperCase().trim() },
//     });

//     if (!student) {
//       await db.alert.create({
//         data: {
//           type:     'UNAUTHORIZED_ACCESS',
//           severity: 'DANGER',
//           message:  `Unknown student RFID card scanned: ${studentRfid}`,
//         },
//       });
//       return fail(res, 404, 'Student RFID card not recognized. Alert created.');
//     }

//     if (!student.isActive) {
//       return fail(res, 403, 'This student account is deactivated');
//     }

//     // 2. Verify bottle by RFID
//     const bottle = await db.bottle.findUnique({
//       where: { rfidTag: bottleRfid.toUpperCase().trim() },
//     });

//     if (!bottle) {
//       return fail(res, 404, 'Chemical bottle RFID not recognized');
//     }

//     if (!bottle.isActive) {
//       return fail(res, 400, 'This chemical bottle is no longer active');
//     }

//     // 3. Check if student already has this bottle checked out
//     const existing = await db.transaction.findFirst({
//       where: {
//         studentId: student.id,
//         bottleId:  bottle.id,
//         status:    'ACTIVE',
//       },
//     });

//     if (existing) {
//       return fail(res, 409, 'This student already has this chemical checked out');
//     }

//     // 4. Update student last RFID scan time
//     await db.student.update({
//       where: { id: student.id },
//       data:  { lastRfidScan: new Date() },
//     });

//     // 5. Create the transaction record
//     const transaction = await db.transaction.create({
//       data: {
//         studentId:     student.id,
//         bottleId:      bottle.id,
//         labInchargeId: req.user!.id,
//         initialWeight: Number(initialWeight),
//         status:        'ACTIVE',
//       },
//       include: {
//         student:     { select: { id: true, name: true, rollNo: true, department: true, batch: true } },
//         bottle:      { select: { id: true, chemicalName: true, unit: true, currentQty: true, location: true } },
//         labIncharge: { select: { id: true, name: true } },
//       },
//     });

//     // 6. Emit real-time event to dashboard
//     emitEvent(SOCKET_EVENTS.NEW_EVENT, transaction);

//     return ok(res, {
//       transaction,
//       student: { id: student.id, name: student.name, rollNo: student.rollNo, department: student.department },
//       bottle:  { id: bottle.id, chemicalName: bottle.chemicalName, unit: bottle.unit, currentQty: bottle.currentQty },
//     });
//   } catch (err) {
//     console.error('Scan start error:', err);
//     return fail(res, 500, 'Scan start failed');
//   }
// });

// // ─── POST /api/scan/complete ──────────────────────────────────────────────────
// // Called when student returns the bottle
// router.post('/complete', authenticate, requireLabIncharge, async (req, res) => {
//   const { transactionId, finalWeight, notes, purpose } = req.body;

//   if (!transactionId || finalWeight === undefined) {
//     return fail(res, 400, 'transactionId and finalWeight are required');
//   }

//   if (isNaN(Number(finalWeight)) || Number(finalWeight) < 0) {
//     return fail(res, 400, 'finalWeight must be a positive number');
//   }

//   try {
//     // 1. Find the active transaction
//     const existing = await db.transaction.findUnique({
//       where: { id: transactionId },
//     });

//     if (!existing)                    return fail(res, 404, 'Transaction not found');
//     if (existing.status !== 'ACTIVE') return fail(res, 400, `Transaction is already ${existing.status}`);

//     // 2. Calculate quantity used
//     const quantityUsed = Math.max(0, existing.initialWeight - Number(finalWeight));

//     // 3. Update transaction to RETURNED
//     const transaction = await db.transaction.update({
//       where: { id: transactionId },
//       data: {
//         finalWeight:  Number(finalWeight),
//         quantityUsed,
//         timeReturned: new Date(),
//         status:       'RETURNED',
//         notes:        notes   ?? null,
//         purpose:      purpose ?? null,
//       },
//       include: {
//         student: { select: { name: true, rollNo: true } },
//         bottle:  { select: { chemicalName: true, unit: true } },
//       },
//     });

//     // 4. Decrement bottle current quantity
//     const updatedBottle = await db.bottle.update({
//       where: { id: existing.bottleId },
//       data:  { currentQty: { decrement: quantityUsed } },
//     });

//     // 5. Run smart alert checks
//     await checkAlerts(updatedBottle, transaction);

//     // 6. Emit real-time updates
//     emitEvent(SOCKET_EVENTS.INVENTORY_UPDATE, updatedBottle);
//     emitEvent(SOCKET_EVENTS.NEW_EVENT, transaction);

//     return ok(res, {
//       transaction,
//       quantityUsed,
//       remainingQty: updatedBottle.currentQty,
//     });
//   } catch (err) {
//     console.error('Scan complete error:', err);
//     return fail(res, 500, 'Scan complete failed');
//   }
// });

// // ─── GET /api/scan/active ─────────────────────────────────────────────────────
// // All currently checked-out bottles
// router.get('/active', authenticate, requireLabIncharge, async (_req, res) => {
//   try {
//     const active = await db.transaction.findMany({
//       where:   { status: 'ACTIVE' },
//       include: {
//         student:     { select: { name: true, rollNo: true, department: true } },
//         bottle:      { select: { chemicalName: true, unit: true } },
//         labIncharge: { select: { name: true } },
//       },
//       orderBy: { timeTaken: 'asc' },
//     });
//     return ok(res, active);
//   } catch {
//     return fail(res, 500, 'Failed to fetch active sessions');
//   }
// });

// // ─── POST /api/scan/rfid-event ────────────────────────────────────────────────
// // Called by ESP32 via HTTP POST when a card or bottle tag is scanned on the
// // physical RFID reader. The server identifies the tag type (student or bottle),
// // then emits the correct Socket.io event so the Scan Session page auto-fills
// // without any manual input from the lab incharge.
// //
// // ESP32 Arduino payload example:
// //   POST /api/scan/rfid-event
// //   { "rfidTag": "A3F2B1C4", "weight": 850.5, "deviceId": "bench-1" }
// //
// // weight is optional — sent by the load cell attached to the ESP32.
// // deviceId is optional — identifies which bench the scan came from.
// router.post('/rfid-event', authenticate, requireLabIncharge, async (req, res) => {
//   const { rfidTag, weight, deviceId } = req.body;

//   if (!rfidTag) {
//     return fail(res, 400, 'rfidTag is required');
//   }

//   const tag = rfidTag.toUpperCase().trim();

//   try {
//     // ── Check if it is a student card ─────────────────────────────
//     const student = await db.student.findUnique({
//       where:  { rfidTag: tag },
//       select: { id: true, name: true, rollNo: true, department: true, rfidTag: true, isActive: true },
//     });

//     if (student) {
//       if (!student.isActive) {
//         return fail(res, 403, 'This student account is deactivated');
//       }

//       // Update student last scan time
//       await db.student.update({
//         where: { id: student.id },
//         data:  { lastRfidScan: new Date() },
//       });

//       // Emit to all connected Scan Session pages
//       emitEvent('rfid_student_scanned', {
//         rfidTag:    tag,
//         studentId:  student.id,
//         name:       student.name,
//         rollNo:     student.rollNo,
//         department: student.department,
//         deviceId:   deviceId ?? null,
//       });

//       console.log(`📡  Student card scanned: ${student.name} (${student.rollNo})`);
//       return ok(res, { type: 'STUDENT', student });
//     }

//     // ── Check if it is a chemical bottle tag ──────────────────────
//     const bottle = await db.bottle.findUnique({
//       where:  { rfidTag: tag },
//       select: { id: true, chemicalName: true, unit: true, currentQty: true, rfidTag: true, isActive: true },
//     });

//     if (bottle) {
//       if (!bottle.isActive) {
//         return fail(res, 400, 'This chemical bottle is no longer active');
//       }

//       // Emit to all connected Scan Session pages
//       // weight comes from the load cell on the ESP32 (optional)
//       emitEvent('rfid_bottle_scanned', {
//         rfidTag:      tag,
//         bottleId:     bottle.id,
//         chemicalName: bottle.chemicalName,
//         unit:         bottle.unit,
//         currentQty:   bottle.currentQty,
//         weight:       weight !== undefined ? Number(weight) : null,
//         deviceId:     deviceId ?? null,
//       });

//       console.log(`📡  Bottle tag scanned: ${bottle.chemicalName} (weight: ${weight ?? 'not provided'})`);
//       return ok(res, { type: 'BOTTLE', bottle });
//     }

//     // ── Unknown RFID tag — create security alert ──────────────────
//     const alert = await db.alert.create({
//       data: {
//         type:     'UNAUTHORIZED_ACCESS',
//         severity: 'DANGER',
//         message:  `Unknown RFID tag scanned${deviceId ? ` by device ${deviceId}` : ''}: ${tag}`,
//       },
//     });

//     // Notify dashboard of the unknown scan
//     emitEvent(SOCKET_EVENTS.ALERT_TRIGGERED, alert);
//     emitEvent('rfid_unknown_scanned', {
//       rfidTag:  tag,
//       deviceId: deviceId ?? null,
//     });

//     console.warn(`⚠️   Unknown RFID tag: ${tag}`);
//     return fail(res, 404, 'RFID tag not recognized. Security alert created.');

//   } catch (err) {
//     console.error('RFID event error:', err);
//     return fail(res, 500, 'Failed to process RFID event');
//   }
// });

// export default router;


// new updated code

import { Router } from 'express';
import { db }                               from '../config/db';
import { authenticate, requireLabIncharge } from '../middleware/auth';
import { ok, fail }                         from '../utils/response';
import { emitEvent, SOCKET_EVENTS }         from '../services/socketService';
import { checkAlerts }                      from '../services/alertService';

const router = Router();

// ─── POST /api/scan/start ─────────────────────────────────────────────────────
// Called when lab incharge scans student card + bottle tag + records initial weight
router.post('/start', authenticate, requireLabIncharge, async (req, res) => {
  const { studentRfid, bottleRfid, initialWeight, lab } = req.body;

  if (!studentRfid || !bottleRfid || initialWeight === undefined) {
    return fail(res, 400, 'studentRfid, bottleRfid, and initialWeight are required');
  }

  if (isNaN(Number(initialWeight)) || Number(initialWeight) < 0) {
    return fail(res, 400, 'initialWeight must be a positive number');
  }

  try {
    // 1. Verify student by RFID
    const student = await db.student.findUnique({
      where: { rfidTag: studentRfid.toUpperCase().trim() },
    });

    if (!student) {
      await db.alert.create({
        data: {
          type:     'UNAUTHORIZED_ACCESS',
          severity: 'DANGER',
          message:  `Unknown student RFID card scanned: ${studentRfid}`,
        },
      });
      return fail(res, 404, 'Student RFID card not recognized. Alert created.');
    }

    if (!student.isActive) {
      return fail(res, 403, 'This student account is deactivated');
    }

    // 2. Verify bottle by RFID
    const bottle = await db.bottle.findUnique({
      where: { rfidTag: bottleRfid.toUpperCase().trim() },
    });

    if (!bottle) {
      return fail(res, 404, 'Chemical bottle RFID not recognized');
    }

    if (!bottle.isActive) {
      return fail(res, 400, 'This chemical bottle is no longer active');
    }

    // 3. Check if student already has this bottle checked out
    const existing = await db.transaction.findFirst({
      where: {
        studentId: student.id,
        bottleId:  bottle.id,
        status:    'ACTIVE',
      },
    });

    if (existing) {
      return fail(res, 409, 'This student already has this chemical checked out');
    }

    // 4. Update student last RFID scan time
    await db.student.update({
      where: { id: student.id },
      data:  { lastRfidScan: new Date() },
    });

    // 5. Create the transaction record
    const transaction = await db.transaction.create({
      data: {
        studentId:     student.id,
        bottleId:      bottle.id,
        labInchargeId: req.user!.id,
        initialWeight: Number(initialWeight),
        status:        'ACTIVE',
        lab:           lab ?? null,
      },
      include: {
        student:     { select: { id: true, name: true, rollNo: true, department: true, batch: true } },
        bottle:      { select: { id: true, chemicalName: true, unit: true, currentQty: true, location: true } },
        labIncharge: { select: { id: true, name: true } },
      },
    });

    // 6. Emit real-time event to dashboard
    emitEvent(SOCKET_EVENTS.NEW_EVENT, transaction);

    return ok(res, {
      transaction,
      student: { id: student.id, name: student.name, rollNo: student.rollNo, department: student.department },
      bottle:  { id: bottle.id, chemicalName: bottle.chemicalName, unit: bottle.unit, currentQty: bottle.currentQty },
    });
  } catch (err) {
    console.error('Scan start error:', err);
    return fail(res, 500, 'Scan start failed');
  }
});

// ─── POST /api/scan/complete ──────────────────────────────────────────────────
// Called when student returns the bottle
router.post('/complete', authenticate, requireLabIncharge, async (req, res) => {
  const { transactionId, finalWeight, notes, purpose } = req.body;

  if (!transactionId || finalWeight === undefined) {
    return fail(res, 400, 'transactionId and finalWeight are required');
  }

  if (isNaN(Number(finalWeight)) || Number(finalWeight) < 0) {
    return fail(res, 400, 'finalWeight must be a positive number');
  }

  try {
    // 1. Find the active transaction
    const existing = await db.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!existing)                    return fail(res, 404, 'Transaction not found');
    if (existing.status !== 'ACTIVE') return fail(res, 400, `Transaction is already ${existing.status}`);

    // 2. Calculate quantity used
    const quantityUsed = Math.max(0, existing.initialWeight - Number(finalWeight));

    // 3. Update transaction to RETURNED
    const transaction = await db.transaction.update({
      where: { id: transactionId },
      data: {
        finalWeight:  Number(finalWeight),
        quantityUsed,
        timeReturned: new Date(),
        status:       'RETURNED',
        notes:        notes   ?? null,
        purpose:      purpose ?? null,
      },
      include: {
        student: { select: { name: true, rollNo: true } },
        bottle:  { select: { chemicalName: true, unit: true } },
      },
    });

    // 4. Decrement bottle current quantity (if bottleId is attached)
    let updatedBottle = null;
    if (existing.bottleId) {
      updatedBottle = await db.bottle.update({
        where: { id: existing.bottleId },
        data:  { currentQty: { decrement: quantityUsed } },
      });
      // 5. Run smart alert checks
      await checkAlerts(updatedBottle, transaction);
      // 6. Emit real-time updates
      emitEvent(SOCKET_EVENTS.INVENTORY_UPDATE, updatedBottle);
    }

    emitEvent(SOCKET_EVENTS.NEW_EVENT, transaction);

    return ok(res, {
      transaction,
      quantityUsed,
      remainingQty: updatedBottle?.currentQty ?? null,
    });
  } catch (err) {
    console.error('Scan complete error:', err);
    return fail(res, 500, 'Scan complete failed');
  }
});

// ─── GET /api/scan/active ─────────────────────────────────────────────────────
// All currently checked-out bottles
router.get('/active', authenticate, requireLabIncharge, async (_req, res) => {
  try {
    const active = await db.transaction.findMany({
      where:   { status: 'ACTIVE' },
      include: {
        student:     { select: { name: true, rollNo: true, department: true } },
        bottle:      { select: { chemicalName: true, unit: true } },
        labIncharge: { select: { name: true } },
      },
      orderBy: { timeTaken: 'asc' },
    });
    return ok(res, active);
  } catch {
    return fail(res, 500, 'Failed to fetch active sessions');
  }
});

// ─── POST /api/scan/rfid-event ────────────────────────────────────────────────
// Called by ESP32 via HTTP POST when a card or bottle tag is scanned on the
// physical RFID reader. The server identifies the tag type (student or bottle),
// then emits the correct Socket.io event so the Scan Session page auto-fills
// without any manual input from the lab incharge.
//
// ESP32 Arduino payload example:
//   POST /api/scan/rfid-event
//   { "rfidTag": "A3F2B1C4", "weight": 850.5, "deviceId": "bench-1", "lab": "LAB_A" }
//
// weight is optional — sent by the load cell attached to the ESP32.
// deviceId is optional — identifies which bench the scan came from.
// lab is optional — identifies which lab this device belongs to (LAB_A / LAB_B).
router.post('/rfid-event', authenticate, requireLabIncharge, async (req, res) => {
  const { rfidTag, weight, deviceId, lab } = req.body;

  if (!rfidTag) {
    return fail(res, 400, 'rfidTag is required');
  }

  const tag = rfidTag.toUpperCase().trim();

  try {
    // ── Check if it is a student card ─────────────────────────────
    const student = await db.student.findUnique({
      where:  { rfidTag: tag },
      select: { id: true, name: true, rollNo: true, department: true, rfidTag: true, isActive: true },
    });

    if (student) {
      if (!student.isActive) {
        return fail(res, 403, 'This student account is deactivated');
      }

      // Update student last scan time
      await db.student.update({
        where: { id: student.id },
        data:  { lastRfidScan: new Date() },
      });

      // Emit to all connected Scan Session pages
      emitEvent('rfid_student_scanned', {
        rfidTag:    tag,
        studentId:  student.id,
        name:       student.name,
        rollNo:     student.rollNo,
        department: student.department,
        deviceId:   deviceId ?? null,
        lab:        lab ?? null,
      });

      console.log(`📡  Student card scanned: ${student.name} (${student.rollNo})`);
      return ok(res, { type: 'STUDENT', student });
    }

    // ── Check if it is a chemical bottle tag ──────────────────────
    const bottle = await db.bottle.findUnique({
      where:  { rfidTag: tag },
      select: { id: true, chemicalName: true, unit: true, currentQty: true, rfidTag: true, isActive: true },
    });

    if (bottle) {
      if (!bottle.isActive) {
        return fail(res, 400, 'This chemical bottle is no longer active');
      }

      // Emit to all connected Scan Session pages
      // weight comes from the load cell on the ESP32 (optional)
      emitEvent('rfid_bottle_scanned', {
        rfidTag:      tag,
        bottleId:     bottle.id,
        chemicalName: bottle.chemicalName,
        unit:         bottle.unit,
        currentQty:   bottle.currentQty,
        weight:       weight !== undefined ? Number(weight) : null,
        deviceId:     deviceId ?? null,
        lab:          lab ?? null,
      });

      console.log(`📡  Bottle tag scanned: ${bottle.chemicalName} (weight: ${weight ?? 'not provided'})`);
      return ok(res, { type: 'BOTTLE', bottle });
    }

    // ── Unknown RFID tag — create security alert ──────────────────
    const alert = await db.alert.create({
      data: {
        type:     'UNAUTHORIZED_ACCESS',
        severity: 'DANGER',
        message:  `Unknown RFID tag scanned${deviceId ? ` by device ${deviceId}` : ''}: ${tag}`,
      },
    });

    // Notify dashboard of the unknown scan
    emitEvent(SOCKET_EVENTS.ALERT_TRIGGERED, alert);
    emitEvent('rfid_unknown_scanned', {
      rfidTag:  tag,
      deviceId: deviceId ?? null,
    });

    console.warn(`⚠️   Unknown RFID tag: ${tag}`);
    return fail(res, 404, 'RFID tag not recognized. Security alert created.');

  } catch (err) {
    console.error('RFID event error:', err);
    return fail(res, 500, 'Failed to process RFID event');
  }
});

export default router;