import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on('error', (err) => logger.error('Redis error', { err: err.message }));
  }
  return redis;
}
