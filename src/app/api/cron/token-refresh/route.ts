import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Token Refresh Cron Job
 * Runs daily via GitHub Actions.
 * Refreshes Instagram long-lived tokens that are approaching expiry (>50 days old).
 *
 * Instagram long-lived tokens expire after 60 days. This cron refreshes
 * tokens older than 50 days, giving a 10-day safety buffer.
 *
 * If refresh fails, logs an error and creates a notification for the user
 * so they know to reconnect their Instagram account.
 *
 * Protected by CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getAdminSupabase();
    const now = new Date();

    // Find accounts whose token was last updated more than 50 days ago
    const fiftyDaysAgo = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);

    const { data: accounts, error: fetchError } = await supabase
      .from("instagram_accounts")
      .select("id, user_id, ig_user_id, ig_username, access_token, updated_at")
      .eq("is_active", true)
      .lt("updated_at", fiftyDaysAgo.toISOString());

    if (fetchError) {
      console.error("[Token Refresh] Fetch error:", fetchError);
      return NextResponse.json(
        { status: "error", error: fetchError.message },
        { status: 500 }
      );
    }

    if (!accounts || accounts.length === 0) {
      console.log("[Token Refresh] No tokens need refreshing.");
      return NextResponse.json({
        status: "ok",
        refreshed: 0,
        failed: 0,
        timestamp: now.toISOString(),
      });
    }

    let refreshed = 0;
    let failed = 0;
    const failures: { username: string; error: string }[] = [];

    for (const account of accounts) {
      const acc = account as Record<string, string>;
      try {
        // Call Meta's token refresh endpoint
        // https://developers.facebook.com/docs/instagram-basic-display-api/guides/long-lived-tokens#refresh-a-long-lived-token
        const refreshRes = await fetch(
          `https://graph.instagram.com/refresh_access_token` +
            `?grant_type=ig_refresh_token` +
            `&access_token=${acc.access_token}`,
          { method: "GET" }
        );

        const refreshData = await refreshRes.json();

        if (refreshData.error) {
          throw new Error(
            refreshData.error.message || "Token refresh API error"
          );
        }

        if (!refreshData.access_token) {
          throw new Error("No access_token in refresh response");
        }

        const newToken = refreshData.access_token as string;
        const newExpiresIn = refreshData.expires_in as number; // ~5183944 seconds (60 days)
        const updatedAt = new Date().toISOString();

        // Update instagram_accounts table
        await supabase
          .from("instagram_accounts")
          .update({
            access_token: newToken,
            page_access_token: newToken, // Keep in sync for backward compat
            updated_at: updatedAt,
          })
          .eq("id", acc.id);

        // Also update user_settings (the other table that stores the token)
        await supabase
          .from("user_settings")
          .update({
            instagram_access_token: newToken,
            updated_at: updatedAt,
          })
          .eq("user_id", acc.user_id);

        // Log activity (fire-and-forget)
        supabase
          .from("activity_log")
          .insert({
            user_id: acc.user_id,
            action: "instagram.token_refreshed",
            metadata: {
              ig_username: acc.ig_username,
              expires_in: newExpiresIn,
            },
          })
          .then(() => {});

        refreshed++;
        console.log(
          `[Token Refresh] ✅ Refreshed token for @${acc.ig_username} (expires in ${Math.round(newExpiresIn / 86400)} days)`
        );
      } catch (err) {
        failed++;
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";
        failures.push({
          username: acc.ig_username || acc.ig_user_id,
          error: errorMsg,
        });

        console.error(
          `[Token Refresh] ❌ Failed for @${acc.ig_username}: ${errorMsg}`
        );

        // Create an in-app notification so user knows to reconnect
        supabase
          .from("notifications")
          .insert({
            user_id: acc.user_id,
            type: "warning",
            title: "Instagram Reconnection Needed",
            message: `Your Instagram token for @${acc.ig_username} could not be refreshed. Please reconnect your account in Settings to keep automations running.`,
            is_read: false,
          })
          .then(() => {});

        // Log failure activity
        supabase
          .from("activity_log")
          .insert({
            user_id: acc.user_id,
            action: "instagram.token_refresh_failed",
            metadata: {
              ig_username: acc.ig_username,
              error: errorMsg,
            },
          })
          .then(() => {});
      }
    }

    console.log(
      `[Token Refresh] Done: ${refreshed} refreshed, ${failed} failed out of ${accounts.length} total`
    );

    // ── TOKEN EXPIRY WARNING (#14) ──
    // Check ALL active accounts for tokens expiring within 7 days
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    // Tokens last ~60 days from updated_at. If updated_at is >53 days ago, token expires in <7 days.
    const fiftyThreeDaysAgo = new Date(now.getTime() - 53 * 24 * 60 * 60 * 1000);

    const { data: expiringAccounts } = await supabase
      .from("instagram_accounts")
      .select("id, user_id, ig_username, updated_at")
      .eq("is_active", true)
      .lt("updated_at", fiftyThreeDaysAgo.toISOString())
      .gte("updated_at", fiftyDaysAgo.toISOString()); // Between 53-50 days = expiring in 7-10 days, not yet due for refresh

    if (expiringAccounts && expiringAccounts.length > 0) {
      for (const ea of expiringAccounts) {
        const acc = ea as Record<string, string>;
        const updatedAt = new Date(acc.updated_at);
        const expiresAt = new Date(updatedAt.getTime() + 60 * 24 * 60 * 60 * 1000);
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Only warn once — check if notification already exists this week
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const { count: existingWarnings } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", acc.user_id)
          .eq("type", "warning")
          .ilike("title", "%token expires%")
          .gte("created_at", oneWeekAgo.toISOString());

        if ((existingWarnings ?? 0) === 0) {
          await supabase.from("notifications").insert({
            user_id: acc.user_id,
            type: "warning",
            title: `⏰ Instagram token expires in ${daysLeft} days`,
            body: `Your token for @${acc.ig_username} will expire soon. It should auto-refresh, but if it fails, reconnect your account in Settings.`,
            is_read: false,
          });
          console.log(`[Token Refresh] ⏰ Expiry warning for @${acc.ig_username}: ${daysLeft} days left`);
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      total: accounts.length,
      refreshed,
      failed,
      expiry_warnings: expiringAccounts?.length ?? 0,
      failures: failures.length > 0 ? failures : undefined,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error("[Token Refresh] Unexpected error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
