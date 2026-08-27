// import { Router } from 'express';
// import { db }                          from '../config/db';
// import { authenticate, requireStudent } from '../middleware/auth';
// import { ok, fail }                     from '../utils/response';

// const router = Router();

// // GET /api/my/history — student sees ONLY their own records
// router.get('/history', authenticate, requireStudent, async (req, res) => {
//   try {
//     const transactions = await db.transaction.findMany({
//       where:   { studentId: req.user!.id },
//       include: {
//         bottle:      { select: { chemicalName: true, unit: true, location: true } },
//         labIncharge: { select: { name: true } },
//       },
//       orderBy: { timeTaken: 'desc' },
//       take:    200,
//     });
//     return ok(res, transactions);
//   } catch {
//     return fail(res, 500, 'Failed to fetch your history');
//   }
// });

// // GET /api/my/profile — student's own profile
// router.get('/profile', authenticate, requireStudent, async (req, res) => {
//   try {
//     const student = await db.student.findUnique({
//       where: { id: req.user!.id },
//       select: {
//         id:          true,
//         name:        true,
//         rollNo:      true,
//         email:       true,
//         batch:       true,
//         department:  true,
//         phone:       true,
//         rfidTag:     true,
//         lastLogin:   true,
//         lastRfidScan:true,
//         createdAt:   true,
//         _count: { select: { transactions: true } },
//       },
//     });

//     if (!student) return fail(res, 404, 'Profile not found');
//     return ok(res, student);
//   } catch {
//     return fail(res, 500, 'Failed to fetch your profile');
//   }
// });
// // PATCH /api/my/change-password — Student changes their own password
// router.patch('/change-password', authenticate, requireStudent, async (req, res) => {
//   const { currentPassword, newPassword } = req.body;

//   if (!currentPassword || !newPassword) {
//     return fail(res, 400, 'currentPassword and newPassword are required');
//   }

//   if (newPassword.length < 6) {
//     return fail(res, 400, 'New password must be at least 6 characters');
//   }

//   try {
//     const student = await db.student.findUnique({
//       where:  { id: req.user!.id },
//       select: { password: true },
//     });

//     if (!student) return fail(res, 404, 'Student not found');

//     // Verify current password
//     const { verifyPassword } = await import('../utils/password');
//     const isValid = await verifyPassword(currentPassword, student.password);
//     if (!isValid) {
//       return fail(res, 401, 'Current password is incorrect');
//     }

//     // Hash and save new password
//     const { hashPassword } = await import('../utils/password');
//     const hashed = await hashPassword(newPassword);

//     await db.student.update({
//       where: { id: req.user!.id },
//       data:  { password: hashed },
//     });

//     return ok(res, { message: 'Password changed successfully' });
//   } catch {
//     return fail(res, 500, 'Failed to change password');
//   }
// });
// export default router;





import { Router } from 'express';
import { db }                                                    from '../config/db';
import { authenticate, requireStudent, requireLabIncharge }      from '../middleware/auth';
import { ok, fail }                                              from '../utils/response';
import { verifyPassword, hashPassword }                          from '../utils/password';

const router = Router();

// ─── STUDENT routes ───────────────────────────────────────────────────────────

// GET /api/my/history
router.get('/history', authenticate, requireStudent, async (req, res) => {
  try {
    const transactions = await db.transaction.findMany({
      where:   { studentId: req.user!.id },
      include: {
        bottle:      { select: { chemicalName: true, unit: true, location: true } },
        labIncharge: { select: { name: true } },
      },
      orderBy: { timeTaken: 'desc' },
      take:    200,
    });
    return ok(res, transactions);
  } catch {
    return fail(res, 500, 'Failed to fetch your history');
  }
});

// GET /api/my/profile — student profile
router.get('/profile', authenticate, requireStudent, async (req, res) => {
  try {
    const student = await db.student.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, name: true, rollNo: true, email: true,
        batch: true, department: true, phone: true,
        rfidTag: true, lastLogin: true, lastRfidScan: true, createdAt: true,
        _count: { select: { transactions: true } },
      },
    });
    if (!student) return fail(res, 404, 'Profile not found');
    return ok(res, student);
  } catch {
    return fail(res, 500, 'Failed to fetch your profile');
  }
});

// PATCH /api/my/change-password — student changes own password
router.patch('/change-password', authenticate, requireStudent, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)  return fail(res, 400, 'currentPassword and newPassword are required');
  if (newPassword.length < 6)            return fail(res, 400, 'New password must be at least 6 characters');

  try {
    const student = await db.student.findUnique({
      where:  { id: req.user!.id },
      select: { password: true },
    });
    if (!student) return fail(res, 404, 'Student not found');

    const isValid = await verifyPassword(currentPassword, student.password);
    if (!isValid) return fail(res, 401, 'Current password is incorrect');

    await db.student.update({
      where: { id: req.user!.id },
      data:  { password: await hashPassword(newPassword) },
    });
    return ok(res, { message: 'Password changed successfully' });
  } catch {
    return fail(res, 500, 'Failed to change password');
  }
});

// ─── ADMIN + LAB INCHARGE shared routes ──────────────────────────────────────

// GET /api/my/staff-profile — Admin or Lab Incharge views own profile
router.get('/staff-profile', authenticate, requireLabIncharge, async (req, res) => {
  try {
    if (req.user!.role === 'ADMIN') {
      const admin = await db.admin.findUnique({
        where:  { id: req.user!.id },
        select: {
          id: true, name: true, email: true,
          lastLogin: true, createdAt: true, isActive: true,
        },
      });
      if (!admin) return fail(res, 404, 'Profile not found');
      return ok(res, { ...admin, role: 'ADMIN' });
    }

    // LAB_INCHARGE
    const incharge = await db.labIncharge.findUnique({
      where:  { id: req.user!.id },
      select: {
        id: true, name: true, email: true, employeeId: true,
        department: true, phone: true,
        lastLogin: true, createdAt: true, isActive: true,
        _count: { select: { transactions: true } },
      },
    });
    if (!incharge) return fail(res, 404, 'Profile not found');
    return ok(res, { ...incharge, role: 'LAB_INCHARGE' });
  } catch {
    return fail(res, 500, 'Failed to fetch profile');
  }
});

// PATCH /api/my/staff-change-password — Admin or Lab Incharge changes own password
router.patch('/staff-change-password', authenticate, requireLabIncharge, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)  return fail(res, 400, 'currentPassword and newPassword are required');
  if (newPassword.length < 6)            return fail(res, 400, 'New password must be at least 6 characters');

  try {
    let storedHash = '';

    if (req.user!.role === 'ADMIN') {
      const admin = await db.admin.findUnique({
        where:  { id: req.user!.id },
        select: { password: true },
      });
      if (!admin) return fail(res, 404, 'Admin not found');
      storedHash = admin.password;
    } else {
      const incharge = await db.labIncharge.findUnique({
        where:  { id: req.user!.id },
        select: { password: true },
      });
      if (!incharge) return fail(res, 404, 'Lab Incharge not found');
      storedHash = incharge.password;
    }

    const isValid = await verifyPassword(currentPassword, storedHash);
    if (!isValid) return fail(res, 401, 'Current password is incorrect');

    const hashed = await hashPassword(newPassword);

    if (req.user!.role === 'ADMIN') {
      await db.admin.update({ where: { id: req.user!.id }, data: { password: hashed } });
    } else {
      await db.labIncharge.update({ where: { id: req.user!.id }, data: { password: hashed } });
    }

    return ok(res, { message: 'Password changed successfully' });
  } catch {
    return fail(res, 500, 'Failed to change password');
  }
});

export default router;