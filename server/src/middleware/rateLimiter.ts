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

// Tighter limiter for auth endpoints (also off in development for easy testing).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, error: 'Too many login attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProd,
});
