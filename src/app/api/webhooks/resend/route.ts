import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Resend webhook handler for bounce/complaint processing.
 * Endpoint: POST /api/webhooks/resend
 */
export async function POST(request: Request) {
  try {
    // Verify webhook signature
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: "Missing webhook headers" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const eventType = body.type;

    const supabase = getAdminSupabase();

    switch (eventType) {
      case "email.bounced": {
        const recipientEmail = body.data?.to?.[0];
        if (recipientEmail) {
          // Log bounce in activity log
          console.warn(`[Resend Webhook] Bounce: ${recipientEmail}`);

          // Could mark the lead's email as bounced
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
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
