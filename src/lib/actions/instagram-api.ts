"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchInstagramPosts, type InstagramPost } from "@/lib/instagram/send-dm";

/**
 * Get the current user's recent Instagram posts for the post picker.
 * Calls the Instagram Graph API with the stored access token.
 */
export async function getInstagramPosts(): Promise<{
  data: InstagramPost[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  // Get the user's active Instagram account
  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("ig_user_id, access_token")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!igAccount) {
    return { data: [], error: "No Instagram account connected" };
  }

  const posts = await fetchInstagramPosts(
    igAccount.ig_user_id as string,
    igAccount.access_token as string,
    20
  );

  return { data: posts };
}
