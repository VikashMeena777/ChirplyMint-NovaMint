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

  cashfree.XApiVersion = process.env.CASHFREE_API_VERSION || "2025-01-01";

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
    },
  };

  try {
    const response = await cashfree.PGCreateOrder(request);
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
