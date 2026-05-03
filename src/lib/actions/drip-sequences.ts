"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { canAddDripStep, type PlanKey } from "@/lib/utils/plan-limits";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────

export interface DripStep {
  id: string;
  sequence_id: string;
  step_number: number;
  delay_hours: number;
  message_text: string;
  template_type: string;
  template_title: string | null;
  template_subtitle: string | null;
  template_buttons: unknown[];
  created_at: string;
}

export interface DripSequence {
  id: string;
  automation_id: string;
  user_id: string;
  is_active: boolean;
  window_opener_text: string;
  created_at: string;
  updated_at: string;
  steps?: DripStep[];
}

export interface DripEnrollment {
  id: string;
  sequence_id: string;
  user_id: string;
  automation_id: string;
  recipient_ig_id: string;
  recipient_username: string | null;
  current_step: number;
  status: "waiting_reply" | "active" | "completed" | "cancelled" | "failed";
  next_send_at: string | null;
  enrolled_at: string;
  completed_at: string | null;
}

// ─── Sequence CRUD ───────────────────────────────────────

/**
 * Get the drip sequence (with steps) for an automation.
 */
export async function getDripSequence(automationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("drip_sequences")
    .select("*, drip_steps:drip_steps(*)") // join steps
    .eq("automation_id", automationId)
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows, which is expected for new automations
    return { data: null, error: error.message };
  }

  // Sort steps by step_number
  if (data?.drip_steps) {
    (data as Record<string, unknown>).drip_steps = (
      data.drip_steps as DripStep[]
    ).sort((a: DripStep, b: DripStep) => a.step_number - b.step_number);
  }

  return { data: data as DripSequence | null, error: null };
}

/**
 * Create a new drip sequence for an automation (or return existing one).
 */
export async function createDripSequence(automationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  // Check if sequence already exists
  const { data: existing } = await supabase
    .from("drip_sequences")
    .select("id")
    .eq("automation_id", automationId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return { data: existing, error: null };
  }

  // Verify automation ownership
  const { data: automation } = await supabase
    .from("automations")
    .select("id")
    .eq("id", automationId)
    .eq("user_id", user.id)
    .single();

  if (!automation) return { data: null, error: "Automation not found" };

  const { data, error } = await supabase
    .from("drip_sequences")
    .insert({
      automation_id: automationId,
      user_id: user.id,
      is_active: false,
    })
    .select("id")
    .single();

  if (error) return { data: null, error: error.message };

  logActivity(user.id, "drip.sequence_created", {
    automation_id: automationId,
    sequence_id: (data as Record<string, string>).id,
  }).catch(() => {});

  revalidatePath("/dashboard/automations");
  return { data, error: null };
}

/**
 * Toggle drip sequence on/off.
 */
export async function toggleDripSequence(
  sequenceId: string,
  isActive: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("drip_sequences")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", sequenceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, `drip.sequence_${isActive ? "enabled" : "disabled"}`, {
    sequence_id: sequenceId,
  }).catch(() => {});

  revalidatePath("/dashboard/automations");
  return { success: true };
}

/**
 * Update the window opener text for a drip sequence.
 */
export async function updateWindowOpener(
  sequenceId: string,
  windowOpenerText: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const trimmed = windowOpenerText.trim();
  if (!trimmed) return { error: "Window opener text is required" };
  if (trimmed.length > 500) return { error: "Window opener text is too long (max 500 chars)" };

  const { error } = await supabase
    .from("drip_sequences")
    .update({
      window_opener_text: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sequenceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/automations");
  return { success: true };
}

// ─── Step CRUD ───────────────────────────────────────────

/**
 * Add a step to a drip sequence (with plan limit check).
 */
export async function addDripStep(
  sequenceId: string,
  data: {
    delay_hours: number;
    message_text: string;
    template_type?: string;
    template_title?: string;
    template_buttons?: unknown[];
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check plan limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const userPlan = ((profile as Record<string, string>)?.plan || "free") as PlanKey;

  // Count existing steps
  const { count } = await supabase
    .from("drip_steps")
    .select("id", { count: "exact", head: true })
    .eq("sequence_id", sequenceId);

  const stepCheck = canAddDripStep(userPlan, count ?? 0);
  if (!stepCheck.allowed) {
    return {
      error: `You've reached your plan limit of ${stepCheck.limit} drip step(s). Upgrade to add more.`,
    };
  }

  // Get next step number
  const { data: lastStep } = await supabase
    .from("drip_steps")
    .select("step_number")
    .eq("sequence_id", sequenceId)
    .order("step_number", { ascending: false })
    .limit(1)
    .single();

  const nextStepNumber = ((lastStep as Record<string, number>)?.step_number ?? 0) + 1;

  const { data: inserted, error } = await supabase
    .from("drip_steps")
    .insert({
      sequence_id: sequenceId,
      step_number: nextStepNumber,
      delay_hours: data.delay_hours,
      message_text: data.message_text,
      template_type: data.template_type || "text",
      template_title: data.template_title || null,
      template_buttons: data.template_buttons || [],
    })
    .select()
    .single();

  if (error) return { error: error.message };

  logActivity(user.id, "drip.step_added", {
    sequence_id: sequenceId,
    step_number: nextStepNumber,
    delay_hours: data.delay_hours,
  }).catch(() => {});

  revalidatePath("/dashboard/automations");
  return { success: true, data: inserted };
}

/**
 * Update an existing drip step.
 */
export async function updateDripStep(
  stepId: string,
  updates: {
    delay_hours?: number;
    message_text?: string;
    template_type?: string;
    template_title?: string;
    template_buttons?: unknown[];
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify ownership through sequence
  const { data: step } = await supabase
    .from("drip_steps")
    .select("sequence_id, drip_sequences!inner(user_id)")
    .eq("id", stepId)
    .single();

  if (!step) return { error: "Step not found" };
  const stepData = step as Record<string, unknown>;
  const seqData = stepData.drip_sequences as Record<string, string>;
  if (seqData.user_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("drip_steps")
    .update(updates)
    .eq("id", stepId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/automations");
  return { success: true };
}

/**
 * Delete a drip step and re-number remaining steps.
 */
export async function deleteDripStep(stepId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get the step to find its sequence
  const { data: step } = await supabase
    .from("drip_steps")
    .select("sequence_id, step_number, drip_sequences!inner(user_id)")
    .eq("id", stepId)
    .single();

  if (!step) return { error: "Step not found" };
  const stepData = step as Record<string, unknown>;
  const seqData = stepData.drip_sequences as Record<string, string>;
  if (seqData.user_id !== user.id) return { error: "Unauthorized" };

  const sequenceId = stepData.sequence_id as string;
  const deletedStepNumber = stepData.step_number as number;

  // Delete the step
  const { error } = await supabase
    .from("drip_steps")
    .delete()
    .eq("id", stepId);

  if (error) return { error: error.message };

  // Re-number remaining steps
  const { data: remainingSteps } = await supabase
    .from("drip_steps")
    .select("id, step_number")
    .eq("sequence_id", sequenceId)
    .gt("step_number", deletedStepNumber)
    .order("step_number", { ascending: true });

  if (remainingSteps && remainingSteps.length > 0) {
    for (const s of remainingSteps) {
      const sData = s as Record<string, unknown>;
      await supabase
        .from("drip_steps")
        .update({ step_number: (sData.step_number as number) - 1 })
        .eq("id", sData.id as string);
    }
  }

  logActivity(user.id, "drip.step_deleted", {
    sequence_id: sequenceId,
    step_number: deletedStepNumber,
  }).catch(() => {});

  revalidatePath("/dashboard/automations");
  return { success: true };
}

// ─── Enrollments ─────────────────────────────────────────

/**
 * Enroll a recipient into a drip sequence (called by webhook after initial DM).
 * Uses service role client internally via the webhook handler.
 */
export async function enrollInDrip(
  sequenceId: string,
  userId: string,
  automationId: string,
  recipientIgId: string,
  recipientUsername: string | null
) {
  const supabase = await createClient();

  // Get the first step to calculate next_send_at
  const { data: firstStep } = await supabase
    .from("drip_steps")
    .select("delay_hours")
    .eq("sequence_id", sequenceId)
    .eq("step_number", 1)
    .single();

  if (!firstStep) return { error: "No drip steps configured" };

  const delayHours = (firstStep as Record<string, number>).delay_hours;
  const nextSendAt = new Date(
    Date.now() + delayHours * 60 * 60 * 1000
  ).toISOString();

  const { error } = await supabase.from("drip_enrollments").upsert(
    {
      sequence_id: sequenceId,
      user_id: userId,
      automation_id: automationId,
      recipient_ig_id: recipientIgId,
      recipient_username: recipientUsername,
      current_step: 0,
      status: "active",
      next_send_at: nextSendAt,
      enrolled_at: new Date().toISOString(),
    },
    { onConflict: "sequence_id,recipient_ig_id" }
  );

  if (error) return { error: error.message };

  logActivity(userId, "drip.enrollment_created", {
    sequence_id: sequenceId,
    recipient: recipientUsername || recipientIgId,
  }).catch(() => {});

  return { success: true };
}

/**
 * Get active enrollments for the current user (dashboard view).
 */
export async function getActiveEnrollments(limit = 50) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("drip_enrollments")
    .select(
      "*, drip_sequences(id, automation_id, automations:automation_id(name))"
    )
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false })
    .limit(limit);

  return { data: data ?? [], error: error?.message };
}

/**
 * Cancel a drip enrollment.
 */
export async function cancelEnrollment(enrollmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("drip_enrollments")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
    })
    .eq("id", enrollmentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, "drip.enrollment_cancelled", {
    enrollment_id: enrollmentId,
  }).catch(() => {});

  revalidatePath("/dashboard/automations");
  return { success: true };
}

/**
 * Get drip sequence stats for an automation.
 */
export async function getDripStats(automationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { active: 0, completed: 0, cancelled: 0, failed: 0, total: 0 };

  const { data: sequence } = await supabase
    .from("drip_sequences")
    .select("id")
    .eq("automation_id", automationId)
    .eq("user_id", user.id)
    .single();

  if (!sequence) return { active: 0, completed: 0, cancelled: 0, failed: 0, total: 0 };

  const seqId = (sequence as Record<string, string>).id;

  const { count: active } = await supabase
    .from("drip_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("sequence_id", seqId)
    .eq("status", "active");

  const { count: completed } = await supabase
    .from("drip_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("sequence_id", seqId)
    .eq("status", "completed");

  const { count: cancelled } = await supabase
    .from("drip_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("sequence_id", seqId)
    .eq("status", "cancelled");

  const { count: failed } = await supabase
    .from("drip_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("sequence_id", seqId)
    .eq("status", "failed");

  return {
    active: active ?? 0,
    completed: completed ?? 0,
    cancelled: cancelled ?? 0,
    failed: failed ?? 0,
    total: (active ?? 0) + (completed ?? 0) + (cancelled ?? 0) + (failed ?? 0),
  };
}
