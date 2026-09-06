import OpenAI from "openai";

/**
 * AI provider fallback chain — every provider speaks the OpenAI-compatible
 * Chat Completions API, so the same request body works everywhere; we only
 * swap baseURL / apiKey / model.
 *
 * Order:
 *  1. NVIDIA NIM (primary)  — NVIDIA_NIM_API_KEY + NVIDIA_NIM_MODEL
 *  2. Groq (fallback)       — GROQ_API_KEY + GROQ_MODEL (default: openai/gpt-oss-120b)
 */

interface Provider {
  name: string;
  client: OpenAI;
  model: string;
}

function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  if (process.env.NVIDIA_NIM_API_KEY) {
    providers.push({
      name: "nvidia-nim",
      client: new OpenAI({
        baseURL: "https://integrate.api.nvidia.com/v1",
        apiKey: process.env.NVIDIA_NIM_API_KEY,
      }),
      model: process.env.NVIDIA_NIM_MODEL || "meta/llama-3.3-70b-instruct",
    });
  }

  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: "groq",
      client: new OpenAI({
        baseURL: "https://api.groq.com/openai/v1",
        apiKey: process.env.GROQ_API_KEY,
      }),
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    });
  }

  return providers;
}

/**
 * Reasoning models (Nemotron, gpt-oss, DeepSeek-style) emit their chain of
 * thought — either inline in `<think>…</think>` blocks or (on Groq) in a
 * separate `reasoning` field. Customers must only ever see the final answer.
 * Strips everything up to the last closing think tag; an unterminated think
 * block means the answer never arrived, so return empty and try the next
 * provider.
 */
function stripReasoning(text: string): string {
  if (!/<think>/i.test(text)) return text.trim();
  const closeIdx = text.lastIndexOf("</think>");
  if (closeIdx === -1) return "";
  return text
    .slice(closeIdx + "</think>".length)
    .trim()
    .replace(/^[#*\-\s]+/, "");
}

export interface ChatParams {
  messages: { role: string; content: string }[];
  max_tokens?: number;
  temperature?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/**
 * Try each provider in order and return the first successful reply.
 * Returns null only when no provider is configured or every provider fails —
 * callers keep their own template fallbacks for that case.
 */
export async function chatCompletion(params: ChatParams): Promise<string | null> {
  const providers = buildProviders();

  if (providers.length === 0) {
    console.warn("[AI] No AI providers configured (NVIDIA_NIM_API_KEY / GROQ_API_KEY)");
    return null;
  }

  let lastError: unknown = null;
  for (const provider of providers) {
    try {
      const completion = await provider.client.chat.completions.create({
        model: provider.model,
        messages:
          params.messages as Parameters<
            typeof provider.client.chat.completions.create
          >[0]["messages"],
        max_tokens: params.max_tokens,
        temperature: params.temperature,
        frequency_penalty: params.frequency_penalty,
        presence_penalty: params.presence_penalty,
      });
      const content = completion.choices?.[0]?.message?.content?.trim();
      if (content) {
        const clean = stripReasoning(content);
        if (clean) return clean;
        console.error(`[AI] ${provider.name} reply was entirely reasoning, trying next provider`);
      }
      console.error(`[AI] ${provider.name} returned an empty reply, trying next provider`);
    } catch (err) {
      lastError = err;
      console.error(
        `[AI] ${provider.name} failed, trying next provider:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  if (lastError) console.error("[AI] All providers failed");
  return null;
}
