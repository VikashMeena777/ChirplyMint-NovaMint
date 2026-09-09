import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature } from "@/lib/cashfree/client";
import { PLANS, type PlanKey } from "@/lib/utils/plan-limits";
import { sendEmail } from "@/lib/email/send";
import { createInvoiceForPaidOrder } from "@/lib/billing/invoice";
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
        const rawPlan = order.plan as string;
        const plan = rawPlan as PlanKey;
        const planConfig = PLANS[plan] || PLANS.free;

        // ── Top-up pack: add DMs, don't change plan ──
        if (rawPlan === "topup_500") {
          // Top-up = +500 on the ACTUAL limit (they paid for 500 DMs).
          // dm-reset only clears the counter monthly, never dm_limit, so
          // the purchase persists. Counter resets so the room is usable now.
          const { data: prof } = await supabase
            .from("profiles")
            .select("dm_limit, dm_topup_balance")
            .eq("id", order.user_id)
            .single();
          const cur = prof as Record<string, number> | null;
          const currentLimit = cur?.dm_limit ?? 50;
          const purchased = (cur?.dm_topup_balance ?? 0) + 500;
          await supabase
            .from("profiles")
            .update({
              dm_limit: currentLimit + 500,
              dm_topup_balance: purchased,
              dm_count_this_month: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.user_id);

          void createInvoiceForPaidOrder({
            userId: order.user_id as string,
            orderId: orderId,
            amount: 99,
            plan: "topup_500",
            description: "+500 DM top-up",
          }).catch((e) => console.error("[Cashfree Webhook] Invoice creation failed:", e));

          await supabase.from("notifications").insert({
            user_id: order.user_id,
            type: "payment_success",
            title: "⚡ +500 DMs added!",
            body: "Your DM top-up is active — your monthly counter was reset. Happy automating!",
            metadata: { order_id: orderId },
          });
          return NextResponse.json({ status: "ok" });
        }

        // ── Plan purchase (monthly or annual) ──
        const periodDays = rawPlan.endsWith("_annual") ? 365 : 30;
        const effectivePlan = rawPlan.replace("_annual", "") as PlanKey;
        const effConfig = PLANS[effectivePlan] || PLANS.free;

        await supabase
          .from("profiles")
          .update({
            plan: effectivePlan,
            dm_limit: effConfig.dmLimit,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.user_id);

        // Upsert subscription record
        await supabase
          .from("subscriptions")
          .upsert({
            user_id: order.user_id,
            plan: effectivePlan,
            status: "active",
            cashfree_customer_id: orderData.customer_details?.customer_id || null,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + periodDays * 24 * 60 * 60 * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        // Invoice (sequential, only on confirmed payment)
        void createInvoiceForPaidOrder({
          userId: order.user_id as string,
          orderId: orderId,
          amount: (orderData as Record<string, unknown>).order_amount as number ?? 0,
          plan: rawPlan,
          description: rawPlan.endsWith("_annual")
            ? `${effConfig.name} plan (annual)`
            : rawPlan === "topup_500"
            ? "+500 DM top-up"
            : `${effConfig.name} plan (monthly)`,
        }).catch((e) => console.error("[Cashfree Webhook] Invoice creation failed:", e));

        // Send success notification
        await supabase.from("notifications").insert({
          user_id: order.user_id,
          type: "payment_success",
          title: "🎉 Plan Upgraded!",
          body: `You've been upgraded to the ${effConfig.name} plan${periodDays === 365 ? " (annual)" : ""}. Enjoy your new features!`,
          metadata: { plan, order_id: orderId },
        });

        // Send Plan Upgraded email (fire-and-forget)
        void (async () => {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
            const userEmail = authUser?.user?.email;
            const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", order.user_id).single();
            if (userEmail) {
              await sendEmail({
                to: userEmail,
                subject: `💎 Welcome to ${planConfig.name} — Your Plan is Upgraded!`,
                html: getPlanUpgradedHtml({
                  name: (prof as Record<string, unknown>)?.full_name as string || "there",
                  planName: planConfig.name,
                  dmLimit: planConfig.dmLimit === -1 ? "Unlimited" : String(planConfig.dmLimit),
                  features: planConfig.features.slice(0, 5) as unknown as string[],
                }),
              });
              await supabase.from("profiles").update({ plan_upgraded_email_sent: true }).eq("id", order.user_id);
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
