import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/debug/meta
 * Debug endpoint to test Meta API connection step by step.
 * Shows exactly where the connection breaks.
 * 
 * REMOVE THIS ENDPOINT BEFORE GOING TO PRODUCTION.
 */
export async function GET() {
  const results: Record<string, unknown> = {
    step1_env_check: {},
    step2_user_check: {},
    step3_pages_check: {},
    step4_ig_check: {},
  };

  // Step 1: Check env vars
  results.step1_env_check = {
    META_APP_ID: process.env.META_APP_ID ? `✅ Set (${process.env.META_APP_ID})` : "❌ MISSING",
    META_APP_SECRET: process.env.META_APP_SECRET ? `✅ Set (${process.env.META_APP_SECRET!.substring(0, 6)}...)` : "❌ MISSING",
    META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN ? "✅ Set" : "❌ MISSING",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "❌ MISSING",
    REDIRECT_URI: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/instagram/callback`,
  };

  // Step 2: Check if user is logged in and has stored token
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      results.step2_user_check = { status: "❌ Not logged in — visit this URL while logged into your dashboard" };
      return NextResponse.json(results, { status: 200 });
    }

    results.step2_user_check = { status: "✅ Logged in", user_id: user.id };

    // Check user_settings for stored token
    const { data: settings } = await supabase
      .from("user_settings")
      .select("instagram_connected, instagram_user_id, instagram_username, instagram_access_token, instagram_page_id")
      .eq("user_id", user.id)
      .single();

    if (!settings?.instagram_access_token) {
      results.step2_user_check = {
        ...results.step2_user_check as object,
        stored_token: "❌ No token stored — need to complete OAuth first",
        settings: settings,
      };
      return NextResponse.json(results, { status: 200 });
    }

    const token = settings.instagram_access_token;
    results.step2_user_check = {
      ...results.step2_user_check as object,
      stored_token: `✅ Token exists (${token.substring(0, 15)}...)`,
      ig_connected: settings.instagram_connected,
      ig_username: settings.instagram_username,
      page_id: settings.instagram_page_id,
    };

    // Step 3: Test the token — call me/accounts
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${token}`
    );
    const pagesData = await pagesRes.json();

    results.step3_pages_check = {
      status: pagesRes.status,
      pages_count: pagesData.data?.length ?? 0,
      pages: pagesData.data?.map((p: Record<string, string>) => ({
        id: p.id,
        name: p.name,
        has_access_token: !!p.access_token,
      })),
      error: pagesData.error || null,
    };

    // Step 4: If we have a page, check for IG business account
    const page = pagesData.data?.[0];
    if (page) {
      const igRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      );
      const igData = await igRes.json();

      results.step4_ig_check = {
        page_id: page.id,
        page_name: page.name,
        ig_business_account: igData.instagram_business_account || "❌ NO IG BUSINESS ACCOUNT LINKED",
        raw: igData,
      };

      if (igData.instagram_business_account?.id) {
        const profileRes = await fetch(
          `https://graph.facebook.com/v21.0/${igData.instagram_business_account.id}?fields=username,name,profile_picture_url&access_token=${page.access_token}`
        );
        const profile = await profileRes.json();
        results.step4_ig_check = {
          ...results.step4_ig_check as object,
          ig_profile: profile,
        };
      }
    } else {
      results.step4_ig_check = {
        status: "⏭️ Skipped — no pages found in step 3",
      };
    }
  } catch (err) {
    results.error = String(err);
  }

  return NextResponse.json(results, { status: 200 });
}
