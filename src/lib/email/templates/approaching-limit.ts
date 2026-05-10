/**
 * Approaching DM Limit (80%) — Warning Email
 * Sent when user crosses 80% of their monthly DM limit.
 */
export function getApproachingLimitHtml(data: {
  name: string;
  used: number;
  limit: number;
  plan: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.novamintnetworks.in";
  const pct = Math.round((data.used / data.limit) * 100);
  const remaining = data.limit - data.used;

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
              <div style="font-size:48px;margin-bottom:12px;">⚠️</div>
              <h1 style="margin:0 0 4px;color:#ffffff;font-size:22px;font-weight:700;">DM Limit Warning</h1>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;">You're at ${pct}% of your monthly limit</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#18181b;font-size:16px;line-height:1.6;">
                Hey ${data.name || "there"} 👋
              </p>
              <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.7;">
                You've used <strong>${data.used} out of ${data.limit}</strong> DMs this month on your ${data.plan} plan. You have <strong>${remaining} DMs remaining</strong>.
              </p>

              <!-- Progress Bar -->
              <div style="margin:0 0 24px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span style="font-size:12px;color:#52525b;">${data.used} used</span>
                  <span style="font-size:12px;color:#52525b;">${data.limit} limit</span>
                </div>
                <div style="background:#f4f4f5;border-radius:8px;height:12px;overflow:hidden;">
                  <div style="background:linear-gradient(90deg,#f59e0b,#ef4444);height:100%;width:${Math.min(pct, 100)}%;border-radius:8px;"></div>
                </div>
              </div>

              <!-- Warning Box -->
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:0 0 24px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                  Once you hit your limit, your automations will stop sending DMs until next month. Upgrade now to get more DMs and keep your automations running!
                </p>
              </div>

              <!-- CTA -->
              <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/dashboard/settings"
                       style="display:inline-block;background:linear-gradient(135deg,#16a34a,#059669);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:600;">
                      Upgrade Your Plan →
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
