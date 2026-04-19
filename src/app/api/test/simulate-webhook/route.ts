import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateDMReply } from "@/lib/ai/nvidia-nim";
import { sendInstagramDM, replyToComment } from "@/lib/instagram/send-dm";

/**
 * POST /api/test/simulate-webhook
 *
 * Simulates an Instagram comment webhook to test the entire pipeline:
 *   Comment → Keyword match → AI/Static DM generation → Send DM → Log → Stats
 *
 * This bypasses Meta's webhook delivery (which only works for published apps).
 *
 * Protected by CRON_SECRET.
 *
 * Body: {
 *   commentText: string     (e.g. "FREE")
 *   commenterId: string     (IG-Scoped ID of the commenter — use a test user)
 *   commenterUsername: string
 *   mediaId?: string        (optional — to test specific-post matching)
 *   dryRun?: boolean        (if true, skips actual DM send — just tests matching)
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
      commentText,
      commenterId,
      commenterUsername,
      mediaId,
      dryRun,
    } = body as {
      commentText: string;
      commenterId: string;
      commenterUsername: string;
      mediaId?: string;
      dryRun?: boolean;
    };

    if (!commentText || !commenterId || !commenterUsername) {
      return NextResponse.json(
        {
          error:
            "commentText, commenterId, and commenterUsername are required",
        },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find matching automations
    const { data: automations } = await supabase
      .from("automations")
      .select(
        "*, instagram_accounts!inner(user_id, ig_user_id, access_token, page_access_token)"
      )
      .eq("status", "active");

    if (!automations || automations.length === 0) {
      return NextResponse.json({
        matched: false,
        reason: "No active automations found. Create one first.",
        automationCount: 0,
      });
    }

    const results = [];

    for (const automation of automations) {
      // Keyword matching
      const keywords = (automation.keyword as string)
        .toLowerCase()
        .split(",")
        .map((k: string) => k.trim())
        .filter(Boolean);
      const commentLower = commentText.toLowerCase();
      const matched = keywords.some((kw: string) => commentLower.includes(kw));

      if (!matched) {
        results.push({
          automation: automation.name,
          matched: false,
          reason: `Keywords [${keywords.join(", ")}] not found in "${commentText}"`,
        });
        continue;
      }

      // Scope matching
      const scopeType = (automation.scope_type as string) || "account";
      if (scopeType === "media" && automation.media_id) {
        if (mediaId !== automation.media_id) {
          results.push({
            automation: automation.name,
            matched: true,
            keywordMatched: true,
            scopeMatched: false,
            reason: `Keyword matched but media_id doesn't match (expected: ${automation.media_id}, got: ${mediaId || "none"})`,
          });
          continue;
        }
      }

      const igAccount = automation.instagram_accounts as Record<string, string>;
      const userId = igAccount?.user_id;
      const igUserIdForDM = igAccount?.ig_user_id;
      const accessToken =
        igAccount?.page_access_token || igAccount?.access_token;

      // Generate DM
      const dmText = await generateDMReply({
        automationName: automation.name as string,
        keyword: automation.keyword as string,
        dmTemplate: automation.dm_template as string,
        commenterUsername,
        commentText,
        aiEnabled: (automation.ai_enabled as boolean) ?? false,
      });

      let sendResult: { success: boolean; error?: string; messageId?: string } = { success: false, error: "Dry run — skipped" };
      let commentReplyResult = null;

      if (!dryRun) {
        // Actually send the DM
        sendResult = await sendInstagramDM(igUserIdForDM, accessToken, commenterId, dmText);

        // Comment reply
        if (
          automation.comment_reply_enabled &&
          automation.comment_reply_template
        ) {
          const replyText = (automation.comment_reply_template as string)
            .replace(/\{name\}/gi, `@${commenterUsername}`)
            .replace(/\{keyword\}/gi, commentText);
          // Can't reply to comment without real comment ID in simulation
          commentReplyResult = {
            skipped: true,
            reason:
              "No real comment ID in simulation — reply would use: " +
              replyText,
          };
        }

        // Log DM
        await supabase.from("dm_logs").insert({
          user_id: userId,
          automation_id: automation.id,
          instagram_account_id: (automation as Record<string, unknown>)
            .instagram_account_id,
          recipient_ig_id: commenterId,
          recipient_username: commenterUsername,
          message_text: dmText,
          comment_text: commentText,
          status: sendResult.success ? "sent" : "failed",
        });

        // Update stats
        if (sendResult.success) {
          await supabase
            .from("automations")
            .update({
              dms_sent: ((automation.dms_sent as number) || 0) + 1,
            })
            .eq("id", automation.id);
        }
      }

      results.push({
        automation: automation.name,
        matched: true,
        keywordMatched: true,
        scopeMatched: true,
        aiEnabled: automation.ai_enabled,
        generatedMessage: dmText,
        sendResult: dryRun ? "DRY_RUN" : sendResult,
        commentReply: commentReplyResult,
      });
    }

    return NextResponse.json({
      simulatedComment: commentText,
      commenter: commenterUsername,
      totalAutomations: automations.length,
      results,
      tip: results.some(
        (r) =>
          r.sendResult &&
          typeof r.sendResult === "object" &&
          "error" in r.sendResult &&
          String(r.sendResult.error).includes("manage_messages")
      )
        ? "⚠️ You're seeing a permissions error. This is expected — your Meta app needs App Review + Business Verification before DMs work for non-test users."
        : undefined,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
