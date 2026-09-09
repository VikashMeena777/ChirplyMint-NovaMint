"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Link2,
  Bot,
  FlaskConical,
  Users,
  PartyPopper,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/**
 * Onboarding checklist — drives users to the aha moment (comment → DM
 * arrives) as fast as possible. Disappears once every step is done.
 */
export function OnboardingChecklist({
  igConnected,
  hasAutomation,
  hasDMs,
  hasLeads,
}: {
  igConnected: boolean;
  hasAutomation: boolean;
  hasDMs: boolean;
  hasLeads: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem("cm_checklist_done") === "1");
  }, []);

  const steps = [
    { label: "Connect your Instagram", done: igConnected, href: "/dashboard/settings", icon: Link2 },
    { label: "Create your first automation", done: hasAutomation, href: "/dashboard/automations", icon: Bot },
    { label: "Test it — comment your keyword on a post", done: hasDMs, href: "/dashboard/automations", icon: FlaskConical },
    { label: "Capture your first lead", done: hasLeads, href: "/dashboard/leads", icon: Users },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (dismissed || (allDone && dismissed)) return null;
  if (allDone && !dismissed) {
    // Show the celebration briefly; user can dismiss
  }

  return (
    <div className="rounded-2xl border border-[oklch(0.52_0.19_162/30%)] bg-gradient-to-br from-[oklch(0.52_0.19_162/8%)] to-transparent p-5 relative overflow-hidden">
      <button
        onClick={() => {
          setDismissed(true);
          localStorage.setItem("cm_checklist_done", "1");
        }}
        className="absolute top-3 right-3 text-xs text-muted-foreground hover:text-foreground"
      >
        Dismiss
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[oklch(0.52_0.19_162/15%)] flex items-center justify-center">
          {allDone ? <PartyPopper className="w-5 h-5 text-[oklch(0.52_0.19_162)]" /> : <FlaskConical className="w-5 h-5 text-[oklch(0.52_0.19_162)]" />}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-foreground">
            {allDone ? "You're all set! 🎉" : "Let's get your first DM sent"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allDone
              ? "Your automation machine is live. Explore the tips below to grow faster."
              : `${doneCount} of ${steps.length} done — most creators finish in under 5 minutes.`}
          </p>
        </div>
        <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-muted/40">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-1.5">
          {steps.map((step, i) => (
            <button
              key={step.label}
              onClick={() => !step.done && router.push(step.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                step.done ? "opacity-60" : "hover:bg-background/60"
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="w-5 h-5 text-[oklch(0.52_0.19_162)] shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
              )}
              <step.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className={`text-sm flex-1 ${step.done ? "text-muted-foreground line-through" : "text-foreground font-medium"}`}>
                {i + 1}. {step.label}
              </span>
              {!step.done && (
                <span className="text-xs font-semibold text-[oklch(0.52_0.19_162)]">Go →</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
