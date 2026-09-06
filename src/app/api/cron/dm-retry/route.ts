import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPrivateReply, sendInstagramDM } from "@/lib/instagram/send-dm";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * DM Retry Cron
 * Runs every 15 minutes via cron-job.org.
 *
 * Picks up DMs that were rate-limited by Meta (status = 'rate_limited')
 * and retries them. Spreads retries to avoid hitting the limit again.
 *
 * Rules:
 * - Only retries DMs where retry_after < now
 * - Max 3 retries per DM (then marked as 'failed')
 * - Sends at most 10 DMs per cron run (~20s total, under 30s timeout)
 * - 2-second delay between each DM to spread the load
 * - Capacity: 10 × 4/hour × 24 = 960 retries/day
 *
 * Protected by CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const now = new Date();
    const nowIso = now.toISOString();

    // Find rate-limited DMs that are ready for retry
    const { data: pendingDMs, error: fetchError } = await supabase
      .from("dm_logs")
      .select("id, user_id, automation_id, instagram_account_id, recipient_ig_id, recipient_username, message_text, comment_text, retry_count")
      .eq("status", "rate_limited")
      .lt("retry_after", nowIso)
      .order("created_at", { ascending: true })
      .limit(10); // Max 10 per run to stay under cron-job.org 30s timeout (10 × 2s = 20s)

    if (fetchError) {
      console.error("[DM Retry] Fetch error:", fetchError);
      return NextResponse.json({ status: "error", error: fetchError.message }, { status: 500 });
    }

    if (!pendingDMs || pendingDMs.length === 0) {
      return NextResponse.json({ status: "ok", retried: 0, timestamp: nowIso });
    }

    let retried = 0;
    let succeeded = 0;
    let requeued = 0;
    let failed = 0;

    for (const raw of pendingDMs) {
      const dm = raw as Record<string, unknown>;
      const dmId = dm.id as string;
      const igAccountId = dm.instagram_account_id as string;
      const recipientIgId = dm.recipient_ig_id as string;
      const messageText = dm.message_text as string;
      const retryCount = ((dm.retry_count as number) || 0) + 1;

      // Get the IG account's access token
      const { data: igAccount } = await supabase
        .from("instagram_accounts")
        .select("ig_user_id, access_token, is_active")
        .eq("id", igAccountId)
        .single();

      if (!igAccount || !(igAccount as Record<string, unknown>).is_active) {
        // Account disconnected — mark as permanently failed
        await supabase.from("dm_logs").update({
          status: "failed",
          retry_count: retryCount,
        }).eq("id", dmId);
        failed++;
        continue;
      }

      const acc = igAccount as Record<string, string>;

      // Try sending the DM
      const result = await sendInstagramDM(
        acc.ig_user_id,
        acc.access_token,
        recipientIgId,
        messageText
      );

      if (result.success) {
        // ✅ Success — update status
        await supabase.from("dm_logs").update({
          status: "sent",
          retry_count: retryCount,
          retry_after: null,
        }).eq("id", dmId);
        succeeded++;
      } else if (result.rateLimited && retryCount < 3) {
        // ⏳ Still rate limited — requeue for later (exponential: 1h, 2h, 4h)
        const nextRetryMs = 60 * 60 * 1000 * Math.pow(2, retryCount - 1);
        await supabase.from("dm_logs").update({
          retry_count: retryCount,
          retry_after: new Date(Date.now() + nextRetryMs).toISOString(),
        }).eq("id", dmId);
        requeued++;
      } else {
        // ❌ Permanent failure (non-rate-limit error or max retries)
        await supabase.from("dm_logs").update({
          status: "failed",
          retry_count: retryCount,
          retry_after: null,
        }).eq("id", dmId);
        failed++;
      }

      retried++;

      // 2-second delay between DMs to spread the load
      if (retried < pendingDMs.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`[DM Retry] Done: ${retried} processed, ${succeeded} sent, ${requeued} requeued, ${failed} failed`);

    return NextResponse.json({
      status: "ok",
      total: pendingDMs.length,
      retried,
      succeeded,
      requeued,
      failed,
      timestamp: nowIso,
    });
  } catch (err) {
    console.error("[DM Retry] Unexpected error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
