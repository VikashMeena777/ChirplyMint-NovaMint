/**
 * Generate welcome email HTML
 */
export function getWelcomeEmailHtml(name: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" style="max-width:520px;width:100%;border-collapse:collapse;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d9a6c,#0a7d58);padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                ✨ Chirply<span style="opacity:0.9">Mint</span>
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;color:#18181b;font-size:20px;font-weight:600;">
                Welcome aboard, ${name || "there"}! 🎉
              </h2>
              <p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.6;">
                You've just unlocked the power of AI-driven Instagram DM automation. Here's how to get started in 3 simple steps:
              </p>
              
              <!-- Steps -->
              <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 0;">
                    <table role="presentation" style="width:100%;border-collapse:collapse;background:#f4faf7;border-radius:12px;padding:16px;">
                      <tr>
                        <td style="padding:16px;">
                          <p style="margin:0 0 8px;font-weight:600;color:#18181b;font-size:14px;">1️⃣ Connect your Instagram</p>
                          <p style="margin:0;color:#52525b;font-size:13px;">Link your Instagram Business account in Settings.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;">
                    <table role="presentation" style="width:100%;border-collapse:collapse;background:#f4faf7;border-radius:12px;">
                      <tr>
                        <td style="padding:16px;">
                          <p style="margin:0 0 8px;font-weight:600;color:#18181b;font-size:14px;">2️⃣ Create your first automation</p>
                          <p style="margin:0;color:#52525b;font-size:13px;">Set a keyword trigger and craft your DM template.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;">
                    <table role="presentation" style="width:100%;border-collapse:collapse;background:#f4faf7;border-radius:12px;">
                      <tr>
                        <td style="padding:16px;">
                          <p style="margin:0 0 8px;font-weight:600;color:#18181b;font-size:14px;">3️⃣ Watch the leads come in</p>
                          <p style="margin:0;color:#52525b;font-size:13px;">Every matching comment triggers an automatic DM.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:24px;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.com"}/dashboard"
                       style="display:inline-block;background:linear-gradient(135deg,#0d9a6c,#0a7d58);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:600;letter-spacing:0.3px;">
                      Go to Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #f4f4f5;text-align:center;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">
                © ${new Date().getFullYear()} ChirplyMint by NovaMint Networks<br/>
                Automating Instagram, one DM at a time.
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
