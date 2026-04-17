/**
 * Generate weekly report email HTML
 */
export function getWeeklyReportEmailHtml(data: {
  name: string;
  dmsSent: number;
  leadsCapured: number;
  conversionRate: string;
  topAutomation: string | null;
  insight: string;
  periodStart: string;
  periodEnd: string;
}): string {
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
              <h1 style="margin:0 0 4px;color:#ffffff;font-size:24px;font-weight:700;">📊 Weekly Report</h1>
              <p style="margin:0;color:rgba(255,255,255,0.8);font-size:13px;">ChirplyMint Performance Summary</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.6;">
                Hey ${data.name || "there"}, here's how your automations performed this week.
              </p>
              
              <!-- Stats Grid -->
              <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <tr>
                  <td style="width:50%;padding:8px;">
                    <div style="background:#f4faf7;border-radius:12px;padding:16px;text-align:center;">
                      <p style="margin:0;font-size:28px;font-weight:700;color:#0d9a6c;">${data.dmsSent}</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#52525b;">DMs Sent</p>
                    </div>
                  </td>
                  <td style="width:50%;padding:8px;">
                    <div style="background:#f4faf7;border-radius:12px;padding:16px;text-align:center;">
                      <p style="margin:0;font-size:28px;font-weight:700;color:#0d9a6c;">${data.leadsCapured}</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#52525b;">Leads Captured</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="width:50%;padding:8px;">
                    <div style="background:#f4faf7;border-radius:12px;padding:16px;text-align:center;">
                      <p style="margin:0;font-size:28px;font-weight:700;color:#0d9a6c;">${data.conversionRate}%</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#52525b;">Conversion Rate</p>
                    </div>
                  </td>
                  <td style="width:50%;padding:8px;">
                    <div style="background:#f4faf7;border-radius:12px;padding:16px;text-align:center;">
                      <p style="margin:0;font-size:14px;font-weight:600;color:#0d9a6c;word-break:break-word;">${data.topAutomation || "—"}</p>
                      <p style="margin:4px 0 0;font-size:12px;color:#52525b;">Top Automation</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- AI Insight -->
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-weight:600;color:#92400e;font-size:13px;">💡 AI Insight</p>
                <p style="margin:0;color:#78350f;font-size:13px;line-height:1.5;">${data.insight}</p>
              </div>

              <!-- CTA -->
              <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.com"}/dashboard/analytics"
                       style="display:inline-block;background:linear-gradient(135deg,#0d9a6c,#0a7d58);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:600;">
                      View Full Analytics →
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
                You're receiving this because you have weekly reports enabled.
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.com"}/dashboard/settings"
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
