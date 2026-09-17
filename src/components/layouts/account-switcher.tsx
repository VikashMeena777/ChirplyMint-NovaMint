"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ChevronsUpDown } from "lucide-react";
import { InstagramIcon } from "@/components/icons/instagram/instagram";
import type { IgAccountOption } from "@/lib/ig-account-context";

/**
 * Account switcher — which connected Instagram account the dashboard is
 * "inside". Per-account surfaces (AI agent, AI inbox, leads, messages,
 * analytics, link-in-bio) all follow this choice.
 *
 * Persisted in the cm_ig_acct cookie through a server action, then the page
 * reloads so every server component re-reads it. Hidden when the user has a
 * single account (nothing to switch).
 */
export function AccountSwitcher({
  accounts,
  selectedId,
  collapsed = false,
  onSelectAction,
}: {
  accounts: IgAccountOption[];
  selectedId: string | null;
  collapsed?: boolean;
  /** Server action that writes the cookie: (accountId) => Promise<void> */
  onSelectAction: (accountId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (accounts.length <= 1) return null;

  const selected = accounts.find((a) => a.id === selectedId) ?? accounts[0];

  async function pick(id: string) {
    if (id === selected?.id) return setOpen(false);
    setBusy(true);
    try {
      await onSelectAction(id);
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`relative ${collapsed ? "px-0 mb-2 flex justify-center" : "px-3 mb-2"}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        title={collapsed ? `@${selected?.ig_username}` : undefined}
        className={
          collapsed
            ? "flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/60 hover:border-[oklch(0.52_0.19_162/30%)] transition-colors"
            : "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-card/60 text-left hover:border-[oklch(0.52_0.19_162/30%)] transition-colors"
        }
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.52_0.19_162/12%)] overflow-hidden">
          {selected?.ig_profile_pic ? (
            <Image
              src={selected.ig_profile_pic}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg object-cover"
              unoptimized
            />
          ) : (
            <InstagramIcon size={14} />
          )}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-foreground">
                @{selected?.ig_username}
              </span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {accounts.length} accounts · viewing this one
              </span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </>
        )}
      </button>

      {open && (
        <div
          className={
            collapsed
              ? "absolute left-full top-0 ml-2 z-50 w-60 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
              : "absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
          }
        >
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => pick(a.id)}
              disabled={busy}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 disabled:opacity-50"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[oklch(0.52_0.19_162/12%)] overflow-hidden">
                {a.ig_profile_pic ? (
                  <Image src={a.ig_profile_pic} alt="" width={24} height={24} className="h-6 w-6 rounded-md object-cover" unoptimized />
                ) : (
                  <InstagramIcon size={12} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">@{a.ig_username}</span>
              </span>
              {a.id === selected?.id && <Check className="h-3.5 w-3.5 text-[oklch(0.52_0.19_162)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
