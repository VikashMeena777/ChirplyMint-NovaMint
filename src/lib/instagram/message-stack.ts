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
  // pdf delivery style: "attachment" = in-chat file (Meta wraps downloads in
  // an external-link warning); "link_button" = rich card with a direct link
  // button — opens clean, no Facebook interstitial. Default: attachment.
  pdf_mode?: "attachment" | "link_button";
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

  // Enrichment for quick replies (Instagram only supports chips on TEXT
  // messages). Semantics that preserve the user's order and prompt:
  //   • QR block WITH a prompt -> it becomes its own message at its exact
  //     position: prompt text with the chips underneath (never swallowed).
  //   • QR block WITHOUT a prompt -> chips attach to the previous text
  //     block. Multiple promptless QR blocks MERGE (dedupe by label).
  // Cap at Meta's 13 chips per message.
  const enriched: MessageBlock[] = [];
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (
      b.type === "quick_replies" &&
      b.quick_replies &&
      b.quick_replies.length > 0
    ) {
      const hasOwnPrompt = (b.text || "").trim().length > 0;

      if (hasOwnPrompt) {
        // Own message — prompt text is the carrier, chips ride on it
        enriched.push({
          type: "text",
          text: b.text,
          quick_replies: b.quick_replies.slice(0, 13),
        });
        continue;
      }

      // Promptless: merge into the previous text block if one exists
      const lastTextIdx = [...enriched].reverse().findIndex((x) => x.type === "text");
      if (lastTextIdx >= 0) {
        const target = enriched[enriched.length - 1 - lastTextIdx];
        const existing = target.quick_replies || [];
        const seen = new Set(existing.map((q) => (q.title || "").toLowerCase()));
        const merged = [...existing];
        for (const qr of b.quick_replies) {
          const key = (qr.title || "").toLowerCase();
          if (key && seen.has(key)) continue;
          seen.add(key);
          merged.push(qr);
        }
        target.quick_replies = merged.slice(0, 13);
        continue;
      }

      // No previous text at all: minimal carrier so the chips still show
      enriched.push({
        type: "text",
        text: "Choose an option:",
        quick_replies: b.quick_replies.slice(0, 13),
      });
      continue;
    }
    enriched.push(b);
  }

  for (let i = 0; i < enriched.length; i++) {
    const block = enriched[i];

    // Human pacing (#11): every text-bearing block gets its own typing
    // indicator sized to its length (short tap, longer pause for
    // paragraphs). Media-only blocks get a short settle gap. Total delay
    // stays well under Meta's window expectations and reads as a person
    // typing several messages one after another — never a machine dump.
    if (params.typing !== false) {
      const textLen =
        (block.text || block.subtitle || "").length;
      const isTextual =
        block.type === "text" ||
        block.type === "button_card" ||
        block.type === "quick_replies" ||
        block.type === "pdf";
      if (isTextual) {
        await sendSenderAction(igUserId, accessToken, recipientIgScopedId, "typing_on").catch(() => {});
        const typeMs = Math.min(2200, 500 + textLen * 18);
        await new Promise((r) => setTimeout(r, typeMs));
      } else if (i > 0) {
        await new Promise((r) => setTimeout(r, BLOCK_GAP_MS));
      }
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
          if (block.pdf_mode === "link_button") {
            // Clean link delivery: a rich card with a direct button — no
            // Meta attachment fetch, no facebook.com/flx external-link
            // warning interstitial when the lead opens it.
            result = await sendGenericTemplateDM(igUserId, accessToken, recipientIgScopedId, {
              title: (applyTemplateVars(block.text, templateVars) || "Your file is ready").slice(0, 80),
              subtitle: "Tap below to open it instantly",
              buttons: [{ type: "web_url", title: "Open PDF", url: block.file_url }],
            });
          } else {
            result = await sendFileDM(igUserId, accessToken, recipientIgScopedId, block.file_url);
          }
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
