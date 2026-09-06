import { Resend } from "resend";

// Lazy initialization — avoid crashing at build time when env var is absent
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || "");
  }
  return _resend;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  /** Owner of the mailbox — required for marketing emails (unsubscribe footer). */
  userId?: string;
  /**
   * "transactional" (default): receipts, security alerts, milestones — no footer.
   * "marketing": nudges, digests, win-backs — gets a one-click unsubscribe footer
   * and must respect notification_preferences at the call site.
   */
  category?: "transactional" | "marketing";
}

function unsubscribeFooter(userId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.novamintnetworks.in";
  return `
  <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #eee; text-align: center;">
    <a href="${appUrl}/api/email/unsubscribe?user=${userId}"
       style="color: #999; font-size: 12px; text-decoration: underline;">
      Unsubscribe from product emails
    </a>
    <p style="color: #bbb; font-size: 11px; margin: 6px 0 0 0;">ChirplyMint — Instagram DM Automation</p>
  </div>`;
}

/**
 * Send an email via Resend. Gracefully fails if API key is not set.
 */
export async function sendEmail({
  to,
  subject,
  html,
  from,
  userId,
  category = "transactional",
}: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured — skipping email send");
    return { success: false, error: "Email not configured" };
  }

  const finalHtml =
    category === "marketing" && userId ? html + unsubscribeFooter(userId) : html;

  try {
    const { error } = await getResend().emails.send({
      from: from || process.env.DEFAULT_FROM_EMAIL || "ChirplyMint <noreply@chirplymint.com>",
      to,
      subject,
      html: finalHtml,
    });

    if (error) {
      console.error("[Email] Send failed:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[Email] Unexpected error:", err);
    return { success: false, error: "Failed to send email" };
  }
}
