import request from 'supertest';
import app from '../app';

describe('POST /api/chat', () => {
  it('returns 400 for missing sessionId', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'hello' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid UUID sessionId', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ sessionId: 'not-a-uuid', message: 'hello' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent session', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ sessionId: '00000000-0000-0000-0000-000000000000', message: 'hello' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Session not found');
  });
});
