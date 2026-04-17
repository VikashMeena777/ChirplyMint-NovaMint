"use server";

import { createClient } from "@/lib/supabase/server";

export async function getInstagramConnection(): Promise<{
  connected: boolean;
  username: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { connected: false, username: "" };

  const { data } = await supabase
    .from("user_settings")
    .select("instagram_connected, instagram_username")
    .eq("user_id", user.id)
    .single();

  return {
    connected: (data as Record<string, unknown>)?.instagram_connected === true,
    username: ((data as Record<string, unknown>)?.instagram_username as string) || "",
  };
}

export async function disconnectInstagram(): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("user_settings")
    .update({
      instagram_connected: false,
      instagram_user_id: null,
      instagram_username: null,
      instagram_access_token: null,
      facebook_page_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to disconnect Instagram:", error);
    return { success: false };
  }

  // Log activity (fire and forget)
  void Promise.resolve(
    supabase.from("activity_log").insert({
      user_id: user.id,
      action: "instagram.disconnected",
      details: {},
    })
  ).catch(() => {});

  return { success: true };
}
