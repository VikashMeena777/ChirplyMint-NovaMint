import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const META_APP_ID = process.env.META_APP_ID || "";
const META_APP_SECRET = process.env.META_APP_SECRET || "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/instagram/callback`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * GET /api/auth/instagram/callback
 * Handles Meta OAuth callback:
 * 1) Exchange code for access token
 * 2) Get Facebook Pages
 * 3) Get Instagram Business account linked to the page
 * 4) Store everything in user_settings + instagram_accounts
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // user.id
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description") || "";

  if (error || !code || !state) {
    console.error("[IG OAuth] Denied:", error, errorDescription);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?error=instagram_denied&detail=${encodeURIComponent(errorDescription)}`
    );
  }

  try {
    // 1. Exchange code for short-lived user token
    console.log("[IG OAuth] Exchanging code for token...");
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `client_id=${META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&client_secret=${META_APP_SECRET}` +
        `&code=${code}`,
      { method: "GET" }
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("[IG OAuth] Token exchange failed:", tokenData.error);
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?error=token_exchange_failed`
      );
    }

    // 2. Exchange for long-lived token (60 days)
    console.log("[IG OAuth] Getting long-lived token...");
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${META_APP_ID}` +
        `&client_secret=${META_APP_SECRET}` +
        `&fb_exchange_token=${tokenData.access_token}`,
      { method: "GET" }
    );
    const longTokenData = await longTokenRes.json();
    const userAccessToken =
      longTokenData.access_token || tokenData.access_token;

    // 3. Get Facebook Pages
    console.log("[IG OAuth] Fetching pages...");
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${userAccessToken}`,
      { method: "GET" }
    );
    const pagesData = await pagesRes.json();

    console.log(
      "[IG OAuth] Pages response:",
      JSON.stringify({
        count: pagesData.data?.length ?? 0,
        error: pagesData.error,
        pages: pagesData.data?.map((p: Record<string, string>) => ({
          id: p.id,
          name: p.name,
        })),
      })
    );

    const page = pagesData.data?.[0];

    if (!page) {
      console.error(
        "[IG OAuth] No Facebook Page found. Full response:",
        JSON.stringify(pagesData)
      );

      // Store the raw error for debugging via /api/debug/meta
      const supabaseDebug = await createClient();
      void supabaseDebug.from("activity_log").insert({
        user_id: state,
        action: "instagram.oauth_debug",
        metadata: {
          step: "me/accounts",
          api_response: pagesData,
          token_prefix: userAccessToken.substring(0, 20),
        },
      }).catch(() => {});

      const detail = pagesData.error
        ? encodeURIComponent(pagesData.error.message || JSON.stringify(pagesData.error))
        : encodeURIComponent("me/accounts returned 0 pages. Verify pages_show_list is enabled and your FB Page is connected to this app's business portfolio.");
      
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?error=no_facebook_page&detail=${detail}`
      );
    }

    // 4. Get Instagram Business Account linked to the page
    console.log(
      `[IG OAuth] Looking for IG Business on page: ${page.name} (${page.id})`
    );
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
      { method: "GET" }
    );
    const igData = await igRes.json();
    const igAccountId = igData.instagram_business_account?.id;

    if (!igAccountId) {
      console.error(
        "[IG OAuth] No IG Business account on page:",
        JSON.stringify(igData)
      );
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?error=no_instagram_business`
      );
    }

    // 5. Get Instagram profile info
    console.log(`[IG OAuth] Fetching IG profile: ${igAccountId}`);
    const igProfileRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}?fields=username,name,profile_picture_url&access_token=${page.access_token}`,
      { method: "GET" }
    );
    const igProfile = await igProfileRes.json();

    console.log(`[IG OAuth] Connected: @${igProfile.username}`);

    // 6. Subscribe the page to webhooks (so Meta sends events to us)
    console.log(`[IG OAuth] Subscribing page ${page.id} to webhooks...`);
    const subscribeRes = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}/subscribed_apps?subscribed_fields=feed&access_token=${page.access_token}`,
      { method: "POST" }
    );
    const subscribeData = await subscribeRes.json();
    console.log(
      "[IG OAuth] Page webhook subscription:",
      JSON.stringify(subscribeData)
    );

    // 7. Save to user_settings
    const supabase = await createClient();
    const { error: dbError } = await supabase.from("user_settings").upsert(
      {
        user_id: state,
        instagram_connected: true,
        instagram_user_id: igAccountId,
        instagram_username: igProfile.username || "",
        instagram_access_token: page.access_token,
        instagram_page_id: page.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (dbError) {
      console.error("[IG OAuth] DB save failed:", dbError);
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?error=save_failed`
      );
    }

    // 8. Also upsert into instagram_accounts (required by automations FK)
    const { error: igAccError } = await supabase
      .from("instagram_accounts")
      .upsert(
        {
          user_id: state,
          ig_user_id: igAccountId,
          ig_username: igProfile.username || "",
          ig_name: igProfile.name || "",
          ig_profile_pic: igProfile.profile_picture_url || null,
          access_token: page.access_token,
          page_id: page.id,
          page_access_token: page.access_token,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,ig_user_id" }
      );

    if (igAccError) {
      console.error("[IG OAuth] instagram_accounts save failed:", igAccError);
    }

    // 9. Log activity
    void Promise.resolve(
      supabase.from("activity_log").insert({
        user_id: state,
        action: "instagram.connected",
        metadata: { username: igProfile.username || igAccountId },
      })
    ).catch(() => {});

    console.log(
      `[IG OAuth] ✅ Complete! @${igProfile.username} connected for user ${state}`
    );

    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?success=instagram_connected`
    );
  } catch (err) {
    console.error("[IG OAuth] Unexpected error:", err);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?error=oauth_failed`
    );
  }
}
