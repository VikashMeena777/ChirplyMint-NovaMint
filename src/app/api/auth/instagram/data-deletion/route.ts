import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const APP_SECRET = process.env.META_APP_SECRET || "";

/**
 * Parse Meta's signed request.
 */
function parseSignedRequest(signedRequest: string): Record<string, unknown> | null {
  try {
    const [encodedSig, encodedPayload] = signedRequest.split(".");
    if (!encodedSig || !encodedPayload) return null;

    const expectedSig = crypto
      .createHmac("sha256", APP_SECRET)
      .update(encodedPayload)
      .digest("base64url");

    if (encodedSig !== expectedSig) {
      console.error("[IG Data Deletion] Signature mismatch");
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8")
    );
    return payload;
  } catch (error) {
    console.error("[IG Data Deletion] Failed to parse signed request:", error);
    return null;
  }
}

/**
 * POST /api/auth/instagram/data-deletion
 *
 * Called by Meta when a user requests deletion of their data via Instagram settings.
 * Deletes all data associated with the Instagram user and returns a confirmation.
 *
 * Required response format:
 * { url: "https://...", confirmation_code: "ABC123" }
 *
 * @see https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const signedRequest = formData.get("signed_request") as string;

    if (!signedRequest) {
      console.error("[IG Data Deletion] No signed_request in body");
      return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
    }

    const payload = parseSignedRequest(signedRequest);
    if (!payload) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const igUserId = payload.user_id as string;
    const confirmationCode = `DEL-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    console.log(`[IG Data Deletion] Data deletion request for IG user ${igUserId}, code: ${confirmationCode}`);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find the internal user_id from the IG user ID
    const { data: igAccount } = await supabase
      .from("instagram_accounts")
      .select("id, user_id")
      .eq("ig_user_id", igUserId)
      .limit(1)
      .single();

    if (igAccount) {
      const userId = igAccount.user_id as string;
      const igAccountId = igAccount.id as string;

      // Delete DM logs for this IG account
      await supabase
        .from("dm_logs")
        .delete()
        .eq("instagram_account_id", igAccountId);

      // Delete postback flows linked to automations for this IG account
      const { data: automations } = await supabase
        .from("automations")
        .select("id")
        .eq("instagram_account_id", igAccountId);

      if (automations && automations.length > 0) {
        const automationIds = automations.map((a: Record<string, string>) => a.id);
        await supabase
          .from("postback_flows")
          .delete()
          .in("automation_id", automationIds);
      }

      // Delete automations for this IG account
      await supabase
        .from("automations")
        .delete()
        .eq("instagram_account_id", igAccountId);

      // Delete the Instagram account record itself
      await supabase
        .from("instagram_accounts")
        .delete()
        .eq("id", igAccountId);

      // Log the deletion activity
      supabase
        .from("activity_log")
        .insert({
          user_id: userId,
          action: "instagram.data_deleted",
          details: {
            ig_user_id: igUserId,
            confirmation_code: confirmationCode,
          },
        })
        .then(() => {});

      console.log(`[IG Data Deletion] All data deleted for IG user ${igUserId}`);
    } else {
      console.log(`[IG Data Deletion] No account found for IG user ${igUserId} — may already be deleted`);
    }

    // Return the required response format
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.novamintnetworks.in";
    return NextResponse.json({
      url: `${appUrl}/data-policy?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error("[IG Data Deletion] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET handler — Status check
 */
export async function GET() {
  return NextResponse.json({ status: "data-deletion endpoint active" });
}
