import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type UserRole = 'ADMIN' | 'LAB_INCHARGE' | 'STUDENT';

export interface JwtPayload {
  userId: string;
  email:  string;
  role:   UserRole;
  name:   string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}