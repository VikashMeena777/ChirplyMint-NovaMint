/**
 * Inactive Nudge — 7 Day Re-engagement Email
 * Sent when user has no DM activity for 7+ days.
 */
export function getInactiveNudgeHtml(data: {
  name: string;
  daysSinceActive: number;
  totalLeads: number;
  activeAutomations: number;
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
            <td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:32px 32px 24px;text-align:center;">
              <div style="font-size:48px;margin-bottom:12px;">💤</div>
              <h1 style="margin:0 0 4px;color:#ffffff;font-size:22px;font-weight:700;">We Miss You!</h1>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;">Your automations need attention</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#18181b;font-size:16px;line-height:1.6;">
                Hey ${data.name || "there"} 👋
              </p>
              <p style="margin:0 0 20px;color:#3f3f46;font-size:14px;line-height:1.7;">
                It's been <strong>${data.daysSinceActive} days</strong> since your last activity on ChirplyMint. While you were away, you might be missing out on potential leads!
              </p>

              <!-- Status Cards -->
              <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 24px;">
                <tr>
                  <td style="width:50%;padding:6px;">
                    <div style="background:#fef2f2;border-radius:12px;padding:16px;text-align:center;">
                      <p style="margin:0;font-size:28px;font-weight:700;color:#dc2626;">${data.activeAutomations}</p>
                      <p style="margin:4px 0 0;font-size:11px;color:#52525b;">Active Automations</p>
                    </div>
                  </td>
                  <td style="width:50%;padding:6px;">
                    <div style="background:#f0fdf4;border-radius:12px;padding:16px;text-align:center;">
                      <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a;">${data.totalLeads}</p>
                      <p style="margin:4px 0 0;font-size:11px;color:#52525b;">Total Leads</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Tips -->
              <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:16px;margin:0 0 24px;">
                <p style="margin:0 0 8px;font-weight:600;color:#4338ca;font-size:13px;">💡 Quick wins to try</p>
                <p style="margin:0 0 6px;color:#3730a3;font-size:13px;">• Add a new keyword trigger for common questions</p>
                <p style="margin:0 0 6px;color:#3730a3;font-size:13px;">• Review your AI agent's persona and FAQs</p>
                <p style="margin:0;color:#3730a3;font-size:13px;">• Check your lead list for follow-up opportunities</p>
              </div>

              <!-- CTA -->
              <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/dashboard"
                       style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:600;">
                      Get Back to ChirplyMint →
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
                You're receiving this because you haven't been active recently.
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
