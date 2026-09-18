"use server";

import { getPasswordResetHtml } from "@/lib/email/templates/password-reset";
import { validatePasswordPolicy } from "@/lib/utils/password-policy";
import { sendEmail } from "@/lib/email/send";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { checkRateLimit, getAuthLimiter } from "@/lib/utils/rate-limiter";
import { headers, cookies } from "next/headers";
import { trackServerEvent, identifyServerUser } from "@/lib/analytics/posthog-server";


/**
 * Get client IP for rate limiting.
 * Uses x-forwarded-for header (Vercel/proxy) or falls back to a default.
 */
async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function login(formData: FormData) {
  // Rate limit: 5 login attempts per 15 minutes per IP
  const ip = await getClientIp();
  const authLimiter = getAuthLimiter();
  const rateCheck = await checkRateLimit(authLimiter, `auth:login:${ip}`);
  if (!rateCheck.allowed) {
    return { error: "Too many login attempts. Please try again in a few minutes." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    logActivity(user.id, "auth.login", { method: "email" }).catch(() => {});
    trackServerEvent(user.id, "user.logged_in", { method: "email" });
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(
  formData: FormData
): Promise<{ error: string } | { needsEmailConfirmation: true; email: string }> {
  // Rate limit: 5 signup attempts per 15 minutes per IP
  const ip = await getClientIp();
  const authLimiter = getAuthLimiter();
  const rateCheck = await checkRateLimit(authLimiter, `auth:signup:${ip}`);
  if (!rateCheck.allowed) {
    return { error: "Too many signup attempts. Please try again later." };
  }

  const supabase = await createClient();

  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const password = formData.get("password") as string;

  // Password policy enforced HERE — the signup form's checklist is only a
  // hint and can be bypassed (devtools, curl, disabled JS). This is the
  // authoritative gate; keep it in sync with the checklist copy.
  const policyError = validatePasswordPolicy(password);
  if (policyError) return { error: policyError };

  // Park the referral code where /api/auth/callback will find it. It can only
  // be applied once the account exists AND has a session — which, with email
  // confirmation on, doesn't happen until the link is clicked.
  const refCode = (formData.get("referral_code") as string | null)?.trim().toUpperCase();
  if (refCode) {
    const cookieStore = await cookies();
    cookieStore.set("pending_referral", encodeURIComponent(refCode), {
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // No identities means the address is already registered — Supabase sends no
  // email and deliberately returns a user-shaped response so we can't tell
  // signups apart from resends. Don't count it, don't welcome it.
  const isAlreadyRegistered =
    Array.isArray(data.user?.identities) && data.user.identities.length === 0;

  if (data.user && !isAlreadyRegistered) {
    logActivity(data.user.id, "auth.signup", {
      method: "email",
      verified: !!data.session,
    }).catch(() => {});
    identifyServerUser(data.user.id, { email, name, plan: "free" });
    trackServerEvent(data.user.id, "user.signed_up", { method: "email" });
  }

  // Email confirmation is ON (mailer_autoconfirm = false), so signUp returns
  // NO session: the account exists but can't be used until the link in the
  // email is clicked. Redirecting to /dashboard here is what used to bounce
  // people to /login with no explanation and lose them.
  if (!data.session) {
    return { needsEmailConfirmation: true, email };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Re-send the "confirm your email" link. Used by the signup screen (nothing
 * arrived) and by the login screen (someone tried to sign in before they
 * confirmed).
 */
export async function resendConfirmation(
  email: string
): Promise<{ success?: true; error?: string }> {
  const ip = await getClientIp();
  const authLimiter = getAuthLimiter();
  const rateCheck = await checkRateLimit(authLimiter, `auth:resend:${ip}`);
  if (!rateCheck.allowed) {
    return { error: "Too many attempts. Please try again in a few minutes." };
  }

  const clean = (email || "").trim().toLowerCase();
  if (!clean || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    return { error: "Enter a valid email address" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: clean,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    if (/already\s+confirmed|already\s+been\s+confirmed/i.test(error.message)) {
      return { error: "That email is already confirmed — just sign in." };
    }
    // Supabase throttles per address (~60s between emails). Say what to do
    // instead of relaying "you can only request this after 26 seconds".
    if (/rate limit|after \d+ seconds|security purposes/i.test(error.message)) {
      return { error: "That link was just sent — give it a minute before asking for another." };
    }
    console.error("[Signup] Resend confirmation failed:", error.message);
    return { error: error.message };
  }

  return { success: true };
}

export async function signInWithGoogle(referralCode?: string) {
  const supabase = await createClient();

  // Same cookie the email path sets — a Google signup skips the signup action
  // entirely, so arriving via /signup?ref=… and choosing Google dropped the
  // code before this.
  if (referralCode?.trim()) {
    const cookieStore = await cookies();
    cookieStore.set("pending_referral", encodeURIComponent(referralCode.trim().toUpperCase()), {
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    logActivity(user.id, "auth.signout").catch(() => {});
    trackServerEvent(user.id, "user.signed_out");
  }
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Send welcome email immediately for new users.
 * Checks onboarding_email_step — only sends if at step 0.
 * Advances to step 1 so the cron doesn't duplicate it.
 */
// NOTE: the welcome email lives in /api/auth/callback (sendWelcomeIfNew) and
// fires the moment someone confirms their address — that's the first point a
// new account can actually sign in. The copy that used to sit here never ran:
// signUp() returns no session while confirmation is required, so getUser()
// was always null.

export async function changePassword(newPassword: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const policyError = validatePasswordPolicy(newPassword);
  if (policyError) return { error: policyError };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return {};
}

/**
 * Send a password-reset email FROM OUR DOMAIN with a link ON OUR DOMAIN.
 *
 * Supabase's built-in reset mail links to <project>.supabase.co while our
 * SMTP sender is novamintnetworks.in. Gmail treats that sender/link domain
 * mismatch on a password page as phishing — the mail landed in spam with a
 * warning banner. We generate the recovery token via the admin API and mail
 * it ourselves through Resend, so both domains match.
 *
 * Always returns success: never reveal whether an address is registered.
 */
export async function requestPasswordReset(
  email: string
): Promise<{ success: true } | { error: string }> {
  const ip = await getClientIp();
  const authLimiter = getAuthLimiter();
  const rateCheck = await checkRateLimit(authLimiter, `auth:reset:${ip}`);
  if (!rateCheck.allowed) {
    return { error: "Too many reset attempts. Please try again in a few minutes." };
  }

  const clean = (email || "").trim().toLowerCase();
  if (!clean || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    return { error: "Enter a valid email address" };
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: clean,
    });

    // Unknown address → say nothing (account-enumeration protection)
    if (error || !data?.properties?.hashed_token) {
      if (error && !/not found|User not found/i.test(error.message)) {
        console.error("[Reset] generateLink error:", error.message);
      }
      return { success: true };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const resetUrl =
      `${appUrl}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}` +
      `&type=recovery&next=${encodeURIComponent("/reset-password")}`;

    const name =
      (data.user?.user_metadata?.full_name as string) ||
      clean.split("@")[0] ||
      "there";

    const sent = await sendEmail({
      to: clean,
      subject: "Reset your ChirplyMint password",
      html: getPasswordResetHtml({ name, resetUrl, expiresMinutes: 60 }),
    });

    if (!sent.success) {
      console.error("[Reset] Email send failed:", sent.error);
      return { error: "Could not send the reset email. Please try again shortly." };
    }

    return { success: true };
  } catch (err) {
    console.error("[Reset] Unexpected error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Set a new password from the reset-email flow (user arrives with a
 * session via /auth/confirm). Policy enforced SERVER-side — the client
 * checklist is only a hint.
 */
export async function setNewPassword(
  newPassword: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link expired — request a new one." };

  const policyError = validatePasswordPolicy(newPassword);
  if (policyError) return { error: policyError };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return {};
}
