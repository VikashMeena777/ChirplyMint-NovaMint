import OpenAI from "openai";

/**
 * AI provider fallback chain — every provider speaks the OpenAI-compatible
 * Chat Completions API, so the same request body works everywhere; we only
 * swap baseURL / apiKey / model.
 *
 * Order (2026-09-12, re-measured):
 *  1. Groq (primary)   — GROQ_API_KEY + GROQ_MODEL. ~1.5s replies with
 *     excellent conversational/Hinglish quality. NIM's remaining models
 *     measured 5-18s per reply (and the old llama-3.3-70b is 410-gone),
 *     which is too slow for Instagram DM webhooks.
 *  2. NVIDIA NIM (fallback) — NVIDIA_NIM_API_KEY + NVIDIA_NIM_MODEL.
 */

interface Provider {
  name: string;
  client: OpenAI;
  model: string;
}

function buildProviders(): Provider[] {
  const providers: Provider[] = [];

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

  if (process.env.NVIDIA_NIM_API_KEY) {
    providers.push({
      name: "nvidia-nim",
      client: new OpenAI({
        baseURL: "https://integrate.api.nvidia.com/v1",
        apiKey: process.env.NVIDIA_NIM_API_KEY,
      }),
      model: process.env.NVIDIA_NIM_MODEL || "deepseek-ai/deepseek-v4-flash-0731",
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
 *
 * Visibility: logs which provider succeeded so silent degradation
 * (primary down → fallback model) is visible in logs, not invisible.
 */
export async function chatCompletion(params: ChatParams): Promise<string | null> {
  return (await chatCompletionWithMeta(params)).text;
}

/**
 * Same as chatCompletion but also reports which provider answered.
 * `provider` is null when every provider failed or none is configured.
 * `fallbackUsed` is true when the caller must use its template fallback.
 */
export async function chatCompletionWithMeta(params: ChatParams): Promise<{
  text: string | null;
  provider: string | null;
  fallbackUsed: boolean;
  /** true when the reply came from the FIRST provider in the chain */
  primary: boolean;
}> {
  const providers = buildProviders();

  if (providers.length === 0) {
    console.warn("[AI] No AI providers configured (NVIDIA_NIM_API_KEY / GROQ_API_KEY)");
    return { text: null, provider: null, fallbackUsed: true, primary: false };
  }

  let lastError: unknown = null;
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    try {
      // Build a minimal request: omit undefined params (some NIM/Groq
      // deployments 400 on explicit null/extra fields, e.g. extra_body or
      // unsupported penalty params). NIM only gets model/messages/max_tokens/
      // temperature; penalties are Groq/OpenAI-only.
      type CreateParams = Parameters<typeof provider.client.chat.completions.create>[0];
      const req = {
        model: provider.model,
        messages: params.messages as CreateParams["messages"],
        ...(params.max_tokens !== undefined ? { max_tokens: params.max_tokens } : {}),
        ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
        ...(provider.name !== "nvidia-nim"
          ? {
              ...(params.frequency_penalty !== undefined ? { frequency_penalty: params.frequency_penalty } : {}),
              ...(params.presence_penalty !== undefined ? { presence_penalty: params.presence_penalty } : {}),
            }
          : {}),
        // gpt-oss-style models think in a hidden `reasoning` field that
        // COUNTS toward max_tokens — "low" keeps that overhead small so the
        // visible reply doesn't get truncated by the budget.
        ...(provider.name === "groq" ? { reasoning_effort: "low" as const } : {}),
      } as CreateParams;
      const completion = await provider.client.chat.completions.create(req);
      const content =
        "choices" in completion
          ? completion.choices?.[0]?.message?.content?.trim()
          : undefined;
      if (content) {
        const clean = stripReasoning(content);
        if (clean) {
          if (i === 0) {
            console.log(`[AI] Answered by ${provider.name} (${provider.model})`);
          } else {
            console.warn(`[AI-FALLBACK] Primary unavailable — answered by ${provider.name} (${provider.model})`);
          }
          return { text: clean, provider: provider.name, fallbackUsed: false, primary: i === 0 };
        }
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

  if (lastError) console.error("[AI] All providers failed — caller will use template fallback");
  return { text: null, provider: null, fallbackUsed: true, primary: false };
}
