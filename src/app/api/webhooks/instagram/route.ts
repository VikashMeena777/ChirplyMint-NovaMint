import { NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "chirplymint_verify_2026";

/**
 * GET — Meta Webhook Verification
 * Meta sends a GET request with hub.mode, hub.verify_token, hub.challenge
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
 * This receives webhook events from Meta when users comment/DM
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Process each entry from Meta
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

    // Always respond 200 to Meta to prevent retries
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Meta Webhook] Error processing event:", error);
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ status: "ok" });
  }
}

async function handleComment(commentData: Record<string, unknown>) {
  // TODO: Wire to automation engine
  // 1. Match comment text against automation keywords
  // 2. Find the matching automation
  // 3. Send DM to the commenter using the automation template
  // 4. Log the DM in dm_logs table
  // 5. Create/update lead record
  console.log("[Meta Webhook] Comment received:", JSON.stringify(commentData));
}

async function handleIncomingDM(messagingEvent: Record<string, unknown>) {
  // TODO: Wire to AI response engine  
  // 1. Check if sender has an active conversation
  // 2. If AI-enabled automation, generate response
  // 3. Send reply via Instagram Graph API
  // 4. Log response in dm_logs
  console.log("[Meta Webhook] DM received:", JSON.stringify(messagingEvent));
}
