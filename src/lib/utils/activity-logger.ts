import { createClient } from "@/lib/supabase/server";

/**
 * Log a user activity. Fire-and-forget — never blocks the response.
 */
export async function logActivity(
  userId: string,
  action: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    const supabase = await createClient();
    await supabase.from("activity_log").insert({
      user_id: userId,
      action,
      metadata,
    });
  } catch (e) {
    // Non-blocking, but never fully silent — Vercel log tail is the backstop
    console.warn(`[Activity] log failed for ${action}:`, e instanceof Error ? e.message : e);
  }
}
