/**
 * Instagram API helper functions.
 *
 * With the "Instagram API with Instagram Login" flow:
 * - Media/profile: graph.instagram.com
 * - DMs/comments: graph.instagram.com (same base)
 *
 * Rate Limit Handling:
 * - Meta allows ~200 DMs per IG account per 24 hours
 * - On 429 / rate limit errors, we retry with exponential backoff (3 attempts)
 * - If all retries fail, we return rateLimited: true so the caller can queue for later
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started
 */
import { logDebug, logInfo, logWarn, logError } from "@/lib/utils/logger";

const GRAPH_API_BASE = "https://graph.instagram.com/v26.0";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000; // 2 seconds, doubles each retry

/**
 * Check if a Meta API error is a rate limit error.
 * Meta uses error codes 4 (app-level), 32 (rate limit), 613 (calls limit).
 */
function isRateLimitError(error: Record<string, unknown>): boolean {
  const code = error.code as number;
  const subcode = error.error_subcode as number;
  const message = ((error.message as string) || "").toLowerCase();
  return (
    code === 4 ||
    code === 32 ||
    code === 613 ||
    subcode === 2207051 ||
    message.includes("rate limit") ||
    message.includes("too many calls") ||
    message.includes("limit reached")
  );
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Business Use Case (BUC) rate-limit telemetry (A23).
 * Meta echoes the `x-business-use-case-usage` header on Messaging API
 * responses: JSON keyed by app-scoped IG user id, each entry an array with
 * `call_count` (% of the 24h window consumed), `total_cputime`, `total_time`
 * and `type`. The latest reading per sending account is kept in memory so the
 * dashboard can show a usage gauge (see getRateLimitStatus).
 */
export interface BucUsageEntry {
  callCount: number;
  totalCputime?: number;
  totalTime?: number;
  type?: string;
  readAt: string;
}

const bucUsageMap = new Map<string, BucUsageEntry>();

// % of the 24h window at which we start warning in logs (matches the
// dashboard's amber "API usage 80%+" state)
const BUC_WARN_THRESHOLD = 80;

/**
 * Record the latest BUC usage reading from a response header.
 * Best-effort: wrapped so telemetry can never break a send.
 */
function recordBucUsage(igUserId: string, headers: Headers): void {
  try {
    const raw = headers.get("x-business-use-case-usage");
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<
      string,
      Array<{ call_count?: number; total_cputime?: number; total_time?: number; type?: string }>
    >;
    const entry = parsed?.[igUserId]?.[0];
    if (!entry || typeof entry.call_count !== "number") return;
    bucUsageMap.set(igUserId, {
      callCount: entry.call_count,
      totalCputime: entry.total_cputime,
      totalTime: entry.total_time,
      type: entry.type,
      readAt: new Date().toISOString(),
    });
    if (entry.call_count >= BUC_WARN_THRESHOLD) {
      logWarn("IG BUC Usage", `Rate-limit window ${entry.call_count}% consumed for IG account ${igUserId}`);
    }
  } catch {
    // Telemetry only — never break a send over a usage header.
  }
}

/**
 * Latest BUC rate-limit reading for an IG account.
 * Returns null when no send has been observed in this server instance yet.
 */
export function getBucUsage(igUserId: string): BucUsageEntry | null {
  return bucUsageMap.get(igUserId) ?? null;
}

/**
 * Send a DM to an Instagram user via the Instagram Messaging API.
 * Uses POST /<IG_ID>/messages with Authorization Bearer header.
 * Requires: instagram_business_manage_messages permission.
 *
 * @param igUserId - The sender's Instagram professional account ID (IG_ID)
 * @param accessToken - Instagram user access token
 * @param recipientIgScopedId - The recipient's Instagram-scoped ID (IGSID)
 * @param messageText - The message text to send
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api
 */
export async function sendInstagramDM(
  igUserId: string,
  accessToken: string,
  recipientIgScopedId: string,
  messageText: string,
  options?: { humanAgent?: boolean; typing?: boolean }
): Promise<{ success: boolean; messageId?: string; error?: string; rateLimited?: boolean }> {
  // Human feel: show "typing…" briefly so the DM lands like a real person's.
  // Batch senders (drip engine) opt out with typing:false to stay in their
  // function timeout budget.
  if (options?.typing !== false) {
    await sendSenderAction(igUserId, accessToken, recipientIgScopedId, "typing_on").catch(() => {});
    await sleep(900);
  }

  // Build request body
  const body: Record<string, unknown> = {
    recipient: { id: recipientIgScopedId },
    message: { text: messageText },
  };

  // Add HUMAN_AGENT tag for messages sent outside the 24-hour window
  if (options?.humanAgent) {
    body.messaging_type = "MESSAGE_TAG";
    body.tag = "HUMAN_AGENT";
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      recordBucUsage(igUserId, res.headers);

      const data = await res.json();

      if (data.error) {
        // Rate limit → retry with exponential backoff
        if (isRateLimitError(data.error) && attempt < MAX_RETRIES) {
          const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
          logWarn("IG Send DM", `Rate limited, retry ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms`, { error: data.error.message });
          await sleep(delayMs);
          continue;
        }

        // Rate limit but out of retries
        if (isRateLimitError(data.error)) {
          logWarn("IG Send DM", "Rate limit — all retries exhausted, queuing for later", { recipientIgScopedId });
          return { success: false, error: data.error.message, rateLimited: true };
        }

        logError("IG Send DM", "API Error", data.error);
        return { success: false, error: data.error.message };
      }

      return { success: true, messageId: data.message_id };
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
        logWarn("IG Send DM", `Network error, retry ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms`);
        await sleep(delayMs);
        continue;
      }
      const msg = error instanceof Error ? error.message : "Unknown error";
      logError("IG Send DM", "Network error after retries", error);
      return { success: false, error: msg };
    }
  }

  return { success: false, error: "Max retries exceeded" };
}

/**
 * Send a PRIVATE REPLY to a comment via the Instagram Private Replies API.
 * This is the CORRECT way to DM a user who commented on your post.
 *
 * Uses POST /<IG_ID>/messages with recipient.comment_id (NOT recipient.id).
 * Rules:
 * - Only ONE private reply per comment is allowed.
 * - Must be sent within 7 days of the comment.
 * - Requires: instagram_business_manage_messages permission.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/private-replies
 */
export async function sendPrivateReply(
  igUserId: string,
  accessToken: string,
  commentId: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; recipientId?: string; error?: string; rateLimited?: boolean; duplicate?: boolean }> {
  logDebug("IG Private Reply", `Sending via /${igUserId}/messages`, { commentId });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          recipient: { comment_id: commentId },
          message: { text: messageText },
        }),
      });

      const data = await res.json();

      if (data.error) {
        // Rate limit → retry with exponential backoff
        if (isRateLimitError(data.error) && attempt < MAX_RETRIES) {
          const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
          logWarn("IG Private Reply", `Rate limited, retry ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms`, { error: data.error.message });
          await sleep(delayMs);
          continue;
        }

        if (isRateLimitError(data.error)) {
          logWarn("IG Private Reply", "Rate limit — all retries exhausted, queuing for later", { commentId });
          return { success: false, error: data.error.message, rateLimited: true };
        }

        // Meta re-delivers comment webhooks 2-5x. A second private reply to
        // the same comment returns subcode 2534023 ("already has a reply") —
        // treat it as success: the lead DID get the message, and marking it
        // failed caused false "failed" rows + failure-alert spam.
        if (data.error.error_subcode === 2534023 || /already has a reply/i.test(data.error.message || "")) {
          logInfo("IG Private Reply", "Duplicate private reply (already sent) — treating as success", { commentId });
          return { success: true, duplicate: true };
        }

        logError("IG Private Reply", "API Error", data.error);
        return { success: false, error: data.error.message };
      }

      logInfo("IG Private Reply", "Success", { recipientId: data.recipient_id, messageId: data.message_id });
      return {
        success: true,
        messageId: data.message_id,
        recipientId: data.recipient_id,
      };
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
        logWarn("IG Private Reply", `Network error, retry ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms`);
        await sleep(delayMs);
        continue;
      }
      const msg = error instanceof Error ? error.message : "Unknown error";
      logError("IG Private Reply", "Network error after retries", error);
      return { success: false, error: msg };
    }
  }

  return { success: false, error: "Max retries exceeded" };
}

/**
 * Quick Reply button type for Instagram messaging.
 * When tapped, it sends a text message FROM the user (opening the DM window).
 */
export interface QuickReplyButton {
  title: string;
  payload: string;
}

/**
 * Send a Private Reply with Quick Reply buttons.
 * Quick Replies appear as tappable chips below the message.
 * When the user taps one, Instagram sends a text message on behalf of the user,
 * which opens the messaging window for follow-up DMs (drip sequences).
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api
 */
export async function sendPrivateReplyWithQuickReplies(
  igUserId: string,
  accessToken: string,
  commentId: string,
  messageText: string,
  quickReplies: QuickReplyButton[]
): Promise<{ success: boolean; messageId?: string; recipientId?: string; error?: string }> {
  try {
    logDebug("IG Private Reply+QR", `Sending with ${quickReplies.length} quick replies`, { commentId });

    const qr = quickReplies.map((btn) => ({
      content_type: "text",
      title: btn.title.slice(0, 20), // Instagram limits to 20 chars
      payload: btn.payload.slice(0, 1000),
    }));

    const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: {
          text: messageText,
          quick_replies: qr,
        },
      }),
    });

    const data = await res.json();

    if (data.error) {
      // If quick replies aren't supported for private replies, fall back to plain text
      logWarn("IG Private Reply+QR", "Quick replies failed, falling back to plain text", { error: data.error.message });
      return sendPrivateReply(igUserId, accessToken, commentId, messageText);
    }

    logInfo("IG Private Reply+QR", "Success", { recipientId: data.recipient_id });
    return {
      success: true,
      messageId: data.message_id,
      recipientId: data.recipient_id,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logError("IG Private Reply+QR", "Network error", error);
    return { success: false, error: msg };
  }
}

/**
 * Send a Generic Template (rich card with buttons) as a Private Reply.
 * Uses the Instagram Generic Template format for interactive DMs.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/send-messages#generic-template
 */
export async function sendGenericTemplate(
  igUserId: string,
  accessToken: string,
  commentId: string,
  template: {
    title: string;
    subtitle?: string;
    image_url?: string;
    buttons: TemplateButton[];
  }
): Promise<{ success: boolean; messageId?: string; recipientId?: string; error?: string }> {
  try {
    logDebug("IG Generic Template", `Sending "${template.title}"`, { commentId });

    const element: Record<string, unknown> = {
      title: template.title.slice(0, 80),
    };
    if (template.subtitle) element.subtitle = template.subtitle.slice(0, 80);
    if (template.image_url) element.image_url = template.image_url;

    // Build buttons array (max 3)
    if (template.buttons && template.buttons.length > 0) {
      element.buttons = template.buttons.slice(0, 3).map((btn) => {
        if (btn.type === "web_url") {
          return { type: "web_url", url: btn.url, title: btn.title.slice(0, 20) };
        }
        return { type: "postback", title: btn.title.slice(0, 20), payload: btn.payload || btn.title };
      });
    }

    const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [element],
            },
          },
        },
      }),
    });

    const data = await res.json();

    if (data.error) {
      logError("IG Generic Template", "API Error", data.error);
      return { success: false, error: data.error.message };
    }

    logInfo("IG Generic Template", "Success", { messageId: data.message_id });
    return {
      success: true,
      messageId: data.message_id,
      recipientId: data.recipient_id,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logError("IG Generic Template", "Network error", error);
    return { success: false, error: msg };
  }
}

/**
 * Send a Generic Template (rich card with buttons) as a Direct Message.
 * Unlike sendGenericTemplate (which uses comment_id for Private Replies),
 * this function sends directly to a user's IG-scoped ID — used for drip follow-ups.
 *
 * Supports HUMAN_AGENT tag for messages sent outside the 24-hour window.
 */
export async function sendGenericTemplateDM(
  igUserId: string,
  accessToken: string,
  recipientIgId: string,
  template: {
    title: string;
    subtitle?: string;
    image_url?: string;
    buttons: TemplateButton[];
  },
  options?: { humanAgent?: boolean; typing?: boolean }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Typing indicator before the rich card lands (opt out for batch sends)
  if (options?.typing !== false) {
    await sendSenderAction(igUserId, accessToken, recipientIgId, "typing_on").catch(() => {});
    await sleep(900);
  }
  try {
    logDebug("IG Template DM", `Sending "${template.title}"`, { recipientIgId });

    const element: Record<string, unknown> = {
      title: template.title.slice(0, 80),
    };
    if (template.subtitle) element.subtitle = template.subtitle.slice(0, 80);
    if (template.image_url) element.image_url = template.image_url;

    // Build buttons array (max 3)
    if (template.buttons && template.buttons.length > 0) {
      element.buttons = template.buttons.slice(0, 3).map((btn) => {
        if (btn.type === "web_url") {
          return { type: "web_url", url: btn.url, title: btn.title.slice(0, 20) };
        }
        return { type: "postback", title: btn.title.slice(0, 20), payload: btn.payload || btn.title };
      });
    }

    const body: Record<string, unknown> = {
      recipient: { id: recipientIgId },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
            elements: [element],
          },
        },
      },
    };

    // Add HUMAN_AGENT tag for drip follow-ups outside 24-hour window
    if (options?.humanAgent) {
      body.messaging_type = "MESSAGE_TAG";
      body.tag = "HUMAN_AGENT";
    }

    const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    recordBucUsage(igUserId, res.headers);

    const data = await res.json();

    if (data.error) {
      logError("IG Template DM", "API Error", data.error);
      return { success: false, error: data.error.message };
    }

    logInfo("IG Template DM", "Success", { messageId: data.message_id });
    return { success: true, messageId: data.message_id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logError("IG Template DM", "Network error", error);
    return { success: false, error: msg };
  }
}

/**
 * Check if the commenter follows the business account using the User Profile API.
 * Returns is_user_follow_business from IG User Profile endpoint.
 *
 * Note: Requires user consent (the user must have previously DM'd the business).
 * If consent is not established (first-time commenter), API will error → returns null.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/user-profile
 */
export async function checkIfFollower(
  igScopedId: string,
  accessToken: string
): Promise<{ isFollower: boolean | null; username?: string; error?: string }> {
  try {
    logDebug("IG Follower Check", "Checking follower status", { igScopedId });

    const res = await fetch(
      `${GRAPH_API_BASE}/${igScopedId}?fields=name,username,is_user_follow_business&access_token=${accessToken}`,
      { method: "GET" }
    );

    const data = await res.json();

    if (data.error) {
      // Common error: "User consent is required" for first-time commenters
      logWarn("IG Follower Check", "API Error", { error: data.error.message });
      return { isFollower: null, error: data.error.message };
    }

    const isFollower = data.is_user_follow_business ?? null;
    logDebug("IG Follower Check", `${data.username || igScopedId} follows=${isFollower}`);
    return { isFollower, username: data.username };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    logError("IG Follower Check", "Network error", error);
    return { isFollower: null, error: msg };
  }
}

/**
 * Reply to a comment on an Instagram post.
 * Uses the comment's ID to post a public reply.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/comment-moderation
 */
export async function replyToComment(
  accessToken: string,
  commentId: string,
  replyText: string
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${commentId}/replies?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      }
    );

    const data = await res.json();

    if (data.error) {
      console.error("[IG Comment Reply] API Error:", data.error.message);
      return { success: false, error: data.error.message };
    }

    return { success: true, commentId: data.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[IG Comment Reply] Network error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Fetch the user's recent Instagram posts for the post picker.
 * Uses the Instagram API with Instagram Login media endpoint.
 * Supports pagination via `after` cursor for loading more posts.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started
 */
export async function fetchInstagramPosts(
  igUserId: string,
  accessToken: string,
  limit = 50,
  afterCursor?: string
): Promise<{ posts: InstagramPost[]; nextCursor?: string }> {
  try {
    const fields =
      "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
    let url = `${GRAPH_API_BASE}/${igUserId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
    if (afterCursor) {
      url += `&after=${afterCursor}`;
    }

    const res = await fetch(url, { method: "GET" });
    const data = await res.json();

    if (data.error) {
      console.error("[IG Posts] API Error:", data.error.message);
      return { posts: [] };
    }

    const posts = (data.data || []).map(
      (post: Record<string, string | undefined>) => ({
        id: post.id || "",
        caption: post.caption || "",
        media_type: post.media_type || "IMAGE",
        media_url: post.media_url || "",
        thumbnail_url: post.thumbnail_url || post.media_url || "",
        permalink: post.permalink || "",
        timestamp: post.timestamp || "",
      })
    );

    const nextCursor = data.paging?.cursors?.after || undefined;

    return { posts, nextCursor };
  } catch (error) {
    console.error("[IG Posts] Fetch error:", error);
    return { posts: [] };
  }
}

/**
 * Fetch a single Instagram post by its URL using the oEmbed endpoint.
 * Extracts the media_id from the oEmbed response, then fetches full details.
 *
 * @param postUrl - Full Instagram post/reel URL (e.g. https://www.instagram.com/reel/...)
 * @param igUserId - The user's IG user ID
 * @param accessToken - Access token
 */
export async function fetchInstagramPostByUrl(
  postUrl: string,
  igUserId: string,
  accessToken: string
): Promise<InstagramPost | null> {
  try {
    // Use Instagram oEmbed to get basic info and validate the URL
    const oembedRes = await fetch(
      `https://graph.facebook.com/v26.0/instagram_oembed?url=${encodeURIComponent(postUrl)}&access_token=${accessToken}`,
      { method: "GET" }
    );
    const oembedData = await oembedRes.json();

    if (oembedData.error) {
      console.error("[IG PostByUrl] oEmbed Error:", oembedData.error.message);

      // Fallback: search through the user's media to find matching URL
      return await findPostByPermalink(postUrl, igUserId, accessToken);
    }

    // If oEmbed worked, try to find the post in user's media
    return await findPostByPermalink(postUrl, igUserId, accessToken);
  } catch (error) {
    console.error("[IG PostByUrl] Fetch error:", error);
    return null;
  }
}

/**
 * Search through user's media to find a post matching the given permalink.
 * Iterates through pages of media to find the matching post.
 */
async function findPostByPermalink(
  permalink: string,
  igUserId: string,
  accessToken: string
): Promise<InstagramPost | null> {
  // Normalize the URL for comparison
  const normalizedTarget = permalink.replace(/\/$/, "").toLowerCase();

  let cursor: string | undefined;
  let attempts = 0;
  const maxAttempts = 5; // Search up to ~250 posts (5 pages x 50 per page)

  while (attempts < maxAttempts) {
    const { posts, nextCursor } = await fetchInstagramPosts(igUserId, accessToken, 50, cursor);

    for (const post of posts) {
      const normalizedPermalink = (post.permalink || "").replace(/\/$/, "").toLowerCase();
      if (normalizedPermalink === normalizedTarget) {
        return post;
      }
    }

    if (!nextCursor) break;
    cursor = nextCursor;
    attempts++;
  }

  console.warn("[IG PostByUrl] Post not found in user media:", permalink);
  return null;
}

/**
 * Fetch the user's currently active Instagram stories.
 * Stories are only available while live (24-hour window).
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing
 */
export async function fetchInstagramStories(
  igUserId: string,
  accessToken: string
): Promise<{ stories: InstagramPost[] }> {
  try {
    const fields =
      "id,media_type,media_url,thumbnail_url,timestamp,permalink";
    const url = `${GRAPH_API_BASE}/${igUserId}/stories?fields=${fields}&access_token=${accessToken}`;

    const res = await fetch(url, { method: "GET" });
    const data = await res.json();

    if (data.error) {
      console.error("[IG Stories] API Error:", data.error.message);
      return { stories: [] };
    }

    const stories = (data.data || []).map(
      (story: Record<string, string | undefined>) => ({
        id: story.id || "",
        caption: "", // Stories don't have captions
        media_type: story.media_type || "IMAGE",
        media_url: story.media_url || "",
        thumbnail_url: story.thumbnail_url || story.media_url || "",
        permalink: story.permalink || "",
        timestamp: story.timestamp || "",
      })
    );

    return { stories };
  } catch (error) {
    console.error("[IG Stories] Fetch error:", error);
    return { stories: [] };
  }
}

export interface TemplateButton {
  type: "web_url" | "postback";
  title: string;
  url?: string;
  payload?: string;
}

export interface InstagramPost {
  id: string;
  caption: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string;
  permalink: string;
  timestamp: string;
}

/**
 * Sender Actions (typing_on / typing_off / mark_seen) — Graph API v26.
 * Body must contain ONLY sender_action + recipient (per Meta docs).
 * Used to humanize automated DMs: show "typing…" briefly before a message lands.
 */
export async function sendSenderAction(
  igUserId: string,
  accessToken: string,
  recipientIgScopedId: string,
  action: "typing_on" | "typing_off" | "mark_seen"
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientIgScopedId },
        sender_action: action,
      }),
    });
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message || "Sender action failed" };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Optional attachment-cache wiring (A22). When provided, image/file sends
 * reuse Meta attachment_ids: a cached id (getAttachmentId) skips the upload
 * entirely, and a fresh one is uploaded once (is_reusable:true) then reported
 * via onAttachmentId so the caller can persist it. All fields optional — on
 * any cache/upload failure the send falls back to the plain URL payload.
 */
export interface AttachmentCacheOpts {
  userId?: string;
  igAccountId?: string;
  onAttachmentId?: (url: string, type: string, id: string) => void;
  getAttachmentId?: (url: string, type: string) => Promise<string | null>;
}

/**
 * Resolve the attachment payload for one asset URL under cache mode:
 *   1. cached attachment_id (getAttachmentId)      -> send by id
 *   2. fresh reusable upload (is_reusable:true)    -> send by id + report for caching
 *   3. fallback                                    -> plain { url } payload
 */
async function resolveAttachmentPayload(
  igUserId: string,
  accessToken: string,
  url: string,
  type: "image" | "file",
  opts?: AttachmentCacheOpts
): Promise<Record<string, string>> {
  if (opts?.getAttachmentId) {
    try {
      const cachedId = await opts.getAttachmentId(url, type);
      if (cachedId) return { attachment_id: cachedId };
    } catch {
      // Cache read failure — fall through to a fresh upload / URL payload.
    }
  }
  if (opts?.onAttachmentId) {
    const upload = await uploadReusableAttachment(igUserId, accessToken, type, url);
    if (upload.success && upload.attachmentId) {
      try {
        opts.onAttachmentId(url, type, upload.attachmentId);
      } catch {
        // Cache write failure — the send itself already has the id.
      }
      return { attachment_id: upload.attachmentId };
    }
  }
  return { url };
}

/**
 * Multi-image DM — up to 10 images in ONE message (GA May 2026).
 * Accepts image URLs (8MB max each, png/jpeg). On error 2534068 (feature not
 * available for the account), falls back to sending images one by one.
 * With cacheOpts, each image is sent by reusable attachment_id when possible.
 */
export async function sendMultiImageDM(
  igUserId: string,
  accessToken: string,
  recipientIgScopedId: string,
  imageUrls: string[],
  caption?: string,
  opts?: AttachmentCacheOpts
): Promise<{ success: boolean; messageId?: string; error?: string; fellBackToSingles?: boolean }> {
  const urls = imageUrls.slice(0, 10);
  try {
    // Instagram messages carry text OR attachments, never both — putting
    // caption text alongside attachments gets it silently DROPPED (user
    // reported: images arrived, caption missing). The caption goes as its
    // own text message right AFTER the album: images land first (visual
    // hook), then the caption reads exactly like a native Instagram caption
    // under a post — the pattern every user's brain already knows.
    const payloads: Record<string, string>[] = [];
    for (const url of urls) {
      payloads.push(await resolveAttachmentPayload(igUserId, accessToken, url, "image", opts));
    }
    const body: Record<string, unknown> = {
      recipient: { id: recipientIgScopedId },
      message: {
        attachments: payloads.map((payload) => ({
          type: "image",
          payload,
        })),
      },
    };
    const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    recordBucUsage(igUserId, res.headers);
    const data = await res.json();
    if (data.error) {
      const subcode = data.error.error_subcode as number | undefined;
      if (subcode === 2534068) {
        // Feature not enabled for this account — send as individual images
        // (real image attachments, NOT the URL as text).
        let allOk = true;
        for (let i = 0; i < urls.length; i++) {
          const single = await sendImageDMByUrl(igUserId, accessToken, recipientIgScopedId, urls[i], payloads[i]);
          if (!single.success) allOk = false;
          await sleep(600);
        }
        if (allOk && caption && caption.trim()) {
          await sendInstagramDM(igUserId, accessToken, recipientIgScopedId, caption.slice(0, 1000));
        }
        return { success: allOk, fellBackToSingles: true };
      }
      return { success: false, error: data.error.message || "Multi-image send failed" };
    }
    if (caption && caption.trim()) {
      await sleep(600);
      await sendInstagramDM(igUserId, accessToken, recipientIgScopedId, caption.slice(0, 1000));
    }
    return { success: true, messageId: data.message_id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Single image attachment DM (used by the multi-image fallback).
 * `attachmentPayload` overrides the default { url } payload so the fallback
 * can reuse a cached/uploaded attachment_id.
 */
export async function sendImageDMByUrl(
  igUserId: string,
  accessToken: string,
  recipientIgScopedId: string,
  imageUrl: string,
  attachmentPayload?: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientIgScopedId },
        message: {
          attachment: { type: "image", payload: attachmentPayload || { url: imageUrl } },
        },
      }),
    });
    recordBucUsage(igUserId, res.headers);
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message || "Image send failed" };
    return { success: true, messageId: data.message_id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * File DM — PDF brochures/lead magnets (25MB max, added Dec 2025).
 * The URL must be publicly reachable; Meta fetches it at send time.
 * With cacheOpts, the file is sent by reusable attachment_id when possible.
 */
export async function sendFileDM(
  igUserId: string,
  accessToken: string,
  recipientIgScopedId: string,
  fileUrl: string,
  opts?: AttachmentCacheOpts
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const payload = await resolveAttachmentPayload(igUserId, accessToken, fileUrl, "file", opts);
    const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientIgScopedId },
        message: {
          attachment: { type: "file", payload },
        },
      }),
    });
    recordBucUsage(igUserId, res.headers);
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message || "File send failed" };
    return { success: true, messageId: data.message_id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}
export interface QuickReply {
  content_type?: "text" | "user_email" | "user_phone_number";
  title: string; // max 20 chars
  payload: string;
}

/**
 * Quick Replies DM — up to 13 tappable options under a text prompt.
 * user_email / user_phone_number types open the keyboard pre-filled for
 * one-tap lead capture. Taps arrive on the messages webhook as
 * message.quick_reply.payload with the typed value as message.text.
 */
export async function sendQuickRepliesDM(
  igUserId: string,
  accessToken: string,
  recipientIgScopedId: string,
  promptText: string,
  quickReplies: QuickReply[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Meta rule: native capture chips (user_email / user_phone_number) CANNOT
  // be mixed with each other in one message — only ONE special type per
  // message; mixing makes Instagram drop the chips (the "only one button
  // shows" bug). So we split into sequential messages:
  //   1. prompt + all text chips
  //   2. short email prompt + the single email chip (if present)
  //   3. short phone prompt + the single phone chip (if present)
  const textChips = quickReplies.filter((q) => (q.content_type || "text") === "text").slice(0, 13);
  const emailChip = quickReplies.find((q) => q.content_type === "user_email");
  const phoneChip = quickReplies.find((q) => q.content_type === "user_phone_number");

  async function sendOne(text: string, chips: QuickReply[]): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          recipient: { id: recipientIgScopedId },
          message: {
            text: text.slice(0, 1000),
            quick_replies: chips.map((q) => ({
              content_type: q.content_type || "text",
              title: q.title.slice(0, 20),
              payload: q.payload,
            })),
          },
        }),
      });
      recordBucUsage(igUserId, res.headers);
      const data = await res.json();
      if (data.error) return { success: false, error: data.error.message || "Quick replies send failed" };
      return { success: true, messageId: data.message_id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  }

  let anySuccess = false;
  let lastError: string | undefined;

  if (textChips.length > 0) {
    const r = await sendOne(promptText, textChips);
    if (r.success) anySuccess = true; else lastError = r.error;
    await new Promise((res) => setTimeout(res, 600));
  }

  if (emailChip) {
    const r = await sendOne("Also - drop your email so we can reach you 📧", [emailChip]);
    if (r.success) anySuccess = true; else lastError = r.error;
    await new Promise((res) => setTimeout(res, 600));
  }

  if (phoneChip) {
    const r = await sendOne("And your phone number, if that's easier 📱", [phoneChip]);
    if (r.success) anySuccess = true; else lastError = r.error;
  }

  if (!textChips.length && !emailChip && !phoneChip) {
    return { success: false, error: "Quick replies block has no options" };
  }
  return anySuccess ? { success: true } : { success: false, error: lastError };
}

export interface CarouselElement {
  title: string; // max 80 chars
  subtitle?: string; // max 80 chars
  image_url?: string;
  default_url?: string;
  buttons: TemplateButton[];
}

/**
 * Carousel DM (generic template) — up to 10 cards, 3 buttons each.
 * Mobile-only rendering (Instagram limitation); sent as a horizontally
 * scrollable product showcase.
 */
export async function sendCarouselDM(
  igUserId: string,
  accessToken: string,
  recipientIgScopedId: string,
  elements: CarouselElement[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        recipient: { id: recipientIgScopedId },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: elements.slice(0, 10).map((el) => ({
                title: el.title.slice(0, 80),
                ...(el.subtitle ? { subtitle: el.subtitle.slice(0, 80) } : {}),
                ...(el.image_url ? { image_url: el.image_url } : {}),
                ...(el.default_url ? { default_action: { type: "web_url", url: el.default_url } } : {}),
                buttons: (el.buttons || []).slice(0, 3).map((btn) =>
                  btn.type === "web_url"
                    ? { type: "web_url", url: btn.url, title: btn.title.slice(0, 20) }
                    : { type: "postback", title: btn.title.slice(0, 20), payload: btn.payload || btn.title }
                ),
              })),
            },
          },
        },
      }),
    });
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message || "Carousel send failed" };
    return { success: true, messageId: data.message_id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Media Share DM — send one of YOUR OWN published posts into the
 * conversation ("here's the post you commented on"). Media must be owned
 * by the connected account.
 */
export async function sendMediaShareDM(
  igUserId: string,
  accessToken: string,
  recipientIgScopedId: string,
  mediaId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        recipient: { id: recipientIgScopedId },
        message: { attachment: { type: "MEDIA_SHARE", payload: { id: mediaId } } },
      }),
    });
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message || "Media share failed" };
    return { success: true, messageId: data.message_id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * React to an inbound message with an emoji (sender_action react).
 * Used for the auto-heart delight feature on first-time commenters.
 */
export async function reactToMessage(
  igUserId: string,
  accessToken: string,
  recipientIgScopedId: string,
  messageId: string,
  emoji = "❤️"
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        recipient: { id: recipientIgScopedId },
        sender_action: "react",
        message_id: messageId,
        reaction: emoji,
      }),
    });
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message || "React failed" };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Upload a reusable attachment once, get an attachment_id, reuse it across
 * every recipient (solves large-image timeouts on slow servers).
 */
export async function uploadReusableAttachment(
  igUserId: string,
  accessToken: string,
  type: "image" | "video" | "audio" | "file",
  mediaUrl: string
): Promise<{ success: boolean; attachmentId?: string; error?: string }> {
  try {
    const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/message_attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        message: {
          attachment: { type, payload: { url: mediaUrl, is_reusable: true } },
        },
      }),
    });
    const data = await res.json();
    if (data.error) return { success: false, error: data.error.message || "Attachment upload failed" };
    return { success: true, attachmentId: data.attachment_id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Hide a comment from the public feed (Graph API v26, instagram_manage_comments).
 * Hidden comments stay visible to the commenter - they don't know it was hidden -
 * but they never trigger automations. Used by account-level auto-moderation.
 */
export async function hideComment(
  commentId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`https://graph.instagram.com/v26.0/${commentId}?hide=true`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json()) as { error?: { message?: string } };
    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "network error" };
  }
}

/**
 * Like a comment (auto-like / engagement, Graph API v26).
 * Requires instagram_manage_comments. Idempotent per comment — liking an
 * already-liked comment returns success.
 */
export async function likeComment(
  igUserId: string,
  commentId: string,
  accessToken: string
): Promise<{ success: boolean; duplicate?: boolean; error?: string; needsPermission?: boolean }> {
  try {
    // Like Media and Comments API (Meta changelog, Apr 2026): likes live on
    // the IG User edge with a comment_id/media_id param — the old
    // /{comment-id}/likes edge never existed and 404s with "Unsupported
    // post request". Requires instagram_manage_engagement.
    const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/likes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ comment_id: commentId }),
    });
    const data = (await res.json()) as { error?: { message?: string; code?: number; error_subcode?: number } };
    if (data.error) {
      // Already liked → success (idempotent)
      if (/already/i.test(data.error.message || "")) {
        return { success: true, duplicate: true };
      }
      const msg = data.error.message || "";
      if (/permission|engage/i.test(msg)) {
        return {
          success: false,
          needsPermission: true,
          error: "Needs the instagram_manage_engagement permission (Meta app review)",
        };
      }
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}
