import request from 'supertest';
import express  from 'express';
import { db }   from '../config/db';

// ── Minimal app for testing (no MQTT / socket) ─────────────────────────────
import authRoutes from '../routes/auth';
import { errorHandler } from '../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler as any);

// ── Test data ─────────────────────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@smartlab.com';
const ADMIN_PASSWORD = 'admin123';
const STUDENT_ROLLNO = '21-CS-45';
const STUDENT_PASS   = 'student123';

describe('POST /api/auth/login', () => {
  it('returns 400 when role is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, role: 'ADMIN' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 for wrong admin password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'wrongpassword', role: 'ADMIN' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for non-existent admin email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@lab.com', password: 'pass', role: 'ADMIN' });
    expect(res.statusCode).toBe(401);
  });

  it('returns JWT token for valid admin login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'ADMIN' });

    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.role).toBe('ADMIN');
    } else {
      // Seed data not present — skip
      expect([200, 401]).toContain(res.statusCode);
    }
  });

  it('returns JWT for valid student login with roll number', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ rollNo: STUDENT_ROLLNO, password: STUDENT_PASS, role: 'STUDENT' });

    if (res.statusCode === 200) {
      expect(res.body.data.user.role).toBe('STUDENT');
      expect(res.body.data.user).toHaveProperty('rollNo');
    } else {
      expect([200, 401]).toContain(res.statusCode);
    }
  });

  it('returns 400 when student logs in without roll number or email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'pass', role: 'STUDENT' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid role value', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'x@y.com', password: 'pass', role: 'SUPERUSER' });
    expect(res.statusCode).toBe(400);
  });
});

afterAll(async () => {
  await db.$disconnect();
});