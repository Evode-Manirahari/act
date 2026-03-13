import * as Sentry from '@sentry/react-native';

declare const process: { env: Record<string, string | undefined> };

let initialized = false;

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
    tracesSampleRate: process.env.EXPO_PUBLIC_ENV === 'production' ? 0.1 : 1.0,
    enableAutoSessionTracking: true,
    // Ignore non-actionable errors
    ignoreErrors: ['Network request failed', 'AbortError'],
  });

  initialized = true;
}

export function captureException(err: unknown): void {
  if (initialized) {
    Sentry.captureException(err);
  }
}

export function setUserContext(userId: string, trade: string): void {
  if (initialized) {
    Sentry.setUser({ id: userId });
    Sentry.setTag('trade', trade);
  }
}
