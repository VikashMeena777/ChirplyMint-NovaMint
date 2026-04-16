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
  } catch {
    // Non-blocking — silently fail
  }
}
