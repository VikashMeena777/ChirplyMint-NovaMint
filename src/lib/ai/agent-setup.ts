import type { AIAgent } from "@/lib/actions/ai-agent";

/**
 * Pure setup-gate logic — shared by the server actions, the onboarding
 * wizard (client), and tests. Kept OUTSIDE the "use server" file because
 * server-action files may only export async functions.
 */

/** Persona texts that ship as column defaults — never enough to reply as
 *  the owner. An agent still on one of these MUST NOT activate. */
const PLACEHOLDER_PERSONAS = [
  "you are a helpful and friendly brand assistant",
  "you are a friendly and helpful assistant",
];

/**
 * What's still missing before this agent may activate. Empty = ready.
 * The rules are content-based (not just the flag) so a hand-edited agent
 * that still says nothing about the owner stays gated.
 */
export function agentSetupMissing(a: Partial<AIAgent>): string[] {
  const missing: string[] = [];
  const name = (a.agent_name ?? "").trim();
  if (!name || /^(my )?assistant$/i.test(name)) missing.push("name");

  const about = (a.about_text ?? "").trim();
  if (about.length < 20) missing.push("about");

  const persona = (a.persona ?? "").trim().toLowerCase();
  const personaIsPlaceholder = PLACEHOLDER_PERSONAS.some((p) =>
    persona.startsWith(p)
  );
  if (persona.length < 60 || personaIsPlaceholder) missing.push("persona");

  return missing;
}

/**
 * Assemble the rich persona the reply prompt consumes, from the wizard's
 * structured answers. This is what stops the agent from talking nonsense:
 * everything it claims to be comes from these fields.
 */
export function assemblePersona(input: {
  agentName: string;
  about: string;
  contentTopics?: string;
  offers?: string;
}): string {
  const parts: string[] = [];
  parts.push(
    `You are "${input.agentName.trim()}", replying to followers on behalf of a real person: ${input.about.trim()}`
  );
  if (input.contentTopics?.trim()) {
    parts.push(`WHAT THE PAGE POSTS ABOUT: ${input.contentTopics.trim()}`);
  }
  if (input.offers?.trim()) {
    parts.push(`WHAT IS OFFERED (share these when relevant): ${input.offers.trim()}`);
  } else {
    parts.push(
      "WHAT IS OFFERED: nothing is being sold right now — focus on being helpful, warm, and sharing content."
    );
  }
  parts.push(
    "Never invent facts about yourself beyond the information above — if asked something personal you don't have an answer for, deflect lightly or say you'll check and get back."
  );
  return parts.join("\n\n");
}
