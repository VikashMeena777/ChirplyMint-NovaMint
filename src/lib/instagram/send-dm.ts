const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

/**
 * Send a DM to an Instagram user via the Messenger Platform.
 * Requires: page access token with instagram_manage_messages permission.
 *
 * @see https://developers.facebook.com/docs/messenger-platform/instagram/features/send-message
 */
export async function sendInstagramDM(
  pageAccessToken: string,
  recipientIgScopedId: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${GRAPH_API_BASE}/me/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-comment
 */
export async function replyToComment(
  pageAccessToken: string,
  commentId: string,
  replyText: string
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${commentId}/replies?access_token=${pageAccessToken}`,
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
 * Returns media with thumbnails, captions, and permalinks.
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
