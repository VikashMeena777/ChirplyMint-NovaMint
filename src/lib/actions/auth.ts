"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/utils/activity-logger";
import { checkRateLimit, getAuthLimiter } from "@/lib/utils/rate-limiter";
import { headers } from "next/headers";
import { sendEmail } from "@/lib/email/send";
import { getWelcomeOnboardingHtml } from "@/lib/email/templates/onboarding-day1";

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
  if (user) logActivity(user.id, "auth.login", { method: "email" }).catch(() => {});

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

  const { error } = await supabase.auth.signUp({
    email,
    password: formData.get("password") as string,
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
  if (user) logActivity(user.id, "auth.signout").catch(() => {});
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

  console.log(`[Onboarding] ✉️ Welcome email sent to ${email}`);
}
