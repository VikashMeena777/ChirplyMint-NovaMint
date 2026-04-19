/**
 * Instagram API helper functions.
 *
 * With the "Instagram API with Instagram Login" flow:
 * - Media/profile: graph.instagram.com
 * - DMs/comments: graph.instagram.com (same base)
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started
 */
const GRAPH_API_BASE = "https://graph.instagram.com/v21.0";

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
  messageText: string
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
        message: { text: messageText },
      }),
    });

    const data = await res.json();

    if (data.error) {
      console.error("[IG Send DM] API Error:", data.error.message);
      return { success: false, error: data.error.message };
    }

    return { success: true, messageId: data.message_id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[IG Send DM] Network error:", msg);
    return { success: false, error: msg };
  }
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
): Promise<{ success: boolean; messageId?: string; recipientId?: string; error?: string }> {
  try {
    console.log(`[IG Private Reply] Sending via /${igUserId}/messages with comment_id=${commentId}`);

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
      console.error("[IG Private Reply] API Error:", JSON.stringify(data.error));
      return { success: false, error: data.error.message };
    }

    console.log(`[IG Private Reply] Success! recipient_id=${data.recipient_id}, message_id=${data.message_id}`);
    return {
      success: true,
      messageId: data.message_id,
      recipientId: data.recipient_id,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[IG Private Reply] Network error:", msg);
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
    console.log(`[IG Generic Template] Sending template "${template.title}" via comment_id=${commentId}`);

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
      console.error("[IG Generic Template] API Error:", JSON.stringify(data.error));
      return { success: false, error: data.error.message };
    }

    console.log(`[IG Generic Template] Success! message_id=${data.message_id}`);
    return {
      success: true,
      messageId: data.message_id,
      recipientId: data.recipient_id,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[IG Generic Template] Network error:", msg);
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
    console.log(`[IG Follower Check] Checking follower status for IGSID=${igScopedId}`);

    const res = await fetch(
      `${GRAPH_API_BASE}/${igScopedId}?fields=name,username,is_user_follow_business&access_token=${accessToken}`,
      { method: "GET" }
    );

    const data = await res.json();

    if (data.error) {
      // Common error: "User consent is required" for first-time commenters
      console.warn("[IG Follower Check] API Error:", data.error.message);
      return { isFollower: null, error: data.error.message };
    }

    const isFollower = data.is_user_follow_business ?? null;
    console.log(`[IG Follower Check] ${data.username || igScopedId} follows=${isFollower}`);
    return { isFollower, username: data.username };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[IG Follower Check] Network error:", msg);
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
      `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(postUrl)}&access_token=${accessToken}`,
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
