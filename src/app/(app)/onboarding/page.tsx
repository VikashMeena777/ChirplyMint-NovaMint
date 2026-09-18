"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Building2, MessageCircle, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PLANS, type PlanKey } from "@/lib/utils/plan-limits";
import { toast } from "sonner";

const steps = [
  { id: 1, title: "About you", icon: Building2 },
  { id: 2, title: "Instagram", icon: MessageCircle },
  { id: 3, title: "Choose Plan", icon: Zap },
];

// Derived from PLANS (single source of truth) so onboarding pricing can
// never drift from the checkout and plan-gating logic.
const plans = (Object.keys(PLANS) as PlanKey[]).map((key) => ({
  id: key,
  name: PLANS[key].name,
  price: PLANS[key].price === 0 ? "Free" : `₹${PLANS[key].price}/mo`,
  dms:
    PLANS[key].dmLimit === -1
      ? "Unlimited DMs"
      : `${PLANS[key].dmLimit.toLocaleString("en-IN")} DMs/mo`,
  automations:
    PLANS[key].automationLimit === -1
      ? "Unlimited automations"
      : `${PLANS[key].automationLimit} automation${PLANS[key].automationLimit > 1 ? "s" : ""}`,
}));

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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // Almost always: this was opened in a mail app's browser, whose session
        // doesn't exist anywhere else. Send them to sign in rather than
        // leaving them on a screen that can't save.
        toast.error("Your session expired. Please sign in again.");
        router.replace("/login");
        return;
      }

      // Only write profile fields the DB grants allow users to set.
      // `plan` is NEVER written here — paid plans are granted server-side
      // after a verified Cashfree payment (see /api/payments/*).
      // .select() matters: a write that matches no row returns success, so
      // without reading the row back a blocked save looked identical to a
      // successful one — the user stayed stuck on this screen.
      const { data: updated, error } = await supabase
        .from("profiles")
        .update({
          business_name: businessName || null,
          instagram_handle: igHandle || null,
          onboarding_complete: true,
        })
        .eq("id", user.id)
        .select("onboarding_complete");

      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error("Profile update did not apply");
      }

      toast.success("You're all set! 🎉");
      if (selectedPlan === "free") {
        router.push("/dashboard");
      } else {
        const planName = PLANS[selectedPlan as PlanKey]?.name || "paid";
        toast.info(
          `Complete your ${planName} upgrade from the Billing tab in Settings.`
        );
        router.push("/dashboard/settings");
      }
    } catch (err) {
      console.error("[Onboarding] Could not finish setup:", err);
      toast.error("We couldn't save that — please try again. If it keeps failing, reload the page.");
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
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s.id
                    ? "bg-[oklch(0.52_0.19_162)] text-white"
                    : "bg-muted text-muted-foreground"
                  }`}
              >
                {s.id}
              </div>
              {s.id < 3 && (
                <div
                  className={`w-8 h-0.5 rounded-full transition-all ${step > s.id ? "bg-[oklch(0.52_0.19_162)]" : "bg-border"
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
          {/* Step 1: Who you are — creators and businesses both sign up */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Tell us about you
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Creator, freelancer or a full business — it all works here. This just personalizes
                  your dashboard.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Your name or brand
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Priya Sharma, or Sunrise Café"
                  className={`w-full h-11 px-4 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.52_0.19_162)] focus:border-transparent placeholder:text-muted-foreground/50 ${
                    businessName.length > 0 && businessName.trim().length < 2
                      ? "border-red-400"
                      : "border-border"
                  }`}
                />
                {businessName.length > 0 && businessName.trim().length < 2 ? (
                  <p className="text-xs text-red-500">Please use at least 2 characters.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Your own name is fine — it shows on your receipts and emails.
                  </p>
                )}
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={businessName.trim().length < 2}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:pointer-events-none"
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
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedPlan === plan.id
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

        {/* Skip takes the same path as finishing — the only difference is what
            it writes. It used to look inert because a failed save was silent. */}
        <button
          onClick={handleComplete}
          disabled={saving}
          className="w-full text-center text-xs text-muted-foreground mt-4 hover:text-foreground transition-colors disabled:opacity-60"
        >
          {saving ? "Setting up…" : "Skip for now — take me to the dashboard"}
        </button>
      </div>
    </div>
  );
}
