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
 * Strip thinking tags and reasoning blocks from reasoning models (e.g. Nemotron, GPT-OSS).
 * Followers on Instagram should only see the final message, never internal reasoning thoughts.
 */
function cleanReasoningOutput(text: string): string {
  let cleaned = text;

  // Strip <think>...</think> blocks if present
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // Strip [REASONING]...[/REASONING] blocks if present
  cleaned = cleaned.replace(/\[reasoning\][\s\S]*?\[\/reasoning\]/gi, "");

  return cleaned.trim();
}

/**
 * Build list of configured LLM providers (NVIDIA NIM and Groq).
 * All model names are dynamically read from environment variables.
 */
function getCandidateProviders(): ProviderCandidate[] {
  const candidates: ProviderCandidate[] = [];

  // 1. Groq (Configurable via GROQ_API_KEY & GROQ_MODEL)
  if (process.env.GROQ_API_KEY) {
    const groqBaseUrl =
      process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
    const groqModel =
      process.env.GROQ_MODEL || "openai/gpt-oss-120b";

    const groqClient = new OpenAI({
      baseURL: groqBaseUrl,
      apiKey: process.env.GROQ_API_KEY,
    });

    candidates.push({
      name: `Groq (${groqModel})`,
      client: groqClient,
      model: groqModel,
    });
  }

  // 2. NVIDIA NIM (Configurable via NVIDIA_NIM_API_KEY/NVIDIA_API_KEY & NVIDIA_NIM_MODEL)
  const nvidiaKey =
    process.env.NVIDIA_NIM_API_KEY || process.env.NVIDIA_API_KEY;

  if (nvidiaKey) {
    const nvidiaBaseUrl =
      process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
    const nvidiaModel =
      process.env.NVIDIA_NIM_MODEL || "nvidia/nemotron-3-super-120b-a12b";

    const nimClient = new OpenAI({
      baseURL: nvidiaBaseUrl,
      apiKey: nvidiaKey,
    });

    const extraBody: Record<string, unknown> = {};
    if (process.env.NVIDIA_ENABLE_THINKING === "true") {
      extraBody.chat_template_kwargs = { enable_thinking: true };
    }

    candidates.push({
      name: `NVIDIA NIM (${nvidiaModel})`,
      client: nimClient,
      model: nvidiaModel,
      extraBody: Object.keys(extraBody).length > 0 ? extraBody : undefined,
    });
  }

  return candidates;
}

/**
 * Generate a text completion using either Groq or NVIDIA NIM.
 * All models are loaded from environment variables and stripped of internal reasoning artifacts.
 */
export async function generateLLMCompletion(
  options: CompletionOptions
): Promise<string | null> {
  const candidates = getCandidateProviders();

  if (candidates.length === 0) {
    console.warn(
      "[AI Engine] No AI API keys configured. Set GROQ_API_KEY or NVIDIA_NIM_API_KEY (or NVIDIA_API_KEY)."
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
