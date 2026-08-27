import { Response } from 'express';

export function ok<T>(res: Response, data: T, meta?: Record<string, unknown>) {
  return res.json({ success: true, data, meta });
}

export function fail(res: Response, status: number, message: string | object) {
  return res.status(status).json({ success: false, error: message });
}