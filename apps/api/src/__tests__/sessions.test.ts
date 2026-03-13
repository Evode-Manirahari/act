import request from 'supertest';
import app from '../app';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  prisma: {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockSession = {
  id: 'session_1',
  userId: 'user_1',
  trade: 'ELECTRICAL',
  startedAt: new Date(),
  endedAt: null,
  jobAddress: '123 Main St',
  jobNotes: null,
  summary: null,
  messages: [],
};

describe('POST /api/sessions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a session', async () => {
    (mockPrisma.session.create as jest.Mock).mockResolvedValue(mockSession);

    const res = await request(app)
      .post('/api/sessions')
      .send({ userId: 'user_1', trade: 'ELECTRICAL', jobAddress: '123 Main St' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('session_1');
    expect(res.body.trade).toBe('ELECTRICAL');
  });

  it('returns 400 for invalid trade', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({ userId: 'user_1', trade: 'INVALID' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/sessions/:id', () => {
  it('returns session with messages', async () => {
    (mockPrisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);

    const res = await request(app).get('/api/sessions/session_1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('session_1');
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  it('returns 404 when not found', async () => {
    (mockPrisma.session.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/sessions/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/sessions/user/:userId', () => {
  it('returns user sessions newest first', async () => {
    (mockPrisma.session.findMany as jest.Mock).mockResolvedValue([mockSession]);

    const res = await request(app).get('/api/sessions/user/user_1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].userId).toBe('user_1');
  });
});

describe('PATCH /api/sessions/:id', () => {
  it('updates session fields', async () => {
    const updated = { ...mockSession, jobNotes: 'Replaced breaker' };
    (mockPrisma.session.update as jest.Mock).mockResolvedValue(updated);

    const res = await request(app)
      .patch('/api/sessions/session_1')
      .send({ jobNotes: 'Replaced breaker' });

    expect(res.status).toBe(200);
    expect(res.body.jobNotes).toBe('Replaced breaker');
  });
});
