// server/src/config/mqtt.ts
import mqtt, { MqttClient } from 'mqtt';
import { env } from './env';
import { handleMQTTEvent } from '../services/mqttService';

export const TOPICS = {
  EVENTS: 'lab/events',
  ALERTS: 'lab/alerts',
  STATUS: 'lab/status',
} as const;

let client: MqttClient | null = null;

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
    if (topic === TOPICS.EVENTS) {
      try {
        const payload = JSON.parse(message.toString());
        await handleMQTTEvent(payload);
      } catch (err) {
        console.error('Failed to parse MQTT message:', err);
      }
    }
  });

  client.on('connect', () => {
    console.log(`✅ MQTT connected: ${env.MQTT_BROKER}`);
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
  });

  client.on('offline', () => {
    // Offline status
  });

  return client;
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