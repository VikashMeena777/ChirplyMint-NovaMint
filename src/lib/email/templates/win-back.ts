/**
 * Win-Back — 30 Day Re-engagement Email
 * Sent when user has been inactive for 30+ days.
 */
export function getWinBackHtml(data: {
  name: string;
  daysSinceActive: number;
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
            <td style="background:linear-gradient(135deg,#ec4899,#db2777);padding:32px 32px 24px;text-align:center;">
              <div style="font-size:48px;margin-bottom:12px;">🔙</div>
              <h1 style="margin:0 0 4px;color:#ffffff;font-size:22px;font-weight:700;">We Really Miss You!</h1>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;">It's been ${data.daysSinceActive} days</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#18181b;font-size:16px;line-height:1.6;">
                Hey ${data.name || "there"} 💛
              </p>
              <p style="margin:0 0 20px;color:#3f3f46;font-size:14px;line-height:1.7;">
                It's been over a month since we last saw you on ChirplyMint. Your Instagram automations are waiting for you, and here's what's new:
              </p>

              <!-- What's New -->
              <div style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:12px;padding:20px;margin:0 0 20px;">
                <p style="margin:0 0 12px;font-weight:600;color:#be185d;font-size:14px;">🆕 What's new since you left:</p>
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;color:#be185d;font-size:16px;width:24px;vertical-align:top;">✨</td>
                    <td style="padding:6px 0;color:#3f3f46;font-size:13px;line-height:1.5;">
                      <strong>Smarter AI Agent</strong> — improved conversation quality with custom personas
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#be185d;font-size:16px;width:24px;vertical-align:top;">⚡</td>
                    <td style="padding:6px 0;color:#3f3f46;font-size:13px;line-height:1.5;">
                      <strong>Drip Sequences</strong> — multi-step follow-up DMs on autopilot
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#be185d;font-size:16px;width:24px;vertical-align:top;">📊</td>
                    <td style="padding:6px 0;color:#3f3f46;font-size:13px;line-height:1.5;">
                      <strong>Better Analytics</strong> — track your DM performance with weekly reports
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Referral Incentive -->
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:0 0 24px;text-align:center;">
                <p style="margin:0 0 4px;font-weight:600;color:#166534;font-size:14px;">🎁 Welcome back offer</p>
                <p style="margin:0;color:#3f3f46;font-size:13px;">
                  Refer a friend and get <strong>14 days of Pro free</strong>!
                </p>
              </div>

              <!-- CTA -->
              <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/dashboard"
                       style="display:inline-block;background:linear-gradient(135deg,#ec4899,#db2777);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:600;">
                      Come Back to ChirplyMint →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #f4f4f5;text-align:center;">
              <p style="margin:0 0 8px;color:#a1a1aa;font-size:11px;">
                You're receiving this because you haven't visited in a while.
              </p>
              <a href="${appUrl}/dashboard/settings"
                 style="color:#a1a1aa;font-size:11px;text-decoration:underline;">
                Manage notification preferences
              </a>
              <p style="margin:12px 0 0;color:#a1a1aa;font-size:11px;">
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
