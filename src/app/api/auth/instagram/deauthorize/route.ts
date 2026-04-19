import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const APP_SECRET = process.env.META_APP_SECRET || "";

/**
 * Parse Meta's signed request.
 * The signed_request is a Base64URL encoded JSON payload, signed with the app secret.
 * @see https://developers.facebook.com/docs/games/gamesonfacebook/login#parsingsr
 */
function parseSignedRequest(signedRequest: string): Record<string, unknown> | null {
  try {
    const [encodedSig, encodedPayload] = signedRequest.split(".");
    if (!encodedSig || !encodedPayload) return null;

    // Verify signature
    const expectedSig = crypto
      .createHmac("sha256", APP_SECRET)
      .update(encodedPayload)
      .digest("base64url");

    if (encodedSig !== expectedSig) {
      console.error("[IG Deauthorize] Signature mismatch");
      return null;
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8")
    );
    return payload;
  } catch (error) {
    console.error("[IG Deauthorize] Failed to parse signed request:", error);
    return null;
  }
}

/**
 * POST /api/auth/instagram/deauthorize
 *
 * Called by Meta when a user removes ChirplyMint from their Instagram settings.
 * Marks the user's Instagram account as disconnected in our database.
 *
 * @see https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const signedRequest = formData.get("signed_request") as string;

    if (!signedRequest) {
      console.error("[IG Deauthorize] No signed_request in body");
      return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
    }

    const payload = parseSignedRequest(signedRequest);
    if (!payload) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const igUserId = payload.user_id as string;
    console.log(`[IG Deauthorize] User ${igUserId} removed ChirplyMint from their Instagram settings`);

    // Mark the Instagram account as inactive
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from("instagram_accounts")
      .update({ is_active: false })
      .eq("ig_user_id", igUserId);

    if (error) {
      console.error("[IG Deauthorize] DB error:", error.message);
    } else {
      console.log(`[IG Deauthorize] Successfully deactivated account for IG user ${igUserId}`);
    }

    // Log the deauthorization activity
    const { data: igAccount } = await supabase
      .from("instagram_accounts")
      .select("user_id")
      .eq("ig_user_id", igUserId)
      .limit(1)
      .single();

    if (igAccount?.user_id) {
      supabase
        .from("activity_log")
        .insert({
          user_id: igAccount.user_id,
          action: "instagram.deauthorized",
          details: { ig_user_id: igUserId },
        })
        .then(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[IG Deauthorize] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET handler — Meta may send a verification ping
 */
export async function GET() {
  return NextResponse.json({ status: "deauthorize endpoint active" });
}
