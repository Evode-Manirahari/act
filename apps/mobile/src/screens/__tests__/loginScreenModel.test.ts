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
