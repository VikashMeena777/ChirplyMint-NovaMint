/**
 * Welcome Flow setup (Graph API v26 messenger_profile):
 *   - Ice Breakers: up to 4 tappable prompts shown in the DM screen BEFORE
 *     the lead sends anything. Great for guiding them into your funnel.
 *   - Persistent Menu: up to 5 always-visible quick actions in the DM thread.
 *
 * Both live on the /{ig-user-id}/messenger_profile endpoint and are a
 * per-Instagram-account setting. We set sensible defaults at OAuth connect
 * time; account owners can customize later (welcome_flow_setup flags that
 * defaults were provisioned, so we only ever do this once per account).
 */

export interface WelcomeFlowConfig {
  iceBreakers: { question: string; payload: string }[]; // max 4
  persistentMenu: { title: string; payload: string }[]; // max 5
}

export const DEFAULT_WELCOME_FLOW: WelcomeFlowConfig = {
  iceBreakers: [
    { question: "Send me the free guide 📩", payload: "WELCOME_FREE_GUIDE" },
    { question: "What can you do? ✨", payload: "WELCOME_WHAT_CAN_YOU_DO" },
    { question: "I want to buy / see pricing 💳", payload: "WELCOME_PRICING" },
    { question: "Talk to a human 👋", payload: "WELCOME_HUMAN" },
  ],
  persistentMenu: [
    { title: "Free guide 📩", payload: "MENU_FREE_GUIDE" },
    { title: "Pricing 💳", payload: "MENU_PRICING" },
    { title: "Help / FAQ 🙋", payload: "MENU_HELP" },
  ],
};

/**
 * Provision the default welcome flow for an IG account. Non-fatal by
 * design: a failure here never blocks the OAuth connect.
 */
export async function setupWelcomeFlow(
  igUserId: string,
  accessToken: string,
  config: WelcomeFlowConfig = DEFAULT_WELCOME_FLOW
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Ice breakers (max 4)
    if (config.iceBreakers.length > 0) {
      const res = await fetch(
        `https://graph.instagram.com/v26.0/${igUserId}/messenger_profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            platform: "instagram",
            ice_breakers: config.iceBreakers.slice(0, 4).map((ib) => ({
              question: ib.question,
              payload: ib.payload,
            })),
          }),
        }
      );
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || `ice_breakers HTTP ${res.status}`);
      }
    }

    // 2. Persistent menu (max 5)
    if (config.persistentMenu.length > 0) {
      const res = await fetch(
        `https://graph.instagram.com/v26.0/${igUserId}/messenger_profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            platform: "instagram",
            persistent_menu: [
              {
                locale: "default",
                composer_input_disabled: false,
                call_to_actions: config.persistentMenu.slice(0, 5).map((mi) => ({
                  type: "postback",
                  title: mi.title.slice(0, 20),
                  payload: mi.payload,
                })),
              },
            ],
          }),
        }
      );
      const data = (await res.json()) as { error?: { message?: string } };
      if (!res.ok || data.error) {
        throw new Error(data.error?.message || `persistent_menu HTTP ${res.status}`);
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
