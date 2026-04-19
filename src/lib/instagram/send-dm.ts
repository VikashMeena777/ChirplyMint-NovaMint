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
 * Requires: instagram_business_manage_messages permission.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api
 */
export async function sendInstagramDM(
  accessToken: string,
  recipientIgScopedId: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${GRAPH_API_BASE}/me/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientIgScopedId },
        message: { text: messageText },
        messaging_type: "RESPONSE",
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
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started
 */
export async function fetchInstagramPosts(
  igUserId: string,
  accessToken: string,
  limit = 20
): Promise<InstagramPost[]> {
  try {
    const fields =
      "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
    const res = await fetch(
      `${GRAPH_API_BASE}/${igUserId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`,
      { method: "GET" }
    );

    const data = await res.json();

    if (data.error) {
      console.error("[IG Posts] API Error:", data.error.message);
      return [];
    }

    return (data.data || []).map(
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
  } catch (error) {
    console.error("[IG Posts] Fetch error:", error);
    return [];
  }
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
