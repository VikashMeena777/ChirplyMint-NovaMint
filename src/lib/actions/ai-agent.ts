"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity-logger";
import { revalidatePath } from "next/cache";
import { agentSetupMissing, assemblePersona } from "@/lib/ai/agent-setup";

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
  // onboarding (structured setup — the activation gate depends on these)
  setup_complete: boolean;
  business_type: string;
  about_text: string;
  content_topics: string;
  offers_text: string;
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
      // auto-detect: mirror whatever language the lead writes in (default)
      language: "auto",
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

  // ── ACTIVATION GATE ── the agent may only go live when the owner has
  // given it enough information to reply as them. A placeholder persona
  // hallucinated facts in real DMs; that must be impossible now.
  if (updates.is_active === true) {
    const { data: current } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const merged = { ...(current ?? {}), ...updates } as Partial<AIAgent>;
    const missing = agentSetupMissing(merged);
    if (missing.length > 0 || !merged.setup_complete) {
      const what =
        missing.length > 0
          ? `missing: ${missing.join(", ")}`
          : "setup not completed";
      return {
        error: `Complete the agent setup first (${what}). Open "Set up agent" to finish it.`,
      };
    }
  }

  const { error } = await supabase
    .from("ai_agents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  logActivity(user.id, "ai_agent.updated", updates).catch(() => {});
  revalidatePath("/dashboard/ai-agent");
  return { success: true };
}

// ─── Onboarding wizard ────────────────────────────────────

export interface OnboardingDraft {
  agent_name: string;
  business_type: string;
  about_text: string;
  content_topics: string;
  offers_text: string;
  tone: string;
  language: string;
  greeting_message: string;
  fallback_message: string;
  /** persona text when the owner hand-edited it in the review step */
  persona_override?: string;
  faqs?: { question: string; answer: string }[];
}

/**
 * Save one wizard step (progressive — refresh-safe). When every required
 * answer exists AND the caller says this is the final step, the persona is
 * (re)assembled from the structured answers, setup_complete flips true and
 * the agent activates. Returns the refreshed agent + what's still missing.
 */
export async function saveAIAgentOnboarding(
  draft: OnboardingDraft,
  finish: boolean
): Promise<{ data: AIAgent | null; missing: string[]; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, missing: [], error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("ai_agents")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!existing) {
    return { data: null, missing: [], error: "Create the agent first" };
  }

  const agentName = draft.agent_name?.trim() || "Assistant";
  const candidate: Partial<AIAgent> = {
    agent_name: agentName,
    business_type: draft.business_type?.trim() ?? "",
    about_text: draft.about_text?.trim() ?? "",
    content_topics: draft.content_topics?.trim() ?? "",
    offers_text: draft.offers_text?.trim() ?? "",
    tone: draft.tone || "friendly",
    language: draft.language || "auto",
    greeting_message: draft.greeting_message?.trim() || "Hey! 👋 How can I help you today?",
    fallback_message:
      draft.fallback_message?.trim() ||
      "Good question! Let me check and get back to you shortly. 😊",
  };

  // Intermediate steps persist the raw answers only — the persona is
  // assembled at the end, once there's enough substance to build from.
  const updates: Record<string, unknown> = { ...candidate, updated_at: new Date().toISOString() };

  let missing: string[] = [];
  if (finish) {
    const persona =
      draft.persona_override?.trim() ||
      assemblePersona({
        agentName,
        about: draft.about_text ?? "",
        contentTopics: draft.content_topics,
        offers: draft.offers_text,
      });
    missing = agentSetupMissing({ ...candidate, persona });
    if (missing.length > 0) {
      return { data: null, missing, error: `Still missing: ${missing.join(", ")}` };
    }
    updates.persona = persona;
    updates.setup_complete = true;
    updates.is_active = true;
  }

  const { data, error } = await supabase
    .from("ai_agents")
    .update(updates)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { data: null, missing, error: error.message };

  // seed any FAQs collected in the wizard
  if (finish && draft.faqs?.length) {
    const rows = draft.faqs
      .filter((f) => f.question.trim() && f.answer.trim())
      .map((f, i) => ({
        agent_id: (data as AIAgent).id,
        user_id: user.id,
        question: f.question.trim(),
        answer: f.answer.trim(),
        sort_order: i,
      }));
    console.log("[AI Agent Onboarding] faq seed:", draft.faqs.length, "raw,", rows.length, "rows");
    if (rows.length) {
      const { error: faqError } = await supabase.from("ai_agent_faqs").insert(rows);
      if (faqError) {
        console.error("[AI Agent Onboarding] FAQ seed failed:", faqError.message);
      }
    }
  } else if (finish) {
    console.log("[AI Agent Onboarding] no faqs in draft at finish");
  }

  logActivity(user.id, finish ? "ai_agent.onboarded" : "ai_agent.onboarding_step", {
    step_fields: Object.keys(candidate),
  }).catch(() => {});
  revalidatePath("/dashboard/ai-agent");
  return { data: data as AIAgent, missing: [], error: null };
}

/**
 * Test-drive the agent with UNSAVED wizard values: builds the same style of
 * system prompt the live reply path uses and calls the provider directly.
 * Nothing is written to the DB — pure preview.
 */
export async function previewAgentReply(
  draft: {
    agent_name: string;
    persona: string;
    tone: string;
    language: string;
    fallback_message: string;
    max_reply_length?: number;
  },
  history: { role: "user" | "assistant"; content: string }[],
  incoming: string
): Promise<{ reply: string | null; error: string | null }> {
  const langLine =
    draft.language && draft.language !== "auto"
      ? `ALWAYS reply in ${draft.language}.`
      : "Match the language the user writes in (Hinglish/Hindi/English — mirror their style).";

  const systemPrompt = `You are "${draft.agent_name || "Assistant"}" — a real person running an Instagram page, chatting with a follower in your DMs.

WHO YOU ARE:
${draft.persona}

YOUR VIBE: ${draft.tone || "friendly"}

HOW YOU TALK:
- Short, casual, friendly — like a real person on Instagram DMs
- Max 2-3 sentences per reply, 1-2 emojis max
- ${langLine}
- Keep replies under ${draft.max_reply_length ?? 300} characters

STAYING REAL (CRITICAL):
- Only state facts about yourself that are in your persona above
- If they ask something personal you don't have an answer for — NEVER invent specifics. Deflect lightly, or say you'll check and get back
- NEVER break character. NEVER mention being an AI or a bot
- If someone asks something you don't know, just say "${draft.fallback_message || "Let me check and get back to you!"}"`;

  const { chatCompletionWithMeta } = await import("@/lib/ai/provider");
  const { text, fallbackUsed } = await chatCompletionWithMeta({
    messages: [
      { role: "system", content: systemPrompt },
      ...history.slice(-10),
      { role: "user", content: incoming },
    ],
    max_tokens: 450,
    temperature: 0.5,
    frequency_penalty: 0.4,
    presence_penalty: 0.2,
  });

  if (fallbackUsed) return { reply: null, error: "AI providers unavailable right now — try again" };
  return { reply: text, error: null };
}

/** Prefill source for the wizard: the connected Instagram account (if any). */
export async function getOnboardingPrefill(): Promise<{
  ig_username: string | null;
  ig_name: string | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ig_username: null, ig_name: null, error: "Not authenticated" };

  const { data } = await supabase
    .from("instagram_accounts")
    .select("ig_username, ig_name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ig_username: (data as { ig_username?: string } | null)?.ig_username ?? null,
    ig_name: (data as { ig_name?: string } | null)?.ig_name ?? null,
    error: null,
  };
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
