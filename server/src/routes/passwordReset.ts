import { Router }        from 'express';
import { db }            from '../config/db';
import { ok, fail }      from '../utils/response';
import { hashPassword }  from '../utils/password';
import { sendResetCode } from '../config/mailer';

const router = Router();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const VALID_USER_TYPES = ['STUDENT', 'LAB_INCHARGE', 'ADMIN'];

// ── POST /api/password-reset/send-code ────────────────────────────────────────
router.post('/send-code', async (req, res) => {
  const { email, rollNo, userType } = req.body;

  if (!userType || !VALID_USER_TYPES.includes(userType)) {
    return fail(res, 400, 'userType must be STUDENT, LAB_INCHARGE, or ADMIN');
  }

  try {
    let userEmail = '';
    let userName  = '';
    let userId    = '';

    if (userType === 'STUDENT') {
      const student = rollNo
        ? await db.student.findUnique({ where: { rollNo: rollNo.trim() } })
        : email
          ? await db.student.findUnique({ where: { email: email.toLowerCase().trim() } })
          : null;

      if (!student || !student.isActive) {
        return ok(res, {
          message: 'If an account with that information exists, a reset code has been sent.',
        });
      }

      if (!student.email) {
        return fail(res, 400,
          'No email address is linked to this account. Please contact your lab admin to reset your password.'
        );
      }

      userEmail = student.email;
      userName  = student.name;
      userId    = student.id;

    } else if (userType === 'LAB_INCHARGE') {
      if (!email) return fail(res, 400, 'Email is required');

      const incharge = await db.labIncharge.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (!incharge || !incharge.isActive) {
        return ok(res, {
          message: 'If an account with that email exists, a reset code has been sent.',
        });
      }

      userEmail = incharge.email;
      userName  = incharge.name;
      userId    = incharge.id;

    } else {
      // ADMIN
      if (!email) return fail(res, 400, 'Email is required');

      const admin = await db.admin.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (!admin || !admin.isActive) {
        return ok(res, {
          message: 'If an account with that email exists, a reset code has been sent.',
        });
      }

      userEmail = admin.email;
      userName  = admin.name;
      userId    = admin.id;
    }

    // Delete any existing unused codes for this user
    await db.passwordReset.deleteMany({
      where: { userId, used: false },
    });

    // Create new reset code — expires in 15 minutes
    const code = generateCode();
    await db.passwordReset.create({
      data: {
        email:     userEmail,
        code,
        userType,
        userId,
        used:      false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await sendResetCode(userEmail, userName, code);

    return ok(res, {
      message: `Reset code sent to ${userEmail.replace(/(.{2}).+(@.+)/, '$1***$2')}`,
      maskedEmail: userEmail.replace(/(.{2}).+(@.+)/, '$1***$2'),
    });

  } catch (err) {
    console.error('Send reset code error:', err);
    return fail(res, 500, 'Failed to send reset code. Please try again.');
  }
});

// ── POST /api/password-reset/verify-code ──────────────────────────────────────
router.post('/verify-code', async (req, res) => {
  const { code, userType } = req.body;

  if (!code || !userType || !VALID_USER_TYPES.includes(userType)) {
    return fail(res, 400, 'code and a valid userType are required');
  }

  try {
    const reset = await db.passwordReset.findFirst({
      where: {
        code:      code.trim(),
        userType,
        used:      false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!reset) {
      return fail(res, 400, 'Invalid or expired reset code');
    }

    return ok(res, { valid: true, userId: reset.userId });
  } catch {
    return fail(res, 500, 'Failed to verify code');
  }
});

// ── POST /api/password-reset/reset-password ───────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { code, userType, newPassword } = req.body;

  if (!code || !userType || !newPassword || !VALID_USER_TYPES.includes(userType)) {
    return fail(res, 400, 'code, a valid userType, and newPassword are required');
  }

  if (newPassword.length < 6) {
    return fail(res, 400, 'Password must be at least 6 characters');
  }

  try {
    const reset = await db.passwordReset.findFirst({
      where: {
        code:      code.trim(),
        userType,
        used:      false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!reset) {
      return fail(res, 400, 'Invalid or expired reset code. Please request a new one.');
    }

    const hashed = await hashPassword(newPassword);

    if (userType === 'STUDENT') {
      await db.student.update({
        where: { id: reset.userId },
        data:  { password: hashed },
      });
    } else if (userType === 'LAB_INCHARGE') {
      await db.labIncharge.update({
        where: { id: reset.userId },
        data:  { password: hashed },
      });
    } else {
      // ADMIN
      await db.admin.update({
        where: { id: reset.userId },
        data:  { password: hashed },
      });
    }

    await db.passwordReset.update({
      where: { id: reset.id },
      data:  { used: true },
    });

    return ok(res, { message: 'Password reset successfully. You can now log in.' });

  } catch {
    return fail(res, 500, 'Failed to reset password');
  }
});

export default router;