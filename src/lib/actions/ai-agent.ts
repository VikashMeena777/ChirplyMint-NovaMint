"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────

export interface AIAgent {
  id: string;
  user_id: string;
  is_active: boolean;
  agent_name: string;
  persona: string;
  tone: string;
  language: string;
  greeting_message: string;
  fallback_message: string;
  max_reply_length: number;
  created_at: string;
  updated_at: string;
}

export interface AIAgentFAQ {
  id: string;
  agent_id: string;
  user_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface AIConversation {
  id: string;
  sender_ig_id: string;
  sender_username: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// ─── Agent CRUD ──────────────────────────────────────────

export async function getAIAgent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") return { data: null, error: error.message };
  return { data: data as AIAgent | null, error: null };
}

export async function createAIAgent(agentName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  // Check if user already has an agent
  const { data: existing } = await supabase
    .from("ai_agents")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) return { data: null, error: "You already have an AI agent" };

  const { data, error } = await supabase
    .from("ai_agents")
    .insert({
      user_id: user.id,
      agent_name: agentName || "Assistant",
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  logActivity(user.id, "ai_agent.created", { name: agentName }).catch(() => {});
  revalidatePath("/dashboard/ai-agent");
  return { data: data as AIAgent, error: null };
}

export async function updateAIAgent(updates: {
  is_active?: boolean;
  agent_name?: string;
  persona?: string;
  tone?: string;
  language?: string;
  greeting_message?: string;
  fallback_message?: string;
  max_reply_length?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("ai_agents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, "ai_agent.updated", updates).catch(() => {});
  revalidatePath("/dashboard/ai-agent");
  return { success: true };
}

// ─── FAQ CRUD ────────────────────────────────────────────

export async function getAgentFAQs(agentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("ai_agent_faqs")
    .select("*")
    .eq("agent_id", agentId)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data as AIAgentFAQ[]) ?? [], error: null };
}

export async function addFAQ(agentId: string, question: string, answer: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { count } = await supabase
    .from("ai_agent_faqs")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId);

  const { error } = await supabase
    .from("ai_agent_faqs")
    .insert({
      agent_id: agentId,
      user_id: user.id,
      question,
      answer,
      sort_order: count ?? 0,
    });

  if (error) return { error: error.message };

  logActivity(user.id, "ai_agent.faq_added", { question }).catch(() => {});
  revalidatePath("/dashboard/ai-agent");
  return { success: true };
}

export async function updateFAQ(faqId: string, updates: {
  question?: string;
  answer?: string;
  is_active?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("ai_agent_faqs")
    .update(updates)
    .eq("id", faqId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/ai-agent");
  return { success: true };
}

export async function deleteFAQ(faqId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("ai_agent_faqs")
    .delete()
    .eq("id", faqId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/ai-agent");
  return { success: true };
}

// ─── Conversation History ────────────────────────────────

export async function getRecentConversations(agentId: string, limit = 20) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  // Get unique senders with latest message
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("sender_ig_id, sender_username, content, role, created_at")
    .eq("agent_id", agentId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return { data: [], error: error.message };

  // Group by sender, get latest message per thread
  const threads = new Map<string, {
    sender_ig_id: string;
    sender_username: string;
    last_message: string;
    last_role: string;
    last_at: string;
    message_count: number;
  }>();

  for (const msg of (data ?? []) as AIConversation[]) {
    const existing = threads.get(msg.sender_ig_id);
    if (!existing) {
      threads.set(msg.sender_ig_id, {
        sender_ig_id: msg.sender_ig_id,
        sender_username: msg.sender_username,
        last_message: msg.content,
        last_role: msg.role,
        last_at: msg.created_at,
        message_count: 1,
      });
    } else {
      existing.message_count += 1;
    }
  }

  const sorted = Array.from(threads.values())
    .sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
    .slice(0, limit);

  return { data: sorted, error: null };
}

export async function getConversationThread(agentId: string, senderIgId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("agent_id", agentId)
    .eq("user_id", user.id)
    .eq("sender_ig_id", senderIgId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) return { data: [], error: error.message };
  return { data: (data as AIConversation[]) ?? [], error: null };
}

// ─── Agent Stats ─────────────────────────────────────────

export async function getAgentStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { totalConversations: 0, totalMessages: 0, activeToday: 0 };

  const { data: agent } = await supabase
    .from("ai_agents")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!agent) return { totalConversations: 0, totalMessages: 0, activeToday: 0 };

  const agentId = (agent as AIAgent).id;

  // Total unique conversations
  const { data: convs } = await supabase
    .from("ai_conversations")
    .select("sender_ig_id")
    .eq("agent_id", agentId);

  const uniqueSenders = new Set((convs ?? []).map(c => (c as AIConversation).sender_ig_id));

  // Total messages
  const { count: totalMessages } = await supabase
    .from("ai_conversations")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId);

  // Active today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todayConvs } = await supabase
    .from("ai_conversations")
    .select("sender_ig_id")
    .eq("agent_id", agentId)
    .gte("created_at", todayStart.toISOString());

  const todayUnique = new Set((todayConvs ?? []).map(c => (c as AIConversation).sender_ig_id));

  return {
    totalConversations: uniqueSenders.size,
    totalMessages: totalMessages ?? 0,
    activeToday: todayUnique.size,
  };
}
