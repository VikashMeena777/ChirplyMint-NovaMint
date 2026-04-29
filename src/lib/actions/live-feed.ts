"use server";

import { createClient } from "@/lib/supabase/server";

export interface LiveFeedItem {
  id: string;
  action: string;
  anonymizedUser: string;
  detail: string;
  timeAgo: string;
}

/**
 * Fetch recent anonymized activity from dm_logs for the landing page.
 * Uses service-role-like access (public data only, no user filtering).
 */
export async function getLiveFeedItems(limit = 15): Promise<LiveFeedItem[]> {
  const supabase = await createClient();

  // Fetch recent successful DMs (public aggregate — no user-specific data exposed)
  const { data: recentDMs } = await supabase
    .from("dm_logs")
    .select("id, recipient_username, status, sent_at, comment_text")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (!recentDMs || recentDMs.length === 0) return [];

  const now = Date.now();

  return recentDMs.map((dm) => {
    const username = (dm.recipient_username as string) || "user";
    // Anonymize: show first letter + asterisks
    const anonymized =
      username.length > 2
        ? `${username[0]}${"*".repeat(Math.min(username.length - 2, 4))}${username[username.length - 1]}`
        : "a***r";

    // Time ago
    const sentTime = new Date(dm.sent_at as string).getTime();
    const diffMs = now - sentTime;
    const diffMin = Math.floor(diffMs / 60000);
    let timeAgo: string;
    if (diffMin < 1) timeAgo = "just now";
    else if (diffMin < 60) timeAgo = `${diffMin}m ago`;
    else if (diffMin < 1440) timeAgo = `${Math.floor(diffMin / 60)}h ago`;
    else timeAgo = `${Math.floor(diffMin / 1440)}d ago`;

    // Pick random activity descriptions
    const actions = [
      "received an automated DM ✨",
      "got a personalized reply 💬",
      "was captured as a lead 🎯",
      "triggered an automation ⚡",
      "received a button template 📱",
    ];
    const action = actions[Math.floor(Math.random() * actions.length)];

    return {
      id: dm.id as string,
      action,
      anonymizedUser: anonymized,
      detail: `@${anonymized} ${action}`,
      timeAgo,
    };
  });
}
