import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_NIM_API_KEY || "",
});

const MODEL = "meta/llama-3.3-70b-instruct";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface AgentConfig {
  id: string;
  agent_name: string;
  persona: string;
  tone: string;
  greeting_message: string;
  fallback_message: string;
  max_reply_length: number;
}

/**
 * Generate an AI agent reply for an incoming DM.
 * Uses persona, FAQs, and conversation history for context.
 */
export async function generateAgentReply(params: {
  userId: string;
  senderIgId: string;
  senderUsername: string;
  incomingMessage: string;
}): Promise<{ reply: string; agentId: string } | null> {
  const supabase = getSupabase();

  // 1. Get the user's AI agent config
  const { data: agent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("user_id", params.userId)
    .eq("is_active", true)
    .single();

  if (!agent) return null;

  const config = agent as AgentConfig;

  // 2. Get FAQs for context
  const { data: faqs } = await supabase
    .from("ai_agent_faqs")
    .select("question, answer")
    .eq("agent_id", config.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // 3. Get recent conversation history (last 8 messages)
  const { data: history } = await supabase
    .from("ai_conversations")
    .select("role, content")
    .eq("agent_id", config.id)
    .eq("sender_ig_id", params.senderIgId)
    .order("created_at", { ascending: false })
    .limit(8);

  const conversationHistory = (history ?? [])
    .reverse()
    .map((m) => ({
      role: (m as { role: string }).role as "user" | "assistant",
      content: (m as { content: string }).content,
    }));

  // 4. Build FAQ context
  const faqContext = (faqs ?? []).length > 0
    ? "\n\nFREQUENTLY ASKED QUESTIONS (use these to answer accurately):\n" +
      (faqs as { question: string; answer: string }[])
        .map((f, i) => `Q${i + 1}: ${f.question}\nA${i + 1}: ${f.answer}`)
        .join("\n\n")
    : "";

  // 5. Build system prompt
  const systemPrompt = `You are "${config.agent_name}", an AI assistant replying to Instagram DMs.

PERSONA & INSTRUCTIONS:
${config.persona}

TONE: ${config.tone}

RULES:
- Keep replies under ${config.max_reply_length} characters
- Be conversational and natural — this is a DM, not an email
- Use 1-2 emojis max, don't overdo it
- If the user's question matches a FAQ, use that answer (adapt the wording naturally)
- If you don't know something, say: "${config.fallback_message}"
- Never reveal you are an AI unless directly asked
- Never make up information not in the FAQs or persona
- Match the language the user writes in when possible
${faqContext}`;

  // 6. Save incoming message to conversation history
  await supabase.from("ai_conversations").insert({
    agent_id: config.id,
    user_id: params.userId,
    sender_ig_id: params.senderIgId,
    sender_username: params.senderUsername,
    role: "user",
    content: params.incomingMessage,
  });

  // 7. Check if this is first message — send greeting
  if (conversationHistory.length === 0 && config.greeting_message) {
    // Save greeting as assistant response
    await supabase.from("ai_conversations").insert({
      agent_id: config.id,
      user_id: params.userId,
      sender_ig_id: params.senderIgId,
      sender_username: params.senderUsername,
      role: "assistant",
      content: config.greeting_message,
    });

    return { reply: config.greeting_message, agentId: config.id };
  }

  // 8. Generate AI reply
  if (!process.env.NVIDIA_NIM_API_KEY) {
    // No AI key — use fallback
    await supabase.from("ai_conversations").insert({
      agent_id: config.id,
      user_id: params.userId,
      sender_ig_id: params.senderIgId,
      sender_username: params.senderUsername,
      role: "assistant",
      content: config.fallback_message,
    });
    return { reply: config.fallback_message, agentId: config.id };
  }

  try {
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: params.incomingMessage },
    ];

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 256,
      temperature: 0.7,
    });

    let reply = completion.choices?.[0]?.message?.content?.trim() || config.fallback_message;

    // Enforce max length
    if (reply.length > config.max_reply_length) {
      reply = reply.slice(0, config.max_reply_length - 3) + "...";
    }

    // Save reply to conversation history
    await supabase.from("ai_conversations").insert({
      agent_id: config.id,
      user_id: params.userId,
      sender_ig_id: params.senderIgId,
      sender_username: params.senderUsername,
      role: "assistant",
      content: reply,
    });

    return { reply, agentId: config.id };
  } catch (error) {
    console.error("[AI Agent] Error generating reply:", error);

    await supabase.from("ai_conversations").insert({
      agent_id: config.id,
      user_id: params.userId,
      sender_ig_id: params.senderIgId,
      sender_username: params.senderUsername,
      role: "assistant",
      content: config.fallback_message,
    });

    return { reply: config.fallback_message, agentId: config.id };
  }
}
