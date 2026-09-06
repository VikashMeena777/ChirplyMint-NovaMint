"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchInstagramPosts, fetchInstagramPostByUrl, fetchInstagramStories, type InstagramPost } from "@/lib/instagram/send-dm";
import { fetchAccountInsights, fetchRecentMedia } from "@/lib/instagram/insights";

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

/**
 * Get the current user's active Instagram stories for the story picker.
 * Stories are only available while live (24-hour window).
 */
export async function getInstagramStories(): Promise<{
  data: InstagramPost[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

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

  const result = await fetchInstagramStories(
    igAccount.ig_user_id as string,
    igAccount.access_token as string
  );

  return { data: result.stories };
}

/**
 * Content Performance (Graph API v26): account-level metrics + recent media.
 * Requires instagram_business_manage_insights (requested at OAuth; until Meta
 * approves it for production, the Graph call may error — the UI surfaces that).
 */
export async function getContentInsights(): Promise<{
  connected: boolean;
  needsPermission: boolean;
  accountMetrics: Record<string, number>;
  media: {
    id: string;
    caption: string;
    media_type: string;
    permalink: string;
    timestamp: string;
    like_count?: number;
    comments_count?: number;
  }[];
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { connected: false, needsPermission: false, accountMetrics: {}, media: [] };

  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("ig_user_id, access_token, page_access_token")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!igAccount) return { connected: false, needsPermission: false, accountMetrics: {}, media: [] };

  const accessToken = ((igAccount as Record<string, string>).page_access_token ||
    (igAccount as Record<string, string>).access_token) as string;
  const igUserId = (igAccount as Record<string, string>).ig_user_id;

  const [account, media] = await Promise.all([
    fetchAccountInsights(accessToken, igUserId, 30),
    fetchRecentMedia(accessToken, igUserId, 9),
  ]);

  return {
    connected: true,
    needsPermission: Boolean(account.error && /permission|insights/i.test(account.error)),
    accountMetrics: account.metrics,
    media,
  };
}
