"use server";

import { logInfo } from "@/lib/utils/logger";
import { getPasswordResetHtml } from "@/lib/email/templates/password-reset";
import { validatePasswordPolicy } from "@/lib/utils/password-policy";
import { sendEmail } from "@/lib/email/send";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { checkRateLimit, getAuthLimiter } from "@/lib/utils/rate-limiter";
import { headers } from "next/headers";
import { getWelcomeOnboardingHtml } from "@/lib/email/templates/onboarding-day1";
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

export async function signup(formData: FormData) {
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

  const { error } = await supabase.auth.signUp({
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

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    logActivity(user.id, "auth.signup", { method: "email" }).catch(() => {});
    identifyServerUser(user.id, { email, name, plan: "free" });
    trackServerEvent(user.id, "user.signed_up", { method: "email" });

    // Send welcome email immediately (fire-and-forget)
    sendWelcomeEmail(user.id, email, name).catch((err) => {
      console.error("[Onboarding] Failed to send welcome email:", err);
    });
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signInWithGoogle() {
  const supabase = await createClient();

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
async function sendWelcomeEmail(userId: string, email: string, name: string) {
  if (!email) return;

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check current onboarding step
  const { data: profile } = await admin
    .from("profiles")
    .select("onboarding_email_step")
    .eq("id", userId)
    .single();

  const step = (profile as Record<string, unknown>)?.onboarding_email_step as number;
  if (step !== 0) return; // Already past welcome email

  // Send welcome email
  const displayName = name || "there";
  await sendEmail({
    to: email,
    subject: "Welcome to ChirplyMint! 🚀 Here's how to get started",
    html: getWelcomeOnboardingHtml(displayName),
  });

  // Advance to step 1, schedule next email in 2 days
  const nextAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  await admin.from("profiles").update({
    onboarding_email_step: 1,
    onboarding_email_next_at: nextAt.toISOString(),
  }).eq("id", userId);

  logInfo("Onboarding", "✉️ Welcome email sent", { email });
}

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
