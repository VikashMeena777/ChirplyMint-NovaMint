"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Delete the current user's account and all associated data.
 * Cascading deletes on FK constraints handle child rows.
 */
export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    // 1. Delete profile (cascades to automations, leads, dm_logs, etc.)
    await supabase.from("profiles").delete().eq("id", user.id);

    // 2. Delete user settings
    await supabase.from("user_settings").delete().eq("user_id", user.id);

    // 3. Delete activity log
    await supabase.from("activity_log").delete().eq("user_id", user.id);

    // 4. Sign out the user
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[deleteAccount] Error:", err);
    return { error: "Failed to delete account. Please contact support." };
  }

  redirect("/");
}
