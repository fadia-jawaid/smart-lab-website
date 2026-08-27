import { Router } from 'express';
import { db }                         from '../config/db';
import { authenticate, requireAdmin } from '../middleware/auth';
import { ok, fail }                   from '../utils/response';
import { hashPassword, verifyPassword } from '../utils/password';

const router = Router();

const normalizeId = (id: string | string[] | undefined) =>
  Array.isArray(id) ? id[0] : id ?? '';

// GET /api/incharges
router.get('/', authenticate, requireAdmin, async (_req, res) => {
  try {
    const incharges = await db.labIncharge.findMany({
      select: {
        id: true, name: true, email: true, employeeId: true,
        department: true, phone: true, isActive: true,
        lastLogin: true, createdAt: true,
        _count: { select: { transactions: true } },
      },
      orderBy: { name: 'asc' },
    });
    return ok(res, incharges);
  } catch {
    return fail(res, 500, 'Failed to fetch lab incharges');
  }
});

// GET /api/incharges/:id
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const incharge = await db.labIncharge.findUnique({
      where: { id: normalizeId(req.params.id) },
      select: {
        id: true, name: true, email: true, employeeId: true,
        department: true, phone: true, isActive: true,
        lastLogin: true, createdAt: true,
        _count: { select: { transactions: true } },
      },
    });
    if (!incharge) return fail(res, 404, 'Lab Incharge not found');
    return ok(res, incharge);
  } catch {
    return fail(res, 500, 'Failed to fetch lab incharge');
  }
});

// POST /api/incharges
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, email, password, employeeId, department, phone } = req.body;
  if (!name || !email) return fail(res, 400, 'Name and email are required');

  try {
    const plainPwd = password || 'incharge123';
    const hashed   = await hashPassword(plainPwd);

    const incharge = await db.labIncharge.create({
      data: {
        name,
        email:      email.toLowerCase().trim(),
        password:   hashed,
        employeeId: employeeId ?? null,
        department: department ?? null,
        phone:      phone      ?? null,
      },
    });

    const { password: _, ...safe } = incharge;
    return ok(res, { ...safe, defaultPassword: plainPwd });
  } catch (err: any) {
    if (err.code === 'P2002') return fail(res, 409, 'Email or Employee ID already exists');
    return fail(res, 500, 'Failed to create lab incharge');
  }
});

// PATCH /api/incharges/:id
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, email, department, phone, isActive, password } = req.body;

  try {
    const updateData: any = {};
    if (name       !== undefined) updateData.name       = name;
    if (email      !== undefined) updateData.email      = email.toLowerCase().trim();
    if (department !== undefined) updateData.department = department;
    if (phone      !== undefined) updateData.phone      = phone;
    if (isActive   !== undefined) updateData.isActive   = isActive;
    if (password)                 updateData.password   = await hashPassword(password);

    const incharge = await db.labIncharge.update({
      where: { id: normalizeId(req.params.id) },
      data:  updateData,
    });

    const { password: _, ...safe } = incharge;
    return ok(res, safe);
  } catch (err: any) {
    if (err.code === 'P2025') return fail(res, 404, 'Lab Incharge not found');
    if (err.code === 'P2002') return fail(res, 409, 'Email already in use');
    return fail(res, 500, 'Failed to update lab incharge');
  }
});

// POST /api/incharges/:id/verify-password — Admin only
// Returns the default password if it has not been changed
router.post('/:id/verify-password', authenticate, requireAdmin, async (req, res) => {
  try {
    const incharge = await db.labIncharge.findUnique({
      where:  { id: normalizeId(req.params.id) },
      select: { password: true },
    });
    if (!incharge) return fail(res, 404, 'Lab Incharge not found');

    // Check if default password 'incharge123' still matches
    const isDefault = await verifyPassword('incharge123', incharge.password);
    if (isDefault) {
      return ok(res, { password: 'incharge123', isDefault: true });
    }

    return ok(res, { password: '••••••••', isDefault: false, changed: true });
  } catch {
    return fail(res, 500, 'Failed to verify password');
  }
});

// DELETE /api/incharges/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.labIncharge.update({
      where: { id: normalizeId(req.params.id) },
      data:  { isActive: false },
    });
    return ok(res, { message: 'Lab Incharge deactivated' });
  } catch (err: any) {
    if (err.code === 'P2025') return fail(res, 404, 'Lab Incharge not found');
    return fail(res, 500, 'Failed to deactivate lab incharge');
  }
});

export default router;