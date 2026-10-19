// Mirrors the Cognito user pool password policy so the form can guide people before submitting.

export const PASSWORD_RULES = {
  minLength: 8,
  needsLowercase: true,
  needsNumber: true,
} as const;

export type PasswordCheck = {
  length: boolean;
  lowercase: boolean;
  number: boolean;
  ok: boolean;
};

export function checkPassword(password: string): PasswordCheck {
  const length = password.length >= PASSWORD_RULES.minLength;
  const lowercase = !PASSWORD_RULES.needsLowercase || /[a-z]/.test(password);
  const number = !PASSWORD_RULES.needsNumber || /[0-9]/.test(password);
  return { length, lowercase, number, ok: length && lowercase && number };
}
