/**
 * Feature availability — single source of truth.
 *
 * Some features depend on Meta App Review permissions we don't have yet
 * (verified against the Meta App's live permission state):
 *
 *   AUTO-LIKE (❤️ reacting to comments/messages)
 *     needs `instagram_manage_engagement` — REJECTED in review.
 *
 *   DRIP SEQUENCES (scheduled follow-up DMs)
 *     needs the `Human Agent` permission for business-initiated messages
 *     outside the standard messaging window — REJECTED in review.
 *
 * Everything is wired through these flags so flipping one constant re-enables
 * a feature across the dashboard, the webhook, and the marketing copy.
 */

export const META_APPROVAL = {
  /** ❤️ auto-like/auto-react on comments and messages */
  autoLike: false,
  /** scheduled follow-up drip sequences */
  dripSequences: false,
} as const;

export type PendingApprovalFeature = keyof typeof META_APPROVAL;

export function isFeatureBlocked(feature: PendingApprovalFeature): boolean {
  return !META_APPROVAL[feature];
}

export const PENDING_APPROVAL_LABEL: Record<PendingApprovalFeature, string> = {
  autoLike: "Auto-like",
  dripSequences: "Drip sequences",
};
