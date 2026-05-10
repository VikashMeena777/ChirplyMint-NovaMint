"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Camera,
  Bot,
  MessageCircle,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

interface OnboardingTourProps {
  show: boolean;
  onDismiss: () => void;
}

const steps = [
  {
    icon: Rocket,
    title: "Welcome to ChirplyMint! 🎉",
    description:
      "Turn every Instagram comment into a customer with AI-powered DM automation. Let's get you set up in 60 seconds.",
    tip: "This quick tour shows you the 4 key steps to start automating.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Camera,
    title: "Step 1: Connect Instagram",
    description:
      "Link your Instagram Business or Creator account. This lets ChirplyMint listen to comments and send DMs on your behalf.",
    tip: "Go to Settings → Instagram tab to connect your account.",
    href: "/dashboard/settings",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Bot,
    title: "Step 2: Create Your First Automation",
    description:
      "Set a keyword trigger (like 'INFO' or 'PRICE') and write the DM that gets sent automatically when someone comments it.",
    tip: "Head to Automations → Create New to build your first trigger.",
    href: "/dashboard/automations",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: MessageCircle,
    title: "Step 3: Watch the DMs Roll In",
    description:
      "Once someone comments your keyword, ChirplyMint sends them a DM instantly. Track every message in real time.",
    tip: "Check the Messages page to see all sent DMs and their status.",
    href: "/dashboard/messages",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: BarChart3,
    title: "Step 4: Grow with Analytics",
    description:
      "See which automations convert best, track lead capture rates, and optimize your strategy with data.",
    tip: "Visit Analytics for charts and insights on your performance.",
    href: "/dashboard/analytics",
    gradient: "from-amber-500 to-orange-500",
  },
];

export function OnboardingTour({ show, onDismiss }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(show);
  const router = useRouter();

  useEffect(() => {
    setVisible(show);
  }, [show]);

  if (!visible) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  function handleNext() {
    if (isLast) {
      handleClose();
    } else {
      setCurrentStep((p) => p + 1);
    }
  }

  function handlePrev() {
    if (!isFirst) setCurrentStep((p) => p - 1);
  }

  function handleClose() {
    setVisible(false);
    onDismiss();
  }

  function handleGoToStep() {
    if (step.href) {
      handleClose();
      router.push(step.href);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleClose}
      >
        {/* Modal */}
        <div
          className="relative w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-card/80 backdrop-blur text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Gradient header */}
          <div
            className={`bg-gradient-to-br ${step.gradient} p-8 flex items-center justify-center`}
          >
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <step.icon className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 pb-4">
            <h2 className="text-xl font-bold text-foreground mb-2">
              {step.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {step.description}
            </p>

            {/* Tip */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-[oklch(0.52_0.19_162/8%)] border border-[oklch(0.52_0.19_162/15%)]">
              <CheckCircle2 className="w-4 h-4 text-[oklch(0.52_0.19_162)] shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80">{step.tip}</p>
            </div>

            {/* Go to page button */}
            {step.href && (
              <button
                onClick={handleGoToStep}
                className="mt-3 w-full text-center py-2.5 rounded-xl bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)] text-sm font-medium hover:bg-[oklch(0.52_0.19_162/15%)] transition-colors"
              >
                Take me there →
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-muted/50 mb-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.65_0.18_155)] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Step dots + nav */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentStep
                        ? "w-6 bg-[oklch(0.52_0.19_162)]"
                        : i < currentStep
                          ? "bg-[oklch(0.52_0.19_162/40%)]"
                          : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={handlePrev}
                    className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[oklch(0.52_0.19_162)] to-[oklch(0.45_0.2_158)] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[oklch(0.52_0.19_162/20%)] transition-all"
                >
                  {isLast ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Get Started
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
