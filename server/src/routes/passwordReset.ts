import { Router }        from 'express';
import { randomInt }     from 'crypto';
import { db }            from '../config/db';
import { ok, fail }      from '../utils/response';
import { hashPassword }  from '../utils/password';
import { sendResetCode } from '../config/mailer';
import { authLimiter }   from '../middleware/rateLimiter';

const router = Router();

function generateCode(): string {
  // crypto.randomInt is cryptographically secure — Math.random() is not,
  // and its internal state can in principle be inferred from enough
  // output, which matters for something as sensitive as a password-reset
  // code.
  return randomInt(100000, 1000000).toString();
}

const VALID_USER_TYPES = ['STUDENT', 'LAB_INCHARGE', 'ADMIN'];

// Resolves an email/rollNo back to the account's stored email, without any
// side effects — used by verify-code and reset-password to double-check
// that the code being used actually belongs to the account the caller is
// claiming to be, not just to code+userType.
async function resolveAccountEmail(
  userType: string,
  email?: string,
  rollNo?: string,
): Promise<string | null> {
  if (userType === 'STUDENT') {
    const student = rollNo
      ? await db.student.findUnique({ where: { rollNo: rollNo.trim() } })
      : email
        ? await db.student.findUnique({ where: { email: email.toLowerCase().trim() } })
        : null;
    return student?.email ?? null;
  }
  if (userType === 'LAB_INCHARGE') {
    if (!email) return null;
    const incharge = await db.labIncharge.findUnique({ where: { email: email.toLowerCase().trim() } });
    return incharge?.email ?? null;
  }
  if (!email) return null;
  const admin = await db.admin.findUnique({ where: { email: email.toLowerCase().trim() } });
  return admin?.email ?? null;
}

// ── POST /api/password-reset/send-code ────────────────────────────────────────
router.post('/send-code', authLimiter, async (req, res) => {
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
router.post('/verify-code', authLimiter, async (req, res) => {
  const { code, userType, email, rollNo } = req.body;

  if (!code || !userType || !VALID_USER_TYPES.includes(userType)) {
    return fail(res, 400, 'code and a valid userType are required');
  }
  if (!email && !rollNo) {
    return fail(res, 400, 'email (or roll number, for students) is required');
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

    // A code only being valid and unexpired isn't enough — it must also
    // belong to the account the caller is claiming to reset. Without this,
    // a single guessed/leaked 6-digit code for a role (900,000 possible
    // values) could reset ANY account of that role, not just the one it
    // was actually emailed to.
    const claimedEmail = await resolveAccountEmail(userType, email, rollNo);
    if (!reset || !claimedEmail || reset.email.toLowerCase() !== claimedEmail.toLowerCase()) {
      return fail(res, 400, 'Invalid or expired reset code');
    }

    return ok(res, { valid: true, userId: reset.userId });
  } catch {
    return fail(res, 500, 'Failed to verify code');
  }
});

// ── POST /api/password-reset/reset-password ───────────────────────────────────
router.post('/reset-password', authLimiter, async (req, res) => {
  const { code, userType, newPassword, email, rollNo } = req.body;

  if (!code || !userType || !newPassword || !VALID_USER_TYPES.includes(userType)) {
    return fail(res, 400, 'code, a valid userType, and newPassword are required');
  }
  if (!email && !rollNo) {
    return fail(res, 400, 'email (or roll number, for students) is required');
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

    // Same account-binding check as verify-code — see the comment there.
    // This is the step that actually changes a password, so it matters
    // most here even though verify-code already checked it once; a
    // determined caller could otherwise skip straight to this endpoint.
    const claimedEmail = await resolveAccountEmail(userType, email, rollNo);
    if (!reset || !claimedEmail || reset.email.toLowerCase() !== claimedEmail.toLowerCase()) {
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