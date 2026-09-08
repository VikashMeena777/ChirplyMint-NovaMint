import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * DB-backed cache for reusable attachment IDs (A22).
 *
 * `uploadReusableAttachment` (send-dm.ts) converts a public asset URL into a
 * Meta attachment_id once (POST /{ig-user-id}/message_attachments with
 * is_reusable:true). Caching that id in the attachment_cache table means every
 * later send of the same asset skips the upload round-trip entirely — no more
 * large-image timeouts on slow servers.
 *
 * Both helpers take the service-role client (the caller's admin Supabase
 * instance, e.g. the webhook's getSupabase() built with
 * SUPABASE_SERVICE_ROLE_KEY). The service role bypasses the table's RLS
 * (owner-select only), so webhook writes work without extra policies.
 */

export type CacheableAssetType = "image" | "file";

/**
 * Service-role client (same pattern as failure-tracker.ts) — fallback for
 * callers that don't have an admin client handy.
 */
function getAdminSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Look up a previously cached attachment_id for an asset URL.
 * Returns null on miss or error — a cache read failure must never block a send.
 */
export async function getCachedAttachmentId(
  adminSupabase: SupabaseClient | null,
  userId: string,
  url: string,
  type: CacheableAssetType
): Promise<string | null> {
  try {
    const supabase = adminSupabase ?? getAdminSupabase();
    const { data } = await supabase
      .from("attachment_cache")
      .select("attachment_id")
      .eq("user_id", userId)
      .eq("asset_url", url)
      .eq("asset_type", type)
      .limit(1)
      .maybeSingle();
    const row = data as Record<string, string> | null;
    return row?.attachment_id || null;
  } catch {
    return null;
  }
}

/**
 * Cache an attachment_id for an asset URL. Upsert with ON CONFLICT DO
 * NOTHING — the first cached id for a URL wins, later sends never overwrite.
 * Best-effort: a cache write failure must never break a send.
 */
export async function cacheAttachment(
  adminSupabase: SupabaseClient | null,
  userId: string,
  igAccountId: string | null,
  url: string,
  type: CacheableAssetType,
  attachmentId: string
): Promise<void> {
  try {
    const supabase = adminSupabase ?? getAdminSupabase();
    await supabase
      .from("attachment_cache")
      .upsert(
        {
          user_id: userId,
          ig_account_id: igAccountId,
          asset_url: url,
          asset_type: type,
          attachment_id: attachmentId,
        },
        { onConflict: "asset_url,asset_type,user_id", ignoreDuplicates: true }
      );
  } catch {
    // Cache write is optional — sending already succeeded.
  }
}
