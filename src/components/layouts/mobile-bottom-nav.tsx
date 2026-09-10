"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, MessageCircle, LayoutDashboard, Settings, Users } from "lucide-react";
import { HomeIcon } from "@/components/icons/home/home";
import { BotIcon } from "@/components/icons/bot/bot";
import { MessageCircleIcon } from "@/components/icons/message-circle/message-circle";
import { UsersIcon } from "@/components/icons/users/users";
import { SettingsIcon } from "@/components/icons/settings/settings";

/**
 * Mobile bottom navigation (thumb-friendly). Hidden on md+ where the
 * sidebar takes over. Add-to-Home-Screen makes this feel like a native app
 * (PWA manifest wired in layout.tsx).
 */
const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, animated: HomeIcon },
  { href: "/dashboard/automations", label: "Automations", icon: Bot, animated: BotIcon },
  { href: "/dashboard/messages", label: "Inbox", icon: MessageCircle, animated: MessageCircleIcon },
  { href: "/dashboard/leads", label: "Leads", icon: Users, animated: UsersIcon },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, animated: SettingsIcon },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-stretch justify-around">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[60px] transition-colors ${
                active ? "text-[oklch(0.52_0.19_162)]" : "text-muted-foreground"
              }`}
            >
              <item.animated size={22} className={active ? "drop-shadow-[0_0_6px_oklch(0.52_0.19_162/50%)]" : ""} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[oklch(0.52_0.19_162)]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
