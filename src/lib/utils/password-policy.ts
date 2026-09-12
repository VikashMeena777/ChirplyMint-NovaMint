/**
 * Shared password policy: 8+ chars, one uppercase letter, one number,
 * not a common dictionary password.
 * One source of truth for the server-side check (signup / change / reset
 * actions) and the client-side checklist UI.
 */

// Minimal common-password blocklist — these all pass the letter/number
// rules but are in every cracking dictionary (Strix vuln-0002).
const COMMON_PASSWORDS = new Set([
  "password1", "password123", "passw0rd1", "passw0rd123",
  "changeme1", "changeme123", "letmein123", "welcome123",
  "qwerty123", "qwertyui1", "abc12345", "iloveyou1",
  "admin1234", "admin12345", "welcome1", "monkey123",
  "dragon123", "sunshine1", "princess1", "football1",
  "chirplymint1", "chirply123", "instagram1", "insta12345",
]);

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
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "That password is too common — choose something unique";
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
