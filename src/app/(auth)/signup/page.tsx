"use client";

import { useState, useEffect, Suspense } from "react";
import { GoogleButton } from "@/components/auth/google-button";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2, Check, Gift, MailCheck } from "lucide-react";
import { signup, resendConfirmation } from "@/lib/actions/auth";
import { toast } from "sonner";
import { getPasswordChecks } from "@/lib/utils/password-policy";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="h-64 bg-card rounded-2xl animate-pulse" /></div>}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [refCode, setRefCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const hasRefParam = !!searchParams.get("ref");

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setRefCode(ref);
  }, [searchParams]);

  const passwordChecks = getPasswordChecks(password);

  const passwordValid = passwordChecks.every((c) => c.met);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Mirror of the server-side policy (the server is authoritative)
    if (!passwordValid) {
      const missing = passwordChecks.find((c) => !c.met);
      toast.error(`Password needs: ${missing?.label.toLowerCase()}`);
      return;
    }

    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") || "");

    // The referral code rides along in the form; the server actions park it in
    // a cookie for /api/auth/callback, which applies it once the account is
    // confirmed and actually has a session to apply it with.
    const result = await signup(formData);

    if (result && "error" in result) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setSentTo(result?.email || email);
  };

  async function handleResend() {
    if (!sentTo) return;
    setResending(true);
    const res = await resendConfirmation(sentTo);
    setResending(false);
    if (res.error) toast.error(res.error);
    else toast.success("Sent again — check your inbox in a moment.");
  }

  // ── The screen that used to be missing ──
  // Supabase requires email confirmation, so signup creates an account with no
  // session. Until this existed the page just bounced to /login and the new
  // user had no idea they were supposed to check their inbox.
  if (sentTo) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[oklch(0.52_0.19_162/10%)] border border-[oklch(0.52_0.19_162/25%)] flex items-center justify-center">
            <MailCheck className="w-7 h-7 text-[oklch(0.52_0.19_162)]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            One last step. We sent a confirmation link to
          </p>
          <p className="text-sm font-semibold text-foreground break-all">{sentTo}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          {[
            "Open the email from ChirplyMint (subject: “Confirm your email”)",
            "Click the confirmation link — it brings you back here and signs you in",
            "You'll land straight in your dashboard, ready to connect Instagram",
          ].map((stepText, i) => (
            <div key={stepText} className="flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[oklch(0.52_0.19_162)] text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed">{stepText}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Can&apos;t find it? Give it a minute, then check your <span className="font-medium text-foreground">spam</span> or{" "}
            <span className="font-medium text-foreground">promotions</span> folder — confirmation emails often land there the first time.
            The link is valid for 24 hours.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-border bg-card text-foreground text-sm font-semibold transition-colors hover:bg-muted/40 disabled:opacity-60"
        >
          {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resend the email"}
        </button>

        <div className="space-y-2 text-center">
          <p className="text-xs text-muted-foreground">
            Already confirmed it?{" "}
            <Link href="/login" className="text-[oklch(0.52_0.19_162)] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Wrong address or already have an account?{" "}
            <button type="button" onClick={() => setSentTo(null)} className="text-[oklch(0.52_0.19_162)] font-semibold hover:underline">
              Start over
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Banner */}
      {hasRefParam && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <Gift className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-600">You&apos;ve been invited!</p>
            <p className="text-xs text-muted-foreground">Sign up and your friend gets 14 days of Pro free.</p>
          </div>
        </div>
      )}

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Start automating your Instagram DMs for free
        </p>
      </div>

      <GoogleButton label="Sign up with Google" referralCode={refCode} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-background text-muted-foreground">or sign up with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="signup-name" className="text-sm font-medium text-foreground">Full name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input id="signup-name" name="name" type="text" placeholder="Your name" className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent transition-shadow" required />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="text-sm font-medium text-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input id="signup-email" name="email" type="email" placeholder="you@example.com" className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent transition-shadow" required />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="text-sm font-medium text-foreground">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="signup-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 pl-10 pr-12 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent transition-shadow"
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Toggle password">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {passwordChecks.map((check) => (
                <div key={check.label} className="flex items-center gap-2 text-xs">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${check.met ? "bg-[oklch(0.52_0.19_162)] text-white" : "border border-border"}`}>
                    {check.met && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span className={check.met ? "text-foreground" : "text-muted-foreground"}>{check.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Referral Code */}
        <div className="space-y-1.5">
          <label htmlFor="signup-referral" className="text-sm font-medium text-foreground">Referral Code <span className="text-muted-foreground font-normal">(optional)</span></label>
          <div className="relative">
            <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="signup-referral"
              name="referral_code"
              type="text"
              placeholder="Enter referral code"
              value={refCode}
              onChange={(e) => setRefCode(e.target.value.toUpperCase())}
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent transition-shadow uppercase tracking-wider"
            />
          </div>
        </div>

        <button type="submit" disabled={isLoading || (password.length > 0 && !passwordValid)} className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none shadow-sm">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>

      <p className="text-center text-xs text-muted-foreground leading-relaxed">
        By signing up, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>{" "}and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-[oklch(0.52_0.19_162)] font-semibold hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
