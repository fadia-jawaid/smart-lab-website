import { Router } from 'express';
import { db }                                              from '../config/db';
import { authenticate, requireLabIncharge }                from '../middleware/auth';
import { ok, fail }                                        from '../utils/response';

const router = Router();

// GET /api/alerts
router.get('/', authenticate, requireLabIncharge, async (req, res) => {
  try {
    const { isResolved, type, severity } = req.query;

    const where: any = {};
    if (isResolved !== undefined) where.isResolved = isResolved === 'true';
    if (type)     where.type     = type     as string;
    if (severity) where.severity = severity as string;

    const alerts = await db.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take:    200,
    });

    return ok(res, alerts);
  } catch {
    return fail(res, 500, 'Failed to fetch alerts');
  }
});

// GET /api/alerts/count — unresolved count for badge
router.get('/count', authenticate, requireLabIncharge, async (_req, res) => {
  try {
    const count = await db.alert.count({ where: { isResolved: false } });
    return ok(res, { count });
  } catch {
    return fail(res, 500, 'Failed to fetch alert count');
  }
});

// PATCH /api/alerts/:id/resolve — Admin + Lab Incharge
router.patch('/:id/resolve', authenticate, requireLabIncharge, async (req, res) => {
  try {
    const alertId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // Build update data carefully:
    // resolvedBy is a foreign key to the Admin table in Prisma schema.
    // If a Lab Incharge resolves, we cannot store their ID there.
    // So we only set resolvedBy when the user is an Admin.
    const data: any = {
      isResolved: true,
      resolvedAt: new Date(),
    };

    if (req.user?.role === 'ADMIN') {
      data.resolvedBy = req.user.id;
    }

    const alert = await db.alert.update({
      where: { id: alertId },
      data,
    });

    return ok(res, alert);
  } catch (err: any) {
    console.error('Resolve alert error:', err.message);
    if (err.code === 'P2025') return fail(res, 404, 'Alert not found');
    return fail(res, 500, 'Failed to resolve alert');
  }
});

export default router;