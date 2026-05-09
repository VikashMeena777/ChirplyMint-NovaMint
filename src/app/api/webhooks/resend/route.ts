import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Verify Svix webhook signature from Resend.
 * Uses HMAC-SHA256 with the webhook secret to verify payload authenticity.
 */
function verifySvixSignature(
  payload: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string
): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[Resend Webhook] RESEND_WEBHOOK_SECRET not configured — skipping verification");
    return false;
  }

  // Svix secret is base64-encoded with "whsec_" prefix
  const secretBytes = Buffer.from(
    secret.startsWith("whsec_") ? secret.slice(6) : secret,
    "base64"
  );

  // Signature is computed over: msgId.timestamp.body
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  // Svix sends multiple signatures separated by space, each prefixed with "v1,"
  const signatures = svixSignature.split(" ");
  for (const sig of signatures) {
    const sigValue = sig.startsWith("v1,") ? sig.slice(3) : sig;
    try {
      const expected = Buffer.from(expectedSignature, "base64");
      const received = Buffer.from(sigValue, "base64");
      if (expected.length === received.length && timingSafeEqual(expected, received)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

/**
 * Resend webhook handler for bounce/complaint processing.
 * Endpoint: POST /api/webhooks/resend
 */
export async function POST(request: Request) {
  try {
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: "Missing webhook headers" },
        { status: 400 }
      );
    }

    const rawBody = await request.text();

    // Verify timestamp is within 5 minutes to prevent replay attacks
    const timestampSec = parseInt(svixTimestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestampSec) > 300) {
      return NextResponse.json(
        { error: "Webhook timestamp too old" },
        { status: 400 }
      );
    }

    // Verify signature
    if (process.env.RESEND_WEBHOOK_SECRET) {
      const isValid = verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature);
      if (!isValid) {
        console.error("[Resend Webhook] Invalid signature");
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 403 }
        );
      }
    }

    const body = JSON.parse(rawBody);
    const eventType = body.type;

    const supabase = getAdminSupabase();

    switch (eventType) {
      case "email.bounced": {
        const recipientEmail = body.data?.to?.[0];
        if (recipientEmail) {
          console.warn(`[Resend Webhook] Bounce: ${recipientEmail}`);

          await supabase
            .from("leads")
            .update({ notes: "Email bounced" })
            .eq("email", recipientEmail);
        }
        break;
      }

      case "email.complained": {
        const recipientEmail = body.data?.to?.[0];
        if (recipientEmail) {
          console.warn(`[Resend Webhook] Complaint: ${recipientEmail}`);
        }
        break;
      }

      case "email.delivered": {
        // Silently log successful delivery
        break;
      }

      case "email.opened": {
        // Track open rate
        break;
      }

      case "email.clicked": {
        // Track click rate
        break;
      }

      default:
        console.log(`[Resend Webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[Resend Webhook] Error:", err);
    // Always return 200 to prevent Resend retry storms on persistent errors
    return NextResponse.json({ message: "Error processed" }, { status: 200 });
  }
}
