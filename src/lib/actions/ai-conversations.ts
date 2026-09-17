"use server";

import { createClient } from "@/lib/supabase/server";
import { getSelectedIgAccountId } from "@/lib/actions/account-context";
import { resolveWorkspaceScope } from "@/lib/workspace";

/**
 * Get list of unique conversations grouped by sender, with last message preview.
 */
export async function getConversationList(
  page: number = 1,
  search: string = "",
  limit: number = 20
): Promise<{
  conversations: Record<string, unknown>[];
  total: number;
}> {
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return { conversations: [], total: 0 };
  const { targetId, client: db } = scope;

  const accountId = await getSelectedIgAccountId(targetId);
  // Get distinct sender conversations with their latest message
  // We use a raw query approach: fetch recent conversations ordered by time
  let query = db
    .from("ai_conversations")
    .select("id, agent_id, sender_ig_id, sender_username, role, content, created_at", { count: "exact" })
    .eq("user_id", targetId)
      .eq("instagram_account_id", accountId)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("sender_username", `%${search}%`);
  }

  const { data: allMessages, count } = await query.limit(500);

  if (!allMessages || allMessages.length === 0) {
    return { conversations: [], total: 0 };
  }

  // Group by sender_ig_id and get latest message per sender
  const senderMap = new Map<string, Record<string, unknown>>();
  for (const msg of allMessages) {
    const m = msg as Record<string, unknown>;
    const senderId = m.sender_ig_id as string;
    if (!senderMap.has(senderId)) {
      senderMap.set(senderId, {
        sender_ig_id: senderId,
        sender_username: m.sender_username,
        agent_id: m.agent_id,
        last_message: m.content,
        last_role: m.role,
        last_time: m.created_at,
        message_count: 1,
      });
    } else {
      const existing = senderMap.get(senderId)!;
      existing.message_count = (existing.message_count as number) + 1;
    }
  }

  // Convert to array and paginate
  const conversations = Array.from(senderMap.values());
  const total = conversations.length;
  const start = (page - 1) * limit;
  const paginated = conversations.slice(start, start + limit);

  return { conversations: paginated, total };
}

/**
 * Get full message thread for a specific sender.
 */
export async function getConversationThread(
  senderIgId: string
): Promise<Record<string, unknown>[]> {
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return [];
  const { targetId, client: db } = scope;

  const accountId = await getSelectedIgAccountId(targetId);
  const { data } = await db
    .from("ai_conversations")
    .select("id, agent_id, sender_ig_id, sender_username, role, content, created_at")
    .eq("user_id", targetId)
      .eq("instagram_account_id", accountId)
    .eq("sender_ig_id", senderIgId)
    .order("created_at", { ascending: true })
    .limit(200);

  return (data as Record<string, unknown>[]) ?? [];
}

/**
 * Get conversation stats for the inbox header.
 */
export async function getConversationStats(): Promise<{
  total_conversations: number;
  messages_today: number;
  total_messages: number;
}> {
  const scope = await resolveWorkspaceScope();
  if (!scope.user) return { total_conversations: 0, messages_today: 0, total_messages: 0 };
  const { targetId, client: db } = scope;

  const accountId = await getSelectedIgAccountId(targetId);
  // Total messages
  const { count: totalMessages } = await db
    .from("ai_conversations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetId)
      .eq("instagram_account_id", accountId);

  // Messages today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: messagesToday } = await db
    .from("ai_conversations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", targetId)
      .eq("instagram_account_id", accountId)
    .gte("created_at", todayStart.toISOString());

  // Distinct senders (unique conversations)
  const { data: senders } = await db
    .from("ai_conversations")
    .select("sender_ig_id")
    .eq("user_id", targetId)
      .eq("instagram_account_id", accountId);

  const uniqueSenders = new Set((senders ?? []).map((s) => (s as Record<string, string>).sender_ig_id));

  return {
    total_conversations: uniqueSenders.size,
    messages_today: messagesToday ?? 0,
    total_messages: totalMessages ?? 0,
  };
}

/**
 * Submit feedback (thumbs up/down) for an AI reply.
 */
export async function submitReplyFeedback(
  conversationId: string,
  agentId: string,
  rating: "good" | "bad"
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase.from("ai_conversation_feedback").insert({
    conversation_id: conversationId,
    agent_id: agentId,
    user_id: user.id,
    rating,
  });

  if (error) {
    console.error("[AI Feedback] Insert error:", error);
    return { success: false };
  }

  return { success: true };
}
