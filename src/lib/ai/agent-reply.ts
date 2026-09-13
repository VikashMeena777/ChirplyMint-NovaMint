import { createClient } from "@supabase/supabase-js";
import { chatCompletionWithMeta } from "@/lib/ai/provider";

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
  language: string;
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
 * Keeps phrasing fresh WITHOUT pushing the model to invent new facts —
 * the old "vary completely" wording made models break character when a
 * question was repeated, spiralling into nonsense.
 */
function buildAntiRepetitionContext(
  conversationHistory: { role: string; content: string }[]
): string {
  const assistantReplies = conversationHistory
    .filter((m) => m.role === "assistant")
    .map((m) => m.content);

  if (assistantReplies.length === 0) return "";

  const recentReplies = assistantReplies.slice(-3);

  return `\n\nRECENT CHAT RECAP (context only — not a constraint):
Your last replies were:
${recentReplies.map((r) => `- "${r.slice(0, 120)}${r.length > 120 ? "..." : ""}"`).join("\n")}

Vary your PHRASING a little so you don't sound like a loop — but NEVER change the facts or invent new things just to sound different. If you already shared a link or promo, don't repeat it unless they ask.`;
}

/**
 * Has the person asked essentially this same question in the last few
 * turns? A repeated question means the earlier answer didn't land — the
 * agent must answer it again, clearly and simply, not flail for
 * something new to say.
 */
function isRepeatQuestion(
  conversationHistory: { role: string; content: string }[],
  incoming: string
): boolean {
  const norm = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  const target = norm(incoming);
  if (!target || target.length < 3) return false;
  const recentUserMsgs = conversationHistory
    .filter((m) => m.role === "user")
    .slice(-4)
    .map((m) => norm(m.content));
  return recentUserMsgs.some(
    (m) =>
      m === target ||
      (m.length > 8 && target.length > 8 && (m.includes(target) || target.includes(m)))
  );
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
}): Promise<{
  reply: string;
  agentId: string;
} | null> {
  const supabase = getSupabase();

  // 1. Get the user's AI agent config
  const { data: agent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("user_id", params.userId)
    .eq("is_active", true)
    .single();

  if (!agent) return null;

  // Setup gate (defense in depth — the toggle is already gated in the
  // action): an agent that hasn't been through onboarding has a placeholder
  // persona and WILL invent facts. Stay silent and tell the owner once.
  if ((agent as { setup_complete?: boolean }).setup_complete !== true) {
    console.warn(
      `[AI Agent] ${params.userId}'s agent is active but not set up — skipping reply (placeholder persona would hallucinate)`
    );
    return null;
  }

  // Inbox takeover: if the owner paused the AI for this lead, stay silent —
  // they're answering personally from the inbox.
  const admin = getSupabase();
  const { data: pausedLead } = await admin
    .from("leads")
    .select("ai_paused")
    .eq("user_id", params.userId)
    .eq("ig_user_id", params.senderIgId)
    .limit(1)
    .maybeSingle();
  if ((pausedLead as Record<string, unknown> | null)?.ai_paused === true) {
    console.log(`[AI Agent] Paused for ${params.senderIgId} (inbox takeover) — no reply`);
    return null;
  }

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
  let languageHint = detectLanguageHint(params.incomingMessage);
  const intent = classifyIntent(params.incomingMessage);

  // Override language if user set an explicit preference (not "auto")
  const savedLang = config.language;
  if (savedLang && savedLang !== "auto") {
    const langMap: Record<string, string> = {
      english: "ALWAYS reply in English, regardless of what language the user writes in.",
      hindi: "ALWAYS reply in Hindi (Devanagari script हिन्दी), regardless of what language the user writes in.",
      hinglish: "ALWAYS reply in Hinglish (Hindi + English mix), regardless of what language the user writes in.",
      tamil: "ALWAYS reply in Tamil (தமிழ்), regardless of what language the user writes in.",
      telugu: "ALWAYS reply in Telugu (తెలుగు), regardless of what language the user writes in.",
      marathi: "ALWAYS reply in Marathi (मराठी), regardless of what language the user writes in.",
      bangla: "ALWAYS reply in Bangla (বাংলা), regardless of what language the user writes in.",
      gujarati: "ALWAYS reply in Gujarati (ગુજરાતી), regardless of what language the user writes in.",
    };
    languageHint = langMap[savedLang] || languageHint;
  }

  // 6. Build anti-repetition context
  const antiRepetition = buildAntiRepetitionContext(conversationHistory);

  // 6b. Feedback loop — inject bad-rated replies so the agent avoids repeating them (#11)
  let feedbackContext = "";
  const { data: badFeedback } = await supabase
    .from("ai_conversation_feedback")
    .select("conversation_id")
    .eq("agent_id", config.id)
    .eq("user_id", params.userId)
    .eq("rating", "bad")
    .order("created_at", { ascending: false })
    .limit(5);

  if (badFeedback && badFeedback.length > 0) {
    const badIds = (badFeedback as { conversation_id: string }[]).map((f) => f.conversation_id);
    const { data: badMessages } = await supabase
      .from("ai_conversations")
      .select("content")
      .in("id", badIds)
      .eq("role", "assistant");

    if (badMessages && badMessages.length > 0) {
      const examples = (badMessages as { content: string }[])
        .map((m) => `"${m.content.slice(0, 100)}"`)
        .join(", ");
      feedbackContext = `\n\n⚠️ AVOID THESE REPLY STYLES (owner marked them as bad):\n${examples}\nDo NOT repeat similar phrasing, tone, or structure as the replies above.`;
    }
  }

  // 7. Build the human-like system prompt
  const repeatNote = isRepeatQuestion(conversationHistory, params.incomingMessage)
    ? `\nTHEY'RE ASKING THE SAME THING AGAIN: they asked this before and your earlier answer may not have landed. Answer the SAME question again — clearer and simpler this time. Same facts, cleaner phrasing. Do NOT invent a different answer just to sound fresh.`
    : "";

  const greetingContext =
    conversationHistory.length === 0 && config.greeting_message
      ? `\nThis is your first reply to this person. Your usual opening line is: "${config.greeting_message}" — you don't have to use it word-for-word, but keep the same warm energy.`
      : "";

  const systemPrompt = `You are "${config.agent_name}" — a real person running an Instagram page, chatting with a follower in your DMs.

WHO YOU ARE:
${config.persona}

YOUR VIBE: ${config.tone}

WHAT YOU HELP FOLLOWERS WITH:
- Answering their questions about you, your content, and anything in your knowledge base
- Sharing details, links, prices, or info they ask for
- Being warm, quick, and human — like a creator who actually reads their DMs

HOW YOU TALK:
- You talk like a real person on Instagram DMs — short, casual, friendly
- You DON'T sound like a customer service bot or an AI assistant
- You use natural language, slang, and abbreviations when it fits
- Max 2-3 sentences per reply. No essays, no bullet points, no numbered lists
- Max 1-2 emojis per message — don't overdo them
- ${languageHint}
- Keep replies under ${config.max_reply_length} characters

STAYING REAL (CRITICAL):
- Only state facts about yourself that are in your persona or knowledge base below
- If they ask something personal you don't have an answer for (favorite place, age, city, plans…) — NEVER invent specifics. Deflect lightly and naturally, or say you'll check and get back
- If they ask what you do or what you can help with: describe how you help — answering questions, sharing content and details, collabs, whatever fits your persona — in your own casual style, not a sales pitch
- NEVER break character. NEVER mention being an AI, a bot, or an agent, and NEVER say things like "I gave the wrong answer" or "I don't know anything". If you're unsure, just reply simply and stay chill

CONVERSATION AWARENESS:
- ${intent === "greeting" ? "The person just said hi. Greet them warmly and casually. DON'T immediately pitch or promote anything." : ""}
- ${intent === "thanks" ? "The person is thanking you or acknowledging something. Keep it brief and warm. DON'T repeat any links or promos." : ""}
- ${intent === "casual" ? "This is casual small talk. Just be friendly and chat naturally. NO need to push any promo or link." : ""}
- ${intent === "question" ? "The person is asking something specific. FIRST answer or engage with their actual question, THEN if relevant, naturally mention where they can find what they need." : ""}
- If you've already shared a link or promo in this conversation, DO NOT share it again. They already have it.
- If someone asks something you don't know, just say "${config.fallback_message}" — don't make stuff up
- NEVER start with "Sure!", "Of course!", "Great question!", "I'd be happy to help!" — that sounds like AI
- NEVER use phrases like "Feel free to", "Don't hesitate to", "Let me know if" — those are robotic${repeatNote}${greetingContext}${faqContext}${antiRepetition}${feedbackContext}`;

  // 8. Save incoming message to conversation history
  await supabase.from("ai_conversations").insert({
    agent_id: config.id,
    user_id: params.userId,
    sender_ig_id: params.senderIgId,
    sender_username: params.senderUsername,
    role: "user",
    content: params.incomingMessage,
  });

  // 9. First message: send the greeting only when they're just saying hi —
  // if their first message is a real question, answering it beats a canned
  // greeting every time (the prompt carries the greeting's warm energy).
  if (
    conversationHistory.length === 0 &&
    config.greeting_message &&
    (intent === "greeting" || intent === "casual")
  ) {
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
  // Both providers count — Groq alone is enough (provider.ts falls back
  // nim → groq). Previously Groq-only setups silently got fallback messages.
  if (!process.env.NVIDIA_NIM_API_KEY && !process.env.GROQ_API_KEY) {
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

    const { text: aiReply, provider, fallbackUsed, primary } = await chatCompletionWithMeta({
      messages: chatMessages,
      // Reasoning models spend part of the budget on hidden thinking —
      // 450 leaves room for it while reply LENGTH is still enforced by the
      // prompt + post-truncation, not by the token cap.
      max_tokens: 450,
      temperature: 0.5,
      frequency_penalty: 0.4,
      presence_penalty: 0.2,
    });
    if (fallbackUsed) {
      console.warn(`[AI-FALLBACK] AI agent ${config.id} using fallback_message for @${params.senderUsername} (all providers failed)`);
      supabase.from("activity_log").insert({
        user_id: params.userId,
        action: "ai.fallback_used",
        metadata: { agent_id: config.id, recipient: params.senderUsername },
      }).then(() => {});
    } else if (!primary && provider) {
      // provider failover must be visible outside Vercel logs
      console.warn(`[AI-FALLBACK] answered by ${provider} for @${params.senderUsername}`);
      supabase.from("activity_log").insert({
        user_id: params.userId,
        action: "ai.provider_fallback",
        metadata: { agent_id: config.id, provider, recipient: params.senderUsername },
      }).then(() => {});
    }

    let reply = aiReply || config.fallback_message;

    // Post-process: strip AI artifacts
    reply = humanizeReply(reply);

    // Enforce max length — never cut mid-word
    if (reply.length > config.max_reply_length) {
      const truncated = reply.slice(0, config.max_reply_length);
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf("."),
        truncated.lastIndexOf("!"),
        truncated.lastIndexOf("?"),
        truncated.lastIndexOf("।") // Hindi sentence ender
      );
      if (lastSentenceEnd > config.max_reply_length * 0.5) {
        reply = truncated.slice(0, lastSentenceEnd + 1);
      } else {
        const lastSpace = truncated.lastIndexOf(" ");
        reply =
          (lastSpace > config.max_reply_length * 0.6
            ? truncated.slice(0, lastSpace)
            : truncated.slice(0, config.max_reply_length - 1)
          ).trimEnd() + "…";
      }
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
