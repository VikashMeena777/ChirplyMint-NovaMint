import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/debug/meta
 * Debug endpoint to test Instagram API connection step by step.
 * Updated for the NEW "Instagram API with Instagram Login" flow.
 *
 * REMOVE THIS ENDPOINT BEFORE GOING TO PRODUCTION.
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // Step 1: Check env vars
  results.step1_env_check = {
    META_APP_ID: process.env.META_APP_ID
      ? `✅ Set (${process.env.META_APP_ID})`
      : "❌ MISSING",
    META_APP_SECRET: process.env.META_APP_SECRET
      ? `✅ Set (${process.env.META_APP_SECRET!.substring(0, 6)}...)`
      : "❌ MISSING",
    META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN ? "✅ Set" : "❌ MISSING",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "❌ MISSING",
    REDIRECT_URI: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/instagram/callback`,
    oauth_flow: "Instagram Login (instagram.com/oauth/authorize)",
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      results.step2_user = {
        status: "❌ Not logged in — visit this while logged into the dashboard",
      };
      return NextResponse.json(results, { status: 200 });
    }

    results.step2_user = { status: "✅ Logged in", user_id: user.id };

    // Check user_settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select(
        "instagram_connected, instagram_user_id, instagram_username, instagram_access_token, instagram_page_id"
      )
      .eq("user_id", user.id)
      .single();

    results.step3_stored_settings = settings || "No settings found";

    // Check the last OAuth activity logs
    const { data: activityLogs } = await supabase
      .from("activity_log")
      .select("action, metadata, created_at")
      .eq("user_id", user.id)
      .in("action", ["instagram.connected", "instagram.oauth_debug"])
      .order("created_at", { ascending: false })
      .limit(3);

    results.step4_last_oauth_activity =
      activityLogs && activityLogs.length > 0
        ? activityLogs
        : "No OAuth activity logged yet. Try connecting IG, then visit this page again.";

    // If we have a token, test it live against graph.instagram.com
    if (settings?.instagram_access_token) {
      const token = settings.instagram_access_token;
      results.step5_live_token_test = { token_prefix: token.substring(0, 20) };

      // Test graph.instagram.com/me (the new Instagram Login API)
      const meRes = await fetch(
        `https://graph.instagram.com/me?fields=user_id,username,name,account_type,profile_picture_url&access_token=${token}`
      );
      const meData = await meRes.json();
      results.step5_live_token_test = {
        ...(results.step5_live_token_test as object),
        instagram_api: {
          status: meRes.status,
          user_id: meData.user_id || meData.id,
          username: meData.username,
          name: meData.name,
          account_type: meData.account_type,
          error: meData.error || null,
        },
      };
    } else {
      results.step5_live_token_test =
        "⏭️ No token stored — check step4 for OAuth activity";
    }
  } catch (err) {
    results.error = String(err);
  }

  return NextResponse.json(results, { status: 200 });
}
