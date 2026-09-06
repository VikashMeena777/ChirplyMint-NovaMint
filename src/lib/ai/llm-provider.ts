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
}

interface ProviderCandidate {
  name: string;
  client: OpenAI;
  model: string;
}

/**
 * Build priority candidate list of LLM providers based on configured environment variables.
 * Priority order:
 * 1. Groq (Llama 3.3 70B - ultra fast, generous free tier)
 * 2. NVIDIA NIM (Active supported models, avoids retired/410 models)
 * 3. Google Gemini (Gemini 2.0 Flash)
 * 4. OpenAI (GPT-4o Mini)
 */
function getCandidateProviders(): ProviderCandidate[] {
  const candidates: ProviderCandidate[] = [];

  // 1. Groq (Primary recommended - ultra fast, free tier, reliable)
  if (process.env.GROQ_API_KEY) {
    const groqClient = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
    });
    candidates.push({
      name: "Groq (Llama 3.3 70B)",
      client: groqClient,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    });
  }

  // 2. NVIDIA NIM (Live supported models on integrate.api.nvidia.com)
  if (process.env.NVIDIA_NIM_API_KEY) {
    const nimClient = new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: process.env.NVIDIA_NIM_API_KEY,
    });

    // Default to active models (meta/llama-3.3-70b-instruct was retired with HTTP 410 Gone)
    const primaryNimModel =
      process.env.NVIDIA_NIM_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";

    candidates.push({
      name: `NVIDIA NIM (${primaryNimModel})`,
      client: nimClient,
      model: primaryNimModel,
    });

    // Fallback models hosted on NVIDIA NIM
    const nimFallbacks = [
      "mistralai/mistral-large-2-instruct",
      "meta/llama-3.2-11b-vision-instruct",
      "ibm/granite-3.0-8b-instruct",
    ];

    for (const fallbackModel of nimFallbacks) {
      if (fallbackModel !== primaryNimModel) {
        candidates.push({
          name: `NVIDIA NIM Fallback (${fallbackModel})`,
          client: nimClient,
          model: fallbackModel,
        });
      }
    }
  }

  // 3. Google Gemini (OpenAI-compatible endpoint)
  if (process.env.GEMINI_API_KEY) {
    const geminiClient = new OpenAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: process.env.GEMINI_API_KEY,
    });
    candidates.push({
      name: "Google Gemini (Gemini 2.0 Flash)",
      client: geminiClient,
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    });
  }

  // 4. OpenAI (Standard fallback)
  if (process.env.OPENAI_API_KEY) {
    const openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    candidates.push({
      name: "OpenAI (GPT-4o Mini)",
      client: openaiClient,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    });
  }

  return candidates;
}

/**
 * Generate a text completion with automatic multi-provider and multi-model fallback.
 * Prevents single-point-of-failure outages when upstream providers deprecate models (e.g. HTTP 410 Gone).
 */
export async function generateLLMCompletion(
  options: CompletionOptions
): Promise<string | null> {
  const candidates = getCandidateProviders();

  if (candidates.length === 0) {
    console.warn(
      "[AI Engine] No AI API keys configured. Set GROQ_API_KEY, NVIDIA_NIM_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY."
    );
    return null;
  }

  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const completion = await candidate.client.chat.completions.create({
        model: candidate.model,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 200,
        temperature: options.temperature ?? 0.5,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
      });

      const reply = completion.choices?.[0]?.message?.content?.trim();
      if (reply) {
        return reply;
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || "unknown";
      console.warn(
        `[AI Engine] ${candidate.name} failed (HTTP ${status}): ${err?.message || err}. Trying next candidate...`
      );
    }
  }

  console.error("[AI Engine] All candidate AI models/providers failed. Last error:", lastError);
  return null;
}
