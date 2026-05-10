/**
 * Instagram Connected — Celebration Email
 * Sent when user successfully links their IG business account.
 */
export function getInstagramConnectedHtml(data: {
  name: string;
  igUsername: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.novamintnetworks.in";

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
            <td style="background:linear-gradient(135deg,#16a34a,#059669);padding:32px 32px 24px;text-align:center;">
              <div style="font-size:48px;margin-bottom:12px;">🎉</div>
              <h1 style="margin:0 0 4px;color:#ffffff;font-size:22px;font-weight:700;">Instagram Connected!</h1>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;">@${data.igUsername} is now linked</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#18181b;font-size:16px;line-height:1.6;">
                Hey ${data.name || "there"} 👋
              </p>
              <p style="margin:0 0 20px;color:#3f3f46;font-size:14px;line-height:1.7;">
                Great news! Your Instagram account <strong>@${data.igUsername}</strong> is now connected to ChirplyMint. You're ready to start automating your DMs!
              </p>

              <!-- Next Steps -->
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:0 0 24px;">
                <p style="margin:0 0 12px;font-weight:600;color:#166534;font-size:14px;">What to do next:</p>
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;color:#166534;font-size:20px;width:32px;vertical-align:top;">1️⃣</td>
                    <td style="padding:6px 0;color:#3f3f46;font-size:13px;line-height:1.5;">
                      <strong>Create a keyword automation</strong> — set triggers like "price" or "info" to auto-reply to DMs
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#166534;font-size:20px;width:32px;vertical-align:top;">2️⃣</td>
                    <td style="padding:6px 0;color:#3f3f46;font-size:13px;line-height:1.5;">
                      <strong>Set up your AI Agent</strong> — let AI handle conversations with your custom persona
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#166534;font-size:20px;width:32px;vertical-align:top;">3️⃣</td>
                    <td style="padding:6px 0;color:#3f3f46;font-size:13px;line-height:1.5;">
                      <strong>Watch the leads roll in</strong> — every DM reply is captured as a lead automatically
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA -->
              <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/dashboard/automations"
                       style="display:inline-block;background:linear-gradient(135deg,#16a34a,#059669);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:600;">
                      Create Your First Automation →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #f4f4f5;text-align:center;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;">
                © ${new Date().getFullYear()} ChirplyMint by NovaMint Networks
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
