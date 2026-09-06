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
    });
  }

  return candidates;
}

/**
 * Generate a standard text completion using either Groq or NVIDIA NIM.
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
      const completion = await candidate.client.chat.completions.create({
        model: candidate.model,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        ...(options.topP ? { top_p: options.topP } : {}),
        ...(options.frequencyPenalty ? { frequency_penalty: options.frequencyPenalty } : {}),
        ...(options.presencePenalty ? { presence_penalty: options.presencePenalty } : {}),
      });

      const reply = completion.choices?.[0]?.message?.content?.trim();
      if (reply) {
        return reply;
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
