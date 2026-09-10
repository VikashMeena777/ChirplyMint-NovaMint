import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature } from "@/lib/cashfree/client";
import { PLANS, type PlanKey } from "@/lib/utils/plan-limits";
import { sendEmail } from "@/lib/email/send";
import { fulfillPaidOrder } from "@/lib/billing/fulfill";
import { getPlanUpgradedHtml } from "@/lib/email/templates/plan-upgraded";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const timestamp = request.headers.get("x-webhook-timestamp") || "";
    const signature = request.headers.get("x-webhook-signature") || "";

    console.log("[Cashfree Webhook] Received webhook event");

    // Verify webhook signature — ALWAYS verify, never skip
    if (!process.env.CASHFREE_WEBHOOK_SECRET) {
      console.error("[Cashfree Webhook] CRITICAL: CASHFREE_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 200 });
    }
    const isValid = verifyWebhookSignature(rawBody, timestamp, signature);
    if (!isValid) {
      console.error("[Cashfree Webhook] Invalid signature — rejecting");
      return NextResponse.json({ error: "Invalid signature" }, { status: 200 });
    }
    console.log("[Cashfree Webhook] Signature verified ✅");

    const payload = JSON.parse(rawBody);
    const eventType = payload.type;
    const orderData = payload.data?.order;
    const paymentData = payload.data?.payment;

    console.log("[Cashfree Webhook] Event type:", eventType, "Order ID:", orderData?.order_id);

    if (!orderData?.order_id) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 200 });
    }

    const supabase = getAdminSupabase();
    const orderId = orderData.order_id;

    if (eventType === "PAYMENT_SUCCESS_WEBHOOK") {
      // Shared fulfilment: monthly / annual / top-up, idempotent (the verify
      // route calls the exact same function when the user returns from checkout).
      const result = await fulfillPaidOrder({
        orderId,
        paymentId: (paymentData?.cf_payment_id as string) || null,
        cashfreeCustomerId: orderData.customer_details?.customer_id || null,
      });

      if (!result.ok) {
        console.error(`[Cashfree Webhook] Fulfilment failed for ${orderId}:`, result.error);
        return NextResponse.json({ status: "ok" });
      }

      // Plan-upgrade email (top-ups get an in-app notification instead)
      if (!result.alreadyFulfilled && result.kind !== "topup") {
        void (async () => {
          try {
            const { data: ord } = await supabase
              .from("payment_orders")
              .select("user_id, plan")
              .eq("order_id", orderId)
              .single();
            const o = ord as Record<string, string> | null;
            if (!o) return;

            const planKey = o.plan.replace("_annual", "") as PlanKey;
            const planConfig = PLANS[planKey] || PLANS.free;
            const { data: authUser } = await supabase.auth.admin.getUserById(o.user_id);
            const userEmail = authUser?.user?.email;
            const { data: prof } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", o.user_id)
              .single();

            if (userEmail) {
              await sendEmail({
                to: userEmail,
                subject: `Welcome to ${planConfig.name} — your plan is active`,
                html: getPlanUpgradedHtml({
                  name: ((prof as Record<string, unknown>)?.full_name as string) || "there",
                  planName: planConfig.name,
                  dmLimit: planConfig.dmLimit === -1 ? "Unlimited" : String(planConfig.dmLimit),
                  features: planConfig.features.slice(0, 5) as unknown as string[],
                }),
              });
              await supabase
                .from("profiles")
                .update({ plan_upgraded_email_sent: true })
                .eq("id", o.user_id);
            }
          } catch (e) {
            console.error("[Cashfree Webhook] Email error:", e);
          }
        })();
      }
    } else if (eventType === "PAYMENT_FAILED_WEBHOOK") {
      await supabase
        .from("payment_orders")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[Cashfree Webhook] Error:", err);
    // Always return 200 to prevent Cashfree retry storms
    return NextResponse.json({ error: "Error processed" }, { status: 200 });
  }
}
