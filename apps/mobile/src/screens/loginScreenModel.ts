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
