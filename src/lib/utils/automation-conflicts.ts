/**
 * Keyword-conflict rules (pure — unit-testable, used by both the create and
 * update server actions).
 *
 * Two automations only truly conflict when a SINGLE incoming comment or story
 * reply could be claimed by both. That needs three overlaps at once:
 *
 *   1. same Instagram account      (checked by the caller's query)
 *   2. same trigger channel        (a comment automation vs a story-reply
 *                                   automation can share a keyword freely)
 *   3. overlapping scope           (account-wide overlaps everything on that
 *                                   account; post-scoped automations overlap
 *                                   only when they share a post)
 *
 * The previous rule was simply "same keyword on the same account" — it
 * blocked the perfectly valid cases the user hit: same keyword on a different
 * account, same keyword on a different post, and comment vs story triggers.
 */

export interface ConflictCandidate {
  id: string;
  name: string;
  keyword: string | null;
  scope_type?: string | null;
  media_id?: string | null;
  trigger_type?: string | null;
}

/** Comment channel if the trigger is comment_trigger or both. */
function hasCommentChannel(trigger: string | null | undefined): boolean {
  const t = trigger || "comment_trigger";
  return t === "comment_trigger" || t === "both";
}

/** Story channel if the trigger is story_reply or both. */
function hasStoryChannel(trigger: string | null | undefined): boolean {
  const t = trigger || "comment_trigger";
  return t === "story_reply" || t === "both";
}

/** Media ids can be a comma-joined multi-select list. */
export function parseMediaIds(raw: string | null | undefined): string[] {
  return (raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAccountWide(a: ConflictCandidate): boolean {
  return (a.scope_type || "account") !== "media" || parseMediaIds(a.media_id).length === 0;
}

/**
 * Do the two automations' comment scopes overlap? Post-scoped automations
 * overlap only when they share at least one post; anything account-wide
 * overlaps everything on the same account.
 */
export function commentScopesOverlap(a: ConflictCandidate, b: ConflictCandidate): boolean {
  if (isAccountWide(a) || isAccountWide(b)) return true;
  const aIds = parseMediaIds(a.media_id);
  const bIds = parseMediaIds(b.media_id);
  return aIds.some((id) => bIds.includes(id));
}

/**
 * Story replies cannot be scoped — the webhook matcher triggers on ANY story
 * reply for the account (Meta doesn't expose the replied-to story reliably).
 * So two same-keyword story automations on one account always conflict.
 */
export function storyScopesOverlap(): boolean {
  return true;
}

export function keywordsIn(raw: string | null | undefined): string[] {
  return (raw || "")
    .toLowerCase()
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Returns the first overlapping keyword, or null when the two automations can
 * coexist. `incoming` is the automation being created/edited (its id is
 * ignored), `other` is an existing one.
 */
export function findConflict(
  incoming: ConflictCandidate,
  other: ConflictCandidate
): string | null {
  const a = new Set(keywordsIn(incoming.keyword));
  const shared = keywordsIn(other.keyword).filter((k) => a.has(k));
  if (shared.length === 0) return null;

  const commentClash =
    hasCommentChannel(incoming.trigger_type) &&
    hasCommentChannel(other.trigger_type) &&
    commentScopesOverlap(incoming, other);

  const storyClash =
    hasStoryChannel(incoming.trigger_type) &&
    hasStoryChannel(other.trigger_type) &&
    storyScopesOverlap();

  return commentClash || storyClash ? shared[0] : null;
}

/** Human explanation of WHY a keyword clashed, for the error toast. */
export function conflictReason(
  incoming: ConflictCandidate,
  other: ConflictCandidate
): string {
  const commentClash =
    hasCommentChannel(incoming.trigger_type) &&
    hasCommentChannel(other.trigger_type) &&
    commentScopesOverlap(incoming, other);
  const storyClash =
    hasStoryChannel(incoming.trigger_type) &&
    hasStoryChannel(other.trigger_type) &&
    storyScopesOverlap();

  const parts: string[] = [];
  if (commentClash) {
    parts.push(
      isAccountWide(incoming) || isAccountWide(other)
        ? "both trigger on comments account-wide (no specific post selected)"
        : "both trigger on comments for the same post"
    );
  }
  if (storyClash) {
    parts.push("both trigger on story replies, which can't be scoped to one story");
  }
  return parts.join(" and ");
}
