import request from 'supertest';
import app from '../app';

jest.mock('../lib/redis', () => ({
  getRedis: jest.fn(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
  })),
}));

describe('GET /health', () => {
  it('returns 200 with all checks ok when Redis is available', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.ts).toBe('string');
  });

  it('response includes checks object with api and redis fields', async () => {
    const res = await request(app).get('/health');
    expect(res.body.checks).toBeDefined();
    expect(res.body.checks.api).toBe('ok');
    expect(res.body.checks.redis).toBe('ok');
  });

  it('response includes version and env fields', async () => {
    const res = await request(app).get('/health');
    expect(typeof res.body.version).toBe('string');
    expect(typeof res.body.env).toBe('string');
  });

  it('returns degraded status when Redis is unavailable', async () => {
    const { getRedis } = require('../lib/redis');
    getRedis.mockReturnValueOnce({
      ping: jest.fn().mockRejectedValue(new Error('Connection refused')),
    });

    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.redis).toBe('unavailable');
    expect(res.body.checks.api).toBe('ok');
  });
});
