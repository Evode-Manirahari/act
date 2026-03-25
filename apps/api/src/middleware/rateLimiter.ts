import rateLimit from 'express-rate-limit';

const skip = () => process.env.NODE_ENV === 'test';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.CHAT_RATE_LIMIT || '20'),
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});
