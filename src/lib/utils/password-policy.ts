/**
 * Shared password policy: 8+ chars, one uppercase letter, one number.
 * One source of truth for the server-side check (signup / change / reset
 * actions) and the client-side checklist UI.
 */

export function validatePasswordPolicy(
  password: string | null | undefined
): string | null {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/\d/.test(password)) {
    return "Password must contain at least one number";
  }
  return null;
}

export function getPasswordChecks(password: string) {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One number", met: /\d/.test(password) },
  ];
}
