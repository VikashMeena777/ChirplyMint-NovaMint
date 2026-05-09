import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPaymentOrder } from "@/lib/cashfree/client";
import { PLANS, type PlanKey } from "@/lib/utils/plan-limits";
import { checkRateLimit, getApiLimiter } from "@/lib/utils/rate-limiter";

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

    const { plan } = (await request.json()) as { plan: PlanKey };

    if (!plan || !PLANS[plan] || plan === "free") {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    const planConfig = PLANS[plan];
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

    // Store the payment order in DB
    await supabase.from("payment_orders").insert({
      user_id: user.id,
      order_id: orderId,
      plan,
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
