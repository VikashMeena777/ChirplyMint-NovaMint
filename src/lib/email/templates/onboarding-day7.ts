/**
 * Onboarding Day 7 — Create First Automation
 * Sent 7 days after signup if user hasn't created any automations.
 */
export function getFirstAutomationHtml(name: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.novamintnetworks.in";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;margin-top:32px;margin-bottom:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    
    <div style="background:linear-gradient(135deg,#16a34a,#059669);padding:28px 24px;text-align:center;">
      <h1 style="color:#fff;font-size:22px;margin:0;">Time to Automate! ⚡</h1>
    </div>

    <div style="padding:32px 24px;">
      <p style="color:#18181b;font-size:16px;line-height:1.6;">Hey ${name || "there"},</p>
      <p style="color:#3f3f46;font-size:14px;line-height:1.7;">
        You've been with us for a week now! 🎉 It's the perfect time to create your first DM automation.
      </p>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:16px 0;">
        <p style="margin:0 0 8px;color:#166534;font-size:14px;font-weight:600;">💡 Quick Start Idea</p>
        <p style="margin:0;color:#3f3f46;font-size:13px;">
          Create a keyword trigger for <strong>"price"</strong> or <strong>"info"</strong> — whenever someone DMs you with that word, automatically send them your pricing sheet or product info. Takes 30 seconds to set up!
        </p>
      </div>

      <div style="text-align:center;margin-top:24px;">
        <a href="${appUrl}/dashboard/automations" 
           style="display:inline-block;background:linear-gradient(135deg,#16a34a,#059669);color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">
          Create My First Automation →
        </a>
      </div>

      <p style="color:#71717a;font-size:13px;margin-top:24px;text-align:center;">
        Already have automations running? Amazing — you're ahead of 90% of users! 🚀
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
