import { Router } from 'express';
import { db }                                              from '../config/db';
import { authenticate, requireLabIncharge }                from '../middleware/auth';
import { ok, fail }                                        from '../utils/response';
import { emitEvent, SOCKET_EVENTS }                        from '../services/socketService';

const router = Router();

// GET /api/alerts
router.get('/', authenticate, requireLabIncharge, async (req, res) => {
  try {
    const { isResolved, type, severity, skip, limit } = req.query;

    const where: any = {};
    if (isResolved !== undefined) where.isResolved = isResolved === 'true';
    if (type)     where.type     = type     as string;
    if (severity) where.severity = severity as string;

    // Previously this always returned only the 200 newest matching alerts
    // with no way to page further — but /alerts/count (the badge number)
    // counts ALL unresolved alerts with no cap. Whenever there were more
    // than 200 open alerts, the badge and the visible list disagreed, and
    // anything past the 200 most recent could never be seen or resolved
    // from the UI at all — it just sat open in the database forever.
    // `skip`/`limit` let the client page through the rest.
    const take = Math.min(Number(limit) || 200, 500);
    const skipCount = Math.max(Number(skip) || 0, 0);

    const [alerts, total] = await Promise.all([
      db.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: skipCount,
        take,
        include: {
          bottle: { select: { chemicalName: true } },
        },
      }),
      db.alert.count({ where }),
    ]);

    return ok(res, alerts, { total, skip: skipCount, limit: take, hasMore: skipCount + alerts.length < total });
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
      include: { bottle: { select: { chemicalName: true } } },
    });

    // Without this, other connected tabs/dashboards only found out an alert
    // was resolved on their next page load/poll, not in real time.
    emitEvent(SOCKET_EVENTS.ALERT_RESOLVED, alert);

    return ok(res, alert);
  } catch (err: any) {
    console.error('Resolve alert error:', err.message);
    if (err.code === 'P2025') return fail(res, 404, 'Alert not found');
    return fail(res, 500, 'Failed to resolve alert');
  }
});

export default router;