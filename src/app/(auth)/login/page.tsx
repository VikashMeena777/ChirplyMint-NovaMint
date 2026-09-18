"use client";

import { useState, useEffect } from "react";
import { GoogleButton } from "@/components/auth/google-button";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, MailWarning } from "lucide-react";
import { login, resendConfirmation } from "@/lib/actions/auth";
import { toast } from "sonner";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Set when Supabase says the address exists but isn't confirmed yet — the
  // exact state a new signup lands in, and previously a dead end.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  // The confirm-email callback bounces here when a link is expired or reused.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth_callback_failed") {
      toast.error("That confirmation link has expired or was already used. Sign in, or ask for a new link below.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") || "");
    const result = await login(formData);

    if (result?.error) {
      setIsLoading(false);
      if (/email not confirmed|not confirmed/i.test(result.error)) {
        setUnconfirmedEmail(email);
        return;
      }
      toast.error(result.error);
    }
  };

  async function handleResend() {
    if (!unconfirmedEmail) return;
    setResending(true);
    const res = await resendConfirmation(unconfirmedEmail);
    setResending(false);
    if (res.error) toast.error(res.error);
    else toast.success("New link sent — check your inbox and spam folder.");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your ChirplyMint account
        </p>
      </div>

      <GoogleButton />

      {unconfirmedEmail && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <MailWarning className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Your email isn&apos;t confirmed yet
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The account exists but can&apos;t sign in until you click the confirmation link we
                emailed to <span className="font-medium text-foreground break-all">{unconfirmedEmail}</span>.
                Check spam or promotions too — it often lands there.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full h-10 flex items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-card text-sm font-semibold text-foreground transition-colors hover:bg-amber-500/10 disabled:opacity-60"
          >
            {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send me a new confirmation link"}
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-background text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="login-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent transition-shadow"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</label>
            <Link href="/forgot-password" className="text-xs text-[oklch(0.52_0.19_162)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full h-12 pl-10 pr-12 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent transition-shadow"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle password"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none shadow-sm"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[oklch(0.52_0.19_162)] font-semibold hover:underline">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
