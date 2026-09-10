import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Daily Digest Cron
 * Runs once per morning (recommended 09:00 IST = 03:30 UTC via cron-job.org).
 *
 * For users who enabled "Daily digest" in Settings → Notifications, bundles
 * the last 24 hours of in-app notifications into ONE email instead of
 * sending instant pings. Users with zero new notifications get nothing.
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
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Digest opt-ins (filter in JS — contains-filter isn't in the typed client)
    const { data: allProfiles, error: prefsError } = await supabase
      .from("profiles")
      .select("id, full_name, notification_preferences, last_digest_sent_at");

    if (prefsError) {
      console.error("[Digest] Prefs query error:", prefsError);
      return NextResponse.json({ status: "error", error: prefsError.message }, { status: 500 });
    }

    const profiles = (allProfiles || []).filter((p) => {
      const prefs = (p as Record<string, unknown>).notification_preferences as
        | Record<string, boolean>
        | null;
      // Digest needs explicit opt-in AND must respect the global
      // "unsubscribe from product emails" — otherwise the footer link loops
      // forever without ever stopping the digest.
      if (prefs?.email_digest !== true) return false;
      if (prefs?.product_updates === false) return false;
      return true;
    });

    function escapeHtml(s: string): string {
      return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    let sent = 0;
    let skippedNoNews = 0;
    let skippedDuplicate = 0;
    const todayStr = now.toISOString().slice(0, 10);

    for (const raw of profiles || []) {
      try {
      const p = raw as Record<string, unknown>;
      const userId = p.id as string;

      // B5 double-send guard: cron-job.org retries must not re-email today
      const lastSent = p.last_digest_sent_at as string | null;
      if (lastSent && lastSent.slice(0, 10) === todayStr) {
        skippedDuplicate++;
        continue;
      }

      // Last 24h of notifications, newest first
      const { data: notifs } = await supabase
        .from("notifications")
        .select("title, body, type, created_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!notifs || notifs.length === 0) {
        skippedNoNews++;
        continue;
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email;
      if (!email) continue;

      const userName = (p.full_name as string) || "there";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.novamintnetworks.in";

      const items = notifs
        .map(
          (n) => `
        <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
          <div style="font-weight: 600; font-size: 14px;">${escapeHtml(n.title || "")}</div>
          <div style="color: #555; font-size: 13px; margin-top: 2px;">${escapeHtml(n.body || "")}</div>
        </div>`
        )
        .join("");

      const html = `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #16a34a;">🌿 ChirplyMint</h2>
        <p>Hey ${escapeHtml(userName)}, here's what happened in the last 24 hours:</p>
        <div style="background: #f8faf9; border: 1px solid #e5e7eb; border-radius: 12px; padding: 4px 16px;">
          ${items}
        </div>
        <a href="${appUrl}/dashboard/notifications"
           style="display: inline-block; background: #16a34a; color: white; padding: 10px 22px; border-radius: 8px; text-decoration: none; margin-top: 16px; font-size: 14px;">
          Open Notification Center
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          You're receiving this because Daily Digest is enabled in your notification settings.
        </p>
      </div>`;

      const digestResult = await sendEmail({
        to: email,
        subject: `📬 Your ChirplyMint daily digest — ${notifs.length} update${notifs.length === 1 ? "" : "s"}`,
        userId,
        category: "marketing",
        html,
      });
      if (!digestResult.success) {
        console.error(`[Digest] Failed for ${userId}:`, digestResult.error);
        continue;
      }
      await supabase
        .from("profiles")
        .update({ last_digest_sent_at: now.toISOString() })
        .eq("id", userId);
      sent++;
      } catch (userErr) {
        console.error("[Digest] Skipping user after error:", userErr);
        continue;
      }
    }

    console.log(`[Digest] Done: ${sent} digests sent, ${skippedNoNews} no-news, ${skippedDuplicate} duplicate-skipped`);
    return NextResponse.json({
      status: "ok",
      sent,
      skipped_no_news: skippedNoNews,
      skipped_duplicate: skippedDuplicate,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error("[Digest] Unexpected error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
