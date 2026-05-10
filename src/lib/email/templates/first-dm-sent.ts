/**
 * First DM Sent — Milestone Celebration
 * Sent when user's first-ever DM goes out via automation.
 */
export function getFirstDmSentHtml(data: {
  name: string;
  recipientUsername: string;
  automationName: string;
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
              <div style="font-size:48px;margin-bottom:12px;">🚀</div>
              <h1 style="margin:0 0 4px;color:#ffffff;font-size:22px;font-weight:700;">Your First DM Just Went Out!</h1>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;">ChirplyMint is working for you</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#18181b;font-size:16px;line-height:1.6;">
                Hey ${data.name || "there"} 🎉
              </p>
              <p style="margin:0 0 20px;color:#3f3f46;font-size:14px;line-height:1.7;">
                Your automation <strong>"${data.automationName}"</strong> just sent its first DM to <strong>@${data.recipientUsername}</strong>. This is a huge milestone — you're now automating your Instagram outreach!
              </p>

              <!-- Milestone Card -->
              <div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px solid #bbf7d0;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;">
                <p style="margin:0;font-size:40px;">🏅</p>
                <p style="margin:8px 0 4px;font-weight:700;color:#166534;font-size:16px;">First DM Achievement Unlocked!</p>
                <p style="margin:0;color:#3f3f46;font-size:13px;">You're in the top 1% of creators who automate their DMs</p>
              </div>

              <!-- What Happens Next -->
              <div style="background:#fafafa;border-radius:12px;padding:16px;margin:0 0 24px;">
                <p style="margin:0 0 8px;font-weight:600;color:#18181b;font-size:14px;">What happens next?</p>
                <p style="margin:0;color:#52525b;font-size:13px;line-height:1.6;">
                  Every time someone triggers your keyword, ChirplyMint will automatically reply and capture them as a lead. Check your messages page to see the conversation!
                </p>
              </div>

              <!-- CTA -->
              <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/dashboard/messages"
                       style="display:inline-block;background:linear-gradient(135deg,#16a34a,#059669);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:600;">
                      View Your Messages →
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
