import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createPaymentOrder } from "@/lib/cashfree/client";
import { PLANS, type PlanKey } from "@/lib/utils/plan-limits";
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

    // Supported purchases: pro / business / pro_annual / business_annual / topup_500
    const PRICES: Record<string, { amount: number; label: string }> = {
      pro: { amount: PLANS.pro.price, label: "Pro (monthly)" },
      business: { amount: PLANS.business.price, label: "Business (monthly)" },
      pro_annual: { amount: PLANS.pro.price * 10, label: "Pro (annual — 2 months free)" },
      business_annual: { amount: PLANS.business.price * 10, label: "Business (annual — 2 months free)" },
      topup_500: { amount: 99, label: "+500 DM top-up" },
    };

    const entry = PRICES[rawPlan];
    if (!entry) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
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
      returnUrl: `${appUrl}/dashboard/settings?payment=success&order_id={order_id}`,
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

    // Pre-register the invoice (amount final at payment success via webhook)
    await admin.from("invoices").insert({
      user_id: user.id,
      order_id: orderId,
      amount: planConfig.price,
      plan: rawPlan,
      description: entry.label,
      paid_at: new Date().toISOString(),
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
