"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

/**
 * Delete the current user's account and all associated data.
 * Requires password re-entry for security.
 * Cascading deletes on FK constraints handle child rows.
 * Also removes the auth.users entry so the email is fully freed.
 */
export async function deleteAccount(password: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (!password || password.trim().length === 0) {
    return { error: "Password is required" };
  }

  // Verify password before proceeding
  // For OAuth users: check if they have an email identity with a password
  const hasPasswordIdentity = user.app_metadata?.providers?.includes("email");

  if (hasPasswordIdentity) {
    // Email/password user — verify their password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (signInError) {
      return { error: "Incorrect password. Please try again." };
    }
  }
  // OAuth-only users: password field acts as extra friction (any value accepted)
  // They already passed the "type DELETE" check on the frontend

  try {
    // 1. Delete profile (cascades to automations, leads, dm_logs, etc.)
    await supabase.from("profiles").delete().eq("id", user.id);

    // 2. Delete user settings
    await supabase.from("user_settings").delete().eq("user_id", user.id);

    // 3. Delete activity log
    await supabase.from("activity_log").delete().eq("user_id", user.id);

    // 4. Sign out the user
    await supabase.auth.signOut();

    // 5. Delete the auth.users entry (requires service role)
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await admin.auth.admin.deleteUser(user.id);

    console.log(`[Account] 🗑️ Deleted account for ${user.email}`);
  } catch (err) {
    console.error("[deleteAccount] Error:", err);
    return { error: "Failed to delete account. Please contact support." };
  }

  redirect("/");
}
