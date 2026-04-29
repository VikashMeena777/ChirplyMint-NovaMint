import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature } from "@/lib/cashfree/client";
import { PLANS, type PlanKey } from "@/lib/utils/plan-limits";

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
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    const isValid = verifyWebhookSignature(rawBody, timestamp, signature);
    if (!isValid) {
      console.error("[Cashfree Webhook] Invalid signature — rejecting");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    console.log("[Cashfree Webhook] Signature verified ✅");

    const payload = JSON.parse(rawBody);
    const eventType = payload.type;
    const orderData = payload.data?.order;
    const paymentData = payload.data?.payment;

    console.log("[Cashfree Webhook] Event type:", eventType, "Order ID:", orderData?.order_id);

    if (!orderData?.order_id) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const orderId = orderData.order_id;

    if (eventType === "PAYMENT_SUCCESS_WEBHOOK") {
      // Update payment order status
      const { data: order } = await supabase
        .from("payment_orders")
        .update({
          status: "paid",
          cashfree_payment_id: paymentData?.cf_payment_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId)
        .select("user_id, plan")
        .single();

      if (order) {
        const plan = order.plan as PlanKey;
        const planConfig = PLANS[plan] || PLANS.free;

        // Upgrade user's plan
        await supabase
          .from("profiles")
          .update({
            plan,
            dm_limit: planConfig.dmLimit === -1 ? 999999 : planConfig.dmLimit,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.user_id);

        // Upsert subscription record
        await supabase
          .from("subscriptions")
          .upsert({
            user_id: order.user_id,
            plan,
            status: "active",
            cashfree_customer_id: orderData.customer_details?.customer_id || null,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        // Send success notification
        await supabase.from("notifications").insert({
          user_id: order.user_id,
          type: "payment_success",
          title: "🎉 Plan Upgraded!",
          body: `You've been upgraded to the ${planConfig.name} plan. Enjoy your new features!`,
          metadata: { plan, order_id: orderId },
        });
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
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
