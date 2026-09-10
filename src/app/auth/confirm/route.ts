import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Verifies an email OTP (recovery / magiclink / signup) and establishes the
 * session, then forwards to `next`.
 *
 * Why this exists: Supabase's own email links point at
 * <project>.supabase.co, while our mail is sent from novamintnetworks.in.
 * That sender/link domain mismatch made Gmail flag password resets as
 * phishing and drop them in spam. We now mail the link ourselves on our own
 * domain and land it here.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    console.error("[Auth Confirm] verifyOtp failed:", error.message);
    const reason = /expired/i.test(error.message) ? "link_expired" : "invalid_link";
    return NextResponse.redirect(`${origin}/forgot-password?error=${reason}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
