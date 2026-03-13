import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';

// Build a throwaway Express app with a very tight limit for testing
function buildTestApp(max: number) {
  const app = express();
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests', code: 'RATE_LIMITED' },
  });
  app.use(limiter);
  app.get('/test', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('Rate limiter middleware', () => {
  it('allows requests below the limit', async () => {
    const app = buildTestApp(5);
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 429 after exceeding the limit', async () => {
    const app = buildTestApp(3);

    // Exhaust the limit
    await request(app).get('/test');
    await request(app).get('/test');
    await request(app).get('/test');

    // This one should be rate limited
    const limited = await request(app).get('/test');
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('RATE_LIMITED');
  });

  it('sets RateLimit-Limit header', async () => {
    const app = buildTestApp(10);
    const res = await request(app).get('/test');
    expect(res.headers['ratelimit-limit']).toBeDefined();
  });

  it('sets RateLimit-Remaining header', async () => {
    const app = buildTestApp(10);
    const res = await request(app).get('/test');
    expect(res.headers['ratelimit-remaining']).toBeDefined();
    expect(parseInt(res.headers['ratelimit-remaining'])).toBe(9);
  });

  it('rate limit error body contains expected fields', async () => {
    const app = buildTestApp(1);
    await request(app).get('/test'); // uses the only allowed request
    const limited = await request(app).get('/test');
    expect(limited.status).toBe(429);
    expect(limited.body).toHaveProperty('error');
    expect(limited.body).toHaveProperty('code', 'RATE_LIMITED');
  });
});
