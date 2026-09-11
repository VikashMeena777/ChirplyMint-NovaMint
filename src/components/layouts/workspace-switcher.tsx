"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDown, User, Users, Check } from "lucide-react";
import { switchWorkspace, getWorkspaceSwitchState } from "@/lib/actions/workspace";

/**
 * Workspace switcher — shown ONLY for team members (who have both a
 * personal workspace and the team's). Owners and solo users see nothing.
 */
export function WorkspaceSwitcher() {
  const [state, setState] = useState<{ hasMembership: boolean; viewingTeam: boolean; ownerName: string }>({
    hasMembership: false,
    viewingTeam: false,
    ownerName: "",
  });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getWorkspaceSwitchState().then(setState);
  }, []);

  if (!state.hasMembership) return null;

  const options = [
    { key: "team" as const, label: `${state.ownerName}'s team`, sub: "Shared workspace", icon: Users },
    { key: "own" as const, label: "My workspace", sub: "Personal account", icon: User },
  ];
  const active = state.viewingTeam ? "team" : "own";

  async function pick(key: "own" | "team") {
    if (key === active) return setOpen(false);
    setBusy(true);
    await switchWorkspace(key);
    setBusy(false);
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="relative px-3 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-card/60 text-left hover:border-[oklch(0.52_0.19_162/30%)] transition-colors"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.52_0.19_162/12%)]">
          {active === "team" ? (
            <Users className="h-3.5 w-3.5 text-[oklch(0.52_0.19_162)]" />
          ) : (
            <User className="h-3.5 w-3.5 text-[oklch(0.52_0.19_162)]" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-foreground">
            {active === "team" ? "Team workspace" : "My workspace"}
          </span>
          <span className="block truncate text-[10px] text-muted-foreground">
            {active === "team" ? state.ownerName : "Personal"}
          </span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => pick(o.key)}
              disabled={busy}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 disabled:opacity-50"
            >
              <o.icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-medium text-foreground truncate">{o.label}</span>
                <span className="block text-[10px] text-muted-foreground">{o.sub}</span>
              </span>
              {active === o.key && <Check className="h-3.5 w-3.5 text-[oklch(0.52_0.19_162)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
