"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";

export interface SetupStep {
  id: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
}

export interface SetupStatus {
  steps: SetupStep[];
  dismissed: boolean;
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
}

export async function getSetupStatus(): Promise<SetupStatus | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("setup_checklist_dismissed")
    .eq("id", user.id)
    .single();

  const dismissed =
    (profile as Record<string, unknown>)?.setup_checklist_dismissed === true;

  // Check Instagram connection
  const { data: settings } = await supabase
    .from("user_settings")
    .select("instagram_connected")
    .eq("user_id", user.id)
    .single();

  const igConnected =
    (settings as Record<string, unknown>)?.instagram_connected === true;

  // Check if any automation exists
  const { count: automationCount } = await supabase
    .from("automations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("status", "deleted");

  const hasAutomation = (automationCount ?? 0) > 0;

  // Check if any DM was sent
  const { count: dmCount } = await supabase
    .from("dm_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "sent");

  const hasSentDm = (dmCount ?? 0) > 0;

  // Check if any lead was captured
  const { count: leadCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const hasLead = (leadCount ?? 0) > 0;

  const steps: SetupStep[] = [
    {
      id: "connect_instagram",
      label: "Connect Instagram",
      description: "Link your Instagram Business account",
      href: "/dashboard/settings",
      completed: igConnected,
    },
    {
      id: "create_automation",
      label: "Create First Automation",
      description: "Set up a keyword trigger & auto DM",
      href: "/dashboard/automations",
      completed: hasAutomation,
    },
    {
      id: "send_first_dm",
      label: "Send Your First DM",
      description: "Test your automation with a comment",
      href: "/dashboard/messages",
      completed: hasSentDm,
    },
    {
      id: "capture_lead",
      label: "Capture a Lead",
      description: "Convert a DM recipient into a lead",
      href: "/dashboard/leads",
      completed: hasLead,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  return {
    steps,
    dismissed,
    completedCount,
    totalCount: steps.length,
    allComplete: completedCount === steps.length,
  };
}

export async function dismissSetupChecklist(): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("profiles")
    .update({ setup_checklist_dismissed: true })
    .eq("id", user.id);

  if (error) {
    console.error("[Setup] Dismiss failed:", error);
    return { success: false };
  }

  logActivity(user.id, "setup.checklist_dismissed", {}).catch(() => {});
  return { success: true };
}
