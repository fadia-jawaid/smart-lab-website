import { Router } from 'express';
import { db }                                          from '../config/db';
import { authenticate, requireAdmin,
         requireLabIncharge }                          from '../middleware/auth';
import { ok, fail }                                    from '../utils/response';

const router = Router();

// GET /api/settings — Admin + Lab Incharge can view
router.get('/', authenticate, requireLabIncharge, async (_req, res) => {
  try {
    const settings = await db.setting.findMany();
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
    return ok(res, map);
  } catch {
    return fail(res, 500, 'Failed to fetch settings');
  }
});

// PATCH /api/settings — Admin only can save
router.patch('/', authenticate, requireAdmin, async (req, res) => {
  const updates = req.body as Record<string, string>;

  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    return fail(res, 400, 'Request body must be an object of key-value pairs');
  }

  try {
    const results = await Promise.all(
      Object.entries(updates).map(([key, value]) =>
        db.setting.upsert({
          where:  { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );
    return ok(res, results);
  } catch {
    return fail(res, 500, 'Failed to update settings');
  }
});

export default router;