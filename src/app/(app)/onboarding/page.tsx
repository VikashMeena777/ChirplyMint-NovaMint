"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Building2, Instagram, Zap } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const steps = [
  { id: 1, title: "Your Business", icon: Building2 },
  { id: 2, title: "Instagram", icon: Instagram },
  { id: 3, title: "Choose Plan", icon: Zap },
];

const plans = [
  {
    id: "free",
    name: "Free",
    price: "₹0/mo",
    dms: "100 DMs",
    automations: "1 automation",
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹999/mo",
    dms: "1,000 DMs",
    automations: "3 automations",
  },
  {
    id: "business",
    name: "Business",
    price: "₹2,499/mo",
    dms: "Unlimited DMs",
    automations: "Unlimited automations",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [igHandle, setIgHandle] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("free");

  const handleComplete = async () => {
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          business_name: businessName || null,
          ig_handle: igHandle || null,
          plan: selectedPlan,
          onboarding_complete: true,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Welcome to ChirplyMint! 🎉");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome to ChirplyMint
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Let&apos;s set up your account in 30 seconds
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= s.id
                    ? "bg-[oklch(0.52_0.19_162)] text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.id}
              </div>
              {s.id < 3 && (
                <div
                  className={`w-8 h-0.5 rounded-full transition-all ${
                    step > s.id ? "bg-[oklch(0.52_0.19_162)]" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
          {/* Step 1: Business Info */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Tell us about your business
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This helps us personalize your experience.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Business / Brand Name
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Sunrise Café"
                  className="w-full h-11 px-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent placeholder:text-muted-foreground/50"
                />
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: Instagram Handle */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Your Instagram
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We&apos;ll connect your account in Settings later.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Instagram Handle
                </label>
                <div className="flex items-center gap-0">
                  <span className="h-11 px-3 flex items-center rounded-l-xl border border-r-0 border-border bg-muted/30 text-sm text-muted-foreground">
                    @
                  </span>
                  <input
                    value={igHandle}
                    onChange={(e) => setIgHandle(e.target.value)}
                    placeholder="yourhandle"
                    className="w-full h-11 px-4 rounded-r-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Plan Selection */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Choose your plan
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Start free. Upgrade anytime.
                </p>
              </div>
              <div className="space-y-3">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedPlan === plan.id
                        ? "border-[oklch(0.52_0.19_162)] bg-[oklch(0.52_0.19_162/5%)]"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {plan.name}
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {plan.price}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.dms} · {plan.automations}
                    </p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-all"
                >
                  {saving ? "Setting up…" : "Get Started"}{" "}
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Skip */}
        <button
          onClick={handleComplete}
          className="w-full text-center text-xs text-muted-foreground mt-4 hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
