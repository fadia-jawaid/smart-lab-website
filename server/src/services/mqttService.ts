import { db }                       from '../config/db';
import { emitEvent, SOCKET_EVENTS } from './socketService';
import { checkAlerts, resolveLowStockIfRecovered } from './alertService';

interface ESP32EventPayload {
  event:           'taken' | 'returned' | 'attendance' | 'scan' | 'refill' | 'anomaly' | 'idle_alert' | string;
  rfidUser:        string;
  rfidBottle?:     string;
  chemical?:       string;
  weight?:         number;
  weight_taken?:   number;
  amountTaken?:    number;
  lab?:            'LAB_A' | 'LAB_B';
  time_taken?:     string; // "YYYY-MM-DD HH:MM:SS", Pakistan local time (UTC+5) from ESP32 NTP clock
  time_return?:    string; // "YYYY-MM-DD HH:MM:SS", Pakistan local time (UTC+5) from ESP32 NTP clock
  time?:           string; // "YYYY-MM-DD HH:MM:SS", used by 'idle_alert' events (no session, so no taken/return pair)
  absolute_volume?: number; // grams (field name is a historical carry-over from the ESP32 firmware wire format) — the load cell's ABSOLUTE current reading, on 'refill' events and blocked-refill 'anomaly' events
  weight_delta?:    number; // g — magnitude of an unexpected change, on 'anomaly' and 'idle_alert' events
  type?:            'UNAUTHORIZED_ACCESS' | 'LEAKAGE_SUSPECTED' | 'OVERLOAD' | 'UNTRACKED_REFILL'; // sub-type for 'idle_alert' events
  message?:         string; // human-readable detail from the ESP32, on 'idle_alert' events
}

// The ESP32 (LAB A) firmware timestamps events using configTime() with a
// fixed +5:00 offset (Pakistan time) and sends them as plain
// "YYYY-MM-DD HH:MM:SS" strings with no timezone info. `new Date(str)` would
// parse that using the SERVER's local timezone, which is wrong whenever the
// server isn't also running in UTC+5. This parses it explicitly as UTC+5 so
// the stored instant is correct regardless of the server's timezone.
function parseDeviceTimestamp(value?: string): Date | null {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const DEVICE_UTC_OFFSET_MS = 5 * 60 * 60 * 1000; // matches GMT_OFFSET_SEC in the ESP32 sketch

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - DEVICE_UTC_OFFSET_MS);
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
    } else if (data.event === 'refill') {
      await handleRefillEvent(data);
    } else if (data.event === 'anomaly') {
      await handleAnomalyEvent(data);
    } else if (data.event === 'idle_alert') {
      await handleIdleAlertEvent(data);
    } else if (data.event === 'logout') {
      // No usage/refill/anomaly was detected this session — nothing to
      // record, this is expected and not an error.
      console.log(`ℹ️  Logout (no change): ${data.rfidUser}`);
    } else if (data.event === 'login') {
      // The ESP32 fires this the moment a card is scanned and accepted,
      // purely so the login timestamp is on record in the broker's own
      // logs — nothing here needs to be written to the database (the
      // session's actual outcome arrives later as 'taken'/'refill'/
      // 'logout'). Previously this had no branch at all, so it fell
      // through to "Unknown MQTT event type" and logged a misleading
      // warning on every single successful RFID scan.
      console.log(`ℹ️  Login: ${data.rfidUser} (${data.lab ?? 'LAB_A'})`);
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

  if (student && student.isActive) {
    await recordStudentAttendance(student, data);
    return;
  }

  // Not a (registered/active) student — before treating this as a wrong
  // card, check whether it's actually a Lab Incharge. The Lab B firmware
  // explicitly supports and expects incharges to check in here too (its
  // LCD shows "Incharge Marked" for them) — this branch used to skip
  // straight to "wrong card scanned", so every incharge check-in silently
  // logged a false WRONG_RFID alert despite the firmware telling them it
  // succeeded.
  const incharge = await db.labIncharge.findUnique({ where: { rfidTag: rfid } });
  if (incharge && incharge.isActive) {
    await recordInchargeAttendance(incharge, data);
    return;
  }

  // Genuinely not a student or incharge — a card that IS registered
  // somewhere else (e.g. a bottle's own tag) is a different problem
  // (wrong card used here) from one that's not registered anywhere at all.
  const isKnownElsewhere =
    incharge || // registered but inactive
    student ||  // registered but inactive
    (await db.bottle.findUnique({ where: { rfidTag: rfid } }));

  await db.alert.create({
    data: isKnownElsewhere
      ? {
          type:     'WRONG_RFID',
          severity: 'WARNING',
          message:  `Card [${data.rfidUser}] is registered but inactive/not a user card — wrong or deactivated card scanned at the Lab B attendance reader.`,
        }
      : {
          type:     'UNKNOWN_TAG',
          severity: 'DANGER',
          message:  `Unknown RFID attendance card from ESP32 in ${data.lab ?? 'LAB_B'}: ${data.rfidUser}`,
        },
  });
  console.warn(`⚠️  Unknown/inactive RFID user for attendance: [${data.rfidUser}]. Make sure this tag is assigned to a student or Lab Incharge.`);
}

async function recordStudentAttendance(
  student: NonNullable<Awaited<ReturnType<typeof db.student.findUnique>>>,
  data: ESP32EventPayload,
): Promise<void> {
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

async function recordInchargeAttendance(
  incharge: NonNullable<Awaited<ReturnType<typeof db.labIncharge.findUnique>>>,
  data: ESP32EventPayload,
): Promise<void> {
  await db.labIncharge.update({
    where: { id: incharge.id },
    data:  { lastLogin: new Date() },
  });

  // Transaction.labInchargeId is required (it always records "who
  // processed/performed this"), and studentId/bottleId are nullable for
  // exactly this case — an incharge checking themselves in, with no
  // student and no chemical bottle involved.
  const transaction = await db.transaction.create({
    data: {
      studentId:     null,
      bottleId:      null,
      labInchargeId: incharge.id,
      initialWeight: 0,
      finalWeight:   0,
      quantityUsed:  null,
      timeReturned:  new Date(),
      status:        'RETURNED',
      purpose:       'Lab B Attendance Check-in (Lab Incharge)',
      lab:           data.lab ?? 'LAB_B',
    },
    include: {
      student:     { select: { name: true, rollNo: true } },
      bottle:      { select: { chemicalName: true, unit: true } },
      labIncharge: { select: { name: true } },
    },
  });

  emitEvent(SOCKET_EVENTS.NEW_EVENT, transaction);
  emitEvent('rfid_incharge_scanned', {
    rfidTag:    incharge.rfidTag,
    inchargeId: incharge.id,
    name:       incharge.name,
    department: incharge.department,
    lab:        data.lab ?? 'LAB_B',
  });

  console.log(`✅  Attendance recorded for LAB B: ${incharge.name} (Lab Incharge)`);
}

async function handleTakeEvent(data: ESP32EventPayload): Promise<void> {
  const userRfid = (data.rfidUser || '').toUpperCase().trim();

  // 1. Find student by RFID
  const student = await db.student.findUnique({
    where: { rfidTag: userRfid },
  });

  // 1b. Not a student? A Lab Incharge can also personally use chemical
  // (not just refill it) — check the LabIncharge table before giving up.
  let usingIncharge: Awaited<ReturnType<typeof db.labIncharge.findUnique>> = null;
  if (!student || !student.isActive) {
    usingIncharge = await db.labIncharge.findUnique({ where: { rfidTag: userRfid } });
  }

  if ((!student || !student.isActive) && (!usingIncharge || !usingIncharge.isActive)) {
    const isBottleTag = await db.bottle.findUnique({ where: { rfidTag: userRfid } });

    await db.alert.create({
      data: isBottleTag
        ? {
            type:     'WRONG_RFID',
            severity: 'WARNING',
            message:  `Card [${userRfid}] is a bottle's RFID tag, not a user card — wrong tag scanned at the usage scanner.`,
          }
        : {
            type:     'UNKNOWN_TAG',
            severity: 'DANGER',
            message:  `Unknown RFID card scanned from ESP32: ${userRfid}`,
          },
    });
    console.warn(`⚠️  Unknown RFID tag: [${userRfid}]. Please check this card's RFID tag in the admin panel (Student or Lab Incharge).`);
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

  // Previously, if neither the bottle RFID nor the chemical name matched
  // anything, this silently fell back to "the first active bottle" and
  // deducted stock from it — meaning a stray or misconfigured event could
  // quietly corrupt the wrong chemical's inventory. It's safer to record
  // nothing and raise a visible alert than to guess.
  if (!bottle) {
    console.warn(`⚠️  No bottle found for RFID [${data.rfidBottle}] or Chemical [${data.chemical}] — usage NOT recorded, to avoid deducting from the wrong bottle.`);
    await db.alert.create({
      data: {
        type:     'UNTRACKED_USAGE',
        severity: 'WARNING',
        message:  `A 'taken' event arrived with an unrecognized bottle (RFID: ${data.rfidBottle || 'none'}, chemical: ${data.chemical || 'none'}) — usage was not recorded against any bottle.`,
      },
    });
    return;
  }

  // "Processor" incharge for the transaction record. If the scanning
  // person IS an incharge using chemical themselves, they ARE the
  // processor — no need to guess a "most recently logged in" one.
  const incharge = usingIncharge ?? await db.labIncharge.findFirst({
    where:   { isActive: true },
    orderBy: { lastLogin: 'desc' },
  });

  if (!incharge) {
    console.warn('⚠️  No active lab incharge found for MQTT event');
    return;
  }

  // Update student last scan time (only applies when a student scanned)
  if (student) {
    await db.student.update({
      where: { id: student.id },
      data:  { lastRfidScan: new Date() },
    });
  }

  const qtyTaken = data.weight_taken ?? data.amountTaken ?? data.weight ?? 0;
  const isDirectUsage = data.weight_taken !== undefined || data.amountTaken !== undefined;

  // Prefer the real timestamps reported by the ESP32 (it knows the actual
  // login/logout moments); only fall back to "now" if the device didn't send them.
  const takenAt    = parseDeviceTimestamp(data.time_taken);
  const returnedAt = parseDeviceTimestamp(data.time_return);

  // Create transaction record — studentId is null when a Lab Incharge
  // personally used the chemical rather than a student.
  const transaction = await db.transaction.create({
    data: {
      studentId:     student?.id ?? null,
      bottleId:      bottle.id,
      labInchargeId: incharge.id,
      initialWeight: qtyTaken,
      finalWeight:   isDirectUsage ? 0 : null,
      quantityUsed:  isDirectUsage ? qtyTaken : null,
      timeTaken:     takenAt ?? undefined, // undefined -> Prisma schema default (now())
      timeReturned:  isDirectUsage ? (returnedAt ?? new Date()) : null,
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
    // Never let stock go negative — clamp at 0 (an "empty bottle" reads as
    // 0, not a negative number) even if the recorded usage slightly
    // overshoots what's actually left (sensor noise, rounding, etc).
    const clampedQty = Math.max(0, bottle.currentQty - qtyTaken);
    const updatedBottle = await db.bottle.update({
      where: { id: bottle.id },
      data:  { currentQty: clampedQty },
    });
    await checkAlerts(updatedBottle, transaction);
    emitEvent(SOCKET_EVENTS.INVENTORY_UPDATE, updatedBottle);
  }

  // Notify real-time clients (only meaningful when a student scanned)
  if (student) {
    emitEvent('rfid_student_scanned', {
      rfidTag:    student.rfidTag,
      studentId:  student.id,
      name:       student.name,
      rollNo:     student.rollNo,
      department: student.department,
    });

    emitEvent(SOCKET_EVENTS.USER_SCAN, {
      studentId:   student.id,
      studentName: student.name,
      rollNo:      student.rollNo,
      timestamp:   new Date(),
    });
  }

  emitEvent(SOCKET_EVENTS.NEW_EVENT, transaction);

  console.log(
    student
      ? `✅  Usage recorded: ${student.name} (${student.rollNo}) → ${bottle.chemicalName} (${qtyTaken} g)`
      : `✅  Usage recorded: ${incharge.name} (Lab Incharge, personal use) → ${bottle.chemicalName} (${qtyTaken} g)`,
  );
}

async function handleReturnEvent(data: ESP32EventPayload): Promise<void> {
  const bottleTag = (data.rfidBottle || '').toUpperCase().trim();

  let openTransaction = null;

  if (bottleTag) {
    openTransaction = await db.transaction.findFirst({
      where: {
        bottle: { rfidTag: bottleTag },
        status: { in: ['ACTIVE', 'OVERDUE'] },
      },
      orderBy: { timeTaken: 'desc' },
    });
  }

  if (!openTransaction && data.chemical) {
    const allBottles = await db.bottle.findMany({ where: { isActive: true } });
    const matched = allBottles.find(b => b.chemicalName.toLowerCase().includes(data.chemical!.toLowerCase()));
    if (matched) {
      openTransaction = await db.transaction.findFirst({
        where: { bottleId: matched.id, status: { in: ['ACTIVE', 'OVERDUE'] } },
        orderBy: { timeTaken: 'desc' },
      });
    }
  }

  if (!openTransaction) {
    console.warn(`⚠️  No active transaction found to return for bottle RFID [${data.rfidBottle}] / Chemical [${data.chemical}]`);
    return;
  }

  if (!openTransaction.bottleId) {
    console.warn(`⚠️  Active transaction ${openTransaction.id} has no linked bottle; skipping return.`);
    return;
  }

  // A missing weight reading must NOT be treated as "0" — that would make
  // quantityUsed = initialWeight - 0 = the bottle's ENTIRE starting
  // weight, silently wiping out most/all of its stock on the very next
  // return event just because one MQTT message dropped a field. Skip the
  // return and flag it instead; the incharge can complete it manually
  // from the Scan Session page once a real weight is available.
  if (data.weight === undefined || data.weight === null || isNaN(Number(data.weight))) {
    console.warn(
      `⚠️  Return event for transaction ${openTransaction.id} is missing a valid weight reading — ` +
      `ignoring instead of guessing, to avoid corrupting stock. Complete it manually if needed.`,
    );
    await db.alert.create({
      data: {
        type:     'UNTRACKED_USAGE',
        severity: 'WARNING',
        message:  `A 'returned' event for ${data.rfidBottle || data.chemical || 'a bottle'} arrived with no weight reading — return was not recorded automatically. Please complete it manually.`,
        bottleId: openTransaction.bottleId,
      },
    });
    return;
  }

  const finalW = Number(data.weight);
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

  // Update bottle current quantity — never let it go negative.
  const bottleBeforeReturn = await db.bottle.findUnique({ where: { id: openTransaction.bottleId } });
  const clampedReturnQty = Math.max(0, (bottleBeforeReturn?.currentQty ?? 0) - quantityUsed);
  const updatedBottle = await db.bottle.update({
    where: { id: openTransaction.bottleId },
    data:  { currentQty: clampedReturnQty },
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

// =====================================================
// REFILL — a Lab Incharge topped up a bottle. This is
// ONLY ever triggered by an incharge session on the
// firmware side (students can never reach this branch —
// see lab_a_firmware.ino, role gating at logout).
//
// This event carries the load cell's ABSOLUTE current
// reading (absolute_volume), not a delta to add. We SET
// currentQty to that reading directly, so every refill
// re-syncs the database to physical reality instead of
// compounding on top of whatever drift may already exist.
// =====================================================

async function handleRefillEvent(data: ESP32EventPayload): Promise<void> {
  const rfid = (data.rfidUser || '').toUpperCase().trim();

  const incharge = await db.labIncharge.findUnique({
    where: { rfidTag: rfid },
  });

  if (!incharge || !incharge.isActive) {
    // Distinguish "this is actually a student's card" (misconfiguration or a
    // student trying to trigger a refill) from a genuinely unknown card —
    // both are denied, but they're different problems with different fixes.
    const student = await db.student.findUnique({ where: { rfidTag: rfid } });

    await db.alert.create({
      data: student
        ? {
            type:     'UNAUTHORIZED_REFILL',
            severity: 'DANGER',
            message:  `Refill rejected: ${student.name} (${student.rollNo}) is a student and is not authorized to perform refills. Only a Lab Incharge card can refill a bottle.`,
            studentId: student.id,
          }
        : {
            type:     'UNKNOWN_TAG',
            severity: 'DANGER',
            message:  `Unknown RFID card scanned during a refill from ESP32: ${data.rfidUser}`,
          },
    });
    console.warn(`⚠️  Refill rejected for RFID [${data.rfidUser}] — not a registered/active Lab Incharge.`);
    return;
  }

  if (!data.chemical) {
    console.warn('⚠️  Refill event is missing the chemical name — ignoring.');
    return;
  }

  const allBottles = await db.bottle.findMany({ where: { isActive: true } });
  const bottle = allBottles.find(b =>
    b.chemicalName.toLowerCase().includes(data.chemical!.toLowerCase())
  ) ?? null;

  if (!bottle) {
    console.warn(`⚠️  No bottle found matching refill chemical [${data.chemical}]`);
    return;
  }

  if (data.absolute_volume === undefined || data.absolute_volume === null || data.absolute_volume < 0) {
    console.warn('⚠️  Refill event is missing a valid absolute_volume reading — ignoring.');
    return;
  }

  const previousQty = bottle.currentQty;
  let newQty = data.absolute_volume;

  // Hard ceiling: the bottle's true physical/hardware capacity
  // (maxCapacity, e.g. 92g) — a reading above this is physically
  // implausible for this bottle and gets clamped + flagged as Overload.
  // This is intentionally a DIFFERENT number from initialQty (e.g. 50g),
  // which is just the normal day-to-day fill level — see Overfill below.
  let wasOverloaded = false;
  if (newQty > bottle.maxCapacity) {
    console.warn(
      `⚠️  Refill reading (${newQty.toFixed(1)} ${bottle.unit}) exceeds ${bottle.chemicalName}'s ` +
      `physical capacity (${bottle.maxCapacity} ${bottle.unit}) — clamping. If this bottle's real ` +
      `capacity changed, update maxCapacity from the Admin panel.`,
    );
    wasOverloaded = true;
    newQty = bottle.maxCapacity;
  }

  // Above the normal fill reference but still within the bottle's real
  // capacity — not dangerous, just unusual enough to note (e.g. topped
  // up more generously than the usual routine amount).
  const wasOverfilled = !wasOverloaded && newQty > bottle.initialQty;

  const amountAdded = newQty - previousQty;

  const updatedBottle = await db.bottle.update({
    where: { id: bottle.id },
    data:  { currentQty: newQty },
  });

  // Refills are a routine inventory event, not a problem to resolve — log
  // them to RestockLog (their own history/audit trail) instead of Alert.
  const restockLog = await db.restockLog.create({
    data: {
      bottleId:      bottle.id,
      labInchargeId: incharge.id,
      amountAdded,
      previousQty,
      newQty:        updatedBottle.currentQty,
    },
    include: {
      bottle:      { select: { chemicalName: true, unit: true } },
      labIncharge: { select: { name: true, employeeId: true } },
    },
  });

  // Broadcast to dashboard clients in real time
  emitEvent(SOCKET_EVENTS.INVENTORY_UPDATE, updatedBottle);
  emitEvent(SOCKET_EVENTS.RESTOCK_LOGGED, restockLog);

  // If this refill brought stock back above the low-stock threshold,
  // auto-resolve any open Low/Critical/Empty Stock alert for this bottle
  await resolveLowStockIfRecovered(updatedBottle);

  // Flag unusual refills for a human to glance at — informational, never
  // blocks or reverses the refill itself (an incharge is always
  // authorized to refill). The message always states the actual
  // before → after quantity, not just "this looked unusual".
  if (wasOverloaded || wasOverfilled) {
    // When overloaded, also store the load cell's real reading rounded up
    // — the Inventory card can offer a one-click "Update Capacity" action
    // right on the alert, so whoever is standing at the scale can correct
    // a stale maxCapacity value immediately instead of the bottle staying
    // artificially capped from now on. Overfill never suggests a capacity
    // change — nothing about the bottle's numbers is wrong in that case,
    // it was just an unusually generous top-up. Stored on the row itself
    // (not just the live socket push) so the button still shows up after
    // a page refresh.
    const suggestedCapacity = wasOverloaded ? Math.ceil(data.absolute_volume!) : undefined;
    const actualQty         = wasOverloaded ? data.absolute_volume : undefined;

    const alert = await db.alert.create({
      data: {
        type:      wasOverloaded ? 'OVERLOAD' : 'OVERFILL',
        severity:  wasOverloaded ? 'DANGER' : 'WARNING',
        message:   wasOverloaded
          ? `${incharge.name} refilled ${bottle.chemicalName}: ${previousQty.toFixed(1)} → ${updatedBottle.currentQty.toFixed(1)} ${bottle.unit} ` +
            `(load cell read ${data.absolute_volume!.toFixed(1)} ${bottle.unit}, above the ${bottle.maxCapacity} ${bottle.unit} physical capacity — ` +
            `capped to capacity). This bottle's recorded capacity may be out of date — you can update it below.`
          : `${incharge.name} refilled ${bottle.chemicalName}: ${previousQty.toFixed(1)} → ${updatedBottle.currentQty.toFixed(1)} ${bottle.unit} ` +
            `— above the normal fill reference of ${bottle.initialQty} ${bottle.unit}, though still within the bottle's ${bottle.maxCapacity} ${bottle.unit} capacity. ` +
            `Flagged for review — no action needed if this was intentional.`,
        bottleId: bottle.id,
        suggestedCapacity,
        actualQty,
      },
      include: { bottle: { select: { chemicalName: true } } },
    });

    emitEvent(SOCKET_EVENTS.ALERT_TRIGGERED, alert);
  }


  console.log(
    `🔄  Refill synced by ${incharge.name}: ${bottle.chemicalName} ` +
    `${previousQty.toFixed(1)} → ${updatedBottle.currentQty.toFixed(1)} ${bottle.unit} ` +
    `(${amountAdded >= 0 ? '+' : ''}${amountAdded.toFixed(1)} ${bottle.unit})`,
  );
}

// =====================================================
// ANOMALY — the weight on a scale increased significantly
// during a STUDENT session (i.e. NOT an incharge refill).
// This should never happen during normal use, so instead
// of guessing what it means, we flag it for a human to
// check and leave the inventory quantity untouched.
// =====================================================

async function handleAnomalyEvent(data: ESP32EventPayload): Promise<void> {
  const rfid = (data.rfidUser || '').toUpperCase().trim();

  const student = await db.student.findUnique({
    where: { rfidTag: rfid },
  });

  const bottle = data.chemical
    ? (await db.bottle.findMany({ where: { isActive: true } })).find(b =>
        b.chemicalName.toLowerCase().includes(data.chemical!.toLowerCase())
      ) ?? null
    : null;

  const who = student ? `${student.name} (${student.rollNo})` : `unknown card [${data.rfidUser}]`;
  const magnitude = data.weight_delta !== undefined ? `+${data.weight_delta.toFixed(1)} g` : 'an unexpected increase';

  // The ESP32 already measured the load cell's true absolute reading at
  // that moment — store it on the alert row so a Lab Incharge who confirms
  // the bottle really was topped up can apply it in one click ("Confirm &
  // Apply Refill"), instead of needing to re-scan and re-weigh from
  // scratch. Capped to the bottle's true physical capacity (maxCapacity)
  // for safety, same as a normal refill — NOT the normal-fill reference
  // (initialQty), which is just the routine top-up level, not a hard limit.
  const suggestedQty =
    bottle && data.absolute_volume !== undefined
      ? Math.min(data.absolute_volume, bottle.maxCapacity)
      : undefined;

  // Same reasoning as the idle-alert dedup below: an ongoing anomaly
  // shouldn't spawn a new alert row every time it's reported, but the
  // dedup must expire (1 hour) instead of lasting forever — otherwise a
  // single old, never-resolved alert permanently silences every future
  // real anomaly on that bottle/student.
  const anomalyDedupWindowStart = new Date(Date.now() - 60 * 60 * 1000);
  const alreadyOpenAnomaly = await db.alert.findFirst({
    where: {
      type:       'UNTRACKED_USAGE',
      bottleId:   bottle?.id ?? null,
      studentId:  student?.id ?? null,
      isResolved: false,
      createdAt:  { gte: anomalyDedupWindowStart },
    },
  });
  if (alreadyOpenAnomaly) {
    console.log(`ℹ️  Anomaly alert for [${data.chemical ?? 'unknown chemical'}] already open within the last hour — not duplicating.`);
    return;
  }

  const alert = await db.alert.create({
    data: {
      type:      'UNTRACKED_USAGE',
      severity:  'WARNING',
      message:   `Unexpected weight increase (${magnitude}) detected on ${data.chemical ?? 'a load cell'} ` +
                 `during ${who}'s session. Students cannot perform refills, so inventory was NOT updated. ` +
                 `Please check with a Lab Incharge whether this bottle needs a proper refill.`,
      studentId: student?.id,
      bottleId:  bottle?.id,
      suggestedQty,
    },
    include: { bottle: { select: { chemicalName: true } } },
  });

  emitEvent(SOCKET_EVENTS.ALERT_TRIGGERED, alert);

  console.warn(
    `⚠️  Anomaly logged: unexpected weight increase for [${data.chemical ?? 'unknown chemical'}] ` +
    `during ${who}'s session — inventory untouched.`,
  );
}

// =====================================================
// IDLE ALERT — a scale's weight changed while NOBODY had
// an active session (no card was ever scanned). Unlike
// handleAnomalyEvent above, there's no "who" to attach
// this to at all. Sub-types, distinguished by how the
// change looked on the device:
//   - UNAUTHORIZED_ACCESS: a sudden drop — chemical was
//     likely taken without scanning any card.
//   - LEAKAGE_SUSPECTED: a slow drop accumulated over
//     several minutes — possible physical leak.
//   - OVERLOAD: weight rose above the bottle's physical
//     capacity — foreign material or a bad reading.
//   - UNTRACKED_REFILL: weight rose (within capacity) with
//     no card scanned at all — someone likely topped the
//     bottle up without using a Lab Incharge card. Like the
//     student-session anomaly above, this never touches the
//     bottle's stored quantity by itself — it's flagged for
//     a Lab Incharge to review and confirm ("Confirm & Apply
//     Refill") if the top-up was legitimate.
// A weight sensor alone can't tell a genuine leak/theft from
// a legitimate-but-unlogged action with certainty, so this
// always raises an alert for a human to check rather than
// guessing silently.
// =====================================================

async function handleIdleAlertEvent(data: ESP32EventPayload): Promise<void> {
  const bottle = data.chemical
    ? (await db.bottle.findMany({ where: { isActive: true } })).find(b =>
        b.chemicalName.toLowerCase().includes(data.chemical!.toLowerCase())
      ) ?? null
    : null;

  const chemicalName = bottle?.chemicalName ?? data.chemical ?? 'A chemical';
  const magnitude = data.weight_delta !== undefined ? `${data.weight_delta.toFixed(1)} g` : 'an unexplained amount';

  let alertType: 'UNAUTHORIZED_USAGE' | 'LEAKAGE' | 'OVERLOAD' | 'UNTRACKED_REFILL';
  let severity: 'DANGER' | 'WARNING';
  let message: string;

  if (data.type === 'OVERLOAD') {
    alertType = 'OVERLOAD';
    severity  = 'DANGER';
    message   = `${chemicalName}'s bottle is heavier than its ${bottle?.maxCapacity ?? 'rated'} g physical capacity (+${magnitude} over) — possible extra/foreign material added (e.g. water, soil) or an overfill. Please inspect the bottle in person.`;
  } else if (data.type === 'UNAUTHORIZED_ACCESS') {
    alertType = 'UNAUTHORIZED_USAGE';
    severity  = 'DANGER';
    message   = `${chemicalName}'s weight dropped by ${magnitude} with no RFID card scanned — possible unauthorized use. ` +
                `Inventory was NOT updated automatically. Please check the bottle in person, then confirm below if the chemical is genuinely gone.`;
  } else if (data.type === 'UNTRACKED_REFILL') {
    alertType = 'UNTRACKED_REFILL';
    severity  = 'WARNING';
    message   = `${chemicalName}'s weight increased by ${magnitude} with no RFID card scanned — a refill may have happened without using a Lab Incharge card. ` +
                `Inventory was NOT updated. Please check with a Lab Incharge whether this bottle needs a proper refill.`;
  } else {
    alertType = 'LEAKAGE';
    severity  = 'WARNING';
    message   = `${chemicalName}'s weight has been slowly decreasing (${magnitude} over several minutes) with no active session — possible slow leak. ` +
                `Inventory was NOT updated automatically. Please inspect the bottle and cap, then confirm below once you've checked.`;
  }

  // An unauthorized drop (no card, weight fell) or a suspected leak is
  // just as real a change to the physical bottle as a refill is — the
  // chemical is genuinely gone either way. So this gets the exact same
  // treatment as an untracked refill above: never touch inventory by
  // itself, but store a best-guess corrected quantity (the load cell's
  // absolute reading if sent, otherwise last-known-quantity minus the
  // reported drop) so a Lab Incharge who confirms the loss was real can
  // apply it in one click. This is also what makes the "Confirm & Apply"
  // banner actually show up on the Inventory card for these two alert
  // types — without a suggested quantity here, they'd never render a
  // banner there at all (informational-only alerts don't), which made an
  // unauthorized-use alert and a leakage alert look identical (i.e. both
  // simply invisible) on that page even though they're different things.
  const suggestedQty =
    bottle && (alertType === 'UNTRACKED_REFILL' || alertType === 'UNAUTHORIZED_USAGE' || alertType === 'LEAKAGE')
      ? Math.max(
          0,
          Math.min(
            data.absolute_volume ??
              (alertType === 'UNTRACKED_REFILL'
                ? bottle.currentQty + (data.weight_delta ?? 0)
                : bottle.currentQty - (data.weight_delta ?? 0)),
            bottle.maxCapacity,
          ),
        )
      : undefined;

  // Same idle condition (e.g. a slow leak) keeps being reported by the
  // ESP32 on every poll while it's still happening, which previously
  // created a brand-new alert row EVERY single time with no check at
  // all — this is what flooded the Alerts page with dozens of open
  // LEAKAGE / UNAUTHORIZED_USAGE alerts for what was really one ongoing
  // incident. One open alert per (bottle, alert type) is enough; a Lab
  // Incharge resolves it once they've physically checked the bottle.
  // Same idle condition (e.g. a slow leak) keeps being reported by the
  // ESP32 on every poll while it's still happening, which used to create
  // a brand-new alert row EVERY single time with no check at all — this
  // is what flooded the Alerts page with dozens of open LEAKAGE /
  // UNAUTHORIZED_USAGE alerts for what was really one ongoing incident.
  //
  // IMPORTANT: this dedup only looks at the last hour, not "ever". An
  // earlier version checked isResolved:false with no time bound, which
  // meant a single old alert that nobody had gotten around to manually
  // resolving would silently swallow EVERY future occurrence of that
  // same alert type on that bottle forever — a genuinely new incident
  // days later produced no alert at all, which looked exactly like the
  // system had stopped detecting anything. One alert per hour per
  // (bottle, type) is enough to stop the flood without permanently
  // muting real future incidents.
  const dedupWindowStart = new Date(Date.now() - 60 * 60 * 1000);
  const alreadyOpen = await db.alert.findFirst({
    where: {
      type:       alertType,
      bottleId:   bottle?.id ?? null,
      isResolved: false,
      createdAt:  { gte: dedupWindowStart },
    },
  });
  if (alreadyOpen) {
    console.log(`ℹ️  Idle ${alertType} alert for [${chemicalName}] already open within the last hour — not duplicating.`);
    return;
  }

  const alert = await db.alert.create({
    data: {
      type:     alertType,
      severity: severity,
      message:  message,
      bottleId: bottle?.id,
      suggestedQty,
    },
    include: { bottle: { select: { chemicalName: true } } },
  });

  emitEvent(SOCKET_EVENTS.ALERT_TRIGGERED, alert);

  console.warn(
    `🚨 Idle ${alertType} alert: [${data.chemical ?? 'unknown chemical'}] — ${magnitude}, no active session.`,
  );
}