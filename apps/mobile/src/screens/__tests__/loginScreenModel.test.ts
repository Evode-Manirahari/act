import { canSubmitLogin } from '../loginScreenModel';

describe('login screen submit predicate', () => {
  it('blocks submit for empty or whitespace-only email', () => {
    expect(canSubmitLogin({ email: '', password: 'x', submitting: false })).toBe(false);
    expect(canSubmitLogin({ email: '   ', password: 'x', submitting: false })).toBe(false);
  });

  it('blocks submit for an empty password', () => {
    expect(canSubmitLogin({ email: 'a@b.c', password: '', submitting: false })).toBe(false);
  });

  it('blocks double-submit while a sign-in is in flight', () => {
    expect(canSubmitLogin({ email: 'a@b.c', password: 'x', submitting: true })).toBe(false);
  });

  it('allows submit with email, password, and no in-flight request', () => {
    expect(canSubmitLogin({ email: 'a@b.c', password: 'x', submitting: false })).toBe(true);
  });
});

describe('friendlyAuthError', () => {
  const { friendlyAuthError } = require('../loginScreenModel');

  it('maps bad credentials to invite-only guidance', () => {
    expect(friendlyAuthError('Invalid login credentials')).toContain('invite-only');
  });

  it('maps unconfirmed email to admin follow-up', () => {
    expect(friendlyAuthError('Email not confirmed')).toContain('ACT admin');
  });

  it('maps rate limiting to wait-and-retry', () => {
    expect(friendlyAuthError('Too many requests, please retry')).toContain('Wait a minute');
  });

  it('maps network failures to connection guidance', () => {
    expect(friendlyAuthError('Network request failed')).toContain('connection');
    expect(friendlyAuthError('TypeError: Failed to fetch')).toContain('connection');
  });

  it('keeps the raw message as detail for unknown errors', () => {
    expect(friendlyAuthError('weird upstream error')).toBe('Sign-in failed: weird upstream error');
  });
});
