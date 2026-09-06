/**
 * Instagram Insights (Graph API v26, instagram_business_manage_insights).
 *
 * NOTE: insights data lags up to 48h server-side; Stories with <5 viewers
 * return error code 10; account metrics are stored 90 days.
 * @see https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media/insights
 * @see https://developers.facebook.com/documentation/instagram-platform/api-reference/instagram-user/insights
 */

const GRAPH_API_BASE = "https://graph.instagram.com/v26.0";

export interface MetricValue {
  name: string;
  period: string;
  values: { value: number }[];
  title?: string;
}

export interface MediaInsights {
  mediaId: string;
  metrics: Record<string, number>;
  error?: string;
}

export interface AccountInsights {
  igUserId: string;
  metrics: Record<string, number>;
  error?: string;
}

async function graphGet(path: string, accessToken: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${GRAPH_API_BASE}${path}${path.includes("?") ? "&" : "?"}access_token=${accessToken}`);
  return (await res.json()) as Record<string, unknown>;
}

/**
 * Media-level insights for a single post/reel/story.
 * Feed/Reels: views, reach, likes, comments, saved, shares, total_interactions
 * Stories: views, reach, shares, replies, navigation
 */
export async function fetchMediaInsights(
  accessToken: string,
  mediaId: string,
  mediaType: "FEED" | "REELS" | "STORY"
): Promise<MediaInsights> {
  const metricByType: Record<string, string> = {
    FEED: "views,reach,likes,comments,saved,shares,total_interactions",
    REELS: "views,reach,likes,comments,saved,shares,total_interactions",
    STORY: "views,reach,shares,replies,navigation",
  };
  try {
    const data = await graphGet(
      `/${mediaId}/insights?metric=${metricByType[mediaType] || metricByType.FEED}`,
      accessToken
    );
    if (data.error) {
      const err = data.error as Record<string, unknown>;
      return { mediaId, metrics: {}, error: (err.message as string) || "Insights error" };
    }
    const metrics: Record<string, number> = {};
    for (const row of (data.data as MetricValue[]) || []) {
      metrics[row.name] = row.values?.[0]?.value ?? 0;
    }
    return { mediaId, metrics };
  } catch (err) {
    return { mediaId, metrics: {}, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Account-level insights (needs 100+ followers for some metrics).
 * Views/reach/likes/comments/shares/saves/reposts/total_interactions, day granularity.
 */
export async function fetchAccountInsights(
  accessToken: string,
  igUserId: string,
  days = 30
): Promise<AccountInsights> {
  const metrics = "views,reach,likes,comments,shares,saves,reposts,total_interactions";
  const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
  try {
    const data = await graphGet(
      `/${igUserId}/insights?metric=${metrics}&period=day&metric_type=total_value&since=${since}`,
      accessToken
    );
    if (data.error) {
      const err = data.error as Record<string, unknown>;
      return { igUserId, metrics: {}, error: (err.message as string) || "Insights error" };
    }
    const out: Record<string, number> = {};
    for (const row of (data.data as MetricValue[]) || []) {
      // total_value response shape: { total_value: { value } } or values[]
      const total = (row as unknown as { total_value?: { value?: number } }).total_value?.value;
      out[row.name] = total ?? row.values?.[0]?.value ?? 0;
    }
    return { igUserId, metrics: out };
  } catch (err) {
    return { igUserId, metrics: {}, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Recent published media for the account (top-level fields), for pairing
 * with fetchMediaInsights in the dashboard.
 */
export async function fetchRecentMedia(
  accessToken: string,
  igUserId: string,
  limit = 12
): Promise<{ id: string; caption: string; media_type: string; media_url: string; permalink: string; timestamp: string; like_count?: number; comments_count?: number }[]> {
  try {
    const data = await graphGet(
      `/${igUserId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=${limit}`,
      accessToken
    );
    return ((data.data as unknown[]) || []) as {
      id: string;
      caption: string;
      media_type: string;
      media_url: string;
      permalink: string;
      timestamp: string;
      like_count?: number;
      comments_count?: number;
    }[];
  } catch {
    return [];
  }
}
