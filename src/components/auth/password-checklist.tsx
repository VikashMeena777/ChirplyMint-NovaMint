"use client";

import { Check, X } from "lucide-react";
import { getPasswordChecks } from "@/lib/utils/password-policy";

/** The 3-rule password checklist shown under password inputs. */
export function PasswordChecklist({ password }: { password: string }) {
  const checks = getPasswordChecks(password);
  const allMet = checks.every((c) => c.met);

  return (
    <div
      className={`mt-2 space-y-1 rounded-xl border p-3 transition-colors ${
        allMet ? "border-[oklch(0.52_0.19_162/30%)] bg-[oklch(0.52_0.19_162/5%)]" : "border-border bg-muted/30"
      }`}
    >
      {checks.map((c) => (
        <p key={c.label} className="flex items-center gap-2 text-xs">
          {c.met ? (
            <Check className="h-3 w-3 text-[oklch(0.52_0.19_162)]" />
          ) : (
            <X className="h-3 w-3 text-muted-foreground/50" />
          )}
          <span className={c.met ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
        </p>
      ))}
    </div>
  );
}
