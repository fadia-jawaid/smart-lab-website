import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const isProd = env.NODE_ENV === 'production';

// General API limiter — generous, and disabled entirely in development
// (an SPA that polls + React StrictMode double-fetches trips a low cap instantly).
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, error: 'Too many requests, slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProd,
});

// Tighter limiter for auth endpoints — also protects password-reset code
// verification, where a 6-digit code has only 900,000 possible values, so
// this must stay active even outside production. It used to fully
// `skip: () => !isProd`, i.e. be completely OFF unless NODE_ENV was
// exactly "production" — meaning brute-forcing a reset code had zero rate
// limiting during normal development/demo use. A higher cap in
// development still leaves room for React StrictMode's double-fetches and
// manual testing, without leaving the endpoint wide open.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 50 : 300,
  message: { success: false, error: 'Too many login attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});