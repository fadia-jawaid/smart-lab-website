import { useState, useEffect } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { LiveDot } from '../components/ui/LiveDot';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // "Database: Connected" here used to be hardcoded regardless of whether
  // the database was actually reachable — a genuinely misleading status
  // light. /api/system/status (added for the dashboard's hardware widget)
  // already runs a real DB query, so a successful response IS the DB
  // health check; a failed one means the DB call inside it threw.
  const [dbOnline, setDbOnline] = useState<boolean | null>(null);
  const [mqttOnline, setMqttOnline] = useState<boolean | null>(null);
  const { connected } = useSocket();
  const { isAdmin } = useAuth();

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setSettings(res.data.data))
      .catch(() => toast.error('Could not load settings'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkStatus = () => {
      api
        .get('/system/status')
        .then((res) => {
          if (cancelled) return;
          setDbOnline(true);
          setMqttOnline(res.data.data.mqtt.connected);
        })
        .catch(() => {
          if (!cancelled) setDbOnline(false);
        });
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      await api.patch('/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      toast.error(
        e.response?.status === 403
          ? 'Only Admins can change these settings'
          : 'Failed to save settings',
      );
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    {
      key: 'ALERT_OVERDUE_MINUTES',
      label: 'Overdue Alert After (minutes)',
      type: 'number',
      help: 'Minutes before a not-returned chemical triggers an alert',
    },
    {
      key: 'ALERT_LOW_STOCK_PCT',
      label: 'Low Stock Threshold (%)',
      type: 'number',
      help: 'Percentage remaining that triggers a low stock alert (0–100)',
    },
    {
      key: 'ALERT_LEAKAGE_GRAMS',
      label: 'Leakage Detection (grams)',
      type: 'number',
      help: 'Single-session usage above this value triggers a leakage alert',
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card className="p-6 xl:col-span-2">
        <h2 className="mb-1 font-display font-semibold text-slate-100">Alert Thresholds</h2>
        <p className="mb-6 text-sm text-slate-400">
          Configure when the system automatically creates alerts
        </p>

        {!isAdmin && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <p>Only Admins can change these settings. You can view the current values below.</p>
          </div>
        )}

        <fieldset disabled={!isAdmin} className="space-y-5 disabled:opacity-60">
          {fields.map((f) => (
            <div key={f.key}>
              <Input
                label={f.label}
                type={f.type}
                value={settings[f.key] ?? ''}
                onChange={(e) => setSettings((p) => ({ ...p, [f.key]: e.target.value }))}
              />
              <p className="mt-1 text-xs text-slate-500">{f.help}</p>
            </div>
          ))}
        </fieldset>

        {isAdmin && (
          <div className="mt-6 flex items-center gap-3">
            <Button onClick={handleSave} loading={saving}>Save Settings</Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-success">
                <CheckCircle2 size={16} /> Saved
              </span>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-display font-semibold text-slate-100">System Status</h2>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between border-b border-hairline py-2">
            <span className="text-slate-400">Database</span>
            <LiveDot
              active={dbOnline === true}
              label={dbOnline === null ? 'Checking…' : dbOnline ? 'Connected' : 'Disconnected'}
            />
          </div>
          <div className="flex items-center justify-between border-b border-hairline py-2">
            <span className="text-slate-400">Realtime (Socket.io)</span>
            <LiveDot active={connected} label={connected ? 'Connected' : 'Disconnected'} />
          </div>
          <div className="flex items-center justify-between border-b border-hairline py-2">
            <span className="text-slate-400">Lab Hardware (MQTT)</span>
            <LiveDot
              active={mqttOnline === true}
              label={mqttOnline === null ? 'Checking…' : mqttOnline ? 'Connected' : 'Disconnected'}
            />
          </div>
          <div className="flex items-center justify-between border-b border-hairline py-2">
            <span className="text-slate-400">Stack</span>
            <span className="text-slate-300">React + Node.js + SQLite</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">Version</span>
            <span className="text-slate-300">v1.0.0</span>
          </div>
        </div>
      </Card>
    </div>
  );
}