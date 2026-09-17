/**
 * Plain (non-"use server") module for the account-context constants + types.
 * Server-action files may only export async functions, so the cookie name and
 * the option shape live here and are imported by both sides.
 */
export const IG_ACCOUNT_COOKIE = "cm_ig_acct";

export interface IgAccountOption {
  id: string;
  ig_username: string;
  ig_profile_pic: string | null;
}

/** Which account a cookie value should select out of the user's accounts. */
export function pickSelectedAccount(
  accounts: IgAccountOption[],
  cookieValue: string | undefined
): IgAccountOption | null {
  if (accounts.length === 0) return null;
  return accounts.find((a) => a.id === cookieValue) ?? accounts[0];
}
