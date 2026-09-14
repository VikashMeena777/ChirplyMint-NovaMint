import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createPaymentOrder } from "@/lib/cashfree/client";
import { PLANS, type PlanKey } from "@/lib/utils/plan-limits";
import { PURCHASES } from "@/lib/billing/fulfill";
import { checkRateLimit, getApiLimiter } from "@/lib/utils/rate-limiter";

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: prevent order creation spam
    const rateLimitResult = await checkRateLimit(getApiLimiter(), user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { plan: rawPlan } = (await request.json()) as { plan: string };

    // Single catalogue shared with fulfilment — they can never drift apart.
    const entry = PURCHASES[rawPlan];
    if (!entry) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
    }

    // ── Purchase sanity guards (server-side — the UI can be bypassed) ──
    // 1. No downgrade purchases: a Business subscriber buying Pro (monthly
    //    or annual) pays for a plan they already exceed.
    // 2. No duplicate annual purchases: an active annual subscriber buying
    //    the same annual plan again double-charges for overlapping time.
    {
      const { data: current } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();
      const currentPlan = ((current as Record<string, unknown> | null)?.plan as string) || "free";

      const buyingPro = rawPlan === "pro" || rawPlan === "pro_annual";
      if (currentPlan === "business" && buyingPro) {
        return NextResponse.json(
          { error: "You're already on Business — it includes everything in Pro. No need to buy Pro." },
          { status: 400 }
        );
      }

      if (entry.kind === "annual") {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("current_period_end, status")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const row = sub as { current_period_end?: string; status?: string } | null;
        const isAnnualActive =
          row?.status === "active" &&
          !!row?.current_period_end &&
          new Date(row.current_period_end).getTime() - Date.now() > 150 * 24 * 60 * 60 * 1000;
        if (isAnnualActive) {
          return NextResponse.json(
            { error: "Your annual plan is already active — it renews nothing to buy again now." },
            { status: 400 }
          );
        }
      }
    }

    const plan = rawPlan as PlanKey;
    const planConfig = { price: entry.amount };
    const orderId = `CM_${user.id.slice(0, 8)}_${Date.now()}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Get profile for customer details
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const result = await createPaymentOrder({
      orderId,
      orderAmount: planConfig.price,
      customerEmail: profile?.email || user.email || "",
      customerPhone: "9999999999", // Fallback — Cashfree requires phone
      customerId: user.id,
      customerName: (profile?.full_name as string) || "Customer",
      returnUrl: `${appUrl}/dashboard/settings/billing?payment=success&order_id={order_id}`,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Store the payment order via the admin client — the INSERT policy is
    // dropped by the hardening migration (users must not fabricate orders).
    const admin = getAdminSupabase();
    await admin.from("payment_orders").insert({
      user_id: user.id,
      order_id: orderId,
      plan: rawPlan,
      amount: planConfig.price,
      status: "pending",
      payment_session_id: result.paymentSessionId,
    });


    return NextResponse.json({
      paymentSessionId: result.paymentSessionId,
      orderId,
    });
  } catch (err) {
    console.error("[Payment] Create order error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
