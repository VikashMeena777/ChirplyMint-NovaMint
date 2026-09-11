"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Real inbox: threads + messages via Instagram's Conversations API
 * (instagram_manage_messages — approved), manual replies, and per-lead
 * AI pause for human takeover.
 */

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAccount(userId: string, crossUserClient?: ReturnType<typeof getAdmin>) {
  // Cross-user (team member → owner) reads need the service-role client.
  const supabase = crossUserClient ?? (await createClient());
  const { data } = await supabase
    .from("instagram_accounts")
    .select("ig_user_id, page_access_token, access_token")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1);
  const acc = (data || [])[0] as Record<string, string> | undefined;
  if (!acc) return null;
  return { igUserId: acc.ig_user_id, token: acc.page_access_token || acc.access_token };
}

export interface InboxThread {
  threadId: string;
  participantId: string;
  participantName: string;
  lastMessage: string;
  updatedAt: string;
  messageCount: number;
}

/** List recent DM threads (Conversations API). */
export async function getInboxThreads(): Promise<{
  threads: InboxThread[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { threads: [], error: "Not authenticated" };

  // Shared workspace: members read the owner's inbox.
  const ws = await getWorkspaceContext();
  const targetId = ws?.workspaceUserId ?? user.id;
  const crossClient = targetId !== user.id ? getAdmin() : undefined;

  const acc = await getAccount(targetId, crossClient);
  if (!acc) return { threads: [], error: "Connect Instagram first" };

  try {
    const res = await fetch(
      `https://graph.instagram.com/v26.0/${acc.igUserId}/conversations?platform=instagram&fields=id,participants,updated_time,messages.limit(1){message,from}&limit=25&access_token=${encodeURIComponent(acc.token)}`
    );
    const data = (await res.json()) as {
      data?: {
        id: string;
        participants?: { data?: { id: string; username?: string }[] };
        updated_time?: string;
        messages?: { data?: { message?: string; from?: { id?: string; username?: string } }[] };
      }[];
      error?: { message?: string };
    };

    if (data.error) return { threads: [], error: data.error.message };

    const threads: InboxThread[] = (data.data || []).map((t) => {
      // API shape: participants is { data: [...] } (edge-wrapped), not an array
      const participants = t.participants?.data || [];
      const other = participants.find((p) => p.id !== acc.igUserId);
      const last = t.messages?.data?.[0];
      return {
        threadId: t.id,
        participantId: other?.id || "",
        participantName: other?.username || other?.id || "Unknown",
        lastMessage: last?.message?.slice(0, 80) || "(media message)",
        updatedAt: t.updated_time || "",
        messageCount: t.messages?.data?.length || 0,
      };
    });

    return { threads };
  } catch (err) {
    return { threads: [], error: err instanceof Error ? err.message : "Failed to load threads" };
  }
}

export interface InboxMessage {
  id: string;
  fromMe: boolean;
  text: string;
  at: string;
}

/** Messages inside one thread (oldest first). */
export async function getThreadMessages(
  threadId: string
): Promise<{ messages: InboxMessage[]; participantId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { messages: [], error: "Not authenticated" };

  // Shared workspace: members read the owner's threads
  const ws1 = await getWorkspaceContext();
  const targetId1 = ws1?.workspaceUserId ?? user.id;
  const cross1 = targetId1 !== user.id ? getAdmin() : undefined;
  const acc = await getAccount(targetId1, cross1);
  if (!acc) return { messages: [], error: "Connect Instagram first" };

  try {
    const res = await fetch(
      `https://graph.instagram.com/v26.0/${threadId}?fields=participants,messages.limit(30){id,message,from,created_time}&access_token=${encodeURIComponent(acc.token)}`
    );
    const data = (await res.json()) as {
      participants?: { data?: { id: string; username?: string }[] };
      messages?: {
        data?: { id: string; message?: string; from?: { id?: string }; created_time?: string }[];
      };
      error?: { message?: string };
    };

    if (data.error) return { messages: [], error: data.error.message };

    const msgs = (data.messages?.data || [])
      .map((m) => ({
        id: m.id,
        fromMe: m.from?.id === acc.igUserId,
        text: m.message || "(attachment)",
        at: m.created_time || "",
      }))
      .reverse(); // oldest first

    const participants = data.participants?.data || [];
    const other = participants.find((p) => p.id !== acc.igUserId);
    return { messages: msgs, participantId: other?.id };
  } catch (err) {
    return { messages: [], error: err instanceof Error ? err.message : "Failed to load messages" };
  }
}

/** Manual reply from the inbox (uses our existing Send API path). */
export async function replyInThread(
  recipientIgId: string,
  text: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!text.trim()) return { error: "Message is empty" };

  // Shared workspace: members reply from the OWNER's connected account
  const ws2 = await getWorkspaceContext();
  const targetId2 = ws2?.workspaceUserId ?? user.id;
  const cross2 = targetId2 !== user.id ? getAdmin() : undefined;
  const acc = await getAccount(targetId2, cross2);
  if (!acc) return { error: "Connect Instagram first" };

  const res = await fetch(`https://graph.instagram.com/v26.0/${acc.igUserId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${acc.token}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientIgId },
      message: { text: text.slice(0, 1000) },
    }),
  });
  const data = (await res.json()) as { error?: { message?: string } };
  if (data.error) return { error: data.error.message || "Send failed" };
  return { success: true };
}

/** Pause/unpause the AI agent for one lead (human takeover). */
export async function setLeadAiPaused(
  leadIgId: string,
  paused: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("leads")
    .update({ ai_paused: paused })
    .eq("user_id", user.id)
    .eq("ig_user_id", leadIgId);

  return error ? { error: error.message } : {};
}

export async function getLeadAiPaused(leadIgId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("leads")
    .select("ai_paused")
    .eq("user_id", user.id)
    .eq("ig_user_id", leadIgId)
    .limit(1)
    .maybeSingle();
  return ((data as Record<string, unknown> | null)?.ai_paused as boolean) || false;
}
