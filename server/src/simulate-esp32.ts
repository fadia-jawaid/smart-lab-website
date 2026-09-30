import mqtt from 'mqtt';
import axios from 'axios';

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function runSimulator() {
  console.log('🤖 Starting ESP32 Hardware Simulator...\n');

  // 1. MQTT Event Simulation
  console.log(`Connecting to MQTT broker at ${MQTT_BROKER}...`);
  const client = mqtt.connect(MQTT_BROKER);

  client.on('connect', async () => {
    console.log('✅ Connected to MQTT broker!');

    // Simulate "Taken" event: Student Ali Hassan (RFID: A3F2B1C4) takes Ethanol (RFID: BTL-ETOH-01)
    const takenPayload = {
      event: 'taken',
      rfidUser: 'A3F2B1C4',
      rfidBottle: 'BTL-ETOH-01',
      weight: 1450.0,
      lab: 'LAB_A',
    };

    console.log('📡 [MQTT] Publishing "taken" event for Ethanol bottle (58.0 g)...');
    client.publish('lab/events', JSON.stringify(takenPayload), { qos: 1 });

    // Wait 3 seconds then publish "Returned" event with 52.0 g (6 g used)
    setTimeout(() => {
      const returnedPayload = {
        event: 'returned',
        rfidUser: 'A3F2B1C4',
        rfidBottle: 'BTL-ETOH-01',
        weight: 1410.0,
        lab: 'LAB_A',
      };

      console.log('📡 [MQTT] Publishing "returned" event for Ethanol bottle (52.0 g, used: 6.0 g)...');
      client.publish('lab/events', JSON.stringify(returnedPayload), { qos: 1 });

      // Wait another 2 seconds then simulate LAB B student attendance scan
      setTimeout(() => {
        const attendancePayload = {
          event: 'attendance',
          rfidUser: 'B7E4D9A1', // Sara Iqbal
          lab: 'LAB_B',
        };

        console.log('📡 [MQTT] Publishing "attendance" scan event for Sara Iqbal in LAB B...');
        client.publish('lab/events', JSON.stringify(attendancePayload), { qos: 1 }, () => {
          console.log('\n✅ All MQTT simulation events (LAB A & LAB B) sent successfully!');
          client.end();
        });
      }, 2000);
    }, 3000);
  });

  client.on('error', (err) => {
    console.error('❌ MQTT Simulation Error:', err.message);
  });
}

runSimulator().catch(console.error);
