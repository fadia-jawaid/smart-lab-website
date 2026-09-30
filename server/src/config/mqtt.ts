import mqtt, { MqttClient } from 'mqtt';
import { env } from './env';
import { handleMQTTEvent } from '../services/mqttService';
import { db } from './db';
import { emitEvent } from '../services/socketService';

export const TOPICS = {
  EVENTS: 'lab/events',
  ALERTS: 'lab/alerts',
  STATUS: 'lab/status',
  RFID_VALIDATE_REQUEST: 'lab/rfid/validate/request',
  RFID_VALIDATE_RESPONSE: 'lab/rfid/validate/response',
} as const;

let client: MqttClient | null = null;

// ── Connection status tracking ───────────────────────────────────────
// Exposed via GET /api/system/status so the dashboard can show whether the
// MQTT broker link to the lab hardware is actually up, instead of a
// dashboard that only ever shows "everything is fine" regardless of
// whether the ESP32 devices can currently reach the server at all.
type MQTTStatus = {
  connected: boolean;
  connectedAt: Date | null;
  lastDisconnectedAt: Date | null;
  lastError: string | null;
};

const mqttStatus: MQTTStatus = {
  connected: false,
  connectedAt: null,
  lastDisconnectedAt: null,
  lastError: null,
};

export function getMQTTStatus(): MQTTStatus {
  return { ...mqttStatus };
}

export function connectMQTT(): MqttClient {
  if (client) return client;

  client = mqtt.connect(env.MQTT_BROKER, {
    clientId: `smart-lab-server-${process.pid}-${Date.now()}`,
    username: env.MQTT_USER || undefined,
    password: env.MQTT_PASSWORD || undefined,
    reconnectPeriod: 5000,
    connectTimeout: 5000,
    clean: true,
  });

  client.on('message', async (topic, message) => {
    try {
      const raw = message.toString();
      const payload = JSON.parse(raw);

      if (topic === TOPICS.EVENTS) {
        await handleMQTTEvent(payload);
        return;
      }

      // ESP32 asks the server "who is this card?" before deciding whether to
      // start a STUDENT (usage) session or a LAB_INCHARGE (refill) session.
      if (topic === TOPICS.RFID_VALIDATE_REQUEST) {
        await handleRFIDValidation(payload);
      }
    } catch (err) {
      console.error(`Failed to process MQTT message on ${topic}:`, err);
    }
  });

  client.on('connect', () => {
    console.log(`✅ MQTT connected: ${env.MQTT_BROKER}`);
    mqttStatus.connected = true;
    mqttStatus.connectedAt = new Date();
    mqttStatus.lastError = null;
    emitEvent('device_status', getMQTTStatus());

    client!.subscribe(Object.values(TOPICS), { qos: 1 }, (err) => {
      if (err) {
        console.error('MQTT subscribe error:', err.message);
        return;
      }
      console.log('✅ MQTT subscribed:', Object.values(TOPICS).join(', '));
    });
  });

  client.on('error', (err) => {
    // Silent handling for connection refusal when broker is offline
    mqttStatus.lastError = err.message;
  });

  client.on('offline', () => {
    // Offline status
    mqttStatus.connected = false;
    mqttStatus.lastDisconnectedAt = new Date();
    emitEvent('device_status', getMQTTStatus());
  });

  client.on('close', () => {
    if (mqttStatus.connected) {
      mqttStatus.connected = false;
      mqttStatus.lastDisconnectedAt = new Date();
      emitEvent('device_status', getMQTTStatus());
    }
  });

  return client;
}


// =====================================================
// RFID VALIDATION
//
// Checks the scanned UID against BOTH Student and
// LabIncharge tables. Whichever matches determines the
// session's ROLE, which the ESP32 carries forward into
// its login/usage/refill decisions:
//   - role: "STUDENT"      -> usage-only session
//   - role: "LAB_INCHARGE" -> refill-only session
// A card can only ever belong to one or the other — if
// somehow both matched, Student takes priority since
// usage is the far more common, lower-risk action.
// =====================================================

async function handleRFIDValidation(payload: any): Promise<void> {
  const uid = String(payload?.uid ?? payload?.rfidUser ?? payload?.rfidTag ?? '')
    .trim()
    .toUpperCase();
  const lab = String(payload?.lab ?? 'LAB_A').trim().toUpperCase();
  const deviceId = payload?.deviceId ? String(payload.deviceId) : undefined;

  const responseTopic = typeof payload?.responseTopic === 'string' && payload.responseTopic.trim()
    ? payload.responseTopic.trim()
    : TOPICS.RFID_VALIDATE_RESPONSE;

  if (!uid) {
    publishValidationResponse(responseTopic, {
      allowed: false,
      authorized: false,
      success: false,
      uid: '',
      lab,
      message: 'RFID UID is required',
    });
    return;
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

    if (student) {
      await handleStudentValidation(student, uid, lab, deviceId, responseTopic);
      return;
    }

    // Not a student card — check if it belongs to a Lab Incharge instead
    const incharge = await db.labIncharge.findUnique({
      where: { rfidTag: uid },
      select: {
        id: true,
        name: true,
        employeeId: true,
        isActive: true,
      },
    });

    if (incharge) {
      await handleInchargeValidation(incharge, uid, lab, deviceId, responseTopic);
      return;
    }

    // Neither a student nor an incharge — genuinely unknown card
    await db.alert.create({
      data: {
        type: 'UNKNOWN_TAG',
        severity: 'DANGER',
        message: `Unknown RFID card scanned: ${uid} in ${lab}`,
      },
    });

    const result = {
      allowed: false,
      authorized: false,
      success: true,
      uid,
      lab,
      deviceId,
      message: 'RFID card not registered',
    };

    publishValidationResponse(responseTopic, result);
    emitEvent('rfid_validation_result', result);
    console.warn(`⚠️ RFID validation denied: ${uid} (${lab}) — not registered to any student or incharge`);
  } catch (error) {
    console.error('❌ RFID MQTT validation error:', error);
    publishValidationResponse(responseTopic, {
      allowed: false,
      authorized: false,
      success: false,
      uid,
      lab,
      deviceId,
      message: 'Server/database error while validating RFID',
    });
  }
}

async function handleStudentValidation(
  student: { id: string; name: string; rollNo: string; department: string; batch: string; rfidTag: string | null; isActive: boolean },
  uid: string,
  lab: string,
  deviceId: string | undefined,
  responseTopic: string,
): Promise<void> {
  if (!student.isActive) {
    const result = {
      allowed: false,
      authorized: false,
      success: true,
      uid,
      lab,
      deviceId,
      role: 'STUDENT',
      student: { id: student.id, name: student.name, rollNo: student.rollNo },
      message: 'Student account is deactivated',
    };
    publishValidationResponse(responseTopic, result);
    emitEvent('rfid_validation_result', result);
    console.warn(`⚠️ RFID validation denied: ${uid} (${lab}) — student account deactivated`);
    return;
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
    deviceId,
    role: 'STUDENT',
    student: {
      id: student.id,
      name: student.name,
      rollNo: student.rollNo,
      department: student.department,
      batch: student.batch,
    },
    message: 'Access granted',
  };

  publishValidationResponse(responseTopic, result);
  emitEvent('rfid_student_scanned', {
    rfidTag: student.rfidTag,
    studentId: student.id,
    name: student.name,
    rollNo: student.rollNo,
    department: student.department,
    lab,
    deviceId,
  });
  emitEvent('rfid_validation_result', result);

  console.log(`✅ RFID validation allowed (STUDENT): ${student.name} (${student.rollNo}) [${uid}] in ${lab}`);
}

async function handleInchargeValidation(
  incharge: { id: string; name: string; employeeId: string | null; isActive: boolean },
  uid: string,
  lab: string,
  deviceId: string | undefined,
  responseTopic: string,
): Promise<void> {
  if (!incharge.isActive) {
    const result = {
      allowed: false,
      authorized: false,
      success: true,
      uid,
      lab,
      deviceId,
      role: 'LAB_INCHARGE',
      message: 'Lab incharge account is deactivated',
    };
    publishValidationResponse(responseTopic, result);
    emitEvent('rfid_validation_result', result);
    console.warn(`⚠️ RFID validation denied: ${uid} (${lab}) — incharge account deactivated`);
    return;
  }

  await db.labIncharge.update({
    where: { id: incharge.id },
    data: { lastLogin: new Date() },
  });

  // NOTE: the response deliberately reuses the "student" key with the
  // incharge's own name — the ESP32 firmware only reads doc["student"]["name"]
  // to show on the LCD, and a "role" field to decide which flow to run.
  const result = {
    allowed: true,
    authorized: true,
    success: true,
    uid,
    lab,
    deviceId,
    role: 'LAB_INCHARGE',
    student: { id: incharge.id, name: incharge.name },
    message: 'Access granted (Lab Incharge)',
  };

  publishValidationResponse(responseTopic, result);
  emitEvent('rfid_validation_result', result);

  console.log(`✅ RFID validation allowed (LAB_INCHARGE): ${incharge.name} (${incharge.employeeId ?? 'n/a'}) [${uid}] in ${lab}`);
}

function publishValidationResponse(topic: string, payload: object): void {
  if (!client?.connected) {
    console.error('❌ Cannot publish RFID validation response: MQTT client is not connected');
    return;
  }

  client.publish(
    topic,
    JSON.stringify(payload),
    { qos: 1, retain: false },
    (err) => {
      if (err) {
        console.error(`❌ MQTT validation response publish failed on ${topic}:`, err.message);
      } else {
        console.log(`📤 MQTT validation response → ${topic}:`, JSON.stringify(payload));
      }
    },
  );
}

export function getMQTTClient(): MqttClient | null {
  return client;
}

export function publishToDevice(payload: object): void {
  if (!client?.connected) return;

  client.publish(
    TOPICS.ALERTS,
    JSON.stringify(payload),
    { qos: 1, retain: false }
  );
}