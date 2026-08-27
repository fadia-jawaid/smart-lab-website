import { Router } from 'express';
import { db }                              from '../config/db';
import { authenticate, requireAdmin,
         requireLabIncharge }              from '../middleware/auth';
import { ok, fail }                        from '../utils/response';
import { hashPassword, verifyPassword }    from '../utils/password';

const router = Router();

const normalizeId = (id: string | string[] | undefined) =>
  Array.isArray(id) ? id[0] : id ?? '';

// GET /api/students
router.get('/', authenticate, requireLabIncharge, async (req, res) => {
  try {
    const { search, department, batch, isActive } = req.query;

    const where: any = {};
    if (isActive   !== undefined) where.isActive   = isActive === 'true';
    if (department) where.department = department as string;
    if (batch)      where.batch      = batch      as string;

    if (search) {
      where.OR = [
        { name:   { contains: search as string, mode: 'insensitive' } },
        { rollNo: { contains: search as string, mode: 'insensitive' } },
        { email:  { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const students = await db.student.findMany({
      where,
      select: {
        id:           true,
        name:         true,
        rollNo:       true,
        email:        true,
        batch:        true,
        department:   true,
        phone:        true,
        rfidTag:      true,
        isActive:     true,
        lastLogin:    true,
        lastRfidScan: true,
        createdAt:    true,
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ok(res, students);
  } catch {
    return fail(res, 500, 'Failed to fetch students');
  }
});

// GET /api/students/:id
router.get('/:id', authenticate, requireLabIncharge, async (req, res) => {
  try {
    const student = await db.student.findUnique({
      where: { id: normalizeId(req.params.id) },
      select: {
        id: true, name: true, rollNo: true, email: true,
        batch: true, department: true, phone: true,
        rfidTag: true, isActive: true,
        lastLogin: true, lastRfidScan: true, createdAt: true,
        _count: { select: { transactions: true } },
      },
    });
    if (!student) return fail(res, 404, 'Student not found');
    return ok(res, student);
  } catch {
    return fail(res, 500, 'Failed to fetch student');
  }
});

// GET /api/students/:id/history
router.get('/:id/history', authenticate, requireAdmin, async (req, res) => {
  try {
    const transactions = await db.transaction.findMany({
      where:   { studentId: normalizeId(req.params.id) },
      include: {
        bottle:      { select: { chemicalName: true, unit: true, location: true } },
        labIncharge: { select: { name: true } },
      },
      orderBy: { timeTaken: 'desc' },
    });
    return ok(res, transactions);
  } catch {
    return fail(res, 500, 'Failed to fetch student history');
  }
});

// POST /api/students — Admin + Lab Incharge
router.post('/', authenticate, requireLabIncharge, async (req, res) => {
  const { name, rollNo, email, password, batch, department, phone } = req.body;

  if (!name || !rollNo || !batch || !department) {
    return fail(res, 400, 'Name, rollNo, batch, and department are required');
  }

  try {
    const plainPwd  = password || rollNo;          // default = roll number
    const hashed    = await hashPassword(plainPwd);

    const student = await db.student.create({
      data: {
        name,
        rollNo:     rollNo.trim(),
        email:      email ? email.toLowerCase().trim() : null,
        password:   hashed,
        batch,
        department,
        phone:      phone ?? null,
      },
    });

    const { password: _, ...safe } = student;
    // Return the plain default password so the UI can show it once
    return ok(res, { ...safe, defaultPassword: plainPwd });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return fail(res, 409, 'A student with this roll number or email already exists');
    }
    return fail(res, 500, 'Failed to create student');
  }
});

// PATCH /api/students/:id
router.patch('/:id', authenticate, requireLabIncharge, async (req, res) => {
  const { name, email, batch, department, phone, isActive, password } = req.body;

  try {
    const updateData: any = {};
    if (name       !== undefined) updateData.name       = name;
    if (email      !== undefined) updateData.email      = email ? email.toLowerCase().trim() : null;
    if (batch      !== undefined) updateData.batch      = batch;
    if (department !== undefined) updateData.department = department;
    if (phone      !== undefined) updateData.phone      = phone;
    if (isActive   !== undefined && req.user?.role === 'ADMIN') {
      updateData.isActive = isActive;
    }
    if (password) {
      updateData.password = await hashPassword(password);
    }

    const student = await db.student.update({
      where: { id: normalizeId(req.params.id) },
      data:  updateData,
    });

    const { password: _, ...safe } = student;
    return ok(res, safe);
  } catch (err: any) {
    if (err.code === 'P2025') return fail(res, 404, 'Student not found');
    if (err.code === 'P2002') return fail(res, 409, 'Email already in use');
    return fail(res, 500, 'Failed to update student');
  }
});

// PATCH /api/students/:id/rfid
router.patch('/:id/rfid', authenticate, requireLabIncharge, async (req, res) => {
  const { rfidTag } = req.body;
  if (!rfidTag) return fail(res, 400, 'rfidTag is required');

  try {
    const student = await db.student.update({
      where: { id: normalizeId(req.params.id) },
      data:  { rfidTag: rfidTag.toUpperCase().trim() },
    });
    return ok(res, { id: student.id, name: student.name, rfidTag: student.rfidTag });
  } catch (err: any) {
    if (err.code === 'P2025') return fail(res, 404, 'Student not found');
    if (err.code === 'P2002') return fail(res, 409, 'This RFID tag is already assigned to another student');
    return fail(res, 500, 'Failed to assign RFID');
  }
});

// POST /api/students/:id/verify-password
// Admin or Lab Incharge clicks Show — verifies a guess and returns it
// Since bcrypt is one-way, we check if rollNo matches the hash (default password)
router.post('/:id/verify-password', authenticate, requireLabIncharge, async (req, res) => {
  try {
    const student = await db.student.findUnique({
      where:  { id: normalizeId(req.params.id) },
      select: { rollNo: true, password: true },
    });
    if (!student) return fail(res, 404, 'Student not found');

    // Check if default password (rollNo) still matches the hash
    const isDefault = await verifyPassword(student.rollNo, student.password);
    if (isDefault) {
      return ok(res, { password: student.rollNo, isDefault: true });
    }

    // Password has been changed — cannot recover it (bcrypt is one-way)
    return ok(res, { password: '••••••••', isDefault: false, changed: true });
  } catch {
    return fail(res, 500, 'Failed to verify password');
  }
});

// DELETE /api/students/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.student.update({
      where: { id: normalizeId(req.params.id) },
      data:  { isActive: false },
    });
    return ok(res, { message: 'Student deactivated successfully' });
  } catch (err: any) {
    if (err.code === 'P2025') return fail(res, 404, 'Student not found');
    return fail(res, 500, 'Failed to deactivate student');
  }
});

export default router;