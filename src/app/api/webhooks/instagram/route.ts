import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateDMReply } from "@/lib/ai/nvidia-nim";
import crypto from "crypto";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "chirplymint_verify_2026";
const APP_SECRET = process.env.META_APP_SECRET || "";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Verify Meta webhook signature (HMAC SHA-256)
 */
function verifySignature(payload: string, signature: string | null): boolean {
  if (!APP_SECRET) {
    console.warn("[Meta Webhook] META_APP_SECRET not set — skipping signature verification");
    return true; // Allow in dev, but log warning
  }
  if (!signature) return false;

  const expectedSignature =
    "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(payload).digest("hex");

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
 * Handle a comment on a post — match keywords → generate DM → log
 */
async function handleComment(commentData: Record<string, unknown>) {
  const supabase = getSupabase();

  const commentText = (commentData.text as string) || "";
  const commenterId = commentData.from?.toString() || "";
  const commenterUsername =
    (commentData as Record<string, Record<string, string>>).from?.username || "unknown";

  // Find automations that match this keyword
  const { data: automations } = await supabase
    .from("automations")
    .select("*, instagram_accounts!inner(user_id, ig_user_id)")
    .eq("status", "active")
    .not("keyword", "is", null);

  if (!automations || automations.length === 0) return;

  for (const automation of automations) {
    const keyword = (automation.keyword as string).toLowerCase();
    if (!commentText.toLowerCase().includes(keyword)) continue;

    const userId = (automation as Record<string, Record<string, string>>).instagram_accounts?.user_id;
    if (!userId) continue;

    // Generate AI-powered DM reply
    const dmText = await generateDMReply({
      automationName: automation.name as string,
      keyword: automation.keyword as string,
      dmTemplate: automation.dm_template as string,
      commenterUsername,
      commentText,
      aiEnabled: (automation.ai_enabled as boolean) ?? false,
    });

    // Log the DM (actual send would happen via Instagram Graph API)
    await supabase.from("dm_logs").insert({
      user_id: userId,
      automation_id: automation.id,
      recipient_ig_id: commenterId,
      recipient_username: commenterUsername,
      message_text: dmText,
      trigger_type: "comment",
      status: "pending", // Change to 'sent' once IG API send is implemented
    });

    // Create or update lead
    await supabase.from("leads").upsert(
      {
        user_id: userId,
        ig_username: commenterUsername,
        ig_user_id: commenterId,
        source: "comment",
        keyword_matched: keyword,
      },
      { onConflict: "user_id,ig_username" }
    );

    // Create new lead notification if user has it enabled
    const { data: profile } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", userId)
      .single();

    const prefs = (profile?.notification_preferences as Record<string, boolean>) ?? {};
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
      supabase
        .from("activity_log")
        .insert({
          user_id: userId,
          action: "dm.queued",
          metadata: {
            recipient: commenterUsername,
            automation: automation.name,
            trigger: "comment",
          },
        })
    ).catch(() => {});

    console.log(
      `[Meta Webhook] Matched keyword "${keyword}" from @${commenterUsername} → DM queued`
    );
  }
}

/**
 * Handle an incoming DM — generate AI response if automation is AI-enabled
 */
async function handleIncomingDM(messagingEvent: Record<string, unknown>) {
  const supabase = getSupabase();

  const senderId = (messagingEvent.sender as Record<string, string>)?.id || "";
  const messageText =
    (messagingEvent.message as Record<string, string>)?.text || "";

  if (!senderId || !messageText) return;

  // Find any active AI-enabled automation for the recipient account
  const recipientId =
    (messagingEvent.recipient as Record<string, string>)?.id || "";

  const { data: igAccount } = await supabase
    .from("instagram_accounts")
    .select("user_id, id")
    .eq("ig_user_id", recipientId)
    .eq("is_active", true)
    .single();

  if (!igAccount) return;

  const userId = igAccount.user_id as string;

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

  // Log the reply
  await supabase.from("dm_logs").insert({
    user_id: userId,
    automation_id: automation.id,
    recipient_ig_id: senderId,
    recipient_username: senderId,
    message_text: reply,
    trigger_type: "dm_reply",
    status: "pending",
  });

  // Log activity
  void Promise.resolve(
    supabase
      .from("activity_log")
      .insert({
        user_id: userId,
        action: "dm.ai_reply_queued",
        metadata: { sender: senderId, automation: automation.name },
      })
  ).catch(() => {});

  console.log(`[Meta Webhook] AI reply queued for DM from ${senderId}`);
}
