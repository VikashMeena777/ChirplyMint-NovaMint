"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import {
  LayoutDashboard,
  Bot,
  MessageCircle,
  Users,
  BarChart3,
  Settings,
  Bell,
  Plus,
  Search,
  CreditCard,
  Link2,
  HelpCircle,
  BrainCircuit,
  MessagesSquare,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="rounded-2xl border border-border shadow-2xl bg-card">
        <CommandInput
          placeholder="Type a command or search..."
          className="h-12 text-sm border-b border-border bg-transparent px-4 outline-none placeholder:text-muted-foreground"
        />
        <CommandList className="max-h-[320px] overflow-y-auto p-2">
          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </CommandEmpty>

          <CommandGroup heading="Navigate">
            <CommandItem
              onSelect={() => navigate("/dashboard")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
              Dashboard
            </CommandItem>
            <CommandItem
              onSelect={() => navigate("/dashboard/automations")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <Bot className="w-4 h-4 text-muted-foreground" />
              Automations
            </CommandItem>
            <CommandItem
              onSelect={() => navigate("/dashboard/messages")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              Messages
            </CommandItem>
            <CommandItem
              onSelect={() => navigate("/dashboard/leads")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <Users className="w-4 h-4 text-muted-foreground" />
              Leads
            </CommandItem>
            <CommandItem
              onSelect={() => navigate("/dashboard/ai-agent")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <BrainCircuit className="w-4 h-4 text-muted-foreground" />
              AI Agent
            </CommandItem>
            <CommandItem
              onSelect={() => navigate("/dashboard/ai-agent/conversations")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <MessagesSquare className="w-4 h-4 text-muted-foreground" />
              AI Inbox
            </CommandItem>
            <CommandItem
              onSelect={() => navigate("/dashboard/bio")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <Link2 className="w-4 h-4 text-muted-foreground" />
              Link-in-Bio
            </CommandItem>
            <CommandItem
              onSelect={() => navigate("/dashboard/analytics")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Analytics
            </CommandItem>
          </CommandGroup>

          <CommandSeparator className="my-1.5 h-px bg-border" />

          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => navigate("/dashboard/automations")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
              New Automation
            </CommandItem>
            <CommandItem
              onSelect={() => navigate("/dashboard/settings")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <Link2 className="w-4 h-4 text-muted-foreground" />
              Connect Instagram
            </CommandItem>
            <CommandItem
              onSelect={() => navigate("/dashboard/settings")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              Upgrade Plan
            </CommandItem>
          </CommandGroup>

          <CommandSeparator className="my-1.5 h-px bg-border" />

          <CommandGroup heading="Settings">
            <CommandItem
              onSelect={() => navigate("/dashboard/settings")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              Settings
            </CommandItem>
            <CommandItem
              onSelect={() => navigate("/dashboard/notifications")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              Notifications
            </CommandItem>
            <CommandItem
              onSelect={() => navigate("/help")}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm aria-selected:bg-primary/10"
            >
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              Help Center
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <div className="border-t border-border px-4 py-2">
          <p className="text-[11px] text-muted-foreground text-center">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">⌘K</kbd>{" "}
            to toggle &nbsp;·&nbsp;{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">↑↓</kbd>{" "}
            navigate &nbsp;·&nbsp;{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">↵</kbd>{" "}
            select
          </p>
        </div>
      </Command>
    </CommandDialog>
  );
}
