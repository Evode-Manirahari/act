import { initSentry, captureException, captureMessage, isInitialized } from '../lib/sentry';

// Sentry is skipped when NODE_ENV=test (default in Jest)
describe('Sentry lib', () => {
  beforeEach(() => {
    // Ensure test env is set so Sentry never actually initializes in CI
    process.env.NODE_ENV = 'test';
  });

  it('initSentry does not throw when SENTRY_DSN is absent', () => {
    delete process.env.SENTRY_DSN;
    expect(() => initSentry()).not.toThrow();
  });

  it('initSentry does not throw when SENTRY_DSN is present but NODE_ENV=test', () => {
    process.env.SENTRY_DSN = 'https://fake@sentry.io/123';
    expect(() => initSentry()).not.toThrow();
    delete process.env.SENTRY_DSN;
  });

  it('isInitialized returns false in test environment', () => {
    expect(isInitialized()).toBe(false);
  });

  it('captureException does not throw when not initialized', () => {
    expect(() => captureException(new Error('test error'))).not.toThrow();
  });

  it('captureMessage does not throw when not initialized', () => {
    expect(() => captureMessage('test message', 'info')).not.toThrow();
    expect(() => captureMessage('warning msg', 'warning')).not.toThrow();
    expect(() => captureMessage('error msg', 'error')).not.toThrow();
  });

  it('captureException handles non-Error values gracefully', () => {
    expect(() => captureException('string error')).not.toThrow();
    expect(() => captureException({ code: 404 })).not.toThrow();
    expect(() => captureException(null)).not.toThrow();
  });
});
