"use client";

import { motion } from "motion/react";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut } from "@/lib/actions/auth";
import {
  LayoutDashboard,
  MessageCircle,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bot,
  Users,
  Link2,
  Bell,
  Menu,
  X,
  Lightbulb,
  BrainCircuit,
  MessagesSquare,
  Gift,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

import { HomeIcon } from "@/components/icons/home/home";
import { BotIcon } from "@/components/icons/bot/bot";
import { MessageCircleIcon } from "@/components/icons/message-circle/message-circle";
import { UsersIcon } from "@/components/icons/users/users";
import { SparklesIcon } from "@/components/icons/sparkles/sparkles";
import { LinkIcon } from "@/components/icons/link/link";
import { ChartLineIcon } from "@/components/icons/chart-line/chart-line";
import { ChartPieIcon } from "@/components/icons/chart-pie/chart-pie";
import { BellIcon } from "@/components/icons/bell/bell";
import { SettingsIcon } from "@/components/icons/settings/settings";

type AnimatedIconType = React.ComponentType<{ size?: number; className?: string }>;

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    animated: HomeIcon,
  },
  {
    label: "Automations",
    href: "/dashboard/automations",
    icon: Bot,
    animated: BotIcon,
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
    icon: MessageCircle,
    animated: MessageCircleIcon,
  },
  {
    label: "Leads",
    href: "/dashboard/leads",
    icon: Users,
    animated: UsersIcon,
  },
  {
    label: "AI Agent",
    href: "/dashboard/ai-agent",
    icon: BrainCircuit,
    animated: SparklesIcon,
  },
  {
    label: "AI Inbox",
    href: "/dashboard/ai-agent/conversations",
    icon: MessagesSquare,
  },
  {
    label: "Link-in-Bio",
    href: "/dashboard/bio",
    icon: Link2,
    animated: LinkIcon,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    animated: ChartLineIcon,
  },
  {
    label: "Insights",
    href: "/dashboard/insights",
    icon: Lightbulb,
    animated: ChartPieIcon,
  },
  {
    label: "Referrals",
    href: "/dashboard/referrals",
    icon: Gift,
  },
];

const bottomItems = [
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, animated: BellIcon },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, animated: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const themeLabel = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="ChirplyMint" width={36} height={36} className="w-9 h-9 rounded-xl shrink-0" />
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-foreground">
              Chirply<span className="text-[oklch(0.52_0.19_162)]">Mint</span>
            </span>
          )}
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive(item.href)
                ? "bg-[oklch(0.52_0.19_162/12%)] text-[oklch(0.52_0.19_162)] shadow-[inset_0_0_0_1px_oklch(0.52_0.19_162/20%)]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            {isActive(item.href) && (
              <motion.span
                layoutId="sidebar-active-rail"
                className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-gradient-to-b from-[oklch(0.62_0.19_162)] to-[oklch(0.48_0.17_162)]"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            {item.animated ? (
              <span className={`shrink-0 transition-transform duration-300 ${isActive(item.href) ? "scale-110" : "group-hover:scale-105"}`}>
                <item.animated size={20} />
              </span>
            ) : (
              <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive(item.href) ? "scale-110" : "group-hover:scale-105"}`} />
            )}
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-border space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive(item.href)
                ? "bg-[oklch(0.52_0.19_162/12%)] text-[oklch(0.52_0.19_162)] shadow-[inset_0_0_0_1px_oklch(0.52_0.19_162/20%)]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            {item.animated ? (
              <span className="shrink-0">
                <item.animated size={20} />
              </span>
            ) : (
              <item.icon className="w-5 h-5 shrink-0" />
            )}
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {/* Logout */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
          onClick={() => {
            setSigningOut(true);
            setTimeout(() => { void signOut(); }, 1100);
          }}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          title={`Theme: ${themeLabel}`}
        >
          <ThemeIcon className="w-5 h-5 shrink-0" />
          {!collapsed && <span>{themeLabel}</span>}
        </button>
      </div>

      {/* Collapse toggle — desktop only */}
      <div className="hidden lg:block px-3 py-3 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl border border-border bg-card shadow-sm"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar — sticky so it stays visible regardless of page scroll */}
      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-screen overflow-y-auto border-r border-border bg-card transition-all duration-200 ${
          collapsed ? "w-[72px]" : "w-[240px]"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* ── Graceful sign-out farewell ──
          Instant logout feels jarring and creates doubt ("did my automations
          stop?!"). A brief warm farewell reassures the automations keep
          running — closure + trust — then hands off to login. */}
      {signingOut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[oklch(0.52_0.19_162/20%)] to-[oklch(0.45_0.2_158/10%)] flex items-center justify-center animate-pulse">
              <LogOut className="w-7 h-7 text-[oklch(0.52_0.19_162)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">See you soon! 👋</h2>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
                Signing you out — your automations keep running in the background.
              </p>
            </div>
            <div className="w-40 h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/2 rounded-full bg-[oklch(0.52_0.19_162)] animate-[signout-slide_1.1s_ease-in-forwards]" />
            </div>
          </div>
          <style>{`
            @keyframes signout-slide { from { transform: translateX(-100%); } to { transform: translateX(0); } }
          `}</style>
        </div>
      )}
    </>
  );
}
