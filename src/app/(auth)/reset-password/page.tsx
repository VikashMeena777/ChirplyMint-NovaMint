"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

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
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }

    setBusy(true);
    const { createBrowserClient } = await import("@supabase/ssr");
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      toast.error(error.message.includes("session")
        ? "Your reset link expired — request a new one from the login page."
        : error.message);
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
              placeholder="New password (min 8 characters)"
              autoFocus
              className="w-full h-12 px-4 pr-11 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)]"
            />
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
