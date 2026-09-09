import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * These are the Instagram App ID and Secret from the App Dashboard:
 * Instagram → API setup with Instagram login → Business login settings
 */
const META_APP_ID = process.env.META_APP_ID || "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/instagram/callback`;

/** 5-min cache for the engagement-scope probe (per app id). */
const engagementScopeCache = new Map<string, { grantable: boolean; at: number }>();

/**
 * GET /api/auth/instagram
 * Redirects user to Instagram OAuth consent screen using the
 * NEW "Instagram API with Instagram Login" flow.
 *
 * Key differences from old Facebook Login flow:
 * - URL: instagram.com/oauth/authorize (NOT facebook.com/dialog/oauth)
 * - Scopes: instagram_business_* (NOT instagram_basic/pages_show_list)
 * - No Facebook Pages required
 *
 * CSRF protection: `state` is a random nonce echoed back by Instagram and
 * stored in a short-lived httpOnly cookie. The callback verifies the pair —
 * this prevents forged callbacks that would bind an attacker's Instagram
 * account to a victim's ChirplyMint account.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  }

  // New Instagram Login scopes (replaces old instagram_basic, pages_show_list, etc.)
  // manage_insights unlocks media + account metrics (views/reach/saves/shares)
  // for the analytics dashboard — appears in the consent screen once requested.
  //
  // instagram_manage_engagement (auto-like) is ONLY requested once Meta
  // approves it in App Review. PROVEN LIVE BEHAVIOR (2026-09-09): a LIVE
  // app requesting an unapproved scope gets the ENTIRE authorize call
  // rejected with "Invalid platform app" — Instagram renders an error
  // page and never calls our callback, so redirect-based fallbacks cannot
  // catch it. The devtools API is the reliable pre-check: the permissions
  // list shows the scope as approved (is_live) before we ever request it.
  // ?force_engagement=1 overrides for dev-mode testing.
  const forceEngagement = new URL(request.url).searchParams.get("force_engagement") === "1";
  let engagementGrantable = forceEngagement;

  // Self-contained probe: ask Instagram whether the engagement scope is
  // grantable for THIS app right now. A LIVE app carrying an unapproved
  // scope gets the whole authorize call rejected ("Invalid platform app")
  // BEFORE any user interaction, so a cheap HEAD-level probe of the
  // authorize URL decides safely. 5-minute cache to stay frugal.
  if (!engagementGrantable) {
    const cacheKey = `ig-engagement-scope:${META_APP_ID}`;
    const cached = engagementScopeCache.get(cacheKey);
    if (cached && Date.now() - cached.at < 5 * 60_000) {
      engagementGrantable = cached.grantable;
    } else {
      try {
        const probeUrl =
          `https://www.instagram.com/oauth/authorize?client_id=${META_APP_ID}` +
          `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
          `&scope=instagram_manage_engagement&response_type=code`;
        const probe = await fetch(probeUrl, { redirect: "manual" });
        const loc = probe.headers.get("location") || "";
        // Error redirect carries "Invalid+platform+app" (or any /error/ path)
        const grantable = probe.status === 302 && !/\/error\//.test(loc);
        engagementScopeCache.set(cacheKey, { grantable, at: Date.now() });
        engagementGrantable = grantable;
      } catch {
        // Probe failure = request without the scope (safe default)
      }
    }
  }

  const scopes = [
    "instagram_business_basic",
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
    "instagram_business_manage_insights",
    ...(engagementGrantable ? ["instagram_manage_engagement"] : []),
  ].join(",");

  // New Instagram OAuth URL (NOT facebook.com/dialog/oauth)
  const nonce = crypto.randomBytes(24).toString("hex");
  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", META_APP_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", nonce);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("ig_oauth_state", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes to complete the consent screen
  });
  return response;
}
