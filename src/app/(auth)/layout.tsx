import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { InAppBrowserNotice } from "@/components/auth/in-app-browser-notice";
import { isInAppBrowser, chromeHomeIntentUrl } from "@/lib/utils/in-app-browser";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Someone signing in from inside a mail or social app should know why that
  // session won't follow them into Chrome.
  const hdrs = await headers();
  const ua = hdrs.get("user-agent");
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const showInAppNotice = isInAppBrowser(ua) && host.length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <Image src="/logo.png" alt="ChirplyMint" width={40} height={40} className="w-10 h-10 rounded-xl" />
        <span className="text-2xl font-bold tracking-tight text-foreground">
          Chirply<span className="text-[oklch(0.52_0.19_162)]">Mint</span>
        </span>
      </Link>

      {/* Auth card */}
      <div className="w-full max-w-md">{children}</div>

      {/* Footer */}
      <p className="mt-10 text-xs text-muted-foreground">
        © {new Date().getFullYear()} ChirplyMint by NovaMint Networks
      </p>

      {showInAppNotice && (
        <InAppBrowserNotice host={host} chromeIntent={chromeHomeIntentUrl(host, ua)} />
      )}
    </div>
  );
}
