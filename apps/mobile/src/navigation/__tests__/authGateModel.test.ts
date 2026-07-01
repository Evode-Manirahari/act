import { resolveAuthGate } from '../authGateModel';

describe('pilot auth gate', () => {
  it('falls back to the pilot stack when Supabase is not configured (demo flow unchanged)', () => {
    expect(
      resolveAuthGate({
        configStatus: 'unconfigured',
        requireAuth: false,
        loading: false,
        hasSession: false,
      }),
    ).toBe('stack');
  });

  it('fails closed when the build requires auth but Supabase is not configured', () => {
    expect(
      resolveAuthGate({
        configStatus: 'unconfigured',
        requireAuth: true,
        loading: false,
        hasSession: false,
      }),
    ).toBe('config-error');
  });

  it('fails closed on partial/invalid config regardless of requireAuth', () => {
    expect(
      resolveAuthGate({
        configStatus: 'misconfigured',
        requireAuth: false,
        loading: false,
        hasSession: false,
      }),
    ).toBe('config-error');
    expect(
      resolveAuthGate({
        configStatus: 'misconfigured',
        requireAuth: true,
        loading: false,
        hasSession: true,
      }),
    ).toBe('config-error');
  });

  it('shows the loader only during the initial session check', () => {
    expect(
      resolveAuthGate({
        configStatus: 'configured',
        requireAuth: true,
        loading: true,
        hasSession: false,
      }),
    ).toBe('loading');
  });

  it('denies unauthenticated users when configured', () => {
    expect(
      resolveAuthGate({
        configStatus: 'configured',
        requireAuth: false,
        loading: false,
        hasSession: false,
      }),
    ).toBe('login');
  });

  it('shows the pilot stack once a session exists', () => {
    expect(
      resolveAuthGate({
        configStatus: 'configured',
        requireAuth: true,
        loading: false,
        hasSession: true,
      }),
    ).toBe('stack');
  });
});
