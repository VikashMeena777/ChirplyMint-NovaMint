import { createClient } from "@supabase/supabase-js";

/**
 * AI Agent content knowledge: the owner's posts + automation resources.
 * Gives the agent real answers ("what was that reel about?") and the
 * ability to DELIVER content (share a post, send a resource) inside DMs.
 */

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface PostKnowledge {
  mediaId: string;
  caption: string;
  permalink: string;
  mediaType: string;
  timestamp: string;
}

export interface ResourceKnowledge {
  automationId: string;
  name: string;
  keyword: string;
  summary: string; // what the automation delivers
  fileUrl: string | null;
  imageUrls: string[];
}

/**
 * Fetch the owner's recent posts (captions = what the agent "knows" about
 * their own content).
 */
export async function getPostKnowledge(userId: string, limit = 12): Promise<PostKnowledge[]> {
  const supabase = getAdminSupabase();
  const { data: accounts } = await supabase
    .from("instagram_accounts")
    .select("ig_user_id, page_access_token, access_token")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1);

  const acc = (accounts || [])[0] as Record<string, string> | undefined;
  if (!acc) return [];
  const token = acc.page_access_token || acc.access_token;

  try {
    const res = await fetch(
      `https://graph.instagram.com/v26.0/${acc.ig_user_id}/media?fields=id,caption,permalink,media_type,timestamp&limit=${limit}&access_token=${encodeURIComponent(token)}`
    );
    const data = (await res.json()) as { data?: { id: string; caption?: string; permalink?: string; media_type?: string; timestamp?: string }[] };
    return (data.data || []).map((m) => ({
      mediaId: m.id,
      caption: (m.caption || "").slice(0, 300),
      permalink: m.permalink || "",
      mediaType: m.media_type || "",
      timestamp: m.timestamp || "",
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch the owner's automation "resources" — anything a lead can get via
 * keyword (guides, PDFs, albums) plus their summaries.
 */
export async function getResourceKnowledge(userId: string): Promise<ResourceKnowledge[]> {
  const supabase = getAdminSupabase();
  const { data: automations } = await supabase
    .from("automations")
    .select("id, name, keyword, dm_template, template_file_url, template_image_urls, template_blocks, template_type")
    .eq("user_id", userId)
    .eq("status", "active");

  return (automations || []).map((a) => {
    const x = a as Record<string, unknown>;
    const blocks = Array.isArray(x.template_blocks) ? (x.template_blocks as Record<string, unknown>[]) : [];
    const fileUrl = (x.template_file_url as string) ||
      (blocks.find((b) => b.type === "pdf")?.file_url as string) || null;
    const imageUrls = Array.isArray(x.template_image_urls)
      ? (x.template_image_urls as string[])
      : blocks.filter((b) => b.type === "image_album").flatMap((b) => (b.image_urls as string[]) || []);
    const summary =
      (x.dm_template as string)?.slice(0, 140) ||
      (blocks.find((b) => b.type === "text")?.text as string)?.slice(0, 140) ||
      `${x.name} (keyword: ${x.keyword})`;
    return {
      automationId: x.id as string,
      name: x.name as string,
      keyword: x.keyword as string,
      summary,
      fileUrl,
      imageUrls,
    };
  });
}

/**
 * Build the knowledge-block injected into the agent system prompt.
 */
export function buildContentKnowledgePrompt(posts: PostKnowledge[], resources: ResourceKnowledge[]): string {
  let block = "";

  if (posts.length > 0) {
    block +=
      "\n\nYOUR RECENT POSTS (you made these — talk about them naturally when asked):\n" +
      posts
        .map(
          (p) =>
            `• ${p.mediaType === "VIDEO" ? "Reel" : "Post"} (${p.timestamp?.slice(0, 10) || "recent"}): "${p.caption.slice(0, 160)}${p.caption.length > 160 ? "…" : ""}" [media_id: ${p.mediaId}]`
        )
        .join("\n");
    block +=
      "\nIf someone wants to see a specific post, tell them you'll send it, and end your reply with exactly: [SEND_POST:<media_id>] — the system will share that post into the DM for you.";
  }

  if (resources.length > 0) {
    block +=
      "\n\nYOUR RESOURCES (things you give people — guides, PDFs, links. They normally comment your keyword to get these, but you can send them directly in chat):\n" +
      resources
        .map(
          (r) =>
            `• "${r.name}" — ${r.summary}${r.fileUrl ? " (includes a file/PDF)" : ""}${r.imageUrls.length ? ` (${r.imageUrls.length} images)` : ""} [keyword: ${r.keyword}] [automation_id: ${r.automationId}]`
        )
        .join("\n");
    block +=
      "\nIf someone asks for one of these, agree warmly, and end your reply with exactly: [SEND_RESOURCE:<automation_id>] — the system will deliver it for you. Only send a resource if they actually want it — never spam.";
  }

  return block;
}

/**
 * Extract action tags ([SEND_POST:<id>] / [SEND_RESOURCE:<id>]) from an AI
 * reply. Returns the cleaned reply plus the actions to execute.
 */
export function extractAgentActions(reply: string): {
  cleanReply: string;
  sendPostIds: string[];
  sendResourceIds: string[];
} {
  const sendPostIds: string[] = [];
  const sendResourceIds: string[] = [];

  const cleanReply = reply
    .replace(/\[SEND_POST:([^\]]+)\]/g, (_m, id: string) => {
      sendPostIds.push(id.trim());
      return "";
    })
    .replace(/\[SEND_RESOURCE:([^\]]+)\]/g, (_m, id: string) => {
      sendResourceIds.push(id.trim());
      return "";
    })
    .replace(/\s{2,}/g, " ")
    .trim();

  return { cleanReply, sendPostIds, sendResourceIds };
}
