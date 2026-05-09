"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Gift,
  Copy,
  Share2,
  Users,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { getOrCreateReferralCode, getReferralStats } from "@/lib/actions/referral";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://chirplymint.novamintnetworks.in";

export default function ReferralsPage() {
  const [code, setCode] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const stats = await getReferralStats();
    if (stats.code) {
      setCode(stats.code);
    } else {
      // Generate one
      const result = await getOrCreateReferralCode();
      if (result.code) setCode(result.code);
    }
    setCount(stats.count);
    setPlanExpiresAt(stats.planExpiresAt);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const shareLink = code ? `${APP_URL}/signup?ref=${code}` : "";

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Referral code copied!");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Share link copied!");
  };

  const shareWhatsApp = () => {
    const text = `Hey! Try ChirplyMint — automate your Instagram DMs with AI 🤖\nSign up with my link and I get 14 days of Pro free!\n${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted/60 rounded-lg animate-pulse" />
        <div className="h-64 bg-card border border-border rounded-2xl animate-pulse" />
      </div>
    );
  }

  const daysLeft = planExpiresAt
    ? Math.max(0, Math.ceil((new Date(planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Gift className="w-7 h-7 text-emerald-500" />
          Referral Program
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Invite friends and earn <span className="text-emerald-500 font-semibold">14 days of Pro</span> per signup.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{count}</p>
            <p className="text-xs text-muted-foreground">Friends Referred</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{count * 14}</p>
            <p className="text-xs text-muted-foreground">Pro Days Earned</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {daysLeft > 0 ? `${daysLeft}d` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Pro Days Left</p>
          </div>
        </div>
      </div>

      {/* Referral Code Card */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Your Referral Code</h2>

        <div className="flex items-center gap-3">
          <div className="flex-1 px-5 py-4 rounded-xl bg-muted/50 border border-border font-mono text-xl font-bold text-foreground tracking-[0.3em] text-center">
            {code}
          </div>
          <button
            onClick={copyCode}
            className="p-3 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors"
            title="Copy code"
          >
            <Copy className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Share Link</label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareLink}
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm text-foreground truncate"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-emerald-500/10 text-emerald-600 text-sm font-medium hover:bg-emerald-500/20 transition-all border border-emerald-500/30"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={shareWhatsApp}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] text-sm font-semibold hover:bg-[#25D366]/20 transition-all border border-[#25D366]/30"
          >
            <ExternalLink className="w-4 h-4" />
            Share on WhatsApp
          </button>
          <button
            onClick={() => {
              navigator.share?.({
                title: "Join ChirplyMint",
                text: "Automate your Instagram DMs with AI!",
                url: shareLink,
              }).catch(() => copyLink());
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500/10 text-violet-600 text-sm font-semibold hover:bg-violet-500/20 transition-all border border-violet-500/30"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">How It Works</h2>
        <div className="space-y-3">
          {[
            { step: 1, text: "Share your referral code or link with friends" },
            { step: 2, text: "They sign up using your code" },
            { step: 3, text: "You automatically get 14 days of Pro per signup!" },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-sm text-foreground">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mt-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-emerald-600">Pro tip:</span> Each referral stacks! 3 referrals = 42 days of Pro. No limit on how many you can refer.
          </p>
        </div>
      </div>
    </div>
  );
}
