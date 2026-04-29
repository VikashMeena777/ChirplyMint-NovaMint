/**
 * Plan definitions and limit enforcement for ChirplyMint.
 */

export const PLANS = {
  free: {
    name: "Starter",
    price: 0,
    dmLimit: 100,
    automationLimit: 1,
    dripStepLimit: 2,
    features: [
      "100 DMs/month",
      "1 Automation",
      "2 Drip Steps",
      "Basic Analytics",
      "Community Support",
    ],
  },
  pro: {
    name: "Pro",
    price: 999,
    dmLimit: 1000,
    automationLimit: 3,
    dripStepLimit: 5,
    features: [
      "1,000 DMs/month",
      "3 Automations",
      "5 Drip Steps",
      "AI Smart Replies",
      "A/B Testing",
      "Advanced Analytics",
      "Lead Export (CSV + Webhook)",
      "Priority Support",
    ],
  },
  business: {
    name: "Business",
    price: 2499,
    dmLimit: -1, // unlimited
    automationLimit: -1, // unlimited
    dripStepLimit: 10,
    features: [
      "Unlimited DMs",
      "Unlimited Automations",
      "10 Drip Steps",
      "Advanced AI",
      "Team Access",
      "API Access",
      "Custom Branding",
      "Dedicated Support",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/**
 * Check if the user can send more DMs this month.
 */
export function canSendDM(
  plan: PlanKey,
  currentCount: number
): { allowed: boolean; limit: number; remaining: number } {
  const planConfig = PLANS[plan] || PLANS.free;
  if (planConfig.dmLimit === -1) {
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
 * Check if a feature is available for the user's plan.
 */
export function hasFeature(plan: PlanKey, feature: string): boolean {
  const planConfig = PLANS[plan] || PLANS.free;
  return planConfig.features.some((f) =>
    f.toLowerCase().includes(feature.toLowerCase())
  );
}

