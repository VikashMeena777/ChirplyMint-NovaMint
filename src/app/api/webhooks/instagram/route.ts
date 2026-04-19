import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateDMReply } from "@/lib/ai/nvidia-nim";
import {
  sendInstagramDM,
  sendPrivateReply,
  sendGenericTemplate,
  replyToComment,
  checkIfFollower,
  type TemplateButton,
} from "@/lib/instagram/send-dm";
import crypto from "crypto";

const VERIFY_TOKEN =
  process.env.META_VERIFY_TOKEN || "chirplymint_verify_2026";
const APP_SECRET = process.env.META_APP_SECRET || "";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Verify Meta webhook signature (HMAC SHA-256)
 */
function verifySignature(payload: string, signature: string | null): boolean {
  if (!APP_SECRET) {
    console.warn(
      "[Meta Webhook] META_APP_SECRET not set — skipping signature verification"
    );
    return true;
  }
  if (!signature) return false;

  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", APP_SECRET).update(payload).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * GET — Meta Webhook Verification
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[Meta Webhook] Verification successful");
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST — Incoming Instagram Events (comments, messages)
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Verify webhook signature
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifySignature(rawBody, signature)) {
      console.error("[Meta Webhook] Invalid signature — rejecting payload");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (body.object === "instagram") {
      for (const entry of body.entry || []) {
        // Handle comment mentions and keyword triggers
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === "comments") {
              await handleComment(change.value);
            }
          }
        }

        // Handle incoming DMs
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            if (messagingEvent.message) {
              await handleIncomingDM(messagingEvent);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Meta Webhook] Error processing event:", error);
    return NextResponse.json({ status: "ok" });
  }
}

/**
 * Handle a comment on a post — match keywords → send DM + optional comment reply
 */
async function handleComment(commentData: Record<string, unknown>) {
  const supabase = getSupabase();

  const commentText = (commentData.text as string) || "";
  const commentId = (commentData.id as string) || "";
  const mediaId = (commentData.media as Record<string, string>)?.id || "";
  const commenterData = commentData.from as
    | Record<string, string>
    | undefined;
  const commenterId = commenterData?.id || "";
  const commenterUsername = commenterData?.username || "unknown";

  if (!commentText || !commenterId) return;

  // Find active automations that match
  const { data: automations } = await supabase
    .from("automations")
    .select("*, instagram_accounts!inner(user_id, ig_user_id, access_token, page_access_token)")
    .eq("status", "active")
    .not("keyword", "is", null);

  if (!automations || automations.length === 0) return;

  for (const automation of automations) {
    // Match keywords (support comma-separated keywords)
    const keywords = (automation.keyword as string)
      .toLowerCase()
      .split(",")
      .map((k: string) => k.trim())
      .filter(Boolean);
    const commentLower = commentText.toLowerCase();
    const matched = keywords.some((kw: string) => commentLower.includes(kw));
    if (!matched) continue;

    // Check scope: if automation is for a specific post, match media_id
    const scopeType = (automation.scope_type as string) || "account";
    if (scopeType === "media" && automation.media_id) {
      if (mediaId !== automation.media_id) continue; // Skip — different post
    }

    const igAccount = automation.instagram_accounts as Record<string, string>;
    const userId = igAccount?.user_id;
    const igUserId = igAccount?.ig_user_id;
    const accessToken = igAccount?.page_access_token || igAccount?.access_token;
    if (!userId || !accessToken || !igUserId) continue;

    // ═══════════════════════════════════════════════
    // FOLLOW-FOR-DM CHECK
    // If require_follow is true, verify the commenter follows the account.
    // Uses the IG User Profile API endpoint: is_user_follow_business
    // If the API returns null (no consent) or false → skip this DM.
    // ═══════════════════════════════════════════════
    if (automation.require_follow === true) {
      const followerCheck = await checkIfFollower(commenterId, accessToken);

      if (followerCheck.isFollower === false) {
        // Commenter does NOT follow — skip DM
        console.log(
          `[Meta Webhook] @${commenterUsername} does not follow — skipping DM (require_follow=true)`
        );

        // Log as skipped
        await supabase.from("dm_logs").insert({
          user_id: userId,
          automation_id: automation.id,
          instagram_account_id: (automation as Record<string, unknown>)
            .instagram_account_id,
          recipient_ig_id: commenterId,
          recipient_username: commenterUsername,
          message_text: "[SKIPPED] Commenter does not follow this account",
          comment_text: commentText,
          status: "skipped_not_follower",
        });

        // Reply with a "follow me first" message instead of the custom reply
        if (commentId) {
          const followPrompt = `Hey @${commenterUsername}! 👋 Follow us first and then comment again to receive your DM! 💌`;
          await replyToComment(accessToken, commentId, followPrompt);
          console.log(`[Meta Webhook] Posted "follow first" reply to @${commenterUsername}`);
        }

        continue; // Skip to next automation
      }

      if (followerCheck.isFollower === null) {
        // API couldn't verify (no consent / first-time) — skip per strict mode
        console.log(
          `[Meta Webhook] Could not verify follower status for @${commenterUsername} — skipping (strict mode)`
        );

        await supabase.from("dm_logs").insert({
          user_id: userId,
          automation_id: automation.id,
          instagram_account_id: (automation as Record<string, unknown>)
            .instagram_account_id,
          recipient_ig_id: commenterId,
          recipient_username: commenterUsername,
          message_text: "[SKIPPED] Follower status could not be verified",
          comment_text: commentText,
          status: "skipped_not_follower",
        });

        // Reply with a "follow me first" message
        if (commentId) {
          const followPrompt = `Hey @${commenterUsername}! 👋 Follow us first and then comment again to receive your DM! 💌`;
          await replyToComment(accessToken, commentId, followPrompt);
          console.log(`[Meta Webhook] Posted "follow first" reply to @${commenterUsername} (unverified)`);
        }

        continue;
      }

      // followerCheck.isFollower === true → proceed with DM
      console.log(`[Meta Webhook] @${commenterUsername} follows ✅ — proceeding with DM`);
    }

    // ═══════════════════════════════════════════════
    // SEND DM: Text or Generic Template based on template_type
    // ═══════════════════════════════════════════════
    const templateType = (automation.template_type as string) || "text";
    let sendResult: { success: boolean; messageId?: string; recipientId?: string; error?: string };

    if (templateType === "button" && automation.template_title) {
      // ── BUTTON TEMPLATE DM ──
      const buttons = (automation.template_buttons as TemplateButton[]) || [];
      // Replace variables in title/subtitle
      const title = ((automation.template_title as string) || "")
        .replace(/\{name\}/gi, `@${commenterUsername}`)
        .replace(/\{keyword\}/gi, commentText);
      const subtitle = ((automation.template_subtitle as string) || "")
        .replace(/\{name\}/gi, `@${commenterUsername}`)
        .replace(/\{keyword\}/gi, commentText);

      sendResult = await sendGenericTemplate(igUserId, accessToken, commentId, {
        title,
        subtitle: subtitle || undefined,
        image_url: (automation.template_image_url as string) || undefined,
        buttons,
      });
    } else {
      // ── PLAIN TEXT DM ──
      const dmText = await generateDMReply({
        automationName: automation.name as string,
        keyword: automation.keyword as string,
        dmTemplate: automation.dm_template as string,
        commenterUsername,
        commentText,
        aiEnabled: (automation.ai_enabled as boolean) ?? false,
      });

      sendResult = await sendPrivateReply(igUserId, accessToken, commentId, dmText);
    }

    // Build display text for logging
    const logMessageText = templateType === "button"
      ? `[TEMPLATE] ${automation.template_title}`
      : await generateDMReply({
          automationName: automation.name as string,
          keyword: automation.keyword as string,
          dmTemplate: automation.dm_template as string,
          commenterUsername,
          commentText,
          aiEnabled: (automation.ai_enabled as boolean) ?? false,
        });

    // Log the DM
    await supabase.from("dm_logs").insert({
      user_id: userId,
      automation_id: automation.id,
      instagram_account_id: (automation as Record<string, unknown>)
        .instagram_account_id,
      recipient_ig_id: commenterId,
      recipient_username: commenterUsername,
      message_text: typeof logMessageText === "string" ? logMessageText : String(logMessageText),
      comment_text: commentText,
      status: sendResult.success ? "sent" : "failed",
    });

    // Update automation stats
    if (sendResult.success) {
      await supabase.rpc("increment_field", {
        table_name: "automations",
        field_name: "dms_sent",
        row_id: automation.id,
      }).then(({ error }) => {
        // Fallback if RPC doesn't exist
        if (error) {
          supabase
            .from("automations")
            .update({ dms_sent: ((automation.dms_sent as number) || 0) + 1 })
            .eq("id", automation.id)
            .then(() => { });
        }
      });

      // Increment user's monthly DM count
      supabase
        .from("profiles")
        .select("dm_count_this_month")
        .eq("id", userId)
        .single()
        .then(({ data: profile }) => {
          const current = (profile?.dm_count_this_month as number) || 0;
          supabase
            .from("profiles")
            .update({ dm_count_this_month: current + 1 })
            .eq("id", userId)
            .then(() => { });
        });
    }

    // ═══════════════════════════════════════════════
    // COMMENT AUTO-REPLY (if enabled)
    // ═══════════════════════════════════════════════
    if (
      automation.comment_reply_enabled &&
      automation.comment_reply_template &&
      commentId
    ) {
      const replyText = (automation.comment_reply_template as string)
        .replace(/\{name\}/gi, `@${commenterUsername}`)
        .replace(/\{keyword\}/gi, commentText);

      await replyToComment(accessToken, commentId, replyText);

      console.log(
        `[Meta Webhook] Comment reply posted on comment ${commentId}`
      );
    }

    // Create or update lead
    await supabase.from("leads").upsert(
      {
        user_id: userId,
        ig_username: commenterUsername,
        ig_user_id: commenterId,
        source: "comment",
        notes: `Keyword: ${keywords.join(", ")}`,
      },
      { onConflict: "user_id,ig_user_id" }
    );

    // Increment leads_captured on automation
    supabase
      .from("automations")
      .update({
        leads_captured: ((automation.leads_captured as number) || 0) + 1,
      })
      .eq("id", automation.id)
      .then(() => { });

    // Create new lead notification if user has it enabled
    const { data: profile } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", userId)
      .single();

    const prefs =
      (profile?.notification_preferences as Record<string, boolean>) ?? {};
    if (prefs.new_lead_alerts !== false) {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "new_lead",
        title: "New lead captured!",
        body: `@${commenterUsername} commented "${commentText.slice(0, 60)}" and triggered "${automation.name}"`,
        metadata: { username: commenterUsername, automation: automation.name },
      });
    }

    // Log activity (fire-and-forget)
    void Promise.resolve(
      supabase.from("activity_log").insert({
        user_id: userId,
        action: sendResult.success ? "dm.sent" : "dm.failed",
        metadata: {
          recipient: commenterUsername,
          automation: automation.name,
          trigger: "comment",
          template_type: templateType,
          error: sendResult.error || null,
        },
      })
    ).catch(() => { });

    console.log(
      `[Meta Webhook] Keyword "${keywords.join(",")}" matched from @${commenterUsername} → ${templateType === "button" ? "Template" : "DM"} ${sendResult.success ? "sent ✅" : "failed ❌"}`
    );
  }
}

/**
 * Handle an incoming DM — generate AI response if automation is AI-enabled
 */
async function handleIncomingDM(messagingEvent: Record<string, unknown>) {
  const supabase = getSupabase();

  const senderId =
    (messagingEvent.sender as Record<string, string>)?.id || "";
  const messageText =
    (messagingEvent.message as Record<string, string>)?.text || "";

  if (!senderId || !messageText) return;

  // Find any active AI-enabled automation for the recipient account
  const recipientId =
    (messagingEvent.recipient as Record<string, string>)?.id || "";

  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("user_id, id, access_token, page_access_token")
    .eq("ig_user_id", recipientId)
    .eq("is_active", true)
    .single();

  if (!igAccount) return;

  const userId = igAccount.user_id as string;
  const accessToken =
    (igAccount.page_access_token as string) ||
    (igAccount.access_token as string);

  // Find an AI-enabled automation
  const { data: automation } = await supabase
    .from("automations")
    .select("*")
    .eq("user_id", userId)
    .eq("instagram_account_id", igAccount.id)
    .eq("status", "active")
    .eq("ai_enabled", true)
    .limit(1)
    .single();

  if (!automation) return;

  // Generate AI reply
  const reply = await generateDMReply({
    automationName: automation.name as string,
    keyword: "",
    dmTemplate: automation.dm_template as string,
    commenterUsername: senderId,
    commentText: messageText,
    aiEnabled: true,
  });

  // ACTUALLY SEND THE REPLY
  const sendResult = await sendInstagramDM(recipientId, accessToken, senderId, reply);

  // Log the reply
  await supabase.from("dm_logs").insert({
    user_id: userId,
    automation_id: automation.id,
    instagram_account_id: igAccount.id,
    recipient_ig_id: senderId,
    recipient_username: senderId,
    message_text: reply,
    comment_text: messageText,
    status: sendResult.success ? "sent" : "failed",
  });

  // Log activity
  void Promise.resolve(
    supabase.from("activity_log").insert({
      user_id: userId,
      action: sendResult.success ? "dm.ai_reply_sent" : "dm.ai_reply_failed",
      metadata: {
        sender: senderId,
        automation: automation.name,
        error: sendResult.error || null,
      },
    })
  ).catch(() => { });

  console.log(
    `[Meta Webhook] AI reply ${sendResult.success ? "sent ✅" : "failed ❌"} for DM from ${senderId}`
  );
}
