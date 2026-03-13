import rateLimit from 'express-rate-limit';

// Skip rate limiting in test environment so tests aren't affected
const skipInTest = () => process.env.NODE_ENV === 'test';

const rateLimitMessage = { error: 'Too many requests', code: 'RATE_LIMITED' };

/** General API limiter — 100 requests per minute */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT ?? '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  skip: skipInTest,
});

/** Chat endpoint limiter — 20 requests per minute (GPT-4o cost control) */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.CHAT_RATE_LIMIT ?? '20'),
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  skip: skipInTest,
});

/** Transcribe endpoint limiter — 10 requests per minute (Whisper cost control) */
export const transcribeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.TRANSCRIBE_RATE_LIMIT ?? '10'),
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  skip: skipInTest,
});
