import request    from 'supertest';
import express     from 'express';
import { db }      from '../config/db';
import { signToken } from '../utils/jwt';
import studentRoutes from '../routes/students';
import { errorHandler } from '../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api/students', studentRoutes);
app.use(errorHandler as any);

let ADMIN_TOKEN = '';
let INCHARGE_TOKEN = '';

beforeAll(async () => {
  const admin = await db.admin.findFirst();
  if (admin) {
    ADMIN_TOKEN = signToken({
      userId: admin.id,
      email:  admin.email,
      role:   'ADMIN',
      name:   admin.name,
    });
  }

  const incharge = await db.labIncharge.findFirst();
  if (incharge) {
    INCHARGE_TOKEN = signToken({
      userId: incharge.id,
      email:  incharge.email,
      role:   'LAB_INCHARGE',
      name:   incharge.name,
    });
  }
});

describe('GET /api/students', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/students');
    expect(res.statusCode).toBe(401);
  });

  it('allows access for LAB_INCHARGE', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${INCHARGE_TOKEN}`);
    expect(res.statusCode).toBe(200);
  });

  it('returns array for admin', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('POST /api/students', () => {
  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ name: 'Test' });
    expect(res.statusCode).toBe(400);
  });

  it('allows access for LAB_INCHARGE role', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${INCHARGE_TOKEN}`)
      .send({ name: 'X', rollNo: `22-CS-${Date.now().toString().slice(-4)}`, batch: '2022-2026', department: 'CS' });
    expect(res.statusCode).toBe(200);
  });
});

describe('PATCH /api/students/:id/rfid', () => {
  it('returns 401 without token', async () => {
    const res = await request(app)
      .patch('/api/students/any-id/rfid')
      .send({ rfidTag: 'AABBCCDD' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 404 for non-existent student', async () => {
    const res = await request(app)
      .patch('/api/students/non-existent-id/rfid')
      .set('Authorization', `Bearer ${INCHARGE_TOKEN}`)
      .send({ rfidTag: 'AABBCCDD' });
    expect(res.statusCode).toBe(404);
  });
});

afterAll(async () => {
  await db.$disconnect();
});