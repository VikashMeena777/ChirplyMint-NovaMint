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
  sendMultiImageDM,
  sendFileDM,
  reactToMessage,
  hideComment,
  likeComment,
  type TemplateButton,
} from "@/lib/instagram/send-dm";
import { canSendDM, type PlanKey } from "@/lib/utils/plan-limits";
import { checkRateLimit, getDmLimiter, getAiLimiter } from "@/lib/utils/rate-limiter";
import { trackDMFailure, resetFailureCount } from "@/lib/utils/failure-tracker";
import crypto from "crypto";
import { checkDmMilestones } from "@/lib/email/dm-milestones";
import { pickABVariant } from "@/lib/actions/ab-test";
import { sendMessageStack, type MessageBlock } from "@/lib/instagram/message-stack";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "";
// Signature secrets: this is an "Instagram API with Instagram Login" app, and
// production traffic proves payloads are signed with the Instagram product
// secret. META_WEBHOOK_SECRET holds it; META_APP_SECRET (Settings → Basic) is
// the fallback. verifySignature tries both so a mis-paste can't break the app.
const SIGNING_SECRETS: string[] = [
  process.env.META_WEBHOOK_SECRET,
  process.env.META_APP_SECRET,
].filter((s): s is string => Boolean(s));

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
  if (SIGNING_SECRETS.length === 0) {
    console.error(
      "[Meta Webhook] CRITICAL: META_WEBHOOK_SECRET / META_APP_SECRET not set — rejecting payload (fail-closed)"
    );
    return false;
  }
  if (!signature) return false;

  const sigBuf = Buffer.from(signature);
  for (const secret of SIGNING_SECRETS) {
    const expectedSignature =
      "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return true;
    }
  }
  return false;
}

/**
 * GET — Meta Webhook Verification
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Fail closed: if META_VERIFY_TOKEN is not configured, never accept
  // subscription attempts (an empty token must not match).
  if (VERIFY_TOKEN && mode === "subscribe" && token === VERIFY_TOKEN) {
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

    // Vercel serverless wall-clock budget: Meta batches several events into
    // one POST, and AI/follower checks add up. Past ~45s we stop starting
    // NEW automations so the function returns before the 60s kill — a timed
    // out function makes Meta retry the whole batch (duplicate sends).
    const WEBHOOK_DEADLINE_MS = Date.now() + 45_000;
    const timeBudgetLeft = () => WEBHOOK_DEADLINE_MS - Date.now();

    if (body.object === "instagram") {
      for (const entry of body.entry || []) {
        // Handle comment mentions and keyword triggers
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === "comments") {
              await handleComment(change.value, entry.id as string, timeBudgetLeft);
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
            } else if (messagingEvent.message_edit) {
              // User edited a sent message (v26). num_edit:0 can fire instead
              // of the original message (known Meta bug) — never act on it.
              await handleMessageEdit(messagingEvent);
            } else if (messagingEvent.read) {
              // Lead read our DM (messaging_seen / read receipts) — stamp
              // the outbound dm_logs rows for the conversation.
              await handleMessagingRead(messagingEvent);
            } else if (messagingEvent.reaction) {
              // Lead reacted to / unreacted from one of our DMs (v26).
              await handleMessageReaction(messagingEvent);
            } else if (messagingEvent.referral) {
              // messaging_referral (v26): lead arrived from an ad / story
              // link click-to-DM. Attribution lands on the lead row.
              await handleMessagingReferral(messagingEvent);
            } else if (messagingEvent.message) {
              const msg = messagingEvent.message as Record<string, unknown>;

              // Quick-reply tap: message with quick_reply payload, optionally
              // carrying structured lead data (user_email / user_phone_number).
              if (msg.quick_reply) {
                await handleQuickReply(messagingEvent);
              }

              // Check if this is a story reply (has story reference)
              const storyRef = msg.reply_to;
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
async function handleComment(commentData: Record<string, unknown>, receivingIgId?: string, timeBudgetLeft?: () => number) {
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
  // ═══════════════════════════════════════════════
  // AUTO-MODERATION (v26 hide comment): if the receiving account has
  // auto-hide keywords configured and the comment contains one, hide it from
  // the public feed and stop. Hidden comments never trigger automations
  // (spam bots don't get free DMs) and the commenter still sees their text,
  // so they don't retry. Runs BEFORE automation matching so it also covers
  // comments that match no automation.
  // ═══════════════════════════════════════════════
  if (receivingIgId && commentId) {
    try {
      const { data: modAccounts } = await supabase
        .from("instagram_accounts")
        .select("user_id, id, auto_hide_keywords, page_access_token, access_token")
        .eq("ig_user_id", receivingIgId)
        .eq("is_active", true)
        .limit(1);

      const modAcc = (modAccounts || [])[0] as Record<string, unknown> | undefined;
      const kws = ((modAcc?.auto_hide_keywords as string[]) || []).filter((k) => k && k.trim());

      if (modAcc && kws.length > 0) {
        const commentLower = commentText.toLowerCase();
        const hitKeyword = kws.find((k) => commentLower.includes(k.trim().toLowerCase()));

        if (hitKeyword) {
          const hideResult = await hideComment(
            commentId,
            (modAcc.page_access_token as string) || (modAcc.access_token as string) || ""
          );
          console.log(
            `[Meta Webhook] 🚫 Auto-moderation hid comment ${commentId} from @${commenterUsername} (matched "${hitKeyword}") ${hideResult.success ? "✅" : "❌ " + hideResult.error}`
          );

          // Audit trail for the account owner
          void Promise.resolve(
            supabase.from("activity_log").insert({
              user_id: modAcc.user_id,
              action: "moderation.comment_hidden",
              metadata: {
                commenter: commenterUsername,
                keyword: hitKeyword,
                comment_text: commentText.slice(0, 120),
                api_ok: hideResult.success,
              },
            })
          ).catch(() => {});

          return; // Hidden - never feed spam into automations
        }
      }
    } catch (modErr) {
      // Moderation must never break the main flow
      console.error("[Meta Webhook] Moderation error:", modErr);
    }
  }

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
    // Time budget: skip starting new sends when the function is nearly out
    // of wall clock — Meta retries the remaining events cleanly.
    if (timeBudgetLeft && timeBudgetLeft() < 8_000) {
      console.log("[Meta Webhook] Time budget nearly exhausted — deferring remaining automations to Meta retry");
      break;
    }
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
        // API couldn't verify (no consent / first-time commenter)
        // Meta's is_user_follow_business requires the user to have DM'd the 
        // business before (consent). First-time commenters ALWAYS return null,
        // even if they follow the account. So we proceed with the DM — don't block.
        console.log(
          `[Meta Webhook] Could not verify follower status for @${commenterUsername} — proceeding anyway (consent not yet established)`
        );
        // Fall through to send the DM
      }

      // followerCheck.isFollower === true OR null (unverifiable) → proceed with DM
      if (followerCheck.isFollower === true) {
        console.log(`[Meta Webhook] @${commenterUsername} follows ✅ — proceeding with DM`);
      }
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

    // Check for active A/B test variant
    const abVariant = !hasDrip ? await pickABVariant(automation.id, supabase) : null;

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
    } else if (abVariant) {
      // ── A/B TEST VARIANT ACTIVE: Send selected variant template ──
      console.log(
        `[Meta Webhook] A/B test active → sending variant "${abVariant.variant_name}" to @${commenterUsername}`
      );
      if (abVariant.template_type === "button" && abVariant.template_title) {
        const buttons = (abVariant.template_buttons as TemplateButton[]) || [];
        const title = (abVariant.template_title || "")
          .replace(/\{name\}/gi, `@${commenterUsername}`)
          .replace(/\{keyword\}/gi, commentText);
        const subtitle = (abVariant.template_subtitle || "")
          .replace(/\{name\}/gi, `@${commenterUsername}`)
          .replace(/\{keyword\}/gi, commentText);

        sendResult = await sendGenericTemplate(igUserId, accessToken, commentId, {
          title,
          subtitle: subtitle || undefined,
          image_url: abVariant.template_image_url || undefined,
          buttons,
        });
      } else {
        const dmText = (abVariant.dm_template || "")
          .replace(/\{name\}/gi, `@${commenterUsername}`)
          .replace(/\{keyword\}/gi, commentText);

        sendResult = await sendPrivateReply(igUserId, accessToken, commentId, dmText);
      }
    } else if (
      templateType === "stack" &&
      Array.isArray(automation.template_blocks) &&
      (automation.template_blocks as MessageBlock[]).length > 0
    ) {
      // ── MESSAGE STACK, PHASE 1 (comment trigger) ──
      // Meta only allows text/button templates as a comment private reply.
      // Users rarely type a reply, so phase 1 is ALWAYS a one-tap button:
      //   • No follow gate → card with "Send it to me 📩" postback button
      //   • Follow gate ON → "Yes, I follow ✅" + "Not yet — follow first"
      //     (opens profile). Tapping Yes re-verifies server-side.
      // The tap arrives as a messaging_postback → STACK_DELIVER flow plays
      // the remaining blocks. A typed reply also works (stack phase 2).
      const blocks = automation.template_blocks as MessageBlock[];
      const hasFollowGate = automation.require_follow === true;
      const stackDeliverPayload = `STACK_DELIVER:${automation.id}`;
      const igUsernameOwn = (igAccount as Record<string, string>).ig_username || "";
      const first = blocks[0];
      let preSentCount = 0;

      // Phase-1 caption: the first text block (or button card title) so the
      // message reads like the content the user composed.
      let phase1Caption = "";
      let captionConsumed = false;
      if (first.type === "text" && (first.text || "").trim()) {
        phase1Caption = first.text!.replace(/\{name\}/gi, `@${commenterUsername}`).replace(/\{keyword\}/gi, commentText);
        captionConsumed = true;
      } else if (first.type === "button_card" && (first.text || "").trim()) {
        phase1Caption = first.text!.replace(/\{name\}/gi, `@${commenterUsername}`);
        captionConsumed = true;
      } else if ((automation.dm_template as string || "").trim()) {
        phase1Caption = (automation.dm_template as string).replace(/\{name\}/gi, `@${commenterUsername}`);
      } else {
        phase1Caption = `Hey @${commenterUsername}! 👋 Thanks for commenting!`;
      }
      phase1Caption = phase1Caption.slice(0, 80); // template title limit

      const deliverButtons: TemplateButton[] = hasFollowGate
        ? [
            { type: "postback", title: "Yes, I follow ✅", payload: stackDeliverPayload },
            { type: "web_url", title: "Not yet — follow", url: `https://instagram.com/${igUsernameOwn}` },
          ]
        : [
            { type: "postback", title: "Send it to me 📩", payload: stackDeliverPayload },
          ];

      sendResult = await sendGenericTemplate(igUserId, accessToken, commentId, {
        title: phase1Caption,
        subtitle: hasFollowGate ? "Tap Yes and your content is on its way" : "Tap the button below to receive it instantly",
        image_url: first.type === "button_card" ? first.image_url || undefined : undefined,
        buttons: deliverButtons,
      });
      // If the first block's text became the card title in full (fits the
      // 80-char limit), don't repeat it on delivery — the remaining blocks
      // start after it. Longer texts play in full on tap instead.
      preSentCount =
        captionConsumed && phase1Caption.length <= 80 && blocks.length > 1
          ? 1
          : 0;

      // Enroll for delivery on tap / reply
      if (sendResult.success) {
        void (async () => {
          try {
            await supabase.from("stack_pending").insert({
              user_id: userId,
              automation_id: automation.id,
              instagram_account_id: (automation as Record<string, unknown>).instagram_account_id,
              recipient_ig_id: commenterId,
              recipient_username: commenterUsername,
              pre_sent_count: preSentCount,
              status: "waiting",
            });
            console.log(
              `[Meta Webhook] 📦 Stack armed for @${commenterUsername} — ${blocks.length} block(s) on tap/reply${hasFollowGate ? " (follow gate)" : ""}`
            );
          } catch (err) {
            console.error("[Meta Webhook] stack_pending insert error:", err);
          }
        })();
      }

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
      : templateType === "stack"
      ? `[STACK PHASE 1] button card armed (${Array.isArray(automation.template_blocks) ? (automation.template_blocks as unknown[]).length : 0} blocks pending)`
      : abVariant
      ? `[VARIANT: ${abVariant.variant_name}] ${abVariant.template_type === "button" ? abVariant.template_title : abVariant.dm_template}`
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


    // Log the DM — mark rate-limited DMs for later retry
    const dmStatus = sendResult.success
      ? "sent"
      : (sendResult as Record<string, unknown>).rateLimited
        ? "rate_limited"
        : "failed";

    await supabase.from("dm_logs").insert({
      user_id: userId,
      automation_id: automation.id,
      instagram_account_id: (automation as Record<string, unknown>)
        .instagram_account_id,
      recipient_ig_id: commenterId,
      recipient_username: commenterUsername,
      message_text: typeof logMessageText === "string" ? logMessageText : String(logMessageText),
      comment_text: commentText,
      status: dmStatus,
      // Queue rate-limited DMs for retry in 1 hour
      ...(dmStatus === "rate_limited" ? {
        retry_after: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      } : {}),
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

      // AUTO-LIKE the triggering comment (all template types). No extra Meta
      // setup needed — uses the already-approved instagram_manage_comments.
      if (automation.auto_react === true && commentId) {
        likeComment(commentId, accessToken).then((r) => {
          console.log(`[Meta Webhook] ${r.success ? "❤️ Auto-liked" : "⚠️ Auto-like failed"} comment ${commentId}${r.error ? ": " + r.error : ""}`);
        }).catch(() => {});
      }

      // Check DM milestones (first DM, 100 DMs) — fire-and-forget
      void checkDmMilestones(
        supabase,
        userId,
        commenterUsername,
        (automation.name as string) || "Automation"
      ).catch(() => {});
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
/**
 * Deliver a pending Message Stack (phase 2) - shared by the typed-reply
 * path (handleIncomingDM) and the button-tap path (STACK_DELIVER postback).
 * Plays the remaining blocks, logs, marks delivered exactly once.
 * Returns "delivered" | "empty" | "none" (none = no pending stack).
 */
async function deliverPendingStack(params: {
  supabase: ReturnType<typeof getSupabase>;
  userId: string;
  igAccountId: string;
  recipientId: string; // our IG account id (sender of the DM)
  accessToken: string;
  senderId: string; // the lead
  triggerText: string; // what they said/tapped (for logs)
  messageMid?: string; // mid for auto-react
}): Promise<"delivered" | "empty" | "none"> {
  const { supabase, userId, igAccountId, recipientId, accessToken, senderId, triggerText, messageMid } = params;

  const { data: pendingStack } = await supabase
    .from("stack_pending")
    .select("id, automation_id, pre_sent_count, recipient_username")
    .eq("user_id", userId)
    .eq("recipient_ig_id", senderId)
    .eq("status", "waiting")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stackRow = pendingStack as Record<string, unknown> | null;
  if (!stackRow) return "none";

  const { data: stackAutomation } = await supabase
    .from("automations")
    .select("*")
    .eq("id", stackRow.automation_id as string)
    .single();
  const stackAuto = stackAutomation as Record<string, unknown> | null;

  const allBlocks = (stackAuto?.template_blocks as MessageBlock[] | null) || [];
  const skipCount = (stackRow.pre_sent_count as number) || 0;
  const remaining = allBlocks.slice(skipCount);

  if (remaining.length === 0) {
    // Nothing left - clean up and let other flows handle the message
    await supabase
      .from("stack_pending")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", stackRow.id as string);
    return "empty";
  }

  const stackResult = await sendMessageStack({
    igUserId: recipientId,
    accessToken,
    recipientIgScopedId: senderId,
    blocks: remaining,
    templateVars: {
      name: (stackRow.recipient_username as string) || senderId,
      keyword: stackAuto?.keyword as string,
    },
  });

  await supabase.from("dm_logs").insert({
    user_id: userId,
    automation_id: stackRow.automation_id as string,
    instagram_account_id: igAccountId,
    recipient_ig_id: senderId,
    recipient_username: (stackRow.recipient_username as string) || senderId,
    message_text: `[STACK DELIVERED] ${stackResult.sentBlocks}/${stackResult.totalBlocks} blocks${stackResult.errors.length ? " - errors: " + stackResult.errors.join("; ").slice(0, 150) : ""}`,
    comment_text: triggerText,
    status: stackResult.success ? "sent" : "failed",
  });

  // Mark delivered BEFORE anything else - duplicate taps/replays can't
  // double-send a half-played stack.
  await supabase
    .from("stack_pending")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", stackRow.id as string);

  // Lead tapped the button / replied -> they're interested
  void markLeadEngaged(supabase, userId, senderId);

  console.log(
    `[Meta Webhook] Stack delivered -> @${(stackRow.recipient_username as string) || senderId}: ${stackResult.sentBlocks}/${stackResult.totalBlocks} blocks ${stackResult.success ? "OK" : "FAILED"}`
  );

  if (stackAuto?.auto_react === true && messageMid) {
    reactToMessage(recipientId, accessToken, senderId, messageMid, "❤️").catch(() => {});
  }

  return "delivered";
}

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

  // MESSAGE STACK, PHASE 2: this lead just replied after our phase-1
  // button card. Their action opened the 24h window -> play the stack.
  {
    const delivered = await deliverPendingStack({
      supabase,
      userId,
      igAccountId: igAccount.id,
      recipientId,
      accessToken,
      senderId,
      triggerText: messageText,
      messageMid: ((messagingEvent.message as Record<string, unknown>)?.mid as string) || "",
    });
    if (delivered === "delivered") {
      return; // Stack delivered - this reply is fully handled
    }
  }

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

      const richResult = await maybeSendRichTemplate(
        automation, autoTemplateType, recipientId, accessToken, senderId,
        (enrollment.recipient_username as string) || "friend"
      );

      if (richResult) {
        templateSendResult = richResult;
      } else if (autoTemplateType === "button" && automation.template_title) {
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

        // AUTO-REACT: heart the lead's message that opened the window
        if ((automation as Record<string, unknown>).auto_react === true) {
          const reactMid = ((messagingEvent.message as Record<string, unknown>)?.mid as string) || "";
          if (reactMid) {
            reactToMessage(recipientId, accessToken, senderId, reactMid, "❤️").catch(() => {});
          }
        }
      }
    }

    return; // Handled — skip AI agent
  }

  // ── Strategy 1: AI Agent (persona + FAQs + conversation memory) ──
  // Rate-limit AI calls to prevent NIM credit burn
  const aiLimiter = getAiLimiter();
  const aiRateResult = await checkRateLimit(aiLimiter, userId);
  if (!aiRateResult.allowed) {
    console.log(`[AI Agent] Rate limited for user ${userId} — skipping AI reply`);
  } else try {
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

  // ── STACK_DELIVER: the lead tapped the phase-1 button ("Send it to me" /
  // "Yes, I follow ✅"). Their tap opens the 24h window. If follow gate is
  // on, re-verify server-side before playing the stack.
  if (payload.startsWith("stack_deliver:")) {
    const automationId = payload.split(":")[1] || "";
    if (!senderId || !recipientId || !automationId) return;

    const { data: igAccount } = await supabase
      .from("instagram_accounts")
      .select("user_id, id, ig_username, access_token, page_access_token")
      .eq("ig_user_id", recipientId)
      .eq("is_active", true)
      .single();
    if (!igAccount) return;

    const userId = igAccount.user_id as string;
    const accessToken = (igAccount.page_access_token as string) || (igAccount.access_token as string);

    const { data: stackAutomation } = await supabase
      .from("automations")
      .select("*")
      .eq("id", automationId)
      .eq("user_id", userId)
      .single();
    const stackAuto = stackAutomation as Record<string, unknown> | null;
    if (!stackAuto) return;

    // Follow gate: verify on tap (phase-1 verification can be stale)
    if (stackAuto.require_follow === true) {
      const followerCheck = await checkIfFollower(senderId, accessToken);
      if (followerCheck.isFollower === false) {
        const igUsernameOwn = (igAccount as Record<string, string>).ig_username || "";
        await sendGenericTemplateDM(recipientId, accessToken, senderId, {
          title: "Almost there! One quick step",
          subtitle: "Follow the account, then tap Yes again",
          buttons: [
            { type: "web_url", title: "Follow now", url: `https://instagram.com/${igUsernameOwn}` },
            { type: "postback", title: "Yes, I follow ✅", payload: payload.toUpperCase().replace("STACK_DELIVER", "STACK_DELIVER") },
          ],
        }).catch(() => {});
        console.log(`[Meta Webhook] Follow gate blocked stack delivery for ${senderId} — follow prompt sent`);
        return;
      }
    }

    const delivered = await deliverPendingStack({
      supabase,
      userId,
      igAccountId: igAccount.id,
      recipientId,
      accessToken,
      senderId,
      triggerText: "[POSTBACK] STACK_DELIVER tap",
      messageMid: undefined,
    });

    if (delivered === "none") {
      // No pending stack (already delivered / stale tap) — be polite anyway
      await sendInstagramDM(recipientId, accessToken, senderId,
        "You're all set! ✅ Your content was already sent above — scroll up to grab it."
      ).catch(() => {});
    }
    return; // Stack tap fully handled
  }

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

    const richResult = await maybeSendRichTemplate(
      automation, autoTemplateType, recipientId, accessToken, senderId,
      (enrollment.recipient_username as string) || "friend"
    );

    if (richResult) {
      templateSendResult = richResult;
    } else if (autoTemplateType === "button" && automation.template_title) {
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

      // AUTO-REACT: heart the lead's message that opened the window
      if ((automation as Record<string, unknown>).auto_react === true) {
        const reactMid = ((event.message as Record<string, unknown>)?.mid as string) || "";
        if (reactMid) {
          reactToMessage(recipientId, accessToken, senderId, reactMid, "❤️").catch(() => {});
        }
      }
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
    const res = await fetch(`https://graph.instagram.com/v26.0/${recipientId}/messages`, {
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

  // Button tap = engagement signal
  if (sendResult.success) {
    void markLeadEngaged(supabase, userId, senderId);
  }

  // Tag the lead if lead_tag is set — appends to the lead's tags array
  // (shown as colored labels on the Leads page for segmentation)
  if (flow.lead_tag && sendResult.success) {
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, tags")
      .eq("user_id", userId)
      .eq("ig_user_id", senderId)
      .limit(1)
      .maybeSingle();

    const tag = (flow.lead_tag as string).trim();
    if (existingLead) {
      const currentTags = Array.isArray((existingLead as Record<string, unknown>).tags)
        ? ((existingLead as Record<string, unknown>).tags as string[])
        : [];
      if (!currentTags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
        await supabase
          .from("leads")
          .update({ tags: [...currentTags, tag] })
          .eq("id", (existingLead as Record<string, unknown>).id as string);
      }
    } else {
      // Lead row may not exist yet (button tap without prior comment capture)
      await supabase.from("leads").upsert({
        user_id: userId,
        ig_user_id: senderId,
        ig_username: senderId,
        source: "postback",
        tags: [tag],
        notes: `Tagged via button: ${tag}`,
      }, { onConflict: "user_id,ig_user_id" });
    }

    console.log(`[Meta Webhook] Tagged lead ${senderId} with "${tag}"`);
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

  // v26: which link sticker the user tapped (Dec 2025) — lets automations
  // branch on WHICH story link drove the reply.
  const messageObj = messagingEvent.message as Record<string, unknown> | undefined;
  const storyObj = ((messageObj?.reply_to as Record<string, unknown>)?.story ?? {}) as Record<string, unknown>;
  const linkStickerUrl = (storyObj.link_sticker_url as string) || "";

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

  // ══════════════════════════════════════════════════════════════════
  // STORY-LINK BRANCHING (v26 link_sticker_url): automations can define
  // branches per story link. [{ match, blocks }] - if the tapped sticker
  // URL (or the reply text) contains `match`, play THAT branch's message
  // stack instead of the default template. First matching branch wins.
  // ══════════════════════════════════════════════════════════════════
  interface StoryBranch {
    match?: string;
    blocks?: MessageBlock[];
  }

  let matchedAutomation: Record<string, unknown> = automations[0];
  let matchedBranch: StoryBranch | null = null;

  for (const auto of automations as Record<string, unknown>[]) {
    const branches = (auto.story_link_branches as StoryBranch[]) || [];
    if (!Array.isArray(branches) || branches.length === 0) continue;
    const haystack = (linkStickerUrl + " " + (messageText || "")).toLowerCase();
    const branch = branches.find(
      (b) => b && typeof b.match === "string" && b.match.trim() !== "" && haystack.includes(b.match.toLowerCase())
    );
    if (branch && Array.isArray(branch.blocks) && branch.blocks.length > 0) {
      matchedAutomation = auto;
      matchedBranch = branch;
      console.log(`[Meta Webhook] Story branch "${branch.match}" matched for automation ${auto.name}`);
      break;
    }
  }

  let sendResult: { success: boolean; messageId?: string; error?: string };
  let logText: string;

  if (matchedBranch) {
    // Play the branch's stack (window is open - they just messaged us)
    const stackResult = await sendMessageStack({
      igUserId: recipientId,
      accessToken,
      recipientIgScopedId: senderId,
      blocks: (matchedBranch.blocks as MessageBlock[]) || [],
      templateVars: { name: senderId, keyword: messageText },
    });
    sendResult = {
      success: stackResult.success,
      messageId: stackResult.messageIds[0],
      error: stackResult.errors.length > 0 ? stackResult.errors.join("; ") : undefined,
    };
    logText = `[STORY BRANCH: ${matchedBranch.match}]`;
  } else {
    const richResult = await maybeSendRichTemplate(
      matchedAutomation, (matchedAutomation.template_type as string) || "text",
      recipientId, accessToken, senderId, senderId
    );
    if (richResult) {
      sendResult = richResult;
    } else {
      const dmTemplate = (matchedAutomation.dm_template as string) || "Thanks for replying to my story! 💜";
      const dmText = dmTemplate
        .replace(/\{name\}/gi, senderId)
        .replace(/\{story_reply\}/gi, messageText || "");
      sendResult = await sendInstagramDM(recipientId, accessToken, senderId, dmText);
    }
    logText = "";
  }

  // AUTO-REACT (v26 sender_action react): option to drop a ❤️ on the
  // lead's story-reply message the moment the automation answers.
  if (sendResult.success && matchedAutomation.auto_react === true) {
    const reactMid = ((messagingEvent.message as Record<string, unknown>)?.mid as string) || "";
    if (reactMid) {
      reactToMessage(recipientId, accessToken, senderId, reactMid, "❤️").catch(() => {});
    }
  }

  // Log the DM
  await supabase.from("dm_logs").insert({
    user_id: userId,
    automation_id: matchedAutomation.id,
    instagram_account_id: igAccount.id,
    recipient_ig_id: senderId,
    recipient_username: senderId,
    message_text: (logText + `[STORY_REPLY] ` + (messageText?.slice(0, 80) || "")).slice(0, 200),
    comment_text: `[STORY_REPLY] ${messageText?.slice(0, 80) || ""}${linkStickerUrl ? ` [LINK:${linkStickerUrl.slice(0, 180)}]` : ""}`,
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

  // Replying to a story = engaged
  void markLeadEngaged(supabase, userId, senderId);

  // Log activity
  void Promise.resolve(
    supabase.from("activity_log").insert({
      user_id: userId,
      action: sendResult.success ? "dm.story_reply_sent" : "dm.story_reply_failed",
      metadata: {
        sender: senderId,
        automation: matchedAutomation.name,
        trigger: "story_reply",
        error: sendResult.error || null,
      },
    })
  ).catch(() => {});

  console.log(
    `[Meta Webhook] Story reply auto-DM ${sendResult.success ? "sent ✅" : "failed ❌"} to ${senderId}`
  );
}

/**
 * Handle message_edit events (v26, added Sept 2025): a user edited a message
 * they sent. Known Meta bug: some apps receive message_edit with num_edit:0
 * INSTEAD of the original message event — never treat that as an edit or as
 * a new message. For real edits (num_edit >= 1) we update the stored inbound
 * text where we can match it, and never re-trigger automations on edited
 * content (Meta guidance: don't act on already-executed flows).
 */
/**
 * Handle a quick-reply tap (v26). Quick replies are message events whose
 * message carries a quick_reply payload. The killer feature: content_type
 * user_email / user_phone_number quick replies make Instagram ASK the user
 * for their email/phone via the native keyboard - the captured value arrives
 * as message.text. We store it on the lead automatically.
 */
async function handleQuickReply(messagingEvent: Record<string, unknown>) {
  const supabase = getSupabase();

  const senderId = (messagingEvent.sender as Record<string, string>)?.id || "";
  const recipientId = (messagingEvent.recipient as Record<string, string>)?.id || "";
  const msg = messagingEvent.message as Record<string, unknown>;
  const quickReply = msg.quick_reply as Record<string, string> | undefined;
  if (!senderId || !recipientId || !quickReply?.payload) return;

  const capturedText = (msg.text as string) || "";
  const contentType = quickReply.content_type || "text";

  // Resolve the IG account (recipient of the tap = our account)
  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("user_id, id")
    .eq("ig_user_id", recipientId)
    .eq("is_active", true)
    .single();
  if (!igAccount) return;
  const userId = igAccount.user_id as string;

  // Match postback_flows by payload - quick replies use the same flow
  // responses as buttons, so a flow configured for a button payload also
  // answers its quick-reply twin.
  const { data: flows } = await supabase
    .from("postback_flows")
    .select("*, automations!inner(id, name, status, instagram_account_id)")
    .eq("payload", quickReply.payload)
    .eq("is_active", true)
    .eq("automations.status", "active")
    .eq("automations.instagram_account_id", igAccount.id);

  const accessToken = await getAccountToken(recipientId);
  if (!accessToken) return;

  // Structured lead capture: email / phone quick replies write straight
  // onto the lead row.
  if (contentType === "user_email" || contentType === "user_phone_number") {
    const isEmail = contentType === "user_email";
    const value = isEmail ? capturedText.trim().toLowerCase() : capturedText.trim();

    await supabase.from("leads").upsert(
      {
        user_id: userId,
        ig_user_id: senderId,
        ig_username: senderId,
        [isEmail ? "email" : "phone"]: value,
        source: "quick_reply",
        notes: "Captured via " + (isEmail ? "email" : "phone") + " quick reply",
      },
      { onConflict: "user_id,ig_user_id" }
    );

    console.log("[Meta Webhook] Quick-reply captured " + (isEmail ? "email" : "phone") + " for " + senderId);

    // Sharing contact info = strong interest signal
    void markLeadEngaged(supabase, userId, senderId);

    // Notify the owner if they want contact-capture pings
    const { data: cprof } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", userId)
      .single();
    const cprefs = ((cprof as Record<string, unknown> | null)?.notification_preferences as Record<string, boolean>) ?? {};
    if (cprefs.lead_contact_captured === false) return;

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "new_lead",
      title: isEmail ? "📧 Email captured via quick reply" : "📱 Phone captured via quick reply",
      body: "A lead shared their " + (isEmail ? "email" : "phone number") + " via your DM quick reply.",
      metadata: { lead_ig_id: senderId, capture_type: contentType },
    });

    // Send a confirmation so the user knows it worked (window is open)
    const confirmText = isEmail
      ? "Got it - thanks! 📩 We'll reach out at this email."
      : "Got it - thanks! 📲 We'll reach out on this number.";
    await sendInstagramDM(recipientId, accessToken, senderId, confirmText).catch(() => {});
  }

  // Flow response (if configured) - reuse the postback flow machinery
  if (flows && flows.length > 0) {
    const flow = flows[0] as Record<string, unknown>;
    const responseType = (flow.response_type as string) || "text";
    const responseText = ((flow.response_text as string) || "")
      .replace(/\{name\}/gi, senderId);

    if (responseType === "text" && responseText) {
      await sendInstagramDM(recipientId, accessToken, senderId, responseText).catch(() => {});
    } else if (responseType === "button" && flow.response_template_title) {
      const buttons = (flow.response_template_buttons as { type: string; title: string; url?: string }[]) || [];
      await fetch("https://graph.instagram.com/v26.0/" + recipientId + "/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + accessToken,
        },
        body: JSON.stringify({
          recipient: { id: senderId },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                elements: [{
                  title: (flow.response_template_title as string).slice(0, 80),
                  ...(flow.response_template_subtitle ? { subtitle: flow.response_template_subtitle as string } : {}),
                  ...(flow.response_template_image_url ? { image_url: flow.response_template_image_url as string } : {}),
                  ...(buttons.length > 0 ? { buttons: buttons.map((b) => ({
                    type: "web_url" as const,
                    title: b.title.slice(0, 20),
                    url: b.url,
                  })) } : {}),
                }],
              },
            },
          },
        }),
      }).catch(() => {});
    }
  }
}

/**
 * Handle read / messaging_seen events: the lead read our DMs. Stamps
 * seen_at on the outbound dm_logs rows of that conversation so the
 * Messages UI can show a read receipt.
 */
async function handleMessagingRead(messagingEvent: Record<string, unknown>) {
  const supabase = getSupabase();

  const senderId = (messagingEvent.sender as Record<string, string>)?.id || "";
  const recipientId = (messagingEvent.recipient as Record<string, string>)?.id || "";
  if (!senderId || !recipientId) return;

  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("user_id, id")
    .eq("ig_user_id", recipientId)
    .eq("is_active", true)
    .single();
  if (!igAccount) return;

  const seenAt = new Date().toISOString();
  // "sent" rows for THIS lead that haven't been marked seen yet
  await supabase
    .from("dm_logs")
    .update({ seen_at: seenAt })
    .eq("user_id", igAccount.user_id)
    .eq("recipient_ig_id", senderId)
    .eq("status", "sent")
    .is("seen_at", null)
    .lt("created_at", new Date(Date.now() - 2000).toISOString());

  console.log("[Meta Webhook] Read receipt: " + senderId + " saw our DMs");
}

/**
 * Handle reaction events (v26): a lead reacted with an emoji to one of our
 * messages, or removed a reaction. Logged for analytics.
 */
async function handleMessageReaction(messagingEvent: Record<string, unknown>) {
  const supabase = getSupabase();

  const senderId = (messagingEvent.sender as Record<string, string>)?.id || "";
  const recipientId = (messagingEvent.recipient as Record<string, string>)?.id || "";
  const reaction = messagingEvent.reaction as Record<string, unknown> | undefined;
  if (!senderId || !recipientId || !reaction) return;

  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("user_id, id")
    .eq("ig_user_id", recipientId)
    .eq("is_active", true)
    .single();
  if (!igAccount) return;

  const emoji = (reaction.emoji as string) || "";
  const removed = reaction.reaction === false || reaction.action === "unreact";
  if (!removed) {
    void markLeadEngaged(supabase, igAccount.user_id as string, senderId);
  }

  void Promise.resolve(
    supabase.from("activity_log").insert({
      user_id: igAccount.user_id,
      action: removed ? "dm.reaction_removed" : "dm.reaction",
      metadata: {
        lead_ig_id: senderId,
        emoji: emoji,
        message_mid: reaction.mid || reaction.target_mid || null,
      },
    })
  ).catch(() => {});

  console.log("[Meta Webhook] " + (removed ? "Unreact" : "Reaction") + " " + emoji + " from " + senderId);
}

/**
 * Mark a lead as engaged (interested). Idempotent, never downgrades —
 * called on button taps, stack delivery, replies, reactions, and
 * email/phone capture.
 */
async function markLeadEngaged(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  leadIgId: string
): Promise<void> {
  try {
    const { data: lead } = await supabase
      .from("leads")
      .select("id, engagement")
      .eq("user_id", userId)
      .eq("ig_user_id", leadIgId)
      .limit(1)
      .maybeSingle();
    const row = lead as Record<string, unknown> | null;
    if (!row) return;
    if (row.engagement === "interested" || row.engagement === "converted") return;
    await supabase.from("leads").update({ engagement: "interested" }).eq("id", row.id as string);
  } catch {
    // engagement tracking must never break the main flow
  }
}

/**
 * messaging_referral (v26): the lead clicked an ad / story link that opened
 * a DM. The referral object carries source/type + the ad id. We stamp the
 * lead's source as "ad" so growth channels are attributable.
 */
async function handleMessagingReferral(messagingEvent: Record<string, unknown>) {
  const supabase = getSupabase();

  const senderId = (messagingEvent.sender as Record<string, string>)?.id || "";
  const recipientId = (messagingEvent.recipient as Record<string, string>)?.id || "";
  const referral = messagingEvent.referral as Record<string, unknown> | undefined;
  if (!senderId || !recipientId || !referral) return;

  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("user_id, id")
    .eq("ig_user_id", recipientId)
    .eq("is_active", true)
    .single();
  if (!igAccount) return;
  const userId = igAccount.user_id as string;

  const source = (referral.source as string) || "unspecified";
  const adId = (referral.ad_id as string) || "";

  await supabase.from("leads").upsert(
    {
      user_id: userId,
      ig_user_id: senderId,
      ig_username: senderId,
      source: "ad",
      notes: "Arrived via " + source + (adId ? " (ad " + adId.slice(0, 20) + ")" : ""),
    },
    { onConflict: "user_id,ig_user_id" }
  );

  // Clicking an ad to DM you = strong interest
  void markLeadEngaged(supabase, userId, senderId);

  console.log("[Meta Webhook] Referral lead " + senderId + " via " + source);
}

/**
 * Resolve a fresh access token for one of our IG accounts by its ig_user_id.
 */
async function getAccountToken(igUserId: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("instagram_accounts")
    .select("page_access_token, access_token")
    .eq("ig_user_id", igUserId)
    .eq("is_active", true)
    .limit(1);
  const acc = (data || [])[0] as Record<string, string> | undefined;
  return acc ? (acc.page_access_token || acc.access_token) : null;
}

const processedEdits = new Map<string, number>();
async function handleMessageEdit(messagingEvent: Record<string, unknown>) {
  const edit = messagingEvent.message_edit as Record<string, unknown> | undefined;
  if (!edit) return;

  const mid = (edit.mid as string) || "";
  const numEdit = (edit.num_edit as number) ?? 0;
  const editedText = (edit.text as string) || "";

  if (!mid) return;

  // Dedupe by mid + num_edit (Meta retries webhooks for up to 36h)
  const dedupeKey = `${mid}:${numEdit}`;
  if (processedEdits.has(dedupeKey)) return;
  processedEdits.set(dedupeKey, Date.now());
  if (processedEdits.size > 500) {
    const oldest = processedEdits.keys().next().value;
    if (oldest) processedEdits.delete(oldest);
  }

  if (numEdit < 1) {
    console.log(`[Meta Webhook] message_edit num_edit=0 for ${mid} — known Meta bug, ignoring`);
    return;
  }

  console.log(`[Meta Webhook] message #${mid} edited (edit #${numEdit})`);
  if (editedText) {
    console.log(`[Meta Webhook] New text: "${editedText.slice(0, 80)}"`);
    // Audit trail: record the edit on any dm_log that captured the original
    // inbound message. Matching is best-effort by recipient + time proximity.
    try {
      const supabase = getSupabase();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("dm_logs")
        .update({ comment_text: `[EDITED#${numEdit}] ${editedText.slice(0, 180)}` })
        .gte("created_at", since)
        .eq("recipient_ig_id" as string, (messagingEvent.sender as Record<string, string>)?.id || "")
        .eq("trigger_type" as string, "dm");
    } catch {
      // Non-critical — edits are audit-only
    }
  }
}

/**
 * Rich template dispatcher (Graph API v26).
 *
 * Priority: if the automation has a composed Message Stack (template_blocks),
 * play the whole stack sequentially — text + album + PDF + buttons + quick
 * replies + carousel + media share in any combination, with fail-isolation
 * and pacing per block. Legacy single-format automations (multi_image / pdf
 * template_type from before stacks existed) fall back to the direct send.
 *
 * Returns null when the automation isn't a rich type (caller falls through
 * to text/button handling). Only used where a 24h window is OPEN (incoming
 * DMs, postbacks, drip) — comment private replies stay text/button.
 */
async function maybeSendRichTemplate(
  automation: Record<string, unknown>,
  templateType: string,
  igUserId: string,
  accessToken: string,
  recipientIgId: string,
  recipientName: string
): Promise<{ success: boolean; messageId?: string; error?: string } | null> {
  const rawBlocks = (automation.template_blocks as MessageBlock[] | null) || [];
  if (Array.isArray(rawBlocks) && rawBlocks.length > 0) {
    const stackResult = await sendMessageStack({
      igUserId,
      accessToken,
      recipientIgScopedId: recipientIgId,
      blocks: rawBlocks,
      templateVars: { name: recipientName, keyword: automation.keyword as string },
    });
    return {
      success: stackResult.success,
      messageId: stackResult.messageIds[0],
      error: stackResult.errors.length > 0 ? stackResult.errors.join("; ") : undefined,
    };
  }

  if (templateType === "multi_image") {
    const urls = (automation.template_image_urls as string[]) || [];
    if (urls.length === 0) return null;
    const caption = ((automation.dm_template as string) || "").replace(/\{name\}/gi, `@${recipientName}`);
    return await sendMultiImageDM(igUserId, accessToken, recipientIgId, urls, caption);
  }
  if (templateType === "pdf") {
    const fileUrl = (automation.template_file_url as string) || "";
    if (!fileUrl) return null;
    return await sendFileDM(igUserId, accessToken, recipientIgId, fileUrl);
  }
  return null;
}
