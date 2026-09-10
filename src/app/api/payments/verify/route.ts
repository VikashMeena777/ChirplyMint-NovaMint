import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { fulfillPaidOrder } from "@/lib/billing/fulfill";
import { verifyPaymentOrder } from "@/lib/cashfree/client";
import { checkRateLimit, getApiLimiter } from "@/lib/utils/rate-limiter";

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

    // Rate limit: prevent verify spam
    const rateLimitResult = await checkRateLimit(getApiLimiter(), user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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
      .select("user_id, plan, amount, status")
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

    // Amount check: an underpaid order must not unlock the plan.
    // PURCHASES is the single catalogue — compare DB amount and spec.
    const { PURCHASES } = await import("@/lib/billing/fulfill");
    const spec = PURCHASES[(order as Record<string, string>).plan];
    if (!spec) {
      return NextResponse.json({ error: "Unknown purchase type" }, { status: 400 });
    }
    const paidAmount = Number(
      successfulPayment.payment_amount ?? successfulPayment.order_amount ?? NaN
    );
    const expectedAmount = Number((order as Record<string, unknown>).amount ?? spec.amount);
    if (!Number.isNaN(paidAmount) && !Number.isNaN(expectedAmount) && paidAmount < expectedAmount) {
      console.error(`[Payment Verify] Underpaid ${orderId}: got ${paidAmount}, expected ${expectedAmount}`);
      return NextResponse.json(
        { status: "not_paid", message: "Payment amount does not match order" },
        { status: 400 }
      );
    }

    // Payment confirmed — fulfil through the shared path (handles monthly,
    // annual and top-ups identically to the webhook, idempotently).
    const fulfilment = await fulfillPaidOrder({
      orderId,
      paymentId: (successfulPayment.cf_payment_id as string) || null,
    });

    if (!fulfilment.ok) {
      console.error(`[Payment Verify] Fulfilment failed for ${orderId}:`, fulfilment.error);
      return NextResponse.json(
        { error: fulfilment.error || "Could not apply your purchase — contact support" },
        { status: 500 }
      );
    }

    console.log(
      `[Payment Verify] Order ${orderId} fulfilled (${fulfilment.kind ?? "already done"})`
    );

    return NextResponse.json({
      status: "paid",
      plan: order.plan,
      kind: fulfilment.kind ?? null,
    });
  } catch (err) {
    console.error("[Payment Verify] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
