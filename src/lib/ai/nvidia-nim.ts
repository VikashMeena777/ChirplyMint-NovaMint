import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_NIM_API_KEY || "",
});

const MODEL = "meta/llama-3.3-70b-instruct";

/**
 * Replace template variables like {name}, {keyword} with actual values.
 */
function replaceTemplateVars(
  template: string,
  vars: { name?: string; keyword?: string }
): string {
  let result = template;
  if (vars.name) {
    result = result.replace(/\{name\}/gi, vars.name);
  }
  if (vars.keyword) {
    result = result.replace(/\{keyword\}/gi, vars.keyword);
  }
  return result;
}

/**
 * Generate an AI-powered DM reply for an Instagram automation.
 */
export async function generateDMReply(context: {
  automationName: string;
  keyword: string;
  dmTemplate: string;
  commenterUsername: string;
  commentText?: string;
  aiEnabled: boolean;
}): Promise<string> {
  const templateVars = {
    name: context.commenterUsername,
    keyword: context.keyword,
  };

  // If AI is not enabled, return the static template with variables replaced
  if (!context.aiEnabled || !process.env.NVIDIA_NIM_API_KEY) {
    return replaceTemplateVars(context.dmTemplate, templateVars);
  }

  // Also replace variables in the template before sending to AI
  const resolvedTemplate = replaceTemplateVars(context.dmTemplate, templateVars);

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You're the person behind an Instagram page, DMing a follower who just commented on your post. Write like a real person — casual, warm, like you're texting a friend.

RULES:
- 1-3 sentences MAX. This is a DM, not an email
- Acknowledge what they commented — don't ignore it
- Naturally weave in the key info from the template below — don't copy-paste it word for word
- Use their name if provided (just first use, don't overdo it)
- Max 1-2 emojis
- NO hashtags, NO "Feel free to", NO "Don't hesitate to"
- NO "Sure!", "Of course!", "Great question!" — that sounds like AI
- If they commented in Hindi/Hinglish, reply in Hindi/Hinglish
- Sound like a real DM, not a marketing message`,
        },
        {
          role: "user",
          content: `@${context.commenterUsername} commented: "${context.commentText || context.keyword}"

Template to base your DM on (rephrase naturally, don't copy): "${resolvedTemplate}"

Write the DM:`,
        },
      ],
      max_tokens: 150,
      temperature: 0.5,
      frequency_penalty: 0.3,
    });

    let reply = completion.choices?.[0]?.message?.content?.trim();
    if (reply) {
      // Strip wrapping quotes
      if (
        (reply.startsWith('"') && reply.endsWith('"')) ||
        (reply.startsWith("'") && reply.endsWith("'"))
      ) {
        reply = reply.slice(1, -1);
      }
      // Strip robotic openers
      reply = reply.replace(
        /^(Sure!|Of course!|Absolutely!|Great question!|Hey there!|Hello there!|Hi there!)\s*/i,
        ""
      );
      if (reply.length > 0) {
        reply = reply.charAt(0).toUpperCase() + reply.slice(1);
      }
    }
    return reply || resolvedTemplate;
  } catch (error) {
    console.error("[NIM AI] Error generating DM reply:", error);
    return resolvedTemplate; // Fallback to resolved template
  }
}

/**
 * Generate a weekly performance insight summary using AI.
 */
export async function generateWeeklyInsight(stats: {
  dmsSent: number;
  leadsCapured: number;
  topAutomation: string | null;
  conversionRate: string;
  previousDmsSent: number;
}): Promise<string> {
  if (!process.env.NVIDIA_NIM_API_KEY) {
    return `This week: ${stats.dmsSent} DMs sent, ${stats.leadsCapured} leads captured. Conversion rate: ${stats.conversionRate}%.`;
  }

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a business analytics assistant. Generate a brief, motivating weekly performance summary for an Instagram automation platform. Keep it to 3-4 sentences. Be encouraging but honest. Use 1-2 emojis.`,
        },
        {
          role: "user",
          content: `Weekly stats:
- DMs sent this week: ${stats.dmsSent} (last week: ${stats.previousDmsSent})
- Leads captured: ${stats.leadsCapured}
- Top performing automation: ${stats.topAutomation || "None active"}
- Conversion rate: ${stats.conversionRate}%

Generate a brief weekly insight summary.`,
        },
      ],
      max_tokens: 200,
      temperature: 0.6,
    });

    const insight = completion.choices?.[0]?.message?.content?.trim();
    return insight || `This week: ${stats.dmsSent} DMs sent, ${stats.leadsCapured} leads captured.`;
  } catch (error) {
    console.error("[NIM AI] Error generating weekly insight:", error);
    return `This week: ${stats.dmsSent} DMs sent, ${stats.leadsCapured} leads captured. Conversion rate: ${stats.conversionRate}%.`;
  }
}
