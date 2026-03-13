import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger, requestLogger } from './utils/logger';
import { captureException } from './lib/sentry';
import { apiLimiter } from './middleware/rateLimiter';
import { getRedis } from './lib/redis';
import usersRouter from './routes/users';
import sessionsRouter from './routes/sessions';
import chatRouter from './routes/chat';
import transcribeRouter from './routes/transcribe';
import exportRouter from './routes/export';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);
app.use(apiLimiter);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const checks: Record<string, string> = { api: 'ok' };

  try {
    const redis = getRedis();
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'unavailable';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  return res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    checks,
    ts: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    env: process.env.NODE_ENV ?? 'development',
  });
});

app.use('/api/users', usersRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/transcribe', transcribeRouter);
app.use('/api/sessions', exportRouter);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('unhandled error', { message: err.message });
  captureException(err);
  res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
});

export default app;
