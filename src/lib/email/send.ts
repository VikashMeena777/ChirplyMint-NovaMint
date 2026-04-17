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
}

/**
 * Send an email via Resend. Gracefully fails if API key is not set.
 */
export async function sendEmail({
  to,
  subject,
  html,
  from,
}: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured — skipping email send");
    return { success: false, error: "Email not configured" };
  }

  try {
    const { error } = await getResend().emails.send({
      from: from || process.env.DEFAULT_FROM_EMAIL || "ChirplyMint <noreply@chirplymint.com>",
      to,
      subject,
      html,
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
