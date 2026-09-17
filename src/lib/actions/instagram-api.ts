"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveWorkspaceScope, type WorkspaceScope } from "@/lib/workspace";
import { fetchInstagramPosts, fetchInstagramPostByUrl, fetchInstagramStories, getBucUsage, type InstagramPost } from "@/lib/instagram/send-dm";
import { fetchAccountInsights, fetchRecentMedia } from "@/lib/instagram/insights";

/**
 * Resolve which connected account to read from.
 *
 * Multi-account bug fix: these loaders used to hard-code the FIRST active
 * account (`.limit(1)`), so a user with several accounts always saw the
 * primary account's posts/stories in the automation wizard no matter which
 * account was selected. Passing `accountId` (the instagram_accounts row id
 * from the picker) now targets that account; omitting it keeps the old
 * "first active account" behaviour.
 *
 * Ownership is enforced by the same `.eq("user_id", targetId)` filter, so a
 * forged accountId belonging to someone else simply resolves to nothing.
 */
async function resolveIgAccount(
  db: WorkspaceScope["client"],
  targetId: string,
  accountId?: string
) {
  let query = db
    .from("instagram_accounts")
    .select("ig_user_id, access_token, page_access_token")
    .eq("user_id", targetId)
    .eq("is_active", true);
  if (accountId) query = query.eq("id", accountId);
  const { data } = await query.limit(1).single();
  return data as { ig_user_id: string; access_token: string | null; page_access_token: string | null } | null;
}

/**
 * Get the current user's recent Instagram posts for the post picker.
 * Now fetches 50 posts (up from 20) and supports pagination.
 */
export async function getInstagramPosts(
  afterCursor?: string,
  accountId?: string
): Promise<{
  data: InstagramPost[];
  nextCursor?: string;
  error?: string;
}> {
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return { data: [], error: "Not authenticated" };
  const { targetId, client: db } = scope;

  // Get the user's active Instagram account
  const igAccount = await resolveIgAccount(db, targetId, accountId);

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
export async function getInstagramPostByUrl(
  postUrl: string,
  accountId?: string
): Promise<{
  data: InstagramPost | null;
  error?: string;
}> {
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return { data: null, error: "Not authenticated" };
  const { targetId, client: db } = scope;

  // Validate URL format
  const urlLower = postUrl.toLowerCase();
  if (!urlLower.includes("instagram.com/") && !urlLower.includes("instagr.am/")) {
    return { data: null, error: "Please enter a valid Instagram post or reel URL." };
  }

  const igAccount = await resolveIgAccount(db, targetId, accountId);

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
export async function getInstagramStories(accountId?: string): Promise<{
  data: InstagramPost[];
  error?: string;
}> {
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return { data: [], error: "Not authenticated" };
  const { targetId, client: db } = scope;

  const igAccount = await resolveIgAccount(db, targetId, accountId);

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
export async function getContentInsights(accountId?: string): Promise<{
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
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return { connected: false, needsPermission: false, accountMetrics: {}, media: [] };
  const { targetId, client: db } = scope;

  const igAccount = await resolveIgAccount(db, targetId, accountId);

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

/**
 * Rate-limit gauge (A23): the messaging senders in send-dm.ts keep the latest
 * x-business-use-case-usage reading per IG account in memory. Levels:
 * ok < 80% of the 24h window, warning ≥ 80%, critical ≥ 95% (Meta throttles
 * at 100%). "unknown" = no reading in this server instance yet (cold start /
 * no sends observed) — the UI renders nothing in that case.
 */
export async function getRateLimitStatus(): Promise<{
  level: "ok" | "warning" | "critical" | "unknown";
  callCount: number | null;
  readAt: string | null;
}> {
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return { level: "unknown", callCount: null, readAt: null };
  const { targetId, client: db } = scope;

  // Get the user's active Instagram account
  const { data: igAccount } = await db
    .from("instagram_accounts")
    .select("ig_user_id")
    .eq("user_id", targetId)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!igAccount) {
    return { level: "unknown", callCount: null, readAt: null };
  }

  const usage = getBucUsage(igAccount.ig_user_id as string);
  if (!usage || typeof usage.callCount !== "number") {
    return { level: "unknown", callCount: null, readAt: null };
  }

  const level = usage.callCount >= 95 ? "critical" : usage.callCount >= 80 ? "warning" : "ok";
  return { level, callCount: usage.callCount, readAt: usage.readAt };
}
