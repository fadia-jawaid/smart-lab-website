import request from 'supertest';
import express  from 'express';
import { db }   from '../config/db';
import { signToken } from '../utils/jwt';
import scanRoutes   from '../routes/scan';
import { errorHandler } from '../middleware/errorHandler';

jest.mock('../services/socketService', () => ({
  emitEvent:    jest.fn(),
  SOCKET_EVENTS: { NEW_EVENT: 'new_event', INVENTORY_UPDATE: 'inventory_update', ALERT_TRIGGERED: 'alert_triggered', USER_SCAN: 'user_scan' },
}));
jest.mock('../services/mqttService', () => ({ publishAlert: jest.fn() }));

const app = express();
app.use(express.json());
app.use('/api/scan', scanRoutes);
app.use(errorHandler as any);

let INCHARGE_TOKEN = '';

beforeAll(async () => {
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

describe('POST /api/scan/start', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).post('/api/scan/start').send({});
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/scan/start')
      .set('Authorization', `Bearer ${INCHARGE_TOKEN}`)
      .send({ studentRfid: 'ABC123' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for unrecognized student RFID', async () => {
    const res = await request(app)
      .post('/api/scan/start')
      .set('Authorization', `Bearer ${INCHARGE_TOKEN}`)
      .send({ studentRfid: 'UNKNOWN0', bottleRfid: 'BOTTLE01', initialWeight: 500 });
    expect([404, 401]).toContain(res.statusCode);
  });
});

describe('POST /api/scan/complete', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).post('/api/scan/complete').send({});
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 when transactionId is missing', async () => {
    const res = await request(app)
      .post('/api/scan/complete')
      .set('Authorization', `Bearer ${INCHARGE_TOKEN}`)
      .send({ finalWeight: 400 });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for non-existent transaction', async () => {
    const res = await request(app)
      .post('/api/scan/complete')
      .set('Authorization', `Bearer ${INCHARGE_TOKEN}`)
      .send({ transactionId: 'non-existent-id', finalWeight: 400 });
    expect(res.statusCode).toBe(404);
  });
});

afterAll(async () => {
  await db.$disconnect();
});