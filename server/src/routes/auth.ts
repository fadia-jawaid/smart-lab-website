import { Router } from 'express';
import { db }              from '../config/db';
import { verifyPassword }  from '../utils/password';
import { signToken }       from '../utils/jwt';
import { ok, fail }        from '../utils/response';
import { authenticate }    from '../middleware/auth';
import { authLimiter }     from '../middleware/rateLimiter';

const router = Router();

// ─── POST /api/auth/login ────────────────────────────────────────────────────
// Body: { email?, rollNo?, password, role }
// role must be: 'ADMIN' | 'LAB_INCHARGE' | 'STUDENT'

router.post('/login', authLimiter, async (req, res) => {
  console.log('LOGIN REQUEST:', req.body);

  const { email, rollNo, password, role } = req.body;

  // Basic input validation
  if (!role || !password) {
    return fail(res, 400, 'Role and password are required');
  }

  if (!['ADMIN', 'LAB_INCHARGE', 'STUDENT'].includes(role)) {
    return fail(res, 400, 'Invalid role. Must be ADMIN, LAB_INCHARGE, or STUDENT');
  }

  try {
    let user: any = null;

    // ── Admin login ──────────────────────────────────────────────
    if (role === 'ADMIN') {
      if (!email) return fail(res, 400, 'Email is required for Admin login');

      user = await db.admin.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
    }

    // ── Lab Incharge login ───────────────────────────────────────
    else if (role === 'LAB_INCHARGE') {
      if (!email) return fail(res, 400, 'Email is required for Lab Incharge login');

      user = await db.labIncharge.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
    }

    // ── Student login ─────────────────────────────────────────────
    else if (role === 'STUDENT') {
      // Students can log in with Roll Number OR Email
      if (rollNo) {
        user = await db.student.findUnique({
          where: { rollNo: rollNo.trim() },
        });
      } else if (email) {
        user = await db.student.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
      } else {
        return fail(res, 400, 'Roll number or email is required for Student login');
      }
    }

    // ── User not found ────────────────────────────────────────────
    console.log('USER FOUND:', user);

// ── User not found ────────────────────────────────────────────
if (!user) {
  console.log('User not found');
  return fail(res, 401, 'Invalid credentials');
}

    // ── Account deactivated ───────────────────────────────────────
    if (!user.isActive) {
      return fail(res, 401, 'Your account has been deactivated. Contact the admin.');
    }

    // ── Password check ────────────────────────────────────────────
    // const passwordValid = await verifyPassword(password, user.password);
const passwordValid = await verifyPassword(password, user.password);

console.log('PASSWORD VALID:', passwordValid);

    if (!passwordValid) {
      return fail(res, 401, 'Invalid credentials');
    }

    // ── Update last login time ────────────────────────────────────
    const updateData = { lastLogin: new Date() };
    if (role === 'ADMIN') {
      await db.admin.update({ where: { id: user.id }, data: updateData });
    } else if (role === 'LAB_INCHARGE') {
      await db.labIncharge.update({ where: { id: user.id }, data: updateData });
    } else if (role === 'STUDENT') {
      await db.student.update({ where: { id: user.id }, data: updateData });
    }

    // ── Sign JWT ──────────────────────────────────────────────────
    const token = signToken({
      userId: user.id,
      email:  user.email ?? '',
      role,
      name:   user.name,
    });

    // ── Build response user object ────────────────────────────────
    const responseUser: Record<string, any> = {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role,
    };

    // Add student-specific fields
    if (role === 'STUDENT') {
      responseUser.rollNo     = user.rollNo;
      responseUser.batch      = user.batch;
      responseUser.department = user.department;
      responseUser.rfidTag    = user.rfidTag;
    }

    // Add lab incharge-specific fields
    if (role === 'LAB_INCHARGE') {
      responseUser.employeeId = user.employeeId;
      responseUser.department = user.department;
    }

    return ok(res, { token, user: responseUser });

  } catch (err) {
    console.error('Login error:', err);
    return fail(res, 500, 'Login failed. Please try again.');
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  return ok(res, req.user);
});

export default router;