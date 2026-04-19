"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchInstagramPosts, fetchInstagramPostByUrl, type InstagramPost } from "@/lib/instagram/send-dm";

/**
 * Get the current user's recent Instagram posts for the post picker.
 * Now fetches 50 posts (up from 20) and supports pagination.
 */
export async function getInstagramPosts(afterCursor?: string): Promise<{
  data: InstagramPost[];
  nextCursor?: string;
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

  const result = await fetchInstagramPosts(
    igAccount.ig_user_id as string,
    igAccount.access_token as string,
    50,
    afterCursor
  );

  return { data: result.posts, nextCursor: result.nextCursor };
}

/**
 * Fetch a specific Instagram post by its URL.
 * Uses oEmbed + permalink matching to find and return the post.
 */
export async function getInstagramPostByUrl(postUrl: string): Promise<{
  data: InstagramPost | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  // Validate URL format
  const urlLower = postUrl.toLowerCase();
  if (!urlLower.includes("instagram.com/") && !urlLower.includes("instagr.am/")) {
    return { data: null, error: "Please enter a valid Instagram post or reel URL." };
  }

  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("ig_user_id, access_token")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!igAccount) {
    return { data: null, error: "No Instagram account connected" };
  }

  const post = await fetchInstagramPostByUrl(
    postUrl,
    igAccount.ig_user_id as string,
    igAccount.access_token as string
  );

  if (!post) {
    return { data: null, error: "Post not found. Make sure the URL is from your own account." };
  }

  return { data: post };
}
