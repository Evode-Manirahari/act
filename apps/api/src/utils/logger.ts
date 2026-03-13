import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

export const logger = winston.createLogger({
  level: 'info',
  format: process.env.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
  transports: [new winston.transports.Console()],
});

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
}
