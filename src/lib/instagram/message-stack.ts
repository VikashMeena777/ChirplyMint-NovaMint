/**
 * Message Stack engine (Graph API v26).
 *
 * A "stack" is an ordered list of blocks the wizard composes; the sender
 * executes them in sequence inside an open messaging window. This is what
 * lets a user build ANY combination — e.g. PDF + caption + button card +
 * quick replies — while respecting Instagram's format rules:
 *
 *   - A text block's caption is limited to 1000 bytes; quick_replies can only
 *     ride on a TEXT message, so the stack puts them on the last text block.
 *   - Attachments (album / PDF / MEDIA_SHARE / carousel) each need their own
 *     message, so a "PDF with a caption" is really [text block] → [file block].
 *   - Button cards and carousels are templates — separate messages.
 *   - Every block is fail-isolated: one failing block never kills the rest.
 *   - Pacing: small delay between blocks so it reads like a human typing,
 *     and we stay well inside Meta's 100 msg/s per account ceiling.
 */

import {
  sendInstagramDM,
  sendGenericTemplateDM,
  sendMultiImageDM,
  sendFileDM,
  sendQuickRepliesDM,
  sendCarouselDM,
  sendMediaShareDM,
  sendSenderAction,
  type TemplateButton,
  type QuickReply,
  type CarouselElement,
} from "@/lib/instagram/send-dm";

export interface MessageBlock {
  type: "text" | "image_album" | "pdf" | "button_card" | "quick_replies" | "carousel" | "media_share" | "sticker";
  // text / quick_replies prompt / button_card title / sticker ignored
  text?: string;
  // image_album
  image_urls?: string[];
  // pdf
  file_url?: string;
  // button_card
  subtitle?: string;
  image_url?: string;
  buttons?: TemplateButton[];
  // quick_replies
  quick_replies?: QuickReply[];
  // carousel
  elements?: CarouselElement[];
  // media_share
  media_id?: string;
}

export interface StackSendResult {
  success: boolean;
  sentBlocks: number;
  totalBlocks: number;
  errors: string[];
  messageIds: (string | undefined)[];
}

const BLOCK_GAP_MS = 700;

function applyTemplateVars(
  text: string | undefined,
  vars: { name?: string; keyword?: string }
): string {
  if (!text) return "";
  let out = text;
  if (vars.name) out = out.replace(/\{name\}/gi, vars.name);
  if (vars.keyword) out = out.replace(/\{keyword\}/gi, vars.keyword);
  return out;
}

/**
 * Execute a stack of message blocks sequentially.
 * `typing` controls the typing indicator before the FIRST block.
 */
export async function sendMessageStack(params: {
  igUserId: string;
  accessToken: string;
  recipientIgScopedId: string;
  blocks: MessageBlock[];
  templateVars: { name?: string; keyword?: string };
  typing?: boolean;
}): Promise<StackSendResult> {
  const { igUserId, accessToken, recipientIgScopedId, blocks, templateVars } = params;
  const errors: string[] = [];
  const messageIds: (string | undefined)[] = [];
  let sentBlocks = 0;

  const list = (blocks || []).filter((b) => b && b.type);
  if (list.length === 0) {
    return { success: false, sentBlocks: 0, totalBlocks: 0, errors: ["empty stack"], messageIds: [] };
  }

  // Enrichment: attach quick_replies to the LAST text block (Instagram only
  // supports them on text messages), so the composer can specify them as a
  // separate trailing block for UX while we merge for correctness.
  const enriched: MessageBlock[] = [];
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (
      b.type === "quick_replies" &&
      b.quick_replies &&
      enriched.length > 0
    ) {
      const lastTextIdx = [...enriched].reverse().findIndex((x) => x.type === "text");
      if (lastTextIdx >= 0) {
        const target = enriched[enriched.length - 1 - lastTextIdx];
        // Only text messages can carry quick replies
        target.quick_replies = b.quick_replies;
        continue;
      }
      // No text block to attach to: convert prompt into the text block
      enriched.push({
        type: "text",
        text: b.text || "Choose an option:",
        quick_replies: b.quick_replies,
      });
      continue;
    }
    enriched.push(b);
  }

  for (let i = 0; i < enriched.length; i++) {
    const block = enriched[i];

    if (i === 0 && params.typing !== false) {
      await sendSenderAction(igUserId, accessToken, recipientIgScopedId, "typing_on").catch(() => {});
      await new Promise((r) => setTimeout(r, 800));
    } else if (i > 0) {
      await new Promise((r) => setTimeout(r, BLOCK_GAP_MS));
    }

    try {
      let result: { success: boolean; messageId?: string; error?: string } | null = null;

      switch (block.type) {
        case "text": {
          const text = applyTemplateVars(block.text, templateVars);
          if (!text) break; // nothing to send, not an error
          if (block.quick_replies?.length) {
            result = await sendQuickRepliesDM(
              igUserId, accessToken, recipientIgScopedId,
              text, block.quick_replies
            );
          } else {
            result = await sendInstagramDM(igUserId, accessToken, recipientIgScopedId, text);
          }
          break;
        }
        case "image_album": {
          const urls = (block.image_urls || []).slice(0, 10);
          if (urls.length === 0) break;
          result = await sendMultiImageDM(
            igUserId, accessToken, recipientIgScopedId,
            urls,
            applyTemplateVars(block.text, templateVars) || undefined
          );
          break;
        }
        case "pdf": {
          if (!block.file_url) break;
          result = await sendFileDM(igUserId, accessToken, recipientIgScopedId, block.file_url);
          break;
        }
        case "button_card": {
          result = await sendGenericTemplateDM(igUserId, accessToken, recipientIgScopedId, {
            title: applyTemplateVars(block.text, templateVars).slice(0, 80) || "Here you go",
            subtitle: block.subtitle,
            image_url: block.image_url,
            buttons: (block.buttons || []).slice(0, 3),
          });
          break;
        }
        case "carousel": {
          const elements = (block.elements || []).slice(0, 10);
          if (elements.length === 0) break;
          result = await sendCarouselDM(igUserId, accessToken, recipientIgScopedId, elements);
          break;
        }
        case "media_share": {
          if (!block.media_id) break;
          result = await sendMediaShareDM(igUserId, accessToken, recipientIgScopedId, block.media_id);
          break;
        }
        case "sticker": {
          // like_heart sticker
          result = await sendInstagramDM(igUserId, accessToken, recipientIgScopedId, "❤️");
          break;
        }
      }

      if (result) {
        if (result.success) {
          sentBlocks++;
          messageIds.push(result.messageId);
        } else {
          errors.push(`${block.type}: ${result.error || "failed"}`);
        }
      } else {
        // Block skipped (empty content) — count as skipped, not failed
        errors.push(`${block.type}: skipped (empty)`);
      }
    } catch (err) {
      errors.push(`${block.type}: ${err instanceof Error ? err.message : "exception"}`);
    }
  }

  return {
    success: sentBlocks > 0,
    sentBlocks,
    totalBlocks: enriched.length,
    errors,
    messageIds,
  };
}
