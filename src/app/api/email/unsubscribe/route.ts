import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function page(title: string, body: string, ok: boolean) {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — ChirplyMint</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f6f8f7; display: flex;
           align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
            max-width: 420px; padding: 40px; text-align: center; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    p { color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }
    a.btn { display: inline-block; background: #16a34a; color: #fff; padding: 10px 22px;
            border-radius: 10px; text-decoration: none; font-size: 14px; }
    .emoji { font-size: 36px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">${ok ? "🍀" : "⚠️"}</div>
    <h1>${title}</h1>
    <p>${body}</p>
    <a class="btn" href="/">Back to ChirplyMint</a>
  </div>
</body>
</html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

/**
 * GET /api/email/unsubscribe?user=<uuid>
 * One-click unsubscribe from all non-essential (marketing) email:
 * sets product_updates=false and weekly_report=false.
 * Transactional email (payments, security/failure alerts) still arrives.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user");

  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return page("Invalid link", "This unsubscribe link is missing or malformed. Please contact support if you keep seeing this.", false);
  }

  const supabase = getAdminSupabase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", userId)
    .single();

  if (!profile) {
    return page("Link expired", "We couldn't find an account for this unsubscribe link — it may already have been deleted.", false);
  }

  const prefs = (profile.notification_preferences as Record<string, boolean>) ?? {};
  const { error } = await supabase
    .from("profiles")
    .update({
      notification_preferences: {
        ...prefs,
        product_updates: false,
        weekly_report: false,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("[Unsubscribe] DB error:", error);
    return page("Something went wrong", "We couldn't update your email preferences. Please try again or contact support.", false);
  }

  console.log(`[Unsubscribe] User ${userId} opted out of marketing emails`);
  return page(
    "You're unsubscribed",
    "You'll no longer receive product updates, tips, or weekly reports. Important account emails (payments, security alerts) will still arrive.",
    true
  );
}
