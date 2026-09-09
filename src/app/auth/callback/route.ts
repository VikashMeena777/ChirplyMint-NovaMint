import { NextResponse } from "next/server";

/**
 * Alias for the REAL auth callback at /api/auth/callback.
 *
 * Supabase's password-reset emails are built from the project's Site URL /
 * Redirect URLs config. If that config points at /auth/callback (an older
 * path), users land here instead of getting a 404 — we forward everything
 * (code, next, error params) to the real handler untouched.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const target = new URL("/api/auth/callback", origin);
  // Preserve every query param (code, next, error, etc.)
  searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });
  return NextResponse.redirect(target.toString());
}
