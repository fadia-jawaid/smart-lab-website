import { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, Server, Beaker, DoorOpen, Cpu, Info, X, Radio } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/api';
import { cn } from '../../lib/cn';

type MQTTStatus = {
  connected: boolean;
  connectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastError: string | null;
};

type LabStatus = {
  lastActivityAt: string | null;
  active: boolean;
};

type SystemStatus = {
  mqtt: MQTTStatus;
  uptimeSeconds: number;
  labA: LabStatus;
  labB: LabStatus;
};

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatLastSeen(iso: string | null): string {
  if (!iso) return 'Standby (no recent events)';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Active just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function SystemStatusCard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const { on } = useSocket();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/system/status');
      setStatus(res.data.data);
    } catch (err) {
      console.error('SystemStatusCard: failed to load system status', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const unsub = on('device_status', fetchStatus);
    const interval = setInterval(fetchStatus, 30000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [on, fetchStatus]);

  const mqttOnline = status?.mqtt.connected ?? false;

  return (
    <>
      <div className="rounded-2xl border border-hairline bg-surface/75 p-5 backdrop-blur-md shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
              <Cpu size={16} />
            </div>
            <span className="font-display text-base font-bold text-white">
              Hardware & network status
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border',
                mqttOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', mqttOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400')} />
              <span>{mqttOnline ? 'MQTT Broker Live (1883)' : 'Broker Disconnected'}</span>
            </div>

            <button
              onClick={() => setShowInspector(true)}
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border border-hairline bg-surface-2/60 text-brand-300 hover:bg-brand-500/20 hover:border-brand-500/40 transition-colors"
            >
              <Info size={11} />
              <span>Hardware Specs</span>
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Node 1: Broker & ESP32 Link */}
          <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2/30 p-4 transition-colors hover:bg-surface-2/60">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                mqttOnline ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400',
              )}
            >
              {mqttOnline ? <Wifi size={17} /> : <WifiOff size={17} />}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400">MQTT broker</p>
              <p className="truncate text-xs font-semibold text-white">
                {mqttOnline ? 'TCP Port 1883 · Active' : 'Disconnected'}
              </p>
            </div>
          </div>

          {/* Node 2: Lab A Station */}
          <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2/30 p-4 transition-colors hover:bg-surface-2/60">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                status?.labA.active
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'bg-slate-800 text-slate-400',
              )}
            >
              <Beaker size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400">Lab A · Scale telemetry</p>
              <p className="truncate text-xs font-semibold text-white">
                {status?.labA.active ? 'Broadcasting load data' : formatLastSeen(status?.labA.lastActivityAt ?? null)}
              </p>
            </div>
          </div>

          {/* Node 3: Lab B Station */}
          <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2/30 p-4 transition-colors hover:bg-surface-2/60">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                status?.labB.active
                  ? 'bg-cyan-500/15 text-cyan-400'
                  : 'bg-slate-800 text-slate-400',
              )}
            >
              <DoorOpen size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400">Lab B · Turnstile RFID</p>
              <p className="truncate text-xs font-semibold text-white">
                {status?.labB.active ? 'Turnstile listening' : formatLastSeen(status?.labB.lastActivityAt ?? null)}
              </p>
            </div>
          </div>
        </div>

        {status && (
          <div className="mt-4 flex items-center text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Server size={11} className="text-slate-400" />
              Backend Uptime: <strong className="text-slate-300 font-mono">{formatUptime(status.uptimeSeconds)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* IoT Hardware Telemetry & Pinout Inspector Modal */}
      <AnimatePresence>
        {showInspector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInspector(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl rounded-2xl border border-hairline bg-surface p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="text-brand-400" size={18} />
                  <h3 className="font-display text-base font-bold text-white">
                    IoT Hardware Nodes Architecture & Pinouts
                  </h3>
                </div>
                <button
                  onClick={() => setShowInspector(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-2 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
                {/* Node 1 */}
                <div className="rounded-xl border border-hairline bg-surface-2/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-400 text-sm flex items-center gap-1.5">
                      <Radio size={14} /> LAB A — Multi-Scale Chemical Station (ESP32)
                    </span>
                    <span className="rounded bg-emerald-500/20 text-emerald-400 px-2 py-0.5 font-mono text-[10px]">
                      Topic: lab/events
                    </span>
                  </div>
                  <p className="mt-1 text-slate-400 text-[11px]">
                    Continuous mass measurement using 3x HX711 24-bit ADC Load Cells & RC522 RFID card authentication.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[9px] uppercase font-sans">RFID Reader (SPI)</span>
                      <span className="text-slate-200">SDA: GPIO 5 · SCK: 18</span><br />
                      <span className="text-slate-200">MOSI: 23 · MISO: 19 · RST: 22</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[9px] uppercase font-sans">Scale 1 (Ethanol HX711)</span>
                      <span className="text-cyan-400 font-semibold">DT: GPIO 25 · SCK: GPIO 26</span><br />
                      <span className="text-slate-400 text-[10px]">Dual Tare Calibrated</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[9px] uppercase font-sans">Scale 2 (HCl HX711)</span>
                      <span className="text-blue-400 font-semibold">DT: GPIO 33 · SCK: GPIO 32</span><br />
                      <span className="text-slate-400 text-[10px]">Dual Tare Calibrated</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[9px] uppercase font-sans">Scale 3 (Auxiliary Scale)</span>
                      <span className="text-purple-400 font-semibold">DT: GPIO 12 · SCK: GPIO 14</span><br />
                      <span className="text-slate-400 text-[10px]">Expansion Reagent Channel</span>
                    </div>
                  </div>
                </div>

                {/* Node 2 */}
                <div className="rounded-xl border border-hairline bg-surface-2/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400 text-sm flex items-center gap-1.5">
                      <Radio size={14} /> LAB B — Student RFID Turnstile Station (ESP32)
                    </span>
                    <span className="rounded bg-emerald-500/20 text-emerald-400 px-2 py-0.5 font-mono text-[10px]">
                      Topic: lab/attendance
                    </span>
                  </div>
                  <p className="mt-1 text-slate-400 text-[11px]">
                    Contactless student check-in turnstile with I2C LCD Display & anti-collision RFID scanner.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[9px] uppercase font-sans">RFID Reader (Strapping-Safe SPI)</span>
                      <span className="text-slate-200">SDA: GPIO 15 · SCK: 18</span><br />
                      <span className="text-slate-200">MOSI: 23 · MISO: 19 · RST: 5</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[9px] uppercase font-sans">16x2 LCD Display (I2C)</span>
                      <span className="text-emerald-400 font-semibold">SDA: GPIO 21 · SCL: GPIO 22</span><br />
                      <span className="text-slate-400 text-[10px]">Address: 0x27 (5V Backlight)</span>
                    </div>
                  </div>
                </div>

                {/* Embedded Broker */}
                <div className="rounded-xl border border-hairline bg-surface-2/40 p-4">
                  <span className="font-bold text-white text-sm">Aedes Embedded MQTT Broker</span>
                  <div className="mt-2 flex flex-wrap gap-4 text-slate-300">
                    <div>Port: <strong className="text-white font-mono">1883 (TCP)</strong></div>
                    <div>Quality of Service: <strong className="text-white font-mono">QoS 1 (Guaranteed)</strong></div>
                    <div>Network Mode: <strong className="text-white font-mono">LAN Broadcast</strong></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-hairline pt-3 text-right">
                <button
                  onClick={() => setShowInspector(false)}
                  className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-glow"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}