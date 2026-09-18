import { Sidebar } from "@/components/layouts/sidebar";
import { MobileBottomNav } from "@/components/layouts/mobile-bottom-nav";
import { NotificationBell } from "@/components/ui/notification-bell";
import { CommandPalette, CommandPaletteMobileTrigger } from "@/components/ui/command-palette";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ConfirmedNotice } from "@/components/auth/confirmed-notice";
import { InAppBrowserNotice } from "@/components/auth/in-app-browser-notice";
import { headers } from "next/headers";
import { isInAppBrowser, chromeHomeIntentUrl } from "@/lib/utils/in-app-browser";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Detected on the server so the notice never flashes in late. Reading the
  // user-agent HERE (not in the root layout) keeps the marketing pages
  // statically rendered.
  const hdrs = await headers();
  const ua = hdrs.get("user-agent");
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const showInAppNotice = isInAppBrowser(ua) && host.length > 0;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      {/* overflow-x-clip kills the old side-pan; overflow-y stays VISIBLE so
          this never becomes a scroll container. (An overflow-y:auto scroller
          here + overscroll-contain — added in R64 — swallowed the mouse
          wheel: the wheel chained to this non-scrolling container and
          overscroll-behavior stopped it reaching the document. The document
          scrolls the app, and the root keeps overscroll-behavior-y at its
          default so Chrome's pull-to-refresh works.) */}
      <main className="flex-1 min-w-0 overflow-x-clip">
        {/* Top header bar — pl-16 on mobile gives space for the hamburger button */}
        <div className="sticky top-0 z-30 flex items-center justify-end gap-3 pl-16 lg:pl-6 pr-6 lg:pr-8 py-3 bg-muted/30 backdrop-blur-sm border-b border-border/50">
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-muted/50 text-[11px] text-muted-foreground font-mono cursor-pointer hover:bg-muted transition-colors">
            ⌘K
          </kbd>
          {/* ⌘K is unreachable on touch — same palette, tappable */}
          <CommandPaletteMobileTrigger />
          <ThemeToggle />
          <NotificationBell />
        </div>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24 md:pb-8">{children}</div>
      </main>
      <MobileBottomNav />
      <CommandPalette />
      {/* Confirms the email step out loud — people used to arrive here with no
          signal that the link had worked. */}
      <ConfirmedNotice />
      {showInAppNotice && (
        <InAppBrowserNotice host={host} chromeIntent={chromeHomeIntentUrl(host, ua)} />
      )}
    </div>
  );
}

