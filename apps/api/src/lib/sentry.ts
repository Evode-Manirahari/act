import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || process.env.NODE_ENV === 'test') return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [Sentry.httpIntegration()],
  });

  initialized = true;
}

export function captureException(err: unknown): void {
  if (initialized) {
    Sentry.captureException(err);
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (initialized) {
    Sentry.captureMessage(message, level);
  }
}

export function isInitialized(): boolean {
  return initialized;
}
