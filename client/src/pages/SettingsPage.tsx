import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { LiveDot } from '../components/ui/LiveDot';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const { connected } = useSocket();

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => setSettings(res.data.data))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    await api.patch('/settings', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

  return (
    <div className="max-w-xl space-y-6">
      <Card className="p-6">
        <h2 className="mb-1 font-display font-semibold text-slate-100">Alert Thresholds</h2>
        <p className="mb-6 text-sm text-slate-400">
          Configure when the system automatically creates alerts
        </p>
        <div className="space-y-5">
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
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSave}>Save Settings</Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-success">
              <CheckCircle2 size={16} /> Saved
            </span>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-display font-semibold text-slate-100">System Status</h2>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between border-b border-hairline py-2">
            <span className="text-slate-400">Database</span>
            <LiveDot active label="Connected" />
          </div>
          <div className="flex items-center justify-between border-b border-hairline py-2">
            <span className="text-slate-400">Realtime (Socket.io)</span>
            <LiveDot active={connected} label={connected ? 'Connected' : 'Disconnected'} />
          </div>
          <div className="flex items-center justify-between border-b border-hairline py-2">
            <span className="text-slate-400">Stack</span>
            <span className="text-slate-300">React + Node + PostgreSQL</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">Version</span>
            <span className="text-slate-300">v3.0</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
