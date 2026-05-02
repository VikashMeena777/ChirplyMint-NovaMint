/**
 * Plan definitions and limit enforcement for ChirplyMint.
 * ⚡ This is the SINGLE SOURCE OF TRUTH for all pricing data.
 * All pricing surfaces (homepage, /pricing, settings billing, cashfree) read from here.
 */

export const PLANS = {
  free: {
    name: "Starter",
    price: 0,
    dmLimit: 50,
    automationLimit: 1,
    dripStepLimit: 2,
    igAccountLimit: 1,
    bioLinkLimit: 5,
    /** Free plan forces require_follow = true (followers only). Cannot be toggled off. */
    followCheckConfigurable: false,
    features: [
      "50 DMs/month",
      "1 Automation",
      "2 Drip Steps",
      "1 Instagram Account",
      "Comment Auto-Reply",
      "Story Reply Triggers",
      "Text & Button DM Templates",
      "Comment Reply Templates",
      "Follow-Check (Followers Only)",
      "Link-in-Bio (5 links)",
      "Basic Analytics",
      "Community Support",
    ],
    /** Features NOT available on this plan */
    excluded: [
      "AI Smart Replies",
      "AI FAQ Knowledge Base",
      "Postback Flow Builder",
      "A/B Testing",
      "Lead Capture & Tagging",
      "Lead Export (CSV)",
      "Advanced Analytics",
    ],
  },
  pro: {
    name: "Pro",
    price: 499,
    dmLimit: 2000,
    automationLimit: 10,
    dripStepLimit: 5,
    igAccountLimit: 3,
    bioLinkLimit: -1, // unlimited
    /** Pro plan can toggle follow-check on/off */
    followCheckConfigurable: true,
    features: [
      "2,000 DMs/month",
      "10 Automations",
      "5 Drip Steps",
      "3 Instagram Accounts",
      "Everything in Starter",
      "AI Smart Replies",
      "AI FAQ Knowledge Base",
      "Interactive Button DMs",
      "Follow-Check (Configurable)",
      "Postback Flow Builder",
      "A/B Testing",
      "Lead Capture & Tagging",
      "Lead Export (CSV)",
      "Comment Reply Templates",
      "Link-in-Bio (Unlimited)",
      "Advanced Analytics & Insights",
      "Priority Email Support",
    ],
    excluded: [],
  },
  business: {
    name: "Business",
    price: 1499,
    dmLimit: -1, // unlimited
    automationLimit: -1, // unlimited
    dripStepLimit: 10,
    igAccountLimit: 10,
    bioLinkLimit: -1, // unlimited
    /** Business plan can toggle follow-check on/off */
    followCheckConfigurable: true,
    features: [
      "Unlimited DMs",
      "Unlimited Automations",
      "10 Drip Steps",
      "10 Instagram Accounts",
      "Everything in Pro",
      "Advanced AI (longer context)",
      "Multi-Step DM Funnels",
      "Multi IG Account Connect",
      "Custom Branding / White-Label",
      "Full Analytics & Export",
      "Dedicated Support (WhatsApp)",
    ],
    comingSoon: [
      "Team Members",
      "API Access",
      "Webhook Lead Export",
    ],
    excluded: [],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/**
 * Check if a DM limit value represents "unlimited".
 * Treats -1, negative values, and absurdly large values (>=100000) as unlimited.
 * This handles both the canonical -1 and legacy 999999 values from old DB records.
 */
export function isUnlimitedDM(limit: number | null | undefined): boolean {
  if (limit == null) return false;
  return limit < 0 || limit >= 100000;
}

/**
 * Check if the user can send more DMs this month.
 */
export function canSendDM(
  plan: PlanKey,
  currentCount: number
): { allowed: boolean; limit: number; remaining: number } {
  const planConfig = PLANS[plan] || PLANS.free;
  if (isUnlimitedDM(planConfig.dmLimit)) {
    return { allowed: true, limit: -1, remaining: -1 };
  }
  const remaining = Math.max(0, planConfig.dmLimit - currentCount);
  return {
    allowed: currentCount < planConfig.dmLimit,
    limit: planConfig.dmLimit,
    remaining,
  };
}

/**
 * Check if the user can create more automations.
 */
export function canCreateAutomation(
  plan: PlanKey,
  currentCount: number
): { allowed: boolean; limit: number; remaining: number } {
  const planConfig = PLANS[plan] || PLANS.free;
  if (planConfig.automationLimit === -1) {
    return { allowed: true, limit: -1, remaining: -1 };
  }
  const remaining = Math.max(0, planConfig.automationLimit - currentCount);
  return {
    allowed: currentCount < planConfig.automationLimit,
    limit: planConfig.automationLimit,
    remaining,
  };
}

/**
 * Check if the user can add more drip steps to a sequence.
 */
export function canAddDripStep(
  plan: PlanKey,
  currentStepCount: number
): { allowed: boolean; limit: number; remaining: number } {
  const planConfig = PLANS[plan] || PLANS.free;
  const limit = planConfig.dripStepLimit;
  const remaining = Math.max(0, limit - currentStepCount);
  return {
    allowed: currentStepCount < limit,
    limit,
    remaining,
  };
}

/**
 * Check if the user can access the AI Agent feature.
 * Pro+ only.
 */
export function canAccessAIAgent(plan: PlanKey): boolean {
  return plan === "pro" || plan === "business";
}

/**
 * Check if the user can access Lead Capture & Export.
 * Pro+ only.
 */
export function canAccessLeads(plan: PlanKey): boolean {
  return plan === "pro" || plan === "business";
}

/**
 * Check if the user can access A/B Testing.
 * Pro+ only.
 */
export function canAccessABTesting(plan: PlanKey): boolean {
  return plan === "pro" || plan === "business";
}

/**
 * Check if the user's plan allows configuring follow-check gating.
 * Free plan: require_follow is ALWAYS true (forced on).
 * Pro+: User can toggle require_follow on/off.
 */
export function canConfigureFollowCheck(plan: PlanKey): boolean {
  const planConfig = PLANS[plan] || PLANS.free;
  return planConfig.followCheckConfigurable;
}

/**
 * Check if the user can customize bio page styling (font, card radius, opacity).
 * Pro+ can customize.
 */
export function canCustomizeBioStyle(plan: PlanKey): boolean {
  return plan === "pro" || plan === "business";
}

/**
 * Check if the user can hide the "Powered by ChirplyMint" badge.
 * Business-only.
 */
export function canHideBranding(plan: PlanKey): boolean {
  return plan === "business";
}

/**
 * Format limit for display — converts -1 to "∞"
 */
export function formatLimit(limit: number): string {
  return limit === -1 ? "∞" : String(limit);
}

/**
 * Centralized pricing card data — the SINGLE SOURCE OF TRUTH for all pricing surfaces.
 * Homepage, /pricing page, and Settings billing tab all import this.
 */
export function getPlanDisplayData() {
  return [
    {
      key: "free" as PlanKey,
      name: "Starter",
      price: "Free",
      period: "",
      description: "Perfect for testing the waters",
      features: PLANS.free.features,
      comingSoon: [] as readonly string[],
      excluded: PLANS.free.excluded ?? [],
      cta: "Start Free",
      highlight: false,
    },
    {
      key: "pro" as PlanKey,
      name: "Pro",
      price: `₹${PLANS.pro.price}`,
      period: "/month",
      description: "For creators who mean business",
      features: PLANS.pro.features,
      comingSoon: [] as readonly string[],
      excluded: PLANS.pro.excluded ?? [],
      cta: "Upgrade to Pro",
      highlight: true,
    },
    {
      key: "business" as PlanKey,
      name: "Business",
      price: `₹${PLANS.business.price}`,
      period: "/month",
      description: "For teams and agencies",
      features: PLANS.business.features,
      comingSoon: PLANS.business.comingSoon ?? [],
      excluded: PLANS.business.excluded ?? [],
      cta: "Upgrade to Business",
      highlight: false,
    },
  ];
}
