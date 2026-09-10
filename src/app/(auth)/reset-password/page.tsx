"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { setNewPassword } from "@/lib/actions/auth";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { validatePasswordPolicy } from "@/lib/utils/password-policy";

/**
 * Dedicated reset-password page. The email link logs the user in via the
 * auth callback (next=/reset-password) — this page collects the new
 * password. Works for email AND Google users (Supabase adds an email
 * identity when a Google user sets a password).
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const policyError = validatePasswordPolicy(password);
    if (policyError) {
      toast.error(policyError);
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }

    setBusy(true);
    // Server action — policy re-enforced server-side
    const result = await setNewPassword(password);
    setBusy(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setDone(true);
    toast.success("Password updated!");
    setTimeout(() => router.push("/dashboard"), 1800);
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[oklch(0.52_0.19_162/20%)] to-[oklch(0.45_0.2_158/10%)] flex items-center justify-center mx-auto mb-4">
          {done ? (
            <CheckCircle2 className="w-8 h-8 text-[oklch(0.52_0.19_162)]" />
          ) : (
            <Lock className="w-8 h-8 text-[oklch(0.52_0.19_162)]" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {done ? "All set!" : "Set a new password"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {done
            ? "Redirecting you to your dashboard…"
            : "Choose a strong password — you'll stay logged in."}
        </p>
      </div>

      {!done && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              autoFocus
              className="w-full h-12 px-4 pr-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)]"
            />
            {password.length > 0 && <PasswordChecklist password={password} />}
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className="w-full h-12 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)]"
          />
          <button
            type="submit"
            disabled={busy || !password || !confirm}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold shadow-lg disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Update password"}
          </button>
        </form>
      )}

      {done && (
        <div className="text-center">
          <div className="h-1 w-40 mx-auto rounded-full bg-muted overflow-hidden">
            <div className="h-full w-1/2 bg-[oklch(0.52_0.19_162)] animate-pulse mx-auto" />
          </div>
        </div>
      )}
    </div>
  );
}
