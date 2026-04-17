import { Sidebar } from "@/components/layouts/sidebar";
import { NotificationBell } from "@/components/ui/notification-bell";
import { CommandPalette } from "@/components/ui/command-palette";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Top header bar */}
        <div className="sticky top-0 z-30 flex items-center justify-end gap-3 px-6 lg:px-8 py-3 bg-muted/30 backdrop-blur-sm border-b border-border/50">
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-muted/50 text-[11px] text-muted-foreground font-mono cursor-pointer hover:bg-muted transition-colors">
            ⌘K
          </kbd>
          <ThemeToggle />
          <NotificationBell />
        </div>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
      <CommandPalette />
    </div>
  );
}

