import { Router, Request, Response } from 'express';
import { db } from '../config/db';
import { authenticate, requireAdmin } from '../middleware/auth';
import { ok } from '../utils/response';

const router = Router();

/**
 * GET /api/users
 * Returns a combined list of all user types (admin, lab incharge, student)
 * for the admin's user management overview.
 */
router.get('/', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  const [admins, incharges, students] = await Promise.all([
    db.admin.findMany({
      select: { id: true, name: true, email: true, isActive: true, lastLogin: true, createdAt: true },
    }),
    db.labIncharge.findMany({
      select: { id: true, name: true, email: true, isActive: true, lastLogin: true, createdAt: true, employeeId: true, department: true },
    }),
    db.student.findMany({
      select: { id: true, name: true, email: true, rollNo: true, batch: true, department: true, isActive: true, lastLogin: true, rfidTag: true, createdAt: true },
    }),
  ]);

  ok(res, {
    admins:     admins.map(u => ({ ...u, role: 'ADMIN' })),
    incharges:  incharges.map(u => ({ ...u, role: 'LAB_INCHARGE' })),
    students:   students.map(u => ({ ...u, role: 'STUDENT' })),
    total:      admins.length + incharges.length + students.length,
  });
});

export default router;