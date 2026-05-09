/**
 * Onboarding Day 3 — Connect Instagram
 * Sent 3 days after signup if user hasn't connected Instagram yet.
 */
export function getConnectInstagramHtml(name: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.novamintnetworks.in";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;margin-top:32px;margin-bottom:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    
    <div style="background:linear-gradient(135deg,#16a34a,#059669);padding:28px 24px;text-align:center;">
      <h1 style="color:#fff;font-size:22px;margin:0;">Connect Your Instagram 📱</h1>
    </div>

    <div style="padding:32px 24px;">
      <p style="color:#18181b;font-size:16px;line-height:1.6;">Hey ${name || "there"},</p>
      <p style="color:#3f3f46;font-size:14px;line-height:1.7;">
        We noticed you haven't connected your Instagram account yet. Connecting takes less than 60 seconds and unlocks everything ChirplyMint can do for you:
      </p>

      <ul style="color:#3f3f46;font-size:14px;line-height:2;padding-left:20px;">
        <li>🤖 AI-powered auto-replies to DMs</li>
        <li>⚡ Keyword-triggered automations</li>
        <li>📊 Lead capture + analytics</li>
        <li>💬 Drip sequences for engagement</li>
      </ul>

      <div style="text-align:center;margin-top:24px;">
        <a href="${appUrl}/dashboard/settings?tab=instagram" 
           style="display:inline-block;background:linear-gradient(135deg,#16a34a,#059669);color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">
          Connect Instagram Now →
        </a>
      </div>

      <p style="color:#71717a;font-size:13px;margin-top:24px;text-align:center;">
        Already connected? Ignore this email — you're all set! 🎉
      </p>
    </div>

    <div style="background:#fafafa;padding:16px 24px;text-align:center;border-top:1px solid #f4f4f5;">
      <p style="color:#a1a1aa;font-size:11px;margin:0;">
        ChirplyMint by NovaMint Networks · Instagram DM Automation
      </p>
    </div>
  </div>
</body>
</html>`;
}
