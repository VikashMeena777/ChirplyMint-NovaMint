/**
 * Team invitation email.
 *
 * Deliverability notes (this is a transactional invite — it must not look
 * like phishing): a plain descriptive subject, the inviter's real name and
 * email in the body so the recipient recognises the sender, the destination
 * URL shown as visible text (not a bare "click here"), and an explicit
 * "you can ignore this" line.
 */
export function getTeamInviteHtml(params: {
  inviterName: string;
  inviterEmail: string;
  inviteUrl: string;
  seatLimit: number;
}): string {
  const { inviterName, inviterEmail, inviteUrl, seatLimit } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" style="max-width:520px;width:100%;border-collapse:collapse;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#0d9a6c,#0a7d58);padding:32px 32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                ✨ Chirply<span style="opacity:0.9">Mint</span>
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;color:#18181b;font-size:20px;font-weight:600;">
                ${inviterName} added you to their ChirplyMint team
              </h2>
              <p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.6;">
                <strong>${inviterName}</strong> (${inviterEmail}) invited you to join their workspace on
                ChirplyMint — an Instagram DM automation tool. Team members share automations,
                leads and analytics on a plan with up to ${seatLimit} seats.
              </p>

              <table role="presentation" style="width:100%;border-collapse:collapse;margin:24px 0;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display:inline-block;background:#0d9a6c;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:15px;">
                      Accept invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#71717a;font-size:12px;line-height:1.6;">
                Or open this link in your browser:
              </p>
              <p style="margin:0 0 24px;color:#0d9a6c;font-size:12px;word-break:break-all;">
                ${inviteUrl}
              </p>

              <p style="margin:0;color:#71717a;font-size:12px;line-height:1.6;border-top:1px solid #e4e4e7;padding-top:16px;">
                This invitation expires in 7 days. If you weren't expecting it, you can safely
                ignore this email — nothing will be shared with you unless you accept.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;line-height:1.6;">
                ChirplyMint by NovaMint Networks<br/>
                You received this because ${inviterEmail} entered your address as a teammate.
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
