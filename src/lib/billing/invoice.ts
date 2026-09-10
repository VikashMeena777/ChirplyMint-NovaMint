import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Professional invoice service (non-GST Indian seller).
 *
 * Invoices are created ONLY on confirmed payment (never at order creation)
 * and carry a sequential, financial-year-scoped number: CM/2026-27/00042.
 * Sequential numbering + no gaps is the core Indian invoice requirement.
 */

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Indian financial year label for the invoice number: 2026-27 */
export function financialYearLabel(date = new Date()): string {
  const y = date.getFullYear();
  // FY starts April 1
  const fyStart = y - (date.getMonth() < 3 ? 1 : 0); // Jan-Mar belongs to previous FY
  return `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
}

/**
 * Create the invoice for a paid order. Idempotent: re-running for the same
 * order_id returns the existing invoice (webhook + verify race).
 */
export async function createInvoiceForPaidOrder(params: {
  userId: string;
  orderId: string;
  amount: number;
  plan: string;
  description: string;
}): Promise<{ invoiceNumber?: string; error?: string }> {
  const admin = getAdmin();

  // Idempotency: one invoice per order
  const { data: existing } = await admin
    .from("invoices")
    .select("id")
    .eq("order_id", params.orderId)
    .limit(1)
    .maybeSingle();
  if (existing) return {};

  // Sequential number scoped to the financial year.
  // count+1 can collide under concurrency, so retry with the next number on
  // duplicate invoice_number (order_id duplicates still return idempotent {}).
  const fy = financialYearLabel();
  const prefix = `CM/${fy}/`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { count: fyCount } = await admin
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .like("invoice_number", `${prefix}%`);
    const seq = (fyCount ?? 0) + 1 + attempt;
    const invoiceNumber = `${prefix}${String(seq).padStart(5, "0")}`;

    const { error } = await admin.from("invoices").insert({
      user_id: params.userId,
      order_id: params.orderId,
      invoice_number: invoiceNumber,
      amount: params.amount,
      plan: params.plan,
      description: params.description,
      paid_at: new Date().toISOString(),
    });

    if (!error) return { invoiceNumber };
    // Race: another worker inserted first — fine (idempotent outcome)
    if (error.code === "23505") {
      // Same order_id duplicated → already invoiced, not an error.
      const { data: recheck } = await admin
        .from("invoices")
        .select("id")
        .eq("order_id", params.orderId)
        .limit(1)
        .maybeSingle();
      if (recheck) return {};
      // Otherwise it was an invoice_number collision — retry with next seq.
      continue;
    }
    return { error: error.message };
  }
  return { error: "Could not allocate invoice number after retries" };
}

/** Amount in words for INR (Indian system: crore/lakh). */
export function amountInWords(amount: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(n: number): string {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 ? " " + ones[n % 10] : ""}`;
  }

  function threeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return `${h ? ones[h] + " Hundred" : ""}${h && rest ? " " : ""}${rest ? twoDigits(rest) : ""}`;
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  let words = parts.join(" ").trim() + " Rupees";
  if (paise) words += ` and ${twoDigits(paise)} Paise`;
  return words + " Only";
}
