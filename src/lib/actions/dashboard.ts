"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { PLANS, type PlanKey } from "@/lib/utils/plan-limits";

export async function getUserPlan(): Promise<PlanKey> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "free";
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  return ((profile as Record<string, unknown>)?.plan as PlanKey) || "free";
}

export async function getDashboardStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Count active automations
  const { count: automationCount } = await supabase
    .from("automations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");

  // Count DMs sent this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: dmsSent } = await supabase
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "sent")
    .gte("sent_at", startOfMonth.toISOString());

  // Count total leads
  const { count: leadsCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Recent activity
  const { data: recentActivity } = await supabase
    .from("activity_log")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: (profile as Record<string, unknown>)?.full_name as string || "",
      avatar: (profile as Record<string, unknown>)?.avatar_url as string || "",
      plan: (profile as Record<string, unknown>)?.plan as string || "free",
      dmLimit: PLANS[((profile as Record<string, unknown>)?.plan as PlanKey) || "free"]?.dmLimit ?? PLANS.free.dmLimit,
    },
    stats: {
      activeAutomations: automationCount ?? 0,
      dmsSentThisMonth: dmsSent ?? 0,
      totalLeads: leadsCount ?? 0,
    },
    recentActivity: recentActivity ?? [],
  };
}

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Count DMs sent this month from dm_logs (source of truth)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: dmsSentThisMonth } = await supabase
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "sent")
    .gte("sent_at", startOfMonth.toISOString());

  return {
    id: user.id,
    email: user.email ?? "",
    name: (profile as Record<string, unknown>)?.full_name as string || "",
    avatar: (profile as Record<string, unknown>)?.avatar_url as string || "",
    plan: (profile as Record<string, unknown>)?.plan as string || "free",
    dmCountThisMonth: dmsSentThisMonth ?? 0,
    dmLimit: PLANS[((profile as Record<string, unknown>)?.plan as PlanKey) || "free"]?.dmLimit ?? PLANS.free.dmLimit,
  };
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: formData.get("name") as string,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, "profile.update", { name: formData.get("name") as string }).catch(() => {});
  return { success: true };
}

export async function getNotificationPreferences() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", user.id)
    .single();

  const defaults = {
    dm_delivery_alerts: true,
    weekly_report: true,
    new_lead_alerts: false,
    product_updates: true,
  };

  return {
    ...defaults,
    ...((profile as Record<string, unknown>)?.notification_preferences as Record<string, boolean> ?? {}),
  };
}

export async function updateNotificationPreferences(prefs: Record<string, boolean>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ notification_preferences: prefs })
    .eq("id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, "notifications.update", prefs).catch(() => {});
  return { success: true };
}
