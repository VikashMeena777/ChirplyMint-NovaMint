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
  isNvidia: boolean;
}

/**
 * Clean any accidental reasoning/thinking artifacts from the response
 * so followers only receive the final human message.
 */
function stripReasoningArtifacts(text: string): string {
  let cleaned = text.trim();

  // Strip <think>...</think> blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Strip [reasoning]...[/reasoning] blocks
  cleaned = cleaned.replace(/\[reasoning\][\s\S]*?\[\/reasoning\]/gi, "").trim();

  // If the model leaked an internal thought preamble followed by the reply (e.g. "Okay, the user just said... \n\n Hey!")
  const thoughtPreambleRegex =
    /^(?:okay,?\s+the\s+user|thinking\s+process|let\s+me\s+think|i\s+need\s+to\s+reply)[\s\S]*?\n\n+/i;
  if (thoughtPreambleRegex.test(cleaned)) {
    const afterPreamble = cleaned.replace(thoughtPreambleRegex, "").trim();
    if (afterPreamble.length > 0) {
      cleaned = afterPreamble;
    }
  }

  return cleaned;
}

/**
 * Build candidate list for Groq and NVIDIA NIM.
 * Model names are read directly from environment variables.
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
      isNvidia: false,
    });
  }

  // 2. NVIDIA NIM (Permanent base URL)
  if (process.env.NVIDIA_NIM_API_KEY) {
    const nvidiaModel =
      process.env.NVIDIA_NIM_MODEL || "nvidia/nemotron-3-super-120b-a12b";
    const nimClient = new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: process.env.NVIDIA_NIM_API_KEY,
    });

    candidates.push({
      name: `NVIDIA NIM (${nvidiaModel})`,
      client: nimClient,
      model: nvidiaModel,
      isNvidia: true,
    });
  }

  return candidates;
}

/**
 * Generate a clean text completion using either Groq or NVIDIA NIM.
 * Explicitly disables thinking mode so reasoning models output direct replies.
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
      // Build request payload
      const requestPayload: any = {
        model: candidate.model,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        ...(options.topP ? { top_p: options.topP } : {}),
        ...(options.frequencyPenalty ? { frequency_penalty: options.frequencyPenalty } : {}),
        ...(options.presencePenalty ? { presence_penalty: options.presencePenalty } : {}),
      };

      // Explicitly disable thinking on NVIDIA NIM so the model outputs the final answer directly
      if (candidate.isNvidia) {
        requestPayload.extra_body = {
          chat_template_kwargs: {
            enable_thinking: false,
          },
        };
      }

      const completion = await candidate.client.chat.completions.create(requestPayload);

      const raw = completion.choices?.[0]?.message?.content?.trim();
      if (raw) {
        const clean = stripReasoningArtifacts(raw);
        if (clean) {
          return clean;
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
