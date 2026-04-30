import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Instagram App ID & Secret from the App Dashboard:
 * Instagram → API setup with Instagram login → Business login settings
 */
const META_APP_ID = process.env.META_APP_ID || "";
const META_APP_SECRET = process.env.META_APP_SECRET || "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/instagram/callback`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * GET /api/auth/instagram/callback
 *
 * Handles the NEW "Instagram API with Instagram Login" OAuth callback:
 * 1) Exchange authorization code for short-lived token via api.instagram.com
 * 2) Exchange short-lived token for long-lived token (60 days) via graph.instagram.com
 * 3) Fetch Instagram profile directly (NO Facebook Page lookup needed)
 * 4) Store everything in user_settings + instagram_accounts
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let code = searchParams.get("code");
  const state = searchParams.get("state"); // user.id
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description") || "";

  if (error || !code || !state) {
    console.error("[IG OAuth] Denied:", error, errorDescription);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?error=instagram_denied&detail=${encodeURIComponent(errorDescription)}`
    );
  }

  // Strip the #_ that Instagram appends to the code
  if (code.endsWith("#_")) {
    code = code.slice(0, -2);
  }

   try {
    // ── Step 1: Exchange code for short-lived token ──────────────────
    // Official Meta docs use multipart/form-data (curl -F), NOT x-www-form-urlencoded
    console.log("[IG OAuth] Exchanging code for token via api.instagram.com...");
    console.log("[IG OAuth] Using redirect_uri:", REDIRECT_URI);
    console.log("[IG OAuth] Using client_id:", META_APP_ID);

    const formData = new FormData();
    formData.append("client_id", META_APP_ID);
    formData.append("client_secret", META_APP_SECRET);
    formData.append("grant_type", "authorization_code");
    formData.append("redirect_uri", REDIRECT_URI);
    formData.append("code", code);

    const tokenRes = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        body: formData,
      }
    );
    const tokenData = await tokenRes.json();

    console.log("[IG OAuth] Token response shape:", {
      hasData: !!tokenData.data,
      hasAccessToken: !!tokenData.access_token,
      hasError: !!tokenData.error_type || !!tokenData.error,
      errorMessage: tokenData.error_message || null,
    });

    // Response format: { data: [{ access_token, user_id, permissions }] }
    // OR older: { access_token, user_id }
    let shortLivedToken: string;
    let igUserId: string;

    if (tokenData.data && Array.isArray(tokenData.data) && tokenData.data.length > 0) {
      shortLivedToken = tokenData.data[0].access_token;
      igUserId = String(tokenData.data[0].user_id);
    } else if (tokenData.access_token) {
      shortLivedToken = tokenData.access_token;
      igUserId = String(tokenData.user_id);
    } else {
      console.error("[IG OAuth] Token exchange failed:", tokenData);
      const errorMsg =
        tokenData.error_message ||
        tokenData.error?.message ||
        "Token exchange failed";
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?error=token_exchange_failed&detail=${encodeURIComponent(errorMsg)}`
      );
    }

    console.log(`[IG OAuth] Got short-lived token for IG user: ${igUserId}`);

    // ── Step 2: Exchange for long-lived token (60 days) ──────────────
    // NEW: GET to graph.instagram.com/access_token with ig_exchange_token
    console.log("[IG OAuth] Exchanging for long-lived token...");
    const longTokenRes = await fetch(
      `https://graph.instagram.com/access_token` +
        `?grant_type=ig_exchange_token` +
        `&client_secret=${META_APP_SECRET}` +
        `&access_token=${shortLivedToken}`,
      { method: "GET" }
    );
    const longTokenData = await longTokenRes.json();

    const accessToken = longTokenData.access_token || shortLivedToken;
    const expiresIn = longTokenData.expires_in; // seconds (5183944 ≈ 60 days)

    console.log("[IG OAuth] Long-lived token:", {
      success: !!longTokenData.access_token,
      expires_in: expiresIn,
      error: longTokenData.error,
    });

    // ── Step 3: Fetch Instagram profile info ─────────────────────────
    // NEW: Direct call to graph.instagram.com/me (NO Facebook Page lookup!)
    console.log(`[IG OAuth] Fetching IG profile for user ${igUserId}...`);
    const profileRes = await fetch(
      `https://graph.instagram.com/me?fields=user_id,username,name,account_type,profile_picture_url&access_token=${accessToken}`,
      { method: "GET" }
    );
    const igProfile = await profileRes.json();

    const igUsername = igProfile.username || "";
    const igName = igProfile.name || "";
    const igProfilePic = igProfile.profile_picture_url || null;

    // CRITICAL: The /me endpoint returns TWO different IDs:
    // - igProfile.id        = app-scoped ID (26857216443965604) — used in app-level queries
    // - igProfile.user_id   = IG Professional Account ID (17841473138457034) — needed for:
    //     1. /<IG_ID>/messages endpoint (DMs)
    //     2. Webhook notification matching (webhook sends this as the account ID)
    // We MUST store user_id, not id, as our ig_user_id.
    const igProfessionalId = igProfile.user_id || igUserId;

    console.log(`[IG OAuth] Connected: @${igUsername} (${igName})`);
    console.log(`[IG OAuth] App-scoped ID: ${igUserId}, Professional Account ID: ${igProfessionalId}`);

    // ── Step 4: Prevent cross-account IG linking ──────────────────────
    // Check if this IG account is already connected by ANOTHER user
    const supabase = await createClient();
    const { data: existingAccount } = await supabase
      .from("instagram_accounts")
      .select("user_id, ig_username")
      .eq("ig_user_id", igProfessionalId)
      .neq("user_id", state)
      .eq("is_active", true)
      .maybeSingle();

    if (existingAccount) {
      console.error(
        `[IG OAuth] ❌ IG account @${igUsername} (${igProfessionalId}) is already connected to user ${existingAccount.user_id}`
      );
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?error=ig_already_linked&detail=${encodeURIComponent(
          `@${igUsername} is already connected to another ChirplyMint account. Disconnect it there first.`
        )}`
      );
    }

    // ── Step 5: Save to user_settings ────────────────────────────────
    const { error: dbError } = await supabase.from("user_settings").upsert(
      {
        user_id: state,
        instagram_connected: true,
        instagram_user_id: igProfessionalId,
        instagram_username: igUsername,
        instagram_access_token: accessToken,
        instagram_page_id: null, // No page in IG Login flow
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

    // ── Step 5: Upsert into instagram_accounts (used by automations FK) ──
    const { error: igAccError } = await supabase
      .from("instagram_accounts")
      .upsert(
        {
          user_id: state,
          ig_user_id: igProfessionalId,
          ig_username: igUsername,
          ig_name: igName,
          ig_profile_pic: igProfilePic,
          access_token: accessToken,
          page_id: null, // No page in IG Login flow
          page_access_token: accessToken, // Use IG token as the "page" token for backward compat
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,ig_user_id" }
      );

    if (igAccError) {
      console.error("[IG OAuth] instagram_accounts save failed:", igAccError);
    }

    // ── Step 6: Log activity (fire-and-forget) ──────────────────────
    void Promise.resolve(
      supabase.from("activity_log").insert({
        user_id: state,
        action: "instagram.connected",
        metadata: {
          username: igUsername || igUserId,
          flow: "instagram_login",
          token_type: longTokenData.access_token ? "long_lived" : "short_lived",
          expires_in: expiresIn,
        },
      })
    ).catch(() => {});

    console.log(
      `[IG OAuth] ✅ Complete! @${igUsername} connected for user ${state}`
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
