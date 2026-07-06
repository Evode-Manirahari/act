/**
 * Pure submit predicate for LoginScreen, extracted for testability
 * (same pattern as learnScreenModel.ts).
 */
export function canSubmitLogin(inputs: {
  email: string;
  password: string;
  submitting: boolean;
}): boolean {
  return inputs.email.trim().length > 0 && inputs.password.length > 0 && !inputs.submitting;
}

/**
 * Map raw Supabase auth errors to copy a tech on a jobsite can act on.
 * Matched case-insensitively on substrings because auth-js message strings
 * are not a stable API. Unrecognized errors keep the raw message as a
 * detail — honest beats pretty when debugging a pilot login.
 */
export function friendlyAuthError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes('invalid login credentials')) {
    return "Email or password didn't match. Access is invite-only — check with your ACT admin if you need an account.";
  }
  if (msg.includes('email not confirmed')) {
    return 'This account has not been activated yet. Ask your ACT admin to finish the invite.';
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Too many sign-in attempts. Wait a minute and try again.';
  }
  if (msg.includes('network') || msg.includes('fetch failed') || msg.includes('failed to fetch')) {
    return "Can't reach the sign-in service. Check your connection and try again.";
  }
  return `Sign-in failed: ${raw}`;
}
