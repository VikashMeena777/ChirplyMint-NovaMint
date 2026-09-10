/**
 * Password-reset email.
 *
 * Deliverability matters here more than anywhere else: Gmail aggressively
 * flags "click this link and enter your password" mail. Sender domain and
 * link domain MUST match (we mail from our domain and link to our domain —
 * never to the Supabase project host), the wording states plainly who
 * requested it, and there's a clear "ignore this" escape hatch.
 */
export function getPasswordResetHtml(params: {
  name: string;
  resetUrl: string;
  expiresMinutes: number;
}): string {
  const { name, resetUrl, expiresMinutes } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" style="max-width:520px;width:100%;border-collapse:collapse;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d9a6c,#0a7d58);padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                ✨ Chirply<span style="opacity:0.9">Mint</span>
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;color:#18181b;font-size:20px;font-weight:600;">
                Reset your password
              </h2>
              <p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.6;">
                Hi ${name || "there"}, we received a request to reset the password for your
                ChirplyMint account. Click the button below to choose a new one.
              </p>

              <table role="presentation" style="width:100%;border-collapse:collapse;margin:24px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display:inline-block;background:#0d9a6c;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:15px;">
                      Choose a new password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#71717a;font-size:12px;line-height:1.6;">
                Or open this link in your browser:
              </p>
              <p style="margin:0 0 24px;color:#0d9a6c;font-size:12px;word-break:break-all;">
                ${resetUrl}
              </p>

              <p style="margin:0;color:#71717a;font-size:12px;line-height:1.6;border-top:1px solid #e4e4e7;padding-top:16px;">
                This link expires in ${expiresMinutes} minutes and can be used once.
                If you didn't request a password reset, you can safely ignore this email —
                your password stays unchanged. We will never ask you to reply with your password.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;line-height:1.6;">
                ChirplyMint by NovaMint Networks<br/>
                This is an automated security email for your account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
