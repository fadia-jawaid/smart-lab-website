// import { db }                       from '../config/db';
// import { emitEvent, SOCKET_EVENTS } from './socketService';
// import { checkAlerts }              from './alertService';

// interface ESP32EventPayload {
//   event:      'taken' | 'returned' | string;
//   rfidUser:   string;
//   rfidBottle: string;
//   weight:     number;
// }

// export async function handleMQTTEvent(data: ESP32EventPayload): Promise<void> {
//   console.log('📡  MQTT event:', data);

//   try {
//     if (data.event === 'taken') {
//       await handleTakeEvent(data);
//     } else if (data.event === 'returned') {
//       await handleReturnEvent(data);
//     } else {
//       console.warn('Unknown MQTT event type:', data.event);
//     }
//   } catch (err) {
//     console.error('MQTT event processing error:', err);
//   }
// }

// async function handleTakeEvent(data: ESP32EventPayload): Promise<void> {
//   // Find student by RFID
//   const student = await db.student.findUnique({
//     where: { rfidTag: data.rfidUser.toUpperCase() },
//   });

//   if (!student || !student.isActive) {
//     await db.alert.create({
//       data: {
//         type:     'UNAUTHORIZED_ACCESS',
//         severity: 'DANGER',
//         message:  `Unknown RFID card from ESP32: ${data.rfidUser}`,
//       },
//     });
//     console.warn(`Unknown RFID user: ${data.rfidUser}`);
//     return;
//   }

//   // Find bottle by RFID
//   const bottle = await db.bottle.findUnique({
//     where: { rfidTag: data.rfidBottle.toUpperCase() },
//   });

//   if (!bottle || !bottle.isActive) {
//     console.warn(`Unknown RFID bottle: ${data.rfidBottle}`);
//     return;
//   }

//   // Get most recently logged-in active incharge as processor for MQTT events
//   const incharge = await db.labIncharge.findFirst({
//     where:   { isActive: true },
//     orderBy: { lastLogin: 'desc' },
//   });

//   if (!incharge) {
//     console.warn('No active lab incharge found for MQTT event');
//     return;
//   }

//   // Update student last scan time
//   await db.student.update({
//     where: { id: student.id },
//     data:  { lastRfidScan: new Date() },
//   });

//   // Create transaction record
//   const transaction = await db.transaction.create({
//     data: {
//       studentId:     student.id,
//       bottleId:      bottle.id,
//       labInchargeId: incharge.id,
//       initialWeight: data.weight,
//       status:        'ACTIVE',
//     },
//     include: {
//       student:     { select: { name: true, rollNo: true } },
//       bottle:      { select: { chemicalName: true, unit: true } },
//       labIncharge: { select: { name: true } },
//     },
//   });

//   // Notify the Scan Session page that a student card was scanned —
//   // this auto-fills the student field on the scan UI in real time
//   emitEvent('rfid_student_scanned', {
//     rfidTag:    student.rfidTag,
//     studentId:  student.id,
//     name:       student.name,
//     rollNo:     student.rollNo,
//     department: student.department,
//   });

//   // Broadcast the new transaction to all dashboard clients
//   emitEvent(SOCKET_EVENTS.NEW_EVENT, transaction);
//   emitEvent(SOCKET_EVENTS.USER_SCAN, {
//     studentId:   student.id,
//     studentName: student.name,
//     rollNo:      student.rollNo,
//     timestamp:   new Date(),
//   });

//   console.log(`✅  Take recorded: ${student.name} → ${bottle.chemicalName}`);
// }

// async function handleReturnEvent(data: ESP32EventPayload): Promise<void> {
//   // Find the open transaction for this bottle
//   const openTransaction = await db.transaction.findFirst({
//     where: {
//       bottle: { rfidTag: data.rfidBottle.toUpperCase() },
//       status: 'ACTIVE',
//     },
//     orderBy: { timeTaken: 'desc' },
//   });

//   if (!openTransaction) {
//     console.warn(`No active transaction found for bottle RFID: ${data.rfidBottle}`);
//     return;
//   }

//   const quantityUsed = Math.max(0, openTransaction.initialWeight - data.weight);

//   // Update transaction to RETURNED
//   const transaction = await db.transaction.update({
//     where: { id: openTransaction.id },
//     data: {
//       finalWeight:  data.weight,
//       quantityUsed,
//       timeReturned: new Date(),
//       status:       'RETURNED',
//     },
//     include: {
//       student: { select: { name: true, rollNo: true } },
//       bottle:  { select: { chemicalName: true, unit: true } },
//     },
//   });

//   // Update bottle current quantity
//   const updatedBottle = await db.bottle.update({
//     where: { id: openTransaction.bottleId },
//     data:  { currentQty: { decrement: quantityUsed } },
//   });

//   // Run smart alert checks (low stock, leakage)
//   await checkAlerts(updatedBottle, transaction);

//   // Broadcast updates to all dashboard clients
//   emitEvent(SOCKET_EVENTS.INVENTORY_UPDATE, updatedBottle);
//   emitEvent(SOCKET_EVENTS.NEW_EVENT, transaction);

//   console.log(
//     `✅  Return recorded: ${transaction.student?.name} returned ` +
//     `${transaction.bottle?.chemicalName} (used: ${quantityUsed.toFixed(1)})`,
//   );
// }

// new updated code 

import { db }                       from '../config/db';
import { emitEvent, SOCKET_EVENTS } from './socketService';
import { checkAlerts }              from './alertService';

interface ESP32EventPayload {
  event:         'taken' | 'returned' | 'attendance' | 'scan' | string;
  rfidUser:      string;
  rfidBottle?:   string;
  chemical?:     string;
  weight?:       number;
  weight_taken?: number;
  amountTaken?:  number;
  lab?:          'LAB_A' | 'LAB_B';
}

export async function handleMQTTEvent(data: ESP32EventPayload): Promise<void> {
  console.log('📡  MQTT event received:', data);

  try {
    if (data.event === 'taken') {
      await handleTakeEvent(data);
    } else if (data.event === 'returned') {
      await handleReturnEvent(data);
    } else if (data.event === 'attendance' || data.event === 'scan') {
      await handleAttendanceEvent(data);
    } else {
      console.warn('Unknown MQTT event type:', data.event);
    }
  } catch (err) {
    console.error('MQTT event processing error:', err);
  }
}

async function handleAttendanceEvent(data: ESP32EventPayload): Promise<void> {
  const rfid = (data.rfidUser || '').toUpperCase().trim();
  const student = await db.student.findUnique({
    where: { rfidTag: rfid },
  });

  if (!student || !student.isActive) {
    await db.alert.create({
      data: {
        type:     'UNAUTHORIZED_ACCESS',
        severity: 'DANGER',
        message:  `Unknown RFID attendance card from ESP32 in ${data.lab ?? 'LAB_B'}: ${data.rfidUser}`,
      },
    });
    console.warn(`⚠️  Unknown RFID user for attendance: [${data.rfidUser}]. Make sure this tag is assigned to a student.`);
    return;
  }

  // Update student last RFID scan / attendance timestamp
  await db.student.update({
    where: { id: student.id },
    data:  { lastRfidScan: new Date() },
  });

  // Create an Attendance transaction log record with bottleId: null (chemical: Nil) for Lab B
  const incharge = await db.labIncharge.findFirst({ where: { isActive: true }, orderBy: { lastLogin: 'desc' } });

  if (incharge) {
    const transaction = await db.transaction.create({
      data: {
        studentId:     student.id,
        bottleId:      null,
        labInchargeId: incharge.id,
        initialWeight: 0,
        finalWeight:   0,
        quantityUsed:  null,
        timeReturned:  new Date(),
        status:        'RETURNED',
        purpose:       'Lab B Attendance Check-in',
        lab:           data.lab ?? 'LAB_B',
      },
      include: {
        student:     { select: { name: true, rollNo: true } },
        bottle:      { select: { chemicalName: true, unit: true } },
        labIncharge: { select: { name: true } },
      },
    });

    emitEvent(SOCKET_EVENTS.NEW_EVENT, transaction);
  }

  // Emit real-time attendance scan event to frontend web UI
  emitEvent('rfid_student_scanned', {
    rfidTag:    student.rfidTag,
    studentId:  student.id,
    name:       student.name,
    rollNo:     student.rollNo,
    department: student.department,
    lab:        data.lab ?? 'LAB_B',
  });

  emitEvent(SOCKET_EVENTS.USER_SCAN, {
    studentId:   student.id,
    studentName: student.name,
    rollNo:      student.rollNo,
    timestamp:   new Date(),
    lab:         data.lab ?? 'LAB_B',
  });

  console.log(`✅  Attendance recorded for LAB B: ${student.name} (${student.rollNo})`);
}

async function handleTakeEvent(data: ESP32EventPayload): Promise<void> {
  const userRfid = (data.rfidUser || '').toUpperCase().trim();

  // 1. Find student by RFID
  const student = await db.student.findUnique({
    where: { rfidTag: userRfid },
  });

  if (!student || !student.isActive) {
    await db.alert.create({
      data: {
        type:     'UNAUTHORIZED_ACCESS',
        severity: 'DANGER',
        message:  `Unknown RFID card scanned from ESP32: ${userRfid}`,
      },
    });
    console.warn(`⚠️  Unknown RFID student tag: [${userRfid}]. Please check the student's RFID tag in the admin panel.`);
    return;
  }

  // 2. Find bottle by RFID tag or Chemical Name
  let bottle = null;

  if (data.rfidBottle) {
    bottle = await db.bottle.findUnique({
      where: { rfidTag: data.rfidBottle.toUpperCase().trim() },
    });
  }

  if (!bottle && data.chemical) {
    const allBottles = await db.bottle.findMany({ where: { isActive: true } });
    bottle = allBottles.find(b => b.chemicalName.toLowerCase().includes(data.chemical!.toLowerCase())) ?? null;
  }

  if (!bottle) {
    // Default fallback to first active bottle if name matches or fallback
    bottle = await db.bottle.findFirst({ where: { isActive: true } });
  }

  if (!bottle) {
    console.warn(`⚠️  No bottle found for RFID [${data.rfidBottle}] or Chemical [${data.chemical}]`);
    return;
  }

  // Get active lab incharge as processor for MQTT events
  const incharge = await db.labIncharge.findFirst({
    where:   { isActive: true },
    orderBy: { lastLogin: 'desc' },
  });

  if (!incharge) {
    console.warn('⚠️  No active lab incharge found for MQTT event');
    return;
  }

  // Update student last scan time
  await db.student.update({
    where: { id: student.id },
    data:  { lastRfidScan: new Date() },
  });

  const qtyTaken = data.weight_taken ?? data.amountTaken ?? data.weight ?? 0;
  const isDirectUsage = data.weight_taken !== undefined || data.amountTaken !== undefined;

  // Create transaction record
  const transaction = await db.transaction.create({
    data: {
      studentId:     student.id,
      bottleId:      bottle.id,
      labInchargeId: incharge.id,
      initialWeight: qtyTaken,
      finalWeight:   isDirectUsage ? 0 : null,
      quantityUsed:  isDirectUsage ? qtyTaken : null,
      timeReturned:  isDirectUsage ? new Date() : null,
      status:        isDirectUsage ? 'RETURNED' : 'ACTIVE',
      lab:           data.lab ?? 'LAB_A',
    },
    include: {
      student:     { select: { name: true, rollNo: true } },
      bottle:      { select: { chemicalName: true, unit: true } },
      labIncharge: { select: { name: true } },
    },
  });

  if (isDirectUsage && qtyTaken > 0) {
    const updatedBottle = await db.bottle.update({
      where: { id: bottle.id },
      data:  { currentQty: { decrement: qtyTaken } },
    });
    await checkAlerts(updatedBottle, transaction);
    emitEvent(SOCKET_EVENTS.INVENTORY_UPDATE, updatedBottle);
  }

  // Notify real-time clients
  emitEvent('rfid_student_scanned', {
    rfidTag:    student.rfidTag,
    studentId:  student.id,
    name:       student.name,
    rollNo:     student.rollNo,
    department: student.department,
  });

  emitEvent(SOCKET_EVENTS.NEW_EVENT, transaction);
  emitEvent(SOCKET_EVENTS.USER_SCAN, {
    studentId:   student.id,
    studentName: student.name,
    rollNo:      student.rollNo,
    timestamp:   new Date(),
  });

  console.log(`✅  Usage recorded: ${student.name} (${student.rollNo}) → ${bottle.chemicalName} (${qtyTaken} g)`);
}

async function handleReturnEvent(data: ESP32EventPayload): Promise<void> {
  const bottleTag = (data.rfidBottle || '').toUpperCase().trim();

  let openTransaction = null;

  if (bottleTag) {
    openTransaction = await db.transaction.findFirst({
      where: {
        bottle: { rfidTag: bottleTag },
        status: 'ACTIVE',
      },
      orderBy: { timeTaken: 'desc' },
    });
  }

  if (!openTransaction && data.chemical) {
    const allBottles = await db.bottle.findMany({ where: { isActive: true } });
    const matched = allBottles.find(b => b.chemicalName.toLowerCase().includes(data.chemical!.toLowerCase()));
    if (matched) {
      openTransaction = await db.transaction.findFirst({
        where: { bottleId: matched.id, status: 'ACTIVE' },
        orderBy: { timeTaken: 'desc' },
      });
    }
  }

  if (!openTransaction) {
    console.warn(`⚠️  No active transaction found to return for bottle RFID [${data.rfidBottle}] / Chemical [${data.chemical}]`);
    return;
  }

  const finalW = data.weight ?? 0;
  const quantityUsed = Math.max(0, openTransaction.initialWeight - finalW);

  // Update transaction to RETURNED
  const transaction = await db.transaction.update({
    where: { id: openTransaction.id },
    data: {
      finalWeight:  finalW,
      quantityUsed,
      timeReturned: new Date(),
      status:       'RETURNED',
    },
    include: {
      student: { select: { name: true, rollNo: true } },
      bottle:  { select: { chemicalName: true, unit: true } },
    },
  });

  // Update bottle current quantity
  const updatedBottle = await db.bottle.update({
    where: { id: openTransaction.bottleId },
    data:  { currentQty: { decrement: quantityUsed } },
  });

  // Run smart alert checks (low stock, leakage)
  await checkAlerts(updatedBottle, transaction);

  // Broadcast updates to all dashboard clients
  emitEvent(SOCKET_EVENTS.INVENTORY_UPDATE, updatedBottle);
  emitEvent(SOCKET_EVENTS.NEW_EVENT, transaction);

  console.log(
    `✅  Return recorded: ${transaction.student?.name} returned ` +
    `${transaction.bottle?.chemicalName} (used: ${quantityUsed.toFixed(1)} g)`,
  );
}