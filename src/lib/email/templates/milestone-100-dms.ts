/**
 * 100 DMs Milestone — Achievement Email
 * Sent when user crosses 100 lifetime DMs sent.
 */
export function getMilestone100DmsHtml(data: {
  name: string;
  totalDms: number;
  totalLeads: number;
  conversionRate: string;
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
            <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 32px 24px;text-align:center;">
              <div style="font-size:48px;margin-bottom:12px;">🏆</div>
              <h1 style="margin:0 0 4px;color:#ffffff;font-size:22px;font-weight:700;">100 DMs Milestone!</h1>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;">You're crushing it with automation</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#18181b;font-size:16px;line-height:1.6;">
                Hey ${data.name || "there"} 🏆
              </p>
              <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.7;">
                You've just crossed <strong>100 automated DMs</strong>! That's 100 conversations you didn't have to manually handle. Here's your performance snapshot:
              </p>

              <!-- Stats Grid -->
              <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <tr>
                  <td style="width:33%;padding:6px;">
                    <div style="background:#f0fdf4;border-radius:12px;padding:16px;text-align:center;">
                      <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a;">${data.totalDms}</p>
                      <p style="margin:4px 0 0;font-size:11px;color:#52525b;">Total DMs</p>
                    </div>
                  </td>
                  <td style="width:33%;padding:6px;">
                    <div style="background:#eff6ff;border-radius:12px;padding:16px;text-align:center;">
                      <p style="margin:0;font-size:28px;font-weight:700;color:#2563eb;">${data.totalLeads}</p>
                      <p style="margin:4px 0 0;font-size:11px;color:#52525b;">Leads</p>
                    </div>
                  </td>
                  <td style="width:33%;padding:6px;">
                    <div style="background:#fef3c7;border-radius:12px;padding:16px;text-align:center;">
                      <p style="margin:0;font-size:28px;font-weight:700;color:#d97706;">${data.conversionRate}%</p>
                      <p style="margin:4px 0 0;font-size:11px;color:#52525b;">Convert</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Motivational -->
              <div style="background:linear-gradient(135deg,#fefce8,#fef9c3);border:1px solid #fde68a;border-radius:12px;padding:16px;margin:0 0 24px;text-align:center;">
                <p style="margin:0;font-size:14px;color:#92400e;font-weight:500;">
                  💡 You've saved approximately <strong>${Math.round(data.totalDms * 1.5)} minutes</strong> by automating your DMs!
                </p>
              </div>

              <!-- CTA -->
              <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/dashboard"
                       style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:600;">
                      View Your Dashboard →
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
