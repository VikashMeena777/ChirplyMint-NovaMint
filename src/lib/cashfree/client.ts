import { Cashfree, CFEnvironment } from "cashfree-pg";

// Initialize Cashfree instance (constructor-based in v2025+)
function getCashfreeInstance() {
  const env =
    process.env.NEXT_PUBLIC_CASHFREE_ENV === "production"
      ? CFEnvironment.PRODUCTION
      : CFEnvironment.SANDBOX;

  const cashfree = new Cashfree(
    env,
    process.env.CASHFREE_CLIENT_ID || "",
    process.env.CASHFREE_CLIENT_SECRET || ""
  );

  cashfree.XApiVersion = process.env.CASHFREE_API_VERSION || "2026-01-01";

  return cashfree;
}

/**
 * Create a Cashfree payment order for a plan upgrade.
 */
export async function createPaymentOrder(params: {
  orderId: string;
  orderAmount: number;
  customerEmail: string;
  customerPhone: string;
  customerId: string;
  customerName: string;
  returnUrl: string;
}) {
  const cashfree = getCashfreeInstance();

  const request = {
    order_id: params.orderId,
    order_amount: params.orderAmount,
    order_currency: "INR",
    customer_details: {
      customer_id: params.customerId,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
      customer_name: params.customerName,
    },
    order_meta: {
      return_url: params.returnUrl,
      // India-first UX: surface UPI apps (GPay/PhonePe/Paytm) first in the
      // drop-in, since most customers pay by UPI.
      upi: {
        requery: true,
      },
    },
    // payments: { payment_methods: { upi: 1 } } style priority is set via
    // the dashboard default; here we at least enable UPI requery so a
    // "paid but app crashed" UPI payment self-resolves.
  };

  try {
    // x_idempotency_key = order_id: creating the same order twice (user
    // double-clicks upgrade) returns the original instead of erroring.
    const response = await cashfree.PGCreateOrder(request, undefined, params.orderId);
    return {
      success: true,
      paymentSessionId: (response.data as Record<string, unknown>)
        ?.payment_session_id as string | undefined,
      orderId: (response.data as Record<string, unknown>)?.order_id as
        | string
        | undefined,
    };
  } catch (error) {
    console.error("[Cashfree] Create order error:", error);
    return { success: false, error: "Failed to create payment order" };
  }
}

/**
 * Verify Cashfree payment order status.
 */
export async function verifyPaymentOrder(orderId: string) {
  const cashfree = getCashfreeInstance();

  try {
    const response = await cashfree.PGOrderFetchPayments(orderId);
    return { success: true, payments: response.data };
  } catch (error) {
    console.error("[Cashfree] Verify order error:", error);
    return { success: false, error: "Failed to verify payment" };
  }
}

// ─────────────────────────────────────────────────────────────
// Payment Links (approved Cashfree product). Used for dunning: when a plan
// renewal fails / expires, we send the customer a payment link with
// link_auto_reminders=true so Cashfree nags them (email + SMS) until they pay.
// ───────────────────────────────────────────────────────────────────
export async function createRenewalPaymentLink(params: {
  linkId: string; // ≤50 chars, alphanumeric + - _
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  planName: string;
  expiryHours?: number; // default 72h (grace window)
}): Promise<{ success: boolean; linkUrl?: string; linkId?: string; error?: string }> {
  const cashfree = getCashfreeInstance();

  const request = {
    link_id: params.linkId,
    link_amount: params.amount,
    link_currency: "INR",
    link_purpose: `ChirplyMint ${params.planName} plan renewal`,
    customer_details: {
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
    },
    link_auto_reminders: true, // Cashfree emails/SMSes the customer automatically
    link_expiry_time: new Date(
      Date.now() + (params.expiryHours ?? 72) * 60 * 60 * 1000
    ).toISOString(),
    link_notes: {
      product: "chirplymint",
      type: "renewal",
      plan: params.planName,
    },
  };

  try {
    // x_idempotency_key: a retry (cron re-fire) with the same link_id never
    // double-creates; Cashfree returns the existing link.
    const response = await cashfree.PGCreateLink(
      request,
      undefined,
      params.linkId
    );
    const data = response.data as Record<string, unknown>;
    return {
      success: true,
      linkUrl: data?.link_url as string,
      linkId: data?.link_id as string,
    };
  } catch (error) {
    console.error("[Cashfree] Create link error:", error);
    return { success: false, error: "Failed to create payment link" };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Refunds (2026-01-01). refund_id is idempotent: re-POSTing the same id is
// safe. 6-month window from payment date per Cashfree policy.
// ───────────────────────═───────────────────────────────────────────
export async function createRefund(params: {
  orderId: string;
  refundId: string; // our unique id, e.g. RF_<orderId>_<timestamp> — idempotent
  amount: number;
  note?: string;
}): Promise<{ success: boolean; refundStatus?: string; error?: string }> {
  const cashfree = getCashfreeInstance();

  try {
    const response = await cashfree.PGOrderCreateRefund(
      params.orderId,
      {
        refund_amount: params.amount,
        refund_id: params.refundId,
        refund_note: params.note || "Refund via ChirplyMint",
      },
      undefined,
      params.refundId
    );
    const data = response.data as Record<string, unknown>;
    return {
      success: true,
      refundStatus: data?.refund_status as string,
    };
  } catch (error) {
    console.error("[Cashfree] Refund error:", error);
    return { success: false, error: "Failed to create refund" };
  }
}

/**
 * Verify Cashfree webhook signature (HMAC).
 */
export function verifyWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  if (!process.env.CASHFREE_WEBHOOK_SECRET) {
    console.warn("[Cashfree] Webhook secret not configured");
    return false;
  }

  const cashfree = getCashfreeInstance();

  try {
    const result = cashfree.PGVerifyWebhookSignature(
      signature,
      rawBody,
      timestamp
    );
    return !!result;
  } catch {
    return false;
  }
}
