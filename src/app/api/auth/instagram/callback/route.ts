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
 * 2) Get Instagram Business account info
 * 3) Store token + IG user ID in user_settings
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // user.id
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?error=instagram_denied`
    );
  }

  try {
    // 1. Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `client_id=${META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&client_secret=${META_APP_SECRET}` +
        `&code=${code}`,
      { method: "GET" }
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?error=token_exchange_failed`
      );
    }

    // 2. Exchange for long-lived token (60 days)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${META_APP_ID}` +
        `&client_secret=${META_APP_SECRET}` +
        `&fb_exchange_token=${tokenData.access_token}`,
      { method: "GET" }
    );
    const longTokenData = await longTokenRes.json();
    const accessToken = longTokenData.access_token || tokenData.access_token;

    // 3. Get Facebook Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`,
      { method: "GET" }
    );
    const pagesData = await pagesRes.json();
    const page = pagesData.data?.[0];

    if (!page) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?error=no_facebook_page`
      );
    }

    // 4. Get Instagram Business Account linked to the page
    const igRes = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
      { method: "GET" }
    );
    const igData = await igRes.json();
    const igAccountId = igData.instagram_business_account?.id;

    if (!igAccountId) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?error=no_instagram_business`
      );
    }

    // 5. Get Instagram username
    const igProfileRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}?fields=username,name,profile_picture_url&access_token=${page.access_token}`,
      { method: "GET" }
    );
    const igProfile = await igProfileRes.json();

    // 6. Save to user_settings
    const supabase = await createClient();
    const { error: dbError } = await supabase.from("user_settings").upsert(
      {
        user_id: state,
        instagram_connected: true,
        instagram_user_id: igAccountId,
        instagram_username: igProfile.username || "",
        instagram_access_token: page.access_token, // page token for messaging
        instagram_page_id: page.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (dbError) {
      console.error("Failed to save Instagram credentials:", dbError);
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?error=save_failed`
      );
    }

    // 7. Also upsert into instagram_accounts (required by automations FK)
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
      console.error("Failed to save instagram_accounts:", igAccError);
      // Non-fatal: user_settings already saved, so OAuth still "works"
      // but automations won't — log and continue
    }

    // 8. Log activity
    void Promise.resolve(
      supabase.from("activity_log").insert({
        user_id: state,
        action: "instagram.connected",
        metadata: { username: igProfile.username || igAccountId },
      })
    ).catch(() => {});

    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?success=instagram_connected`
    );
  } catch (err) {
    console.error("Instagram OAuth error:", err);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?error=oauth_failed`
    );
  }
}
