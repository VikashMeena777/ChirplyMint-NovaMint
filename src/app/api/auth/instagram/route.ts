import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * These are the Instagram App ID and Secret from the App Dashboard:
 * Instagram → API setup with Instagram login → Business login settings
 */
const META_APP_ID = process.env.META_APP_ID || "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/instagram/callback`;

/**
 * GET /api/auth/instagram
 * Redirects user to Instagram OAuth consent screen using the
 * NEW "Instagram API with Instagram Login" flow.
 *
 * Key differences from old Facebook Login flow:
 * - URL: instagram.com/oauth/authorize (NOT facebook.com/dialog/oauth)
 * - Scopes: instagram_business_* (NOT instagram_basic/pages_show_list)
 * - No Facebook Pages required
 */
export async function GET() {
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
  const scopes = [
    "instagram_business_basic",
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
  ].join(",");

  // New Instagram OAuth URL (NOT facebook.com/dialog/oauth)
  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", META_APP_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", user.id);

  return NextResponse.redirect(authUrl.toString());
}
