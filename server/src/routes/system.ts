import { Router } from 'express';
import { db } from '../config/db';
import { authenticate, requireLabIncharge } from '../middleware/auth';
import { ok, fail } from '../utils/response';
import { getMQTTStatus } from '../config/mqtt';

const router = Router();

const serverStartedAt = new Date();

// A lab is considered "active" if something happened there in the last
// 5 minutes — a plain heuristic, not a hardware heartbeat, since the ESP32
// firmware only ever reports actual scan/weight events, never an idle
// keep-alive. Good enough to tell "in use right now" from "quiet".
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

// GET /api/system/status — dashboard "System Health" widget
router.get('/status', authenticate, requireLabIncharge, async (_req, res) => {
  try {
    const [lastLabA, lastLabB] = await Promise.all([
      db.transaction.findFirst({ where: { lab: 'LAB_A' }, orderBy: { timeTaken: 'desc' }, select: { timeTaken: true } }),
      db.transaction.findFirst({ where: { lab: 'LAB_B' }, orderBy: { timeTaken: 'desc' }, select: { timeTaken: true } }),
    ]);

    const now = Date.now();
    const buildLab = (last: { timeTaken: Date } | null) => {
      const lastActivityAt = last?.timeTaken ?? null;
      const active = lastActivityAt ? now - new Date(lastActivityAt).getTime() < ACTIVE_WINDOW_MS : false;
      return { lastActivityAt, active };
    };

    return ok(res, {
      mqtt: getMQTTStatus(),
      uptimeSeconds: Math.floor((now - serverStartedAt.getTime()) / 1000),
      labA: buildLab(lastLabA),
      labB: buildLab(lastLabB),
    });
  } catch (err) {
    console.error('System status error:', err);
    return fail(res, 500, 'Failed to fetch system status');
  }
});

export default router;