"use client";

import { useEffect, useState } from "react";
import { AccountSwitcher } from "@/components/layouts/account-switcher";
import type { IgAccountOption } from "@/lib/ig-account-context";
import { getIgAccountContext, setSelectedIgAccount } from "@/lib/actions/account-context";

/**
 * Loads the user's connected accounts + the currently selected one, then
 * renders the switcher. Silent when there's only one account (or none) —
 * single-account dashboards look exactly as before.
 */
export function AccountSwitcherHost({ collapsed = false }: { collapsed?: boolean }) {
  const [accounts, setAccounts] = useState<IgAccountOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // The action resolves the session user itself (no argument needed).
    getIgAccountContext()
      .then((ctx) => {
        if (!alive) return;
        setAccounts(ctx.accounts);
        setSelectedId(ctx.selectedId);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (accounts.length <= 1) return null;

  return (
    <AccountSwitcher
      accounts={accounts}
      selectedId={selectedId}
      collapsed={collapsed}
      onSelectAction={async (id) => {
        await setSelectedIgAccount(id);
      }}
    />
  );
}
