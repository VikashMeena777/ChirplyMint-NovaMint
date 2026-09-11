import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature, verifyPaymentOrder } from "@/lib/cashfree/client";
import { PLANS, type PlanKey } from "@/lib/utils/plan-limits";
import { sendEmail } from "@/lib/email/send";
import { fulfillPaidOrder, PURCHASES } from "@/lib/billing/fulfill";
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

    // Verify webhook signature — ALWAYS verify, never skip.
    // Misconfigured must be 500 (so Cashfree retries + Vercel alerts fire),
    // never 200 (which would silently ACK-and-drop real money events).
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
      return NextResponse.json({ error: "Missing order_id" }, { status: 200 });
    }

    const supabase = getAdminSupabase();
    const orderId = orderData.order_id;

    if (eventType === "PAYMENT_SUCCESS_WEBHOOK") {
      // Never trust the webhook type alone — confirm with Cashfree that a
      // SUCCESS payment actually exists and the amount matches what we charged.
      const { data: expected } = await supabase
        .from("payment_orders")
        .select("amount, plan, status")
        .eq("order_id", orderId)
        .maybeSingle();
      const exp = expected as Record<string, unknown> | null;
      if (exp?.status === "paid") {
        // Already fulfilled — idempotent, nothing more to do.
        return NextResponse.json({ status: "ok" });
      }
      try {
        const verification = await verifyPaymentOrder(orderId);
        const payments = (verification.payments as Array<Record<string, unknown>>) || [];
        const success = payments.find((p) => p.payment_status === "SUCCESS");
        // Fail-CLOSED (Strix vuln-0004): when the order-status API confirms
        // the order but shows NO successful payment — whether the list is
        // empty or every attempt failed — do NOT fulfil. Only a network-level
        // error on OUR side (the catch below) still trusts the HMAC alone.
        if (verification.success && !success) {
          console.error(`[Cashfree Webhook] No SUCCESS payment for ${orderId} (verified, ${payments.length} payment(s)) — ignoring`);
          return NextResponse.json({ status: "ok" });
        }
        // Amount check when Cashfree returns an amount field.
        const paidAmount = success
          ? Number(success.payment_amount ?? success.order_amount ?? NaN)
          : NaN;
        const expectedAmount = Number((exp?.amount as number) ?? PURCHASES[(exp?.plan as string) || ""]?.amount ?? NaN);
        if (!Number.isNaN(paidAmount) && !Number.isNaN(expectedAmount) && paidAmount < expectedAmount) {
          console.error(`[Cashfree Webhook] Underpaid ${orderId}: got ${paidAmount}, expected ${expectedAmount} — ignoring`);
          // Visible to the owner (console-only would be a silent money event)
          const { data: underOrd } = await supabase
            .from("payment_orders")
            .select("user_id")
            .eq("order_id", orderId)
            .maybeSingle();
          const underUid = (underOrd as Record<string, string> | null)?.user_id;
          if (underUid) {
            await supabase.from("notifications").insert({
              user_id: underUid,
              type: "warning",
              title: "⚠️ Payment amount mismatch",
              body: `We received ₹${paidAmount} for order ${orderId} but expected ₹${expectedAmount}. Contact support if this was you.`,
              metadata: { order_id: orderId, paid: paidAmount, expected: expectedAmount },
            });
          }
          return NextResponse.json({ status: "ok" });
        }
      } catch (verifyErr) {
        // If the verify call itself fails, fall through and fulfil anyway —
        // the signature is valid, so this is still a genuine Cashfree event.
        console.error(`[Cashfree Webhook] Verify-before-fulfil failed for ${orderId}:`, verifyErr);
      }
      // Shared fulfilment: monthly / annual / top-up, idempotent (the verify
      // route calls the exact same function when the user returns from checkout).
      const result = await fulfillPaidOrder({
        orderId,
        paymentId: (paymentData?.cf_payment_id as string) || null,
        cashfreeCustomerId: orderData.customer_details?.customer_id || null,
      });

      if (!result.ok) {
        console.error(`[Cashfree Webhook] Fulfilment failed for ${orderId}:`, result.error);
        // Return 500 so Cashfree retries; fulfillPaidOrder is idempotent so
        // a retry can never double-credit. Returning ok here would ACK-and-drop
        // real money (silent failure).
        return NextResponse.json({ error: "Fulfilment failed, retry" }, { status: 500 });
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
      // Never overwrite a paid order with failed — webhooks can arrive out
      // of order, and paid + active subscription must win.
      await supabase
        .from("payment_orders")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId)
        .neq("status", "paid");
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[Cashfree Webhook] Error:", err);
    // Always return 200 to prevent Cashfree retry storms
    return NextResponse.json({ error: "Error processed" }, { status: 200 });
  }
}
