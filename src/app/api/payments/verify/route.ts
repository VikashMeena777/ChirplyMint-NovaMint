import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { verifyPaymentOrder } from "@/lib/cashfree/client";
import { PLANS, type PlanKey } from "@/lib/utils/plan-limits";

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/payments/verify
 * Called after user returns from Cashfree checkout.
 * Verifies the payment via Cashfree API and upgrades the plan.
 * This is a FALLBACK for when the Cashfree webhook doesn't fire.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = (await request.json()) as { orderId: string };

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing order_id" },
        { status: 400 }
      );
    }

    const adminSupabase = getAdminSupabase();

    // Check if the order belongs to this user and is still pending
    const { data: order } = await adminSupabase
      .from("payment_orders")
      .select("user_id, plan, status")
      .eq("order_id", orderId)
      .single();

    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If already paid, just return success
    if (order.status === "paid") {
      return NextResponse.json({ status: "already_paid", plan: order.plan });
    }

    // Verify payment via Cashfree API
    const verification = await verifyPaymentOrder(orderId);

    if (!verification.success) {
      return NextResponse.json(
        { error: "Could not verify payment" },
        { status: 500 }
      );
    }

    // Check if any payment in the order is successful
    const payments = verification.payments as Array<Record<string, unknown>> || [];
    const successfulPayment = payments.find(
      (p) => p.payment_status === "SUCCESS"
    );

    if (!successfulPayment) {
      return NextResponse.json(
        { status: "not_paid", message: "No successful payment found" },
        { status: 400 }
      );
    }

    // Payment confirmed — upgrade the user
    const plan = order.plan as PlanKey;
    const planConfig = PLANS[plan] || PLANS.free;

    // Update payment order
    await adminSupabase
      .from("payment_orders")
      .update({
        status: "paid",
        cashfree_payment_id: (successfulPayment.cf_payment_id as string) || null,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);

    // Upgrade user's plan
    await adminSupabase
      .from("profiles")
      .update({
        plan,
        dm_limit: planConfig.dmLimit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // Upsert subscription record
    await adminSupabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        plan,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    console.log(
      `[Payment Verify] User ${user.id} upgraded to ${plan} via API verification`
    );

    return NextResponse.json({
      status: "paid",
      plan,
      planName: planConfig.name,
    });
  } catch (err) {
    console.error("[Payment Verify] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
