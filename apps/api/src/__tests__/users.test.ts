import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('POST /api/users/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers a new user', async () => {
    const mockUser = {
      id: 'user_1',
      deviceId: 'device-abc',
      trade: 'ELECTRICAL',
      createdAt: new Date(),
    };
    (mockPrisma.user.upsert as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/users/register')
      .send({ deviceId: 'device-abc', trade: 'ELECTRICAL' });

    expect(res.status).toBe(201);
    expect(res.body.deviceId).toBe('device-abc');
  });

  it('returns 400 for missing deviceId', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ trade: 'ELECTRICAL' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('defaults trade to ELECTRICAL when not provided', async () => {
    const mockUser = {
      id: 'user_1',
      deviceId: 'device-xyz',
      trade: 'ELECTRICAL',
      createdAt: new Date(),
    };
    (mockPrisma.user.upsert as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/users/register')
      .send({ deviceId: 'device-xyz' });

    expect(res.status).toBe(201);
    expect(res.body.trade).toBe('ELECTRICAL');
  });
});

describe('GET /api/users/:deviceId', () => {
  it('returns user when found', async () => {
    const mockUser = {
      id: 'user_1',
      deviceId: 'device-abc',
      trade: 'ELECTRICAL',
      createdAt: new Date(),
    };
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app).get('/api/users/device-abc');
    expect(res.status).toBe(200);
    expect(res.body.deviceId).toBe('device-abc');
  });

  it('returns 404 when not found', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/users/unknown-device');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
