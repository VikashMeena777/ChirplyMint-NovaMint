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
 * Strip common AI-sounding patterns from replies to make them feel more natural.
 * Removes sycophantic openers, quote wrapping, and robotic transitions.
 */
function humanizeReply(reply: string): string {
  let cleaned = reply;

  // Remove wrapping quotes (AI sometimes wraps entire reply in quotes)
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  // Remove sycophantic openers that scream "I'm an AI"
  const roboticOpeners = [
    /^(Sure!|Sure,|Of course!|Absolutely!|Great question!|I'd be happy to help!|I'd love to help!|No problem!|That's a great question!|Thanks for (asking|reaching out)!)\s*/i,
    /^(Hey there!|Hello there!|Hi there!)\s+/i,
  ];
  for (const pattern of roboticOpeners) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Remove "Here's..." / "Here is..." openers
  cleaned = cleaned.replace(
    /^(Here'?s?\s+(what|how|the|your|a)\s)/i,
    ""
  );

  // Capitalize first letter after cleanup
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned.trim();
}

/**
 * Analyze the last few assistant replies to build anti-repetition context.
 * Tells the model exactly what phrases to AVOID using again.
 */
function buildAntiRepetitionContext(
  conversationHistory: { role: string; content: string }[]
): string {
  const assistantReplies = conversationHistory
    .filter((m) => m.role === "assistant")
    .map((m) => m.content);

  if (assistantReplies.length === 0) return "";

  // Extract key phrases that were repeated
  const recentReplies = assistantReplies.slice(-4);

  return `\n\nANTI-REPETITION (CRITICAL):
Your recent replies to this person were:
${recentReplies.map((r, i) => `- Reply ${i + 1}: "${r.slice(0, 120)}${r.length > 120 ? "..." : ""}"`).join("\n")}

DO NOT repeat these same phrases, sentences, or structure. Each reply must feel fresh and different. If you've already mentioned a link, channel, or promo — DO NOT mention it again unless the user specifically asks for it. Vary your wording completely.`;
}

/**
 * Detect what language/style the user is writing in.
 */
function detectLanguageHint(message: string): string {
  // Check for Devanagari (Hindi)
  const hasHindi = /[\u0900-\u097F]/.test(message);
  // Check for common Hinglish patterns
  const hinglishWords = /\b(bhai|yaar|kya|hai|kaise|nahi|haan|bro|kar|de|mil|batao|chahiye|kab|kaha|karo|mujhe|tujhe|apna)\b/i;
  const hasHinglish = hinglishWords.test(message);
  // Check if mostly lowercase/casual
  const isCasual = message === message.toLowerCase() && message.length < 100;

  if (hasHindi) return "The user is writing in Hindi. Reply in Hindi (Devanagari script).";
  if (hasHinglish) return "The user is writing in Hinglish (Hindi + English mix). Reply in casual Hinglish to match their vibe.";
  if (isCasual) return "The user is being super casual. Match their energy — keep it short and chill.";
  return "The user is writing in English. Reply naturally in English.";
}

/**
 * Determine if the current message is a question about the main topic
 * vs casual chat / follow-up / thanks / greeting.
 */
function classifyIntent(message: string): "question" | "casual" | "greeting" | "thanks" {
  const lower = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hey|hello|yo|sup|hii+|helo|namaste|namaskar)\b/i.test(lower) && lower.length < 30) {
    return "greeting";
  }

  // Thanks / acknowledgment
  if (/^(thanks|thank you|thx|thnx|ok|okay|done|got it|alright|shukriya|dhanyavaad)/i.test(lower)) {
    return "thanks";
  }

  // Casual chat (very short, no question marks, no specific topic words)
  if (lower.length < 15 && !lower.includes("?") && !/\b(movie|film|link|download|telegram|channel|send|where|how|which|when)\b/i.test(lower)) {
    return "casual";
  }

  return "question";
}

/**
 * Generate an AI agent reply for an incoming DM.
 * Uses persona, FAQs, conversation history, language detection,
 * and anti-repetition logic for natural, human-like responses.
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

  // 3. Get recent conversation history (last 14 messages for better context)
  const { data: history } = await supabase
    .from("ai_conversations")
    .select("role, content")
    .eq("agent_id", config.id)
    .eq("sender_ig_id", params.senderIgId)
    .order("created_at", { ascending: false })
    .limit(14);

  const conversationHistory = (history ?? [])
    .reverse()
    .map((m) => ({
      role: (m as { role: string }).role as "user" | "assistant",
      content: (m as { content: string }).content,
    }));

  // 4. Build FAQ context — formatted as knowledge, not robotic Q&A
  const faqContext = (faqs ?? []).length > 0
    ? "\n\nYOUR KNOWLEDGE BASE (use this info when relevant, but rephrase naturally — never copy-paste):\n" +
      (faqs as { question: string; answer: string }[])
        .map((f) => `• When someone asks about "${f.question}" → The answer is: ${f.answer}`)
        .join("\n")
    : "";

  // 5. Detect language and intent
  const languageHint = detectLanguageHint(params.incomingMessage);
  const intent = classifyIntent(params.incomingMessage);

  // 6. Build anti-repetition context
  const antiRepetition = buildAntiRepetitionContext(conversationHistory);

  // 7. Build the human-like system prompt
  const systemPrompt = `You are "${config.agent_name}" — a real person running an Instagram page. You chat with followers in your DMs.

WHO YOU ARE:
${config.persona}

YOUR VIBE: ${config.tone}

HOW YOU TALK:
- You talk like a real person on Instagram DMs — short, casual, friendly
- You DON'T sound like a customer service bot or an AI assistant
- You use natural language, slang, and abbreviations when it fits
- Max 2-3 sentences per reply. No essays, no bullet points, no numbered lists
- Max 1-2 emojis per message — don't overdo them
- ${languageHint}
- Keep replies under ${config.max_reply_length} characters

CONVERSATION AWARENESS:
- ${intent === "greeting" ? "The person just said hi. Greet them warmly and casually. DON'T immediately pitch or promote anything." : ""}
- ${intent === "thanks" ? "The person is thanking you or acknowledging something. Keep it brief and warm. DON'T repeat any links or promos." : ""}
- ${intent === "casual" ? "This is casual small talk. Just be friendly and chat naturally. NO need to push any promo or link." : ""}
- ${intent === "question" ? "The person is asking something specific. FIRST answer or engage with their actual question, THEN if relevant, naturally mention where they can find what they need." : ""}
- If you've already shared a link or promo in this conversation, DO NOT share it again. They already have it.
- If someone asks something you don't know, just say "${config.fallback_message}" — don't make stuff up
- NEVER start with "Sure!", "Of course!", "Great question!", "I'd be happy to help!" — that sounds like AI
- NEVER use phrases like "Feel free to", "Don't hesitate to", "Let me know if" — those are robotic
${faqContext}${antiRepetition}`;

  // 8. Save incoming message to conversation history
  await supabase.from("ai_conversations").insert({
    agent_id: config.id,
    user_id: params.userId,
    sender_ig_id: params.senderIgId,
    sender_username: params.senderUsername,
    role: "user",
    content: params.incomingMessage,
  });

  // 9. Check if this is first message — send greeting
  if (conversationHistory.length === 0 && config.greeting_message) {
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

  // 10. Generate AI reply
  if (!process.env.NVIDIA_NIM_API_KEY) {
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
    // Build messages array with optional conversation summary for long chats
    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // If conversation is long, summarize older messages and keep only recent ones
    if (conversationHistory.length >= 10) {
      const olderMessages = conversationHistory.slice(0, conversationHistory.length - 8);
      const recentMessages = conversationHistory.slice(-8);

      // Build a brief summary of older conversation
      const topicsSummary = olderMessages
        .filter((m) => m.role === "user")
        .map((m) => m.content.slice(0, 60))
        .join(", ");

      const alreadyShared = olderMessages
        .filter((m) => m.role === "assistant")
        .map((m) => m.content.slice(0, 60))
        .join("; ");

      chatMessages.push({
        role: "system",
        content: `[CONVERSATION CONTEXT: This person has been chatting with you for a while. They previously asked about: ${topicsSummary}. You already told them: ${alreadyShared}. Do NOT repeat any of this info — they already have it. Continue the conversation naturally.]`,
      });

      chatMessages.push(...recentMessages);
    } else {
      chatMessages.push(...conversationHistory);
    }

    chatMessages.push({ role: "user", content: params.incomingMessage });

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: chatMessages,
      max_tokens: 200,
      temperature: 0.5,
      frequency_penalty: 0.4,
      presence_penalty: 0.2,
    });

    let reply = completion.choices?.[0]?.message?.content?.trim() || config.fallback_message;

    // Post-process: strip AI artifacts
    reply = humanizeReply(reply);

    // Enforce max length
    if (reply.length > config.max_reply_length) {
      // Try to cut at the last sentence boundary
      const truncated = reply.slice(0, config.max_reply_length);
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf("."),
        truncated.lastIndexOf("!"),
        truncated.lastIndexOf("?"),
        truncated.lastIndexOf("।") // Hindi sentence ender
      );
      reply = lastSentenceEnd > config.max_reply_length * 0.5
        ? truncated.slice(0, lastSentenceEnd + 1)
        : truncated.slice(0, config.max_reply_length - 3) + "...";
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
