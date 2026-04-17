import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_NIM_API_KEY || "",
});

const MODEL = "meta/llama-3.3-70b-instruct";

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
  // If AI is not enabled, return the static template
  if (!context.aiEnabled || !process.env.NVIDIA_NIM_API_KEY) {
    return context.dmTemplate;
  }

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a friendly Instagram DM assistant for a business. Your job is to send helpful, engaging DMs to users who comment on posts. Keep messages:
- Short (2-4 sentences max)
- Friendly and professional
- Include the key info from the template
- Personalize with the user's name when available
- Use 1-2 relevant emojis max
- Never sound robotic or spammy
- Never include hashtags in DMs`,
        },
        {
          role: "user",
          content: `The user @${context.commenterUsername} commented "${context.commentText || context.keyword}" on our post.

Our DM template is: "${context.dmTemplate}"

Generate a personalized DM reply. Make it feel natural and human.`,
        },
      ],
      max_tokens: 256,
      temperature: 0.7,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    return reply || context.dmTemplate;
  } catch (error) {
    console.error("[NIM AI] Error generating DM reply:", error);
    return context.dmTemplate; // Fallback to static template
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
