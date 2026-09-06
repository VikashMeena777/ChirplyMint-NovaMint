import OpenAI from "openai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  topP?: number;
}

interface ProviderCandidate {
  name: string;
  client: OpenAI;
  model: string;
  extraBody?: Record<string, unknown>;
}

/**
 * Strip thinking tags from reasoning models so Instagram followers
 * only see the final human response, never internal thoughts.
 */
function cleanReasoningOutput(text: string): string {
  let cleaned = text;

  // Strip <think>...</think> blocks if present
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // Strip [reasoning]...[/reasoning] blocks if present
  cleaned = cleaned.replace(/\[reasoning\][\s\S]*?\[\/reasoning\]/gi, "");

  return cleaned.trim();
}

/**
 * Build candidate list for Groq and NVIDIA NIM.
 * Model names are read from environment variables (GROQ_MODEL and NVIDIA_NIM_MODEL).
 */
function getCandidateProviders(): ProviderCandidate[] {
  const candidates: ProviderCandidate[] = [];

  // 1. Groq (Permanent base URL)
  if (process.env.GROQ_API_KEY) {
    const groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
    const groqClient = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
    });

    candidates.push({
      name: `Groq (${groqModel})`,
      client: groqClient,
      model: groqModel,
    });
  }

  // 2. NVIDIA NIM (Permanent base URL)
  if (process.env.NVIDIA_NIM_API_KEY) {
    const nvidiaModel = process.env.NVIDIA_NIM_MODEL || "nvidia/nemotron-3-super-120b-a12b";
    const nimClient = new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: process.env.NVIDIA_NIM_API_KEY,
    });

    // Thinking is disabled by default for fast Instagram DM replies,
    // but can be toggled via NVIDIA_ENABLE_THINKING=true.
    const enableThinking = process.env.NVIDIA_ENABLE_THINKING === "true";
    const extraBody: Record<string, unknown> = {
      chat_template_kwargs: { enable_thinking: enableThinking },
    };

    candidates.push({
      name: `NVIDIA NIM (${nvidiaModel})`,
      client: nimClient,
      model: nvidiaModel,
      extraBody,
    });
  }

  return candidates;
}

/**
 * Generate a text completion using either Groq or NVIDIA NIM.
 */
export async function generateLLMCompletion(
  options: CompletionOptions
): Promise<string | null> {
  const candidates = getCandidateProviders();

  if (candidates.length === 0) {
    console.warn(
      "[AI Engine] No AI API keys configured. Please set GROQ_API_KEY or NVIDIA_NIM_API_KEY."
    );
    return null;
  }

  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const requestPayload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model: candidate.model,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        ...(options.topP ? { top_p: options.topP } : {}),
        ...(options.frequencyPenalty ? { frequency_penalty: options.frequencyPenalty } : {}),
        ...(options.presencePenalty ? { presence_penalty: options.presencePenalty } : {}),
        ...(candidate.extraBody ? candidate.extraBody : {}),
      };

      const completion = await candidate.client.chat.completions.create(requestPayload);

      const rawContent = completion.choices?.[0]?.message?.content?.trim();
      if (rawContent) {
        const cleaned = cleanReasoningOutput(rawContent);
        if (cleaned) {
          return cleaned;
        }
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || "unknown";
      console.warn(
        `[AI Engine] ${candidate.name} failed (HTTP ${status}): ${err?.message || err}. Trying next provider...`
      );
    }
  }

  console.error("[AI Engine] All candidate AI providers failed. Last error:", lastError);
  return null;
}
