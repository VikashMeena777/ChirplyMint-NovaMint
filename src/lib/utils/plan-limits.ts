/**
 * Plan definitions and limit enforcement for ChirplyMint.
 */

export const PLANS = {
  free: {
    name: "Starter",
    price: 0,
    dmLimit: 100,
    automationLimit: 1,
    features: [
      "100 DMs/month",
      "1 Automation",
      "Basic Analytics",
      "Community Support",
    ],
  },
  pro: {
    name: "Pro",
    price: 999,
    dmLimit: 1000,
    automationLimit: 3,
    features: [
      "1,000 DMs/month",
      "3 Automations",
      "AI Smart Replies",
      "Advanced Analytics",
      "Priority Support",
    ],
  },
  business: {
    name: "Business",
    price: 2499,
    dmLimit: -1, // unlimited
    automationLimit: -1, // unlimited
    features: [
      "Unlimited DMs",
      "Unlimited Automations",
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
 * Check if a feature is available for the user's plan.
 */
export function hasFeature(plan: PlanKey, feature: string): boolean {
  const planConfig = PLANS[plan] || PLANS.free;
  return planConfig.features.some((f) =>
    f.toLowerCase().includes(feature.toLowerCase())
  );
}
