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
        department: true, phone: true, isActive: true, rfidTag: true,
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
        department: true, phone: true, isActive: true, rfidTag: true,
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

// PATCH /api/incharges/:id/rfid
router.patch('/:id/rfid', authenticate, requireAdmin, async (req, res) => {
  const { rfidTag } = req.body;
  if (!rfidTag) return fail(res, 400, 'rfidTag is required');

  try {
    // Trim + uppercase before saving — the ESP32 firmware normalizes the
    // scanned tag the same way before looking it up, so a tag saved with
    // stray whitespace or lowercase letters (e.g. pasted from a card
    // reader tool, or edited directly in a DB browser) would silently
    // never match a real scan again, with no visible sign anything was
    // wrong — the value just looks identical in any admin UI.
    const incharge = await db.labIncharge.update({
      where: { id: normalizeId(req.params.id) },
      data:  { rfidTag: rfidTag.toUpperCase().trim() },
    });
    return ok(res, { id: incharge.id, name: incharge.name, rfidTag: incharge.rfidTag });
  } catch (err: any) {
    if (err.code === 'P2025') return fail(res, 404, 'Lab Incharge not found');
    if (err.code === 'P2002') return fail(res, 409, 'This RFID tag is already assigned to another lab incharge');
    return fail(res, 500, 'Failed to assign RFID');
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
// Same rfidTag-freeing fix as students.ts / inventory.ts — LabIncharge.rfidTag
// is also @unique, so without this a deactivated incharge's card UID stays
// locked forever and can never be handed to their replacement.
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const inchargeId = normalizeId(req.params.id);
  try {
    const existing = await db.labIncharge.findUnique({ where: { id: inchargeId } });
    if (!existing) return fail(res, 404, 'Lab Incharge not found');

    await db.labIncharge.update({
      where: { id: inchargeId },
      data: {
        isActive: false,
        rfidTag: existing.rfidTag && !existing.rfidTag.includes('__DELETED__')
          ? `${existing.rfidTag}__DELETED__${Date.now()}`
          : existing.rfidTag,
      },
    });
    return ok(res, { message: 'Lab Incharge deactivated. Their RFID card is now free to reassign.' });
  } catch (err: any) {
    if (err.code === 'P2025') return fail(res, 404, 'Lab Incharge not found');
    return fail(res, 500, 'Failed to deactivate lab incharge');
  }
});

export default router;