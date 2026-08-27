import { Aedes } from 'aedes';
import { createServer } from 'net';

const PORT = Number(process.env.MQTT_PORT || 1883);

export async function startBroker() {
  const broker = await Aedes.createBroker();
  const server = createServer(broker.handle);

  server.listen(PORT, () => {
    console.log(`\n🚀 Embedded MQTT Broker running on tcp://localhost:${PORT}`);
    console.log(`   ESP32 devices & local clients can connect to mqtt://localhost:${PORT}\n`);
  });

  broker.on('client', (client: any) => {
    console.log(`🔌 MQTT Device Connected: ${client ? client.id : 'unknown'}`);
  });

  broker.on('clientDisconnect', (client: any) => {
    console.log(`❌ MQTT Device Disconnected: ${client ? client.id : 'unknown'}`);
  });

  broker.on('publish', (packet: any, client: any) => {
    if (client && packet.topic.startsWith('lab/')) {
      console.log(`📡 MQTT Topic [${packet.topic}] Payload:`, packet.payload.toString());
    }
  });
}

if (require.main === module) {
  startBroker().catch(console.error);
}

