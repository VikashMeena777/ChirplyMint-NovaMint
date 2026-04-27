"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { checkRateLimit, getAuthLimiter } from "@/lib/utils/rate-limiter";
import { headers } from "next/headers";

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

  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        full_name: formData.get("name") as string,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) logActivity(user.id, "auth.signup", { method: "email" }).catch(() => {});

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
