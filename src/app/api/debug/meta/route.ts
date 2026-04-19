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

    // Check instagram_accounts table
    const { data: igAccount } = await supabase
      .from("instagram_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    results.step3_ig_account = igAccount
      ? {
          id: igAccount.id,
          ig_user_id: igAccount.ig_user_id,
          ig_username: igAccount.ig_username,
          has_access_token: !!igAccount.access_token,
          has_page_access_token: !!igAccount.page_access_token,
          token_prefix: igAccount.access_token
            ? (igAccount.access_token as string).substring(0, 25)
            : "none",
        }
      : "❌ No active Instagram account found";

    // If we have a token, test it live
    if (igAccount?.access_token) {
      const token = igAccount.access_token as string;
      const igUserId = igAccount.ig_user_id as string;

      // Test 1: /me endpoint
      const meRes = await fetch(
        `https://graph.instagram.com/me?fields=user_id,username,name,account_type&access_token=${token}`
      );
      const meData = await meRes.json();
      results.step4_me_endpoint = {
        status: meRes.status,
        data: meData,
      };

      // Test 2: Check token permissions/scopes
      const debugRes = await fetch(
        `https://graph.instagram.com/debug_token?input_token=${token}&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`
      );
      const debugData = await debugRes.json();
      results.step5_token_debug = {
        status: debugRes.status,
        scopes: debugData.data?.scopes || debugData.data?.granular_scopes,
        app_id: debugData.data?.app_id,
        type: debugData.data?.type,
        is_valid: debugData.data?.is_valid,
        expires_at: debugData.data?.expires_at,
        error: debugData.error || debugData.data?.error || null,
      };

      // Test 3: Try /<IG_ID>/media to confirm media access works
      const mediaRes = await fetch(
        `https://graph.instagram.com/v21.0/${igUserId}/media?fields=id,caption,media_type&limit=2&access_token=${token}`
      );
      const mediaData = await mediaRes.json();
      results.step6_media_test = {
        status: mediaRes.status,
        post_count: mediaData.data?.length || 0,
        first_post: mediaData.data?.[0] || null,
        error: mediaData.error || null,
      };

      // Test 4: Try sending a DM to self (will fail but shows the exact error)
      // We use the IG user ID as both sender and a test "recipient"
      const testDMRes = await fetch(
        `https://graph.instagram.com/v21.0/${igUserId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipient: { id: igUserId }, // sending to self — will likely error
            message: { text: "test" },
          }),
        }
      );
      const testDMData = await testDMRes.json();
      results.step7_dm_test = {
        status: testDMRes.status,
        endpoint: `graph.instagram.com/v21.0/${igUserId}/messages`,
        auth_method: "Authorization: Bearer header",
        response: testDMData,
        note: "Sending to self will likely fail — check the error type to diagnose",
      };

      // Test 5: Also try with access_token as query param (old style)
      const testDMRes2 = await fetch(
        `https://graph.instagram.com/v21.0/${igUserId}/messages?access_token=${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient: { id: igUserId },
            message: { text: "test" },
          }),
        }
      );
      const testDMData2 = await testDMRes2.json();
      results.step8_dm_test_queryparam = {
        status: testDMRes2.status,
        endpoint: `graph.instagram.com/v21.0/${igUserId}/messages?access_token=...`,
        auth_method: "access_token query param",
        response: testDMData2,
      };
    } else {
      results.step4_live_tests = "⏭️ No token stored — connect Instagram first";
    }
  } catch (err) {
    results.error = String(err);
  }

  return NextResponse.json(results, { status: 200 });
}
