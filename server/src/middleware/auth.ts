import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { db } from '../config/db';
import { fail } from '../utils/response';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    fail(res, 401, 'No token provided');
    return;
  }

  const token = header.split(' ')[1];

  try {
    const payload = verifyToken(token);
    let user: any = null;

    if (payload.role === 'ADMIN') {
      user = await db.admin.findUnique({ where: { id: payload.userId } });
    } else if (payload.role === 'LAB_INCHARGE') {
      user = await db.labIncharge.findUnique({ where: { id: payload.userId } });
    } else if (payload.role === 'STUDENT') {
      user = await db.student.findUnique({ where: { id: payload.userId } });
    }

    if (!user || !user.isActive) {
      fail(res, 401, 'User not found or deactivated');
      return;
    }

    req.user = {
      id:    user.id,
      name:  user.name,
      email: user.email ?? '',
      role:  payload.role,
    };
    next();
  } catch {
    fail(res, 401, 'Invalid or expired token');
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'ADMIN') {
    fail(res, 403, 'Admin access required');
    return;
  }
  next();
}

export function requireLabIncharge(req: Request, res: Response, next: NextFunction): void {
  if (!['ADMIN', 'LAB_INCHARGE'].includes(req.user?.role ?? '')) {
    fail(res, 403, 'Lab Incharge access required');
    return;
  }
  next();
}

export function requireStudent(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'STUDENT') {
    fail(res, 403, 'Student access required');
    return;
  }
  next();
}