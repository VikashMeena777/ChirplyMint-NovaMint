import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendInstagramDM, replyToComment } from "@/lib/instagram/send-dm";

/**
 * POST /api/test/send-dm
 *
 * Test endpoint to manually verify DM sending works.
 * Only works in development mode with test users added to your Meta app.
 *
 * Protected by CRON_SECRET to prevent public access.
 *
 * Body: {
 *   recipientId: string  (Instagram-Scoped ID of the test user)
 *   message: string      (DM text to send)
 *   commentId?: string   (optional — test comment reply too)
 *   commentReply?: string
 * }
 */
export async function POST(request: Request) {
  try {
    // Auth check
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      recipientId,
      message,
      commentId,
      commentReply,
    } = body as {
      recipientId: string;
      message: string;
      commentId?: string;
      commentReply?: string;
    };

    if (!recipientId || !message) {
      return NextResponse.json(
        { error: "recipientId and message are required" },
        { status: 400 }
      );
    }

    // Get the first active IG account's page token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: account } = await supabase
      .from("instagram_accounts")
      .select("page_access_token, access_token, ig_username")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!account) {
      return NextResponse.json(
        { error: "No active Instagram account found" },
        { status: 404 }
      );
    }

    const token =
      (account.page_access_token as string) ||
      (account.access_token as string);

    // Test DM sending
    const dmResult = await sendInstagramDM(token, recipientId, message);

    // Optionally test comment reply
    let commentResult = null;
    if (commentId && commentReply) {
      commentResult = await replyToComment(token, commentId, commentReply);
    }

    return NextResponse.json({
      dm: dmResult,
      commentReply: commentResult,
      account: account.ig_username,
      note: dmResult.success
        ? "✅ DM sent! The pipeline works."
        : `❌ DM failed: ${dmResult.error}. If you see 'Requires instagram_manage_messages', your app needs Meta App Review.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
