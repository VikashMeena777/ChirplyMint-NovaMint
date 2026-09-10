import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PLANS, type PlanKey } from "@/lib/utils/plan-limits";
import { createInvoiceForPaidOrder } from "@/lib/billing/invoice";

/**
 * SINGLE source of truth for "a payment succeeded — give them what they paid for".
 *
 * Both the Cashfree webhook and the return-URL verify route call this. They
 * used to duplicate the logic, and verify didn't know about top-ups or annual
 * plans: PLANS["topup_500"] is undefined, so it fell back to the free plan and
 * wrote plan="topup_500" with a 50-DM limit while billing ₹0 on the invoice.
 * One function, one behaviour.
 */

export type PurchaseKind = "monthly" | "annual" | "topup";

export interface PurchaseSpec {
  kind: PurchaseKind;
  /** Plan actually granted (top-ups don't change the plan) */
  effectivePlan: PlanKey | null;
  amount: number;
  label: string;
  periodDays: number;
}

/** Everything sellable, in one place. create-order validates against this too. */
export const PURCHASES: Record<string, PurchaseSpec> = {
  pro: {
    kind: "monthly",
    effectivePlan: "pro",
    amount: PLANS.pro.price,
    label: "Pro plan (monthly)",
    periodDays: 30,
  },
  business: {
    kind: "monthly",
    effectivePlan: "business",
    amount: PLANS.business.price,
    label: "Business plan (monthly)",
    periodDays: 30,
  },
  pro_annual: {
    kind: "annual",
    effectivePlan: "pro",
    amount: PLANS.pro.price * 10,
    label: "Pro plan (annual — 2 months free)",
    periodDays: 365,
  },
  business_annual: {
    kind: "annual",
    effectivePlan: "business",
    amount: PLANS.business.price * 10,
    label: "Business plan (annual — 2 months free)",
    periodDays: 365,
  },
  topup_500: {
    kind: "topup",
    effectivePlan: null,
    amount: 99,
    label: "+500 DM top-up",
    periodDays: 0,
  },
};

export const TOPUP_DM_COUNT = 500;

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface FulfillResult {
  ok: boolean;
  alreadyFulfilled?: boolean;
  kind?: PurchaseKind;
  error?: string;
}

/**
 * Apply a confirmed payment. Idempotent: the payment_orders row is flipped to
 * "paid" with a guard, so the webhook and the verify route racing each other
 * can't double-credit a top-up.
 */
export async function fulfillPaidOrder(params: {
  orderId: string;
  paymentId?: string | null;
  cashfreeCustomerId?: string | null;
}): Promise<FulfillResult> {
  const admin = getAdmin();

  // Validate the purchase type BEFORE flipping to paid, so an unknown
  // plan can never get stuck as paid-forever with nothing delivered.
  const { data: pending } = await admin
    .from("payment_orders")
    .select("user_id, plan, amount, status")
    .eq("order_id", params.orderId)
    .maybeSingle();
  if (!pending) {
    return { ok: false, error: "Order not found" };
  }
  const pendingOrder = pending as unknown as {
    user_id: string;
    plan: string;
    amount: number;
    status: string;
  };
  const earlySpec = PURCHASES[pendingOrder.plan];
  if (!earlySpec) {
    console.error(`[Fulfill] Unknown purchase "${pendingOrder.plan}" for ${params.orderId} — not marking paid`);
    return { ok: false, error: `Unknown purchase type: ${pendingOrder.plan}` };
  }
  if (pendingOrder.status === "paid") {
    return { ok: true, alreadyFulfilled: true, kind: earlySpec.kind };
  }

  // Claim the order: only the caller that flips pending → paid fulfils it.
  const { data: claimed } = await admin
    .from("payment_orders")
    .update({
      status: "paid",
      cashfree_payment_id: params.paymentId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", params.orderId)
    .neq("status", "paid")
    .select("user_id, plan, amount")
    .maybeSingle();

  if (!claimed) {
    // Someone already fulfilled it (or the order doesn't exist)
    const { data: existing } = await admin
      .from("payment_orders")
      .select("status")
      .eq("order_id", params.orderId)
      .maybeSingle();
    return existing
      ? { ok: true, alreadyFulfilled: true }
      : { ok: false, error: "Order not found" };
  }

  const order = claimed as unknown as {
    user_id: string;
    plan: string;
    amount: number;
  };
  const spec = PURCHASES[order.plan];

  if (!spec) {
    console.error(`[Fulfill] Unknown purchase "${order.plan}" for ${params.orderId}`);
    return { ok: false, error: `Unknown purchase type: ${order.plan}` };
  }

  const amount = order.amount ?? spec.amount;

  // ── Top-up: add DMs, never touch the plan ──
  if (spec.kind === "topup") {
    const { data: prof } = await admin
      .from("profiles")
      .select("dm_limit, dm_topup_balance")
      .eq("id", order.user_id)
      .single();
    const cur = prof as Record<string, number> | null;
    const currentLimit = cur?.dm_limit ?? 50;

    // Unlimited plans (-1) keep their limit; the purchase is still recorded.
    const nextLimit = currentLimit === -1 ? -1 : currentLimit + TOPUP_DM_COUNT;

    // Do NOT reset dm_count_this_month here — resetting would give away
    // free DMs (e.g. used 1900/2000 + top-up = 2500 limit + 0 used).
    await admin
      .from("profiles")
      .update({
        dm_limit: nextLimit,
        dm_topup_balance: (cur?.dm_topup_balance ?? 0) + TOPUP_DM_COUNT,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.user_id);

    await admin.from("notifications").insert({
      user_id: order.user_id,
      type: "payment_success",
      title: "⚡ +500 DMs added!",
      body:
        currentLimit === -1
          ? "Your top-up is recorded — your plan already includes unlimited DMs."
          : `Your DM limit is now ${nextLimit}. Happy automating!`,
      metadata: { order_id: params.orderId },
    });
  } else {
    // ── Plan purchase (monthly or annual) ──
    const planKey = spec.effectivePlan!;
    const planConfig = PLANS[planKey];

    // Preserve any previously bought top-up credits on top of the new plan
    // limit, and never wipe a stored Cashfree customer id with null.
    const { data: existingProf } = await admin
      .from("profiles")
      .select("dm_topup_balance")
      .eq("id", order.user_id)
      .maybeSingle();
    const topupBalance =
      (existingProf as Record<string, number> | null)?.dm_topup_balance ?? 0;
    const nextPlanLimit =
      planConfig.dmLimit === -1 ? -1 : planConfig.dmLimit + topupBalance;

    await admin
      .from("profiles")
      .update({
        plan: planKey,
        dm_limit: nextPlanLimit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.user_id);

    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("cashfree_customer_id")
      .eq("user_id", order.user_id)
      .maybeSingle();
    const keepCustomerId =
      params.cashfreeCustomerId ||
      (existingSub as Record<string, string | null> | null)?.cashfree_customer_id ||
      null;

    await admin.from("subscriptions").upsert(
      {
        user_id: order.user_id,
        plan: planKey,
        status: "active",
        cashfree_customer_id: keepCustomerId,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(
          Date.now() + spec.periodDays * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    await admin.from("notifications").insert({
      user_id: order.user_id,
      type: "payment_success",
      title: "🎉 Plan Upgraded!",
      body: `You're on the ${planConfig.name} plan${spec.kind === "annual" ? " (annual)" : ""}. Enjoy your new features!`,
      metadata: { plan: planKey, order_id: params.orderId },
    });
  }

  // Invoice with the REAL amount and description
  await createInvoiceForPaidOrder({
    userId: order.user_id,
    orderId: params.orderId,
    amount,
    plan: order.plan,
    description: spec.label,
  }).catch((e) => console.error("[Fulfill] Invoice failed:", e));

  console.log(`[Fulfill] ${order.plan} (₹${amount}) applied for ${order.user_id}`);
  return { ok: true, kind: spec.kind };
}
