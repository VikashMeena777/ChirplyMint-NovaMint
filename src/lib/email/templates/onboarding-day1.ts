/**
 * Onboarding Day 1 — Welcome Email
 * Sent immediately after signup.
 */
export function getWelcomeOnboardingHtml(name: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.novamintnetworks.in";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;margin-top:32px;margin-bottom:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#16a34a,#059669);padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;font-size:24px;margin:0 0 8px;">Welcome to ChirplyMint! 🚀</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">Your Instagram DM automation starts here.</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px;">
      <p style="color:#18181b;font-size:16px;line-height:1.6;">Hey ${name || "there"} 👋</p>
      <p style="color:#3f3f46;font-size:14px;line-height:1.7;">
        Thanks for joining ChirplyMint! You're now set up to automate your Instagram DMs, capture leads, and grow your business on autopilot.
      </p>

      <p style="color:#18181b;font-size:15px;font-weight:600;margin-top:24px;">Here's how to get started:</p>
      
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:16px 0;">
        <p style="margin:0 0 12px;color:#166534;font-size:14px;font-weight:600;">Step 1: Connect your Instagram</p>
        <p style="margin:0 0 16px;color:#3f3f46;font-size:13px;">Link your Instagram business account to start receiving DMs through ChirplyMint.</p>
        
        <p style="margin:0 0 12px;color:#166534;font-size:14px;font-weight:600;">Step 2: Create your first automation</p>
        <p style="margin:0 0 16px;color:#3f3f46;font-size:13px;">Set up keyword triggers like "price" or "info" to auto-reply when followers DM you.</p>
        
        <p style="margin:0 0 8px;color:#166534;font-size:14px;font-weight:600;">Step 3: Turn on your AI Agent</p>
        <p style="margin:0;color:#3f3f46;font-size:13px;">Let AI handle conversations with your custom persona and FAQ knowledge.</p>
      </div>

      <div style="text-align:center;margin-top:24px;">
        <a href="${appUrl}/dashboard" 
           style="display:inline-block;background:linear-gradient(135deg,#16a34a,#059669);color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">
          Go to Dashboard →
        </a>
      </div>

      <p style="color:#71717a;font-size:12px;margin-top:32px;text-align:center;">
        Need help? Reply to this email or visit our <a href="${appUrl}/help" style="color:#16a34a;text-decoration:none;">Help Center</a>.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#fafafa;padding:16px 24px;text-align:center;border-top:1px solid #f4f4f5;">
      <p style="color:#a1a1aa;font-size:11px;margin:0;">
        ChirplyMint by NovaMint Networks · Instagram DM Automation
      </p>
    </div>
  </div>
</body>
</html>`;
}
