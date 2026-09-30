import { Router } from 'express';
import { db }                               from '../config/db';
import { authenticate, requireLabIncharge } from '../middleware/auth';
import { ok, fail }                         from '../utils/response';

const router = Router();

// GET /api/restock-logs — full refill history, newest first.
// Optional ?bottleId=... to filter to a single chemical.
router.get('/', authenticate, requireLabIncharge, async (req, res) => {
  try {
    const { bottleId } = req.query;

    const where: any = {};
    if (bottleId) where.bottleId = bottleId as string;

    const logs = await db.restockLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        bottle:      { select: { chemicalName: true, unit: true, location: true } },
        labIncharge: { select: { name: true, employeeId: true } },
      },
    });

    return ok(res, logs);
  } catch {
    return fail(res, 500, 'Failed to fetch refill history');
  }
});

// GET /api/restock-logs/summary — per-incharge, per-chemical totals
// (handy for "who refills the most" / "how much has been added this month")
router.get('/summary', authenticate, requireLabIncharge, async (_req, res) => {
  try {
    const logs = await db.restockLog.findMany({
      include: {
        bottle:      { select: { chemicalName: true, unit: true } },
        labIncharge: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const byIncharge: Record<string, { name: string; totalRefills: number }> = {};

    for (const log of logs) {
      const name = log.labIncharge?.name ?? 'Unknown';
      if (!byIncharge[name]) byIncharge[name] = { name, totalRefills: 0 };
      byIncharge[name].totalRefills += 1;
    }

    return ok(res, {
      totalRefills: logs.length,
      byIncharge: Object.values(byIncharge),
    });
  } catch {
    return fail(res, 500, 'Failed to build refill summary');
  }
});

export default router;