/**
 * Mail apps and social apps open links in their OWN embedded browser, which
 * has a separate cookie jar from Chrome/Safari. Signing in there looks
 * successful and then vanishes the moment the person opens their real browser
 * — the single most confusing thing about confirming an account from an email
 * on a phone.
 *
 * We can't make a mail app open a specific browser, so we detect the situation
 * and say so. Kept pure so it can be tested against real user-agent strings.
 */

/** Is this an embedded browser inside another app? */
export function isInAppBrowser(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  // Gmail's Android webview reports GSA; Android webviews also carry "; wv)".
  return /GSA\/|FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|WhatsApp|Snapchat|Pinterest|MicroMessenger|; wv\)/i.test(
    userAgent
  );
}

export function isAndroid(userAgent: string | null | undefined): boolean {
  return /Android/i.test(userAgent ?? "");
}

/**
 * An Android intent URL is the one reliable way to hand a link from inside an
 * app's webview to Chrome. Returns null where no such hand-off exists (iOS has
 * no equivalent), in which case the UI explains the ⋯ → Open in browser route.
 */
export function chromeHomeIntentUrl(
  host: string,
  userAgent: string | null | undefined
): string | null {
  if (!host || !isAndroid(userAgent)) return null;
  return `intent://${host}/#Intent;scheme=https;package=com.android.chrome;end`;
}
