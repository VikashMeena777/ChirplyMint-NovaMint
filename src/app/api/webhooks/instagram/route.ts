import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateDMReply } from "@/lib/ai/nvidia-nim";
import { generateAgentReply } from "@/lib/ai/agent-reply";
import {
  sendInstagramDM,
  sendPrivateReply,
  sendGenericTemplate,
  sendGenericTemplateDM,
  replyToComment,
  checkIfFollower,
  type TemplateButton,
} from "@/lib/instagram/send-dm";
import { canSendDM, type PlanKey } from "@/lib/utils/plan-limits";
import { checkRateLimit, getDmLimiter } from "@/lib/utils/rate-limiter";
import { trackDMFailure, resetFailureCount } from "@/lib/utils/failure-tracker";
import crypto from "crypto";

const VERIFY_TOKEN =
  process.env.META_VERIFY_TOKEN || "chirplymint_verify_2026";
// Webhook signatures use the App Secret from Settings → Basic (NOT the Instagram App Secret)
const APP_SECRET = process.env.META_WEBHOOK_SECRET || process.env.META_APP_SECRET || "";

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
      // IMPORTANT: Always return 200 to Meta to prevent retry storms.
      // Returning 401/403 causes Meta to retry endlessly.
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const body = JSON.parse(rawBody);

    if (body.object === "instagram") {
      for (const entry of body.entry || []) {
        // Handle comment mentions and keyword triggers
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === "comments") {
              await handleComment(change.value, entry.id as string);
            }
            // Handle story mentions/replies
            if (change.field === "story_insights" || change.field === "mentions") {
              await handleStoryReply(change.value);
            }
          }
        }

        // Handle incoming DMs (including story replies via messaging)
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            if (messagingEvent.postback) {
              await handlePostback(messagingEvent);
            } else if (messagingEvent.message) {
              // Check if this is a story reply (has story reference)
              const storyRef = (messagingEvent.message as Record<string, unknown>)?.reply_to;
              if (storyRef && (storyRef as Record<string, unknown>)?.story) {
                await handleStoryReplyDM(messagingEvent);
              } else {
                await handleIncomingDM(messagingEvent);
              }
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
 * In-memory Set to deduplicate webhook deliveries.
 * Meta sends the same comment event 2-5 times; this ensures
 * we only process each commentId once per serverless instance.
 * Entries auto-expire after 5 minutes to avoid memory leaks.
 */
const processedComments = new Map<string, number>();
function isCommentAlreadyProcessed(commentId: string): boolean {
  const now = Date.now();
  // Clean up entries older than 5 minutes
  for (const [key, timestamp] of processedComments) {
    if (now - timestamp > 5 * 60 * 1000) processedComments.delete(key);
  }
  if (processedComments.has(commentId)) return true;
  processedComments.set(commentId, now);
  return false;
}

/**
 * Handle a comment on a post — match keywords → send DM + optional comment reply
 */
async function handleComment(commentData: Record<string, unknown>, receivingIgId?: string) {
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

  // Skip replies to comments — only process top-level comments
  // Instagram replies have a `parent_id` field pointing to the parent comment
  const parentId = (commentData.parent_id as string) || "";
  if (parentId) {
    console.log(`[Meta Webhook] Skipping reply (parent_id=${parentId}) from @${commenterUsername}`);
    return;
  }

  // Skip if this exact comment was already processed (Meta duplicate webhook)
  if (commentId && isCommentAlreadyProcessed(commentId)) {
    console.log(`[Meta Webhook] Skipping duplicate webhook for comment ${commentId}`);
    return;
  }

  // ═══════════════════════════════════════════════
  // CRITICAL: Scope automations to the receiving IG account.
  // entry.id from Meta webhook = the IG Business Account ID that received the comment.
  // Without this filter, automations from ALL users would fire on every comment,
  // causing cross-account data leakage (DM logs showing in wrong accounts).
  // ═══════════════════════════════════════════════
  let query = supabase
    .from("automations")
    .select("*, instagram_accounts!inner(user_id, ig_user_id, ig_username, access_token, page_access_token)")
    .eq("status", "active")
    .not("keyword", "is", null);

  if (receivingIgId) {
    query = query.eq("instagram_accounts.ig_user_id", receivingIgId);
  }

  const { data: automations } = await query;

  if (!automations || automations.length === 0) return;

  for (const automation of automations) {
    // Match keywords (support comma-separated keywords)
    // Special: "*" is a catch-all wildcard that matches EVERY comment
    const keywords = (automation.keyword as string)
      .toLowerCase()
      .split(",")
      .map((k: string) => k.trim())
      .filter(Boolean);
    const commentLower = commentText.toLowerCase();
    const isCatchAll = keywords.includes("*");
    const matched = isCatchAll || keywords.some((kw: string) => commentLower.includes(kw));
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

    // Skip self-comments: when the automation posts a comment reply,
    // that reply triggers the webhook again. Ignore comments from
    // the automation's own Instagram account to prevent reply loops.
    if (commenterId === igUserId) {
      console.log(
        `[Meta Webhook] Ignoring self-comment from own account ${igUserId}`
      );
      continue;
    }


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
    // RATE LIMIT CHECK (Upstash Redis)
    // Prevents abuse: max 1 DM per second per user
    // ═══════════════════════════════════════════════
    const dmLimiter = getDmLimiter();
    const rateCheck = await checkRateLimit(dmLimiter, `dm:${userId}`);
    if (!rateCheck.allowed) {
      console.log(`[Meta Webhook] Rate limited for user ${userId} — skipping DM`);
      await supabase.from("dm_logs").insert({
        user_id: userId,
        automation_id: automation.id,
        instagram_account_id: (automation as Record<string, unknown>).instagram_account_id,
        recipient_ig_id: commenterId,
        recipient_username: commenterUsername,
        message_text: "[SKIPPED] Rate limited",
        comment_text: commentText,
        status: "skipped_rate_limited",
      });
      continue;
    }

    // ═══════════════════════════════════════════════
    // PLAN LIMIT CHECK: Monthly DM quota
    // ═══════════════════════════════════════════════
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("plan, dm_count_this_month")
      .eq("id", userId)
      .single();

    const senderPlan = ((senderProfile?.plan as string) || "free") as PlanKey;
    const currentDmCount = (senderProfile?.dm_count_this_month as number) || 0;
    const dmCheck = canSendDM(senderPlan, currentDmCount);

    if (!dmCheck.allowed) {
      console.log(`[Meta Webhook] User ${userId} hit DM limit (${dmCheck.limit}) — skipping`);
      await supabase.from("dm_logs").insert({
        user_id: userId,
        automation_id: automation.id,
        instagram_account_id: (automation as Record<string, unknown>).instagram_account_id,
        recipient_ig_id: commenterId,
        recipient_username: commenterUsername,
        message_text: `[SKIPPED] Plan DM limit reached (${dmCheck.limit}/month)`,
        comment_text: commentText,
        status: "skipped_plan_limit",
      });
      continue;
    }

    // ═══════════════════════════════════════════════
    // CHECK: Does this automation have an active drip sequence?
    // If YES → send "window opener" as the initial Private Reply
    //          (prompts user to reply, opening the messaging window)
    // If NO  → send normal automation template/text as Private Reply
    // ═══════════════════════════════════════════════
    const { data: activeDripSeq } = await supabase
      .from("drip_sequences")
      .select("id, window_opener_text, window_opener_buttons")
      .eq("automation_id", automation.id)
      .eq("is_active", true)
      .single();

    const hasDrip = !!activeDripSeq;
    const templateType = (automation.template_type as string) || "text";
    let sendResult: { success: boolean; messageId?: string; recipientId?: string; error?: string };

    if (hasDrip) {
      // ── DRIP ACTIVE: Send window opener as Generic Template with postback buttons ──
      const dripData = activeDripSeq as Record<string, unknown>;
      const openerText = ((dripData.window_opener_text as string) || "Do you follow me?")
        .replace(/\{name\}/gi, `@${commenterUsername}`)
        .replace(/\{keyword\}/gi, commentText);

      // Build buttons: "Yes" = postback (triggers drip), "No" = URL to profile
      const igUsername = (igAccount as Record<string, string>).ig_username || "";
      const openerButtons: TemplateButton[] = [
        { type: "postback", title: "Yes ✅", payload: "DRIP_WINDOW_YES" },
        { type: "web_url", title: "No, let me follow", url: `https://instagram.com/${igUsername}` },
      ];

      sendResult = await sendGenericTemplate(igUserId, accessToken, commentId, {
        title: openerText.slice(0, 80),
        subtitle: undefined,
        image_url: undefined,
        buttons: openerButtons,
      });

      console.log(
        `[Meta Webhook] Drip active → sent window opener template to @${commenterUsername} (${sendResult.success ? "✅" : "❌"})`
      );
    } else if (templateType === "button" && automation.template_title) {
      // ── NO DRIP: BUTTON TEMPLATE DM ──
      const buttons = (automation.template_buttons as TemplateButton[]) || [];
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
      // ── NO DRIP: PLAIN TEXT DM ──
      const dmText = await generateDMReply({
        automationName: automation.name as string,
        keyword: isCatchAll ? commentText : (automation.keyword as string),
        dmTemplate: automation.dm_template as string,
        commenterUsername,
        commentText,
        aiEnabled: (automation.ai_enabled as boolean) ?? false,
      });

      sendResult = await sendPrivateReply(igUserId, accessToken, commentId, dmText);
    }

    // Build display text for logging
    const logMessageText = hasDrip
      ? `[WINDOW OPENER] ${((activeDripSeq as Record<string, string>).window_opener_text || "").slice(0, 100)}`
      : templateType === "button"
      ? `[TEMPLATE] ${automation.template_title}`
      : await generateDMReply({
          automationName: automation.name as string,
          keyword: isCatchAll ? commentText : (automation.keyword as string),
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

      // Increment user's monthly DM count (ATOMIC — prevents race conditions)
      supabase
        .from("profiles")
        .update({ dm_count_this_month: ((senderProfile?.dm_count_this_month as number) || 0) + 1 })
        .eq("id", userId)
        .then(() => { });
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
        notes: isCatchAll ? `Catch-all: "${commentText.slice(0, 80)}"` : `Keyword: ${keywords.join(", ")}`,
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

    // ═══════════════════════════════════════════════
    // DRIP SEQUENCE ENROLLMENT (fire-and-forget)
    // Enroll with 'waiting_reply' — user must reply to open messaging window
    // ═══════════════════════════════════════════════
    if (sendResult.success && hasDrip) {
      void (async () => {
        try {
          const seqId = (activeDripSeq as Record<string, string>).id;

          await supabase.from("drip_enrollments").upsert(
            {
              sequence_id: seqId,
              user_id: userId,
              automation_id: automation.id as string,
              recipient_ig_id: commenterId,
              recipient_username: commenterUsername,
              current_step: 0,
              status: "waiting_reply",
              next_send_at: null,
              enrolled_at: new Date().toISOString(),
            },
            { onConflict: "sequence_id,recipient_ig_id" }
          );

          console.log(
            `[Meta Webhook] @${commenterUsername} enrolled in drip (waiting_reply)`
          );
        } catch (err) {
          console.error("[Meta Webhook] Drip enrollment error:", err);
        }
      })();
    }

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

    // Track DM failures for alerting (#13)
    if (sendResult.success) {
      resetFailureCount(igAccount.id);
    } else {
      trackDMFailure(userId, igAccount.id, igAccount.ig_username || "").catch(() => {});
    }

    console.log(
      `[Meta Webhook] ${isCatchAll ? "Catch-all" : `Keyword "${keywords.join(",")}"`} matched from @${commenterUsername} → ${templateType === "button" ? "Template" : "DM"} ${sendResult.success ? "sent ✅" : "failed ❌"}`
    );
  }
}

/**
 * Handle an incoming DM — try AI Agent first (persona-based),
 * then fall back to automation-based AI reply.
 */
async function handleIncomingDM(messagingEvent: Record<string, unknown>) {
  const supabase = getSupabase();

  const senderId =
    (messagingEvent.sender as Record<string, string>)?.id || "";
  const messageText =
    (messagingEvent.message as Record<string, string>)?.text || "";

  if (!senderId || !messageText) return;

  const recipientId =
    (messagingEvent.recipient as Record<string, string>)?.id || "";

  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("user_id, id, ig_user_id, access_token, page_access_token")
    .eq("ig_user_id", recipientId)
    .eq("is_active", true)
    .single();

  if (!igAccount) return;

  const userId = igAccount.user_id as string;
  const accessToken =
    (igAccount.page_access_token as string) ||
    (igAccount.access_token as string);

  // ═══════════════════════════════════════════════
  // DRIP WINDOW OPENER: Check if this user has a 'waiting_reply' enrollment
  // If so, they just replied to the window opener → send the actual template
  // and activate the drip sequence
  // ═══════════════════════════════════════════════
  const { data: pendingEnrollment } = await supabase
    .from("drip_enrollments")
    .select(`
      id, sequence_id, automation_id,
      drip_sequences!inner(automation_id)
    `)
    .eq("recipient_ig_id", senderId)
    .eq("user_id", userId)
    .eq("status", "waiting_reply")
    .limit(1)
    .single();

  if (pendingEnrollment) {
    const enrollment = pendingEnrollment as Record<string, unknown>;
    const automationId = enrollment.automation_id as string;

    // Fetch the automation to get the template
    const { data: automation } = await supabase
      .from("automations")
      .select("*")
      .eq("id", automationId)
      .eq("status", "active")
      .single();

    if (automation) {
      // Send the ACTUAL automation template as a regular DM (window is now open!)
      const autoTemplateType = (automation.template_type as string) || "text";
      let templateSendResult: { success: boolean; messageId?: string; error?: string };

      if (autoTemplateType === "button" && automation.template_title) {
        const buttons = (automation.template_buttons as TemplateButton[]) || [];
        const title = ((automation.template_title as string) || "")
          .replace(/\{name\}/gi, `@${(enrollment.recipient_username as string) || "friend"}`);

        templateSendResult = await sendGenericTemplateDM(
          recipientId, accessToken, senderId,
          { title, subtitle: undefined, image_url: (automation.template_image_url as string) || undefined, buttons }
        );
      } else {
        const dmText = await generateDMReply({
          automationName: automation.name as string,
          keyword: automation.keyword as string,
          dmTemplate: automation.dm_template as string,
          commenterUsername: (enrollment.recipient_username as string) || "friend",
          commentText: messageText,
          aiEnabled: (automation.ai_enabled as boolean) ?? false,
        });

        templateSendResult = await sendInstagramDM(recipientId, accessToken, senderId, dmText);
      }

      // Log the template DM
      await supabase.from("dm_logs").insert({
        user_id: userId,
        automation_id: automationId,
        instagram_account_id: igAccount.id,
        recipient_ig_id: senderId,
        recipient_username: (enrollment.recipient_username as string) || senderId,
        message_text: `[DRIP ACTIVATED] ${autoTemplateType === "button" ? `Template: ${automation.template_title}` : "Automation template sent"}`,
        comment_text: messageText,
        status: templateSendResult.success ? "sent" : "failed",
      });

      if (templateSendResult.success) {
        // Get the first drip step to calculate next_send_at
        const { data: firstStep } = await supabase
          .from("drip_steps")
          .select("delay_hours")
          .eq("sequence_id", enrollment.sequence_id as string)
          .eq("step_number", 1)
          .single();

        const nextSendAt = firstStep
          ? new Date(Date.now() + (firstStep as Record<string, number>).delay_hours * 60 * 60 * 1000).toISOString()
          : null;

        // Activate the enrollment — drip steps will now flow via cron
        await supabase
          .from("drip_enrollments")
          .update({
            status: "active",
            next_send_at: nextSendAt,
          })
          .eq("id", enrollment.id as string);

        console.log(
          `[Meta Webhook] Drip activated for ${senderId} → template sent, next step in ${firstStep ? (firstStep as Record<string, number>).delay_hours + "h" : "N/A"}`
        );
      }
    }

    return; // Handled — skip AI agent
  }

  // ── Strategy 1: AI Agent (persona + FAQs + conversation memory) ──
  try {
    const agentResult = await generateAgentReply({
      userId,
      senderIgId: senderId,
      senderUsername: senderId,
      incomingMessage: messageText,
    });

    if (agentResult) {
      const sendResult = await sendInstagramDM(recipientId, accessToken, senderId, agentResult.reply);

      await supabase.from("dm_logs").insert({
        user_id: userId,
        instagram_account_id: igAccount.id,
        recipient_ig_id: senderId,
        recipient_username: senderId,
        message_text: agentResult.reply,
        comment_text: messageText,
        status: sendResult.success ? "sent" : "failed",
      });

      void Promise.resolve(
        supabase.from("activity_log").insert({
          user_id: userId,
          action: sendResult.success ? "dm.agent_reply_sent" : "dm.agent_reply_failed",
          metadata: { sender: senderId, error: sendResult.error || null },
        })
      ).catch(() => {});

      console.log(
        `[AI Agent] Reply ${sendResult.success ? "sent ✅" : "failed ❌"} for DM from ${senderId}`
      );
      return; // AI Agent handled it
    }
  } catch (err) {
    console.error("[AI Agent] Error:", err);
    // Fall through to automation-based AI
  }

  // ── Strategy 2: Automation-based AI reply (legacy) ──
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

  const reply = await generateDMReply({
    automationName: automation.name as string,
    keyword: "",
    dmTemplate: automation.dm_template as string,
    commenterUsername: senderId,
    commentText: messageText,
    aiEnabled: true,
  });

  const sendResult = await sendInstagramDM(recipientId, accessToken, senderId, reply);

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

/**
 * Handle a postback button tap — look up the flow and send the configured response.
 * Postback events have: sender.id, recipient.id, postback.payload, postback.title
 */
async function handlePostback(event: Record<string, unknown>) {
  const supabase = getSupabase();

  const senderId = (event.sender as Record<string, string>)?.id || "";
  const recipientId = (event.recipient as Record<string, string>)?.id || "";
  const postbackData = event.postback as Record<string, string> | undefined;
  const payload = postbackData?.payload?.toLowerCase()?.trim() || "";
  const buttonTitle = postbackData?.title || "";

  if (!senderId || !payload) return;

  console.log(`[Meta Webhook] Postback received: payload="${payload}" from ${senderId}`);

  // Find the IG account for this recipient
  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("user_id, id, ig_user_id, access_token, page_access_token")
    .eq("ig_user_id", recipientId)
    .eq("is_active", true)
    .single();

  if (!igAccount) {
    console.warn(`[Meta Webhook] No IG account found for recipient ${recipientId}`);
    return;
  }

  const userId = igAccount.user_id as string;
  const accessToken = (igAccount.page_access_token as string) || (igAccount.access_token as string);

  // ═══════════════════════════════════════════════
  // DRIP WINDOW OPENER: Handle "Yes" postback
  // When user taps "Yes ✅" on the window opener template,
  // send the actual automation template and activate drip
  // ═══════════════════════════════════════════════
  if (payload === "drip_window_yes") {
    const { data: pendingEnrollment } = await supabase
      .from("drip_enrollments")
      .select(`id, sequence_id, automation_id, recipient_username`)
      .eq("recipient_ig_id", senderId)
      .eq("user_id", userId)
      .eq("status", "waiting_reply")
      .limit(1)
      .single();

    if (!pendingEnrollment) {
      console.log(`[Meta Webhook] No waiting_reply enrollment for ${senderId} — ignoring DRIP_WINDOW_YES`);
      return;
    }

    const enrollment = pendingEnrollment as Record<string, unknown>;
    const automationId = enrollment.automation_id as string;

    // Fetch the automation to get the template
    const { data: automation } = await supabase
      .from("automations")
      .select("*")
      .eq("id", automationId)
      .eq("status", "active")
      .single();

    if (!automation) {
      console.warn(`[Meta Webhook] Automation ${automationId} not found for drip activation`);
      return;
    }

    // Send the ACTUAL automation template as a regular DM (postback opened the window!)
    const autoTemplateType = (automation.template_type as string) || "text";
    let templateSendResult: { success: boolean; messageId?: string; error?: string };

    if (autoTemplateType === "button" && automation.template_title) {
      const buttons = (automation.template_buttons as TemplateButton[]) || [];
      const title = ((automation.template_title as string) || "")
        .replace(/\{name\}/gi, `@${(enrollment.recipient_username as string) || "friend"}`);

      templateSendResult = await sendGenericTemplateDM(
        recipientId, accessToken, senderId,
        { title, subtitle: undefined, image_url: (automation.template_image_url as string) || undefined, buttons }
      );
    } else {
      const dmText = await generateDMReply({
        automationName: automation.name as string,
        keyword: automation.keyword as string,
        dmTemplate: automation.dm_template as string,
        commenterUsername: (enrollment.recipient_username as string) || "friend",
        commentText: "",
        aiEnabled: (automation.ai_enabled as boolean) ?? false,
      });

      templateSendResult = await sendInstagramDM(recipientId, accessToken, senderId, dmText);
    }

    // Log the template DM
    await supabase.from("dm_logs").insert({
      user_id: userId,
      automation_id: automationId,
      instagram_account_id: igAccount.id,
      recipient_ig_id: senderId,
      recipient_username: (enrollment.recipient_username as string) || senderId,
      message_text: `[DRIP ACTIVATED via postback] ${autoTemplateType === "button" ? `Template: ${automation.template_title}` : "Automation template sent"}`,
      comment_text: `[POSTBACK] DRIP_WINDOW_YES`,
      status: templateSendResult.success ? "sent" : "failed",
    });

    if (templateSendResult.success) {
      // Get the first drip step to calculate next_send_at
      const { data: firstStep } = await supabase
        .from("drip_steps")
        .select("delay_hours")
        .eq("sequence_id", enrollment.sequence_id as string)
        .eq("step_number", 1)
        .single();

      const nextSendAt = firstStep
        ? new Date(Date.now() + (firstStep as Record<string, number>).delay_hours * 60 * 60 * 1000).toISOString()
        : null;

      // Activate the enrollment — drip steps will now flow via cron
      await supabase
        .from("drip_enrollments")
        .update({
          status: "active",
          next_send_at: nextSendAt,
        })
        .eq("id", enrollment.id as string);

      console.log(
        `[Meta Webhook] Drip activated via postback for ${senderId} → template sent, next step in ${firstStep ? (firstStep as Record<string, number>).delay_hours + "h" : "N/A"}`
      );
    }

    return; // Handled — skip normal postback flow
  }

  // Find matching postback flow across all active automations for this user
  const { data: flows } = await supabase
    .from("postback_flows")
    .select("*, automations!inner(id, name, status, instagram_account_id)")
    .eq("payload", payload)
    .eq("is_active", true)
    .eq("automations.status", "active")
    .eq("automations.instagram_account_id", igAccount.id);

  if (!flows || flows.length === 0) {
    console.log(`[Meta Webhook] No postback flow found for payload="${payload}"`);
    return;
  }

  const flow = flows[0];
  const automation = flow.automations as Record<string, unknown>;
  const responseType = (flow.response_type as string) || "text";

  let sendResult: { success: boolean; messageId?: string; error?: string };

  if (responseType === "button" && flow.response_template_title) {
    // Send a follow-up Generic Template
    const buttons = (flow.response_template_buttons as { type: "web_url"; title: string; url?: string }[]) || [];
    const templatePayload = {
      title: (flow.response_template_title as string).slice(0, 80),
      subtitle: (flow.response_template_subtitle as string) || undefined,
      image_url: (flow.response_template_image_url as string) || undefined,
      buttons: buttons.map((b) => ({
        type: "web_url" as const,
        title: b.title.slice(0, 20),
        url: b.url,
      })),
    };

    // For postback responses, we send via regular DM (not private reply)
    // So we use sendInstagramDM for text or construct the template manually
    const res = await fetch(`https://graph.instagram.com/v25.0/${recipientId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: senderId },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [{
                title: templatePayload.title,
                ...(templatePayload.subtitle ? { subtitle: templatePayload.subtitle } : {}),
                ...(templatePayload.image_url ? { image_url: templatePayload.image_url } : {}),
                ...(templatePayload.buttons.length > 0 ? { buttons: templatePayload.buttons } : {}),
              }],
            },
          },
        },
      }),
    });

    const data = await res.json();
    sendResult = data.error
      ? { success: false, error: data.error.message }
      : { success: true, messageId: data.message_id };
  } else {
    // Send plain text response
    const responseText = (flow.response_text as string) || "Thanks for your response!";
    sendResult = await sendInstagramDM(recipientId, accessToken, senderId, responseText);
  }

  // Tag the lead if lead_tag is set
  if (flow.lead_tag && sendResult.success) {
    await supabase
      .from("leads")
      .update({ notes: `Tag: ${flow.lead_tag}` })
      .eq("user_id", userId)
      .eq("ig_user_id", senderId);

    console.log(`[Meta Webhook] Tagged lead ${senderId} with "${flow.lead_tag}"`);
  }

  // Log the postback response
  await supabase.from("dm_logs").insert({
    user_id: userId,
    automation_id: automation.id,
    instagram_account_id: igAccount.id,
    recipient_ig_id: senderId,
    recipient_username: senderId,
    message_text: responseType === "button"
      ? `[POSTBACK TEMPLATE] ${flow.response_template_title}`
      : (flow.response_text as string),
    comment_text: `[POSTBACK] Button: "${buttonTitle}" → payload: "${payload}"`,
    status: sendResult.success ? "sent" : "failed",
  });

  // Log activity
  void Promise.resolve(
    supabase.from("activity_log").insert({
      user_id: userId,
      action: sendResult.success ? "postback.responded" : "postback.failed",
      metadata: {
        payload,
        button_title: buttonTitle,
        automation: automation.name,
        flow_label: flow.label,
        lead_tag: flow.lead_tag || null,
        error: sendResult.error || null,
      },
    })
  ).catch(() => {});

  console.log(
    `[Meta Webhook] Postback "${payload}" → ${responseType} response ${sendResult.success ? "sent ✅" : "failed ❌"}`
  );
}

/**
 * Handle story mentions (from changes webhook).
 * Meta sends story_insights / mentions when someone mentions the account in their story.
 */
async function handleStoryReply(data: Record<string, unknown>) {
  // Story mentions via changes don't contain enough user info to DM directly.
  // The actual story reply DMs come through the messaging channel (handleStoryReplyDM).
  // This handler logs the mention for analytics.
  const supabase = getSupabase();
  const mediaId = (data.media_id as string) || "";

  console.log(`[Meta Webhook] Story mention received, media: ${mediaId}`);

  // We don't take action here — the DM reply comes via messaging webhook.
  // This is logged for future analytics integration.
}

/**
 * Handle a story reply sent via DM (messaging webhook with reply_to.story).
 * Find automations with trigger_type = 'story_reply' or 'both' and send an auto-DM.
 */
async function handleStoryReplyDM(messagingEvent: Record<string, unknown>) {
  const supabase = getSupabase();

  const senderId = (messagingEvent.sender as Record<string, string>)?.id || "";
  const recipientId = (messagingEvent.recipient as Record<string, string>)?.id || "";
  const messageText = (messagingEvent.message as Record<string, string>)?.text || "";

  if (!senderId || !recipientId) return;

  console.log(`[Meta Webhook] Story reply DM from ${senderId}: "${messageText?.slice(0, 50)}"`);

  // Find the IG account
  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("user_id, id, ig_user_id, access_token, page_access_token")
    .eq("ig_user_id", recipientId)
    .eq("is_active", true)
    .single();

  if (!igAccount) return;

  const userId = igAccount.user_id as string;
  const accessToken = (igAccount.page_access_token as string) || (igAccount.access_token as string);

  // Find active automations with trigger_type 'story_reply' or 'both'
  const { data: automations } = await supabase
    .from("automations")
    .select("*")
    .eq("user_id", userId)
    .eq("instagram_account_id", igAccount.id)
    .eq("status", "active")
    .in("trigger_type", ["story_reply", "both"]);

  if (!automations || automations.length === 0) return;

  const automation = automations[0];
  const dmTemplate = (automation.dm_template as string) || "Thanks for replying to my story! 💜";

  // Replace variables
  const dmText = dmTemplate
    .replace(/\{name\}/gi, senderId)
    .replace(/\{story_reply\}/gi, messageText || "");

  // Send the auto-DM
  const sendResult = await sendInstagramDM(recipientId, accessToken, senderId, dmText);

  // Log the DM
  await supabase.from("dm_logs").insert({
    user_id: userId,
    automation_id: automation.id,
    instagram_account_id: igAccount.id,
    recipient_ig_id: senderId,
    recipient_username: senderId,
    message_text: dmText,
    comment_text: `[STORY_REPLY] ${messageText?.slice(0, 100) || ""}`,
    status: sendResult.success ? "sent" : "failed",
  });

  // Create lead
  await supabase.from("leads").upsert(
    {
      user_id: userId,
      ig_username: senderId,
      ig_user_id: senderId,
      source: "story_reply",
      notes: `Story reply: "${messageText?.slice(0, 80) || ""}"`,
    },
    { onConflict: "user_id,ig_user_id" }
  );

  // Log activity
  void Promise.resolve(
    supabase.from("activity_log").insert({
      user_id: userId,
      action: sendResult.success ? "dm.story_reply_sent" : "dm.story_reply_failed",
      metadata: {
        sender: senderId,
        automation: automation.name,
        trigger: "story_reply",
        error: sendResult.error || null,
      },
    })
  ).catch(() => {});

  console.log(
    `[Meta Webhook] Story reply auto-DM ${sendResult.success ? "sent ✅" : "failed ❌"} to ${senderId}`
  );
}
