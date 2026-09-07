"use client";

import { useState } from "react";
import {
  Type,
  Images,
  FileText,
  MousePointerClick,
  MessageCircleReply,
  LayoutGrid,
  Share2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Heart,
  Eye,
} from "lucide-react";
import {
  type MessageBlockForm,
  type QuickReplyOption,
  type CarouselCard,
  type TemplateButton,
} from "./automation-types";

// ── Instagram Send API limits (Graph API v26) ──
const MAX_BLOCKS = 6;
const MAX_ALBUM_IMAGES = 10;
const MAX_QUICK_REPLIES = 13;
const MAX_QR_TITLE = 20;
const MAX_CAROUSEL_CARDS = 10;
const MAX_BUTTONS = 3;
const MAX_CARD_TITLE = 80;

const BLOCK_TYPES: {
  type: MessageBlockForm["type"];
  label: string;
  icon: typeof Type;
  hint: string;
}[] = [
  { type: "text", label: "Text", icon: Type, hint: "Plain text or emoji message" },
  { type: "image_album", label: "Image Album", icon: Images, hint: "Up to 10 images with a caption" },
  { type: "pdf", label: "PDF File", icon: FileText, hint: "Send a document (max 25MB)" },
  { type: "button_card", label: "Button Card", icon: MousePointerClick, hint: "Rich card with up to 3 buttons" },
  { type: "quick_replies", label: "Quick Replies", icon: MessageCircleReply, hint: "Tappable options incl. email/phone capture" },
  { type: "carousel", label: "Carousel", icon: LayoutGrid, hint: "Up to 10 swipeable cards with buttons" },
  { type: "media_share", label: "Share Post", icon: Share2, hint: "Resend one of your posts in the DM" },
];

function blockLabel(type: string): string {
  return BLOCK_TYPES.find((b) => b.type === type)?.label || type;
}

let blockSeq = 0;
function newBlockId(): string {
  blockSeq += 1;
  return `blk_${Date.now()}_${blockSeq}`;
}

export function makeBlock(type: MessageBlockForm["type"]): MessageBlockForm {
  const base: MessageBlockForm = { id: newBlockId(), type };
  switch (type) {
    case "text":
      return { ...base, text: "" };
    case "image_album":
      return { ...base, image_urls: [""], text: "" };
    case "pdf":
      return { ...base, file_url: "", pdf_mode: "link_button" };
    case "button_card":
      return { ...base, text: "", subtitle: "", buttons: [] };
    case "quick_replies":
      return { ...base, text: "Choose an option:", quick_replies: [] };
    case "carousel":
      return { ...base, elements: [] };
    case "media_share":
      return { ...base, media_id: "" };
    default:
      return base;
  }
}

interface StackComposerProps {
  blocks: MessageBlockForm[];
  onChange: (blocks: MessageBlockForm[]) => void;
}

export function StackComposer({ blocks, onChange }: StackComposerProps) {
  function updateBlock(id: string, patch: Partial<MessageBlockForm>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function addBlock(type: MessageBlockForm["type"]) {
    if (blocks.length >= MAX_BLOCKS) return;
    onChange([...blocks, makeBlock(type)]);
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }

  function moveBlock(id: string, dir: -1 | 1) {
    const idx = blocks.findIndex((b) => b.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {/* Block list */}
      {blocks.length === 0 && (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
          No messages yet. Add blocks below — e.g. a text caption, then a PDF, then buttons.
          <br />
          They&apos;ll be delivered one after another in the DM.
        </div>
      )}

      {blocks.map((block, i) => (
        <div key={block.id} className="rounded-xl border bg-card">
          {/* Block header */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/40" />
            <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
            <span className="text-sm font-medium">{blockLabel(block.type)}</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveBlock(block.id, -1)}
                disabled={i === 0}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                aria-label="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveBlock(block.id, 1)}
                disabled={i === blocks.length - 1}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                aria-label="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove block"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Block body */}
          <div className="space-y-3 p-3">
            <BlockEditor block={block} onChange={updateBlock} />
          </div>
        </div>
      ))}

      {/* Add-block picker */}
      <div className="rounded-xl border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Add a message block {blocks.length >= MAX_BLOCKS && "(stack is full — max 6)"}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BLOCK_TYPES.map((bt) => (
            <button
              key={bt.type}
              type="button"
              disabled={blocks.length >= MAX_BLOCKS}
              onClick={() => addBlock(bt.type)}
              className="group flex flex-col items-center gap-1 rounded-lg border bg-background p-3 text-center transition hover:border-[oklch(0.52_0.19_162)] disabled:opacity-40"
            >
              <bt.icon className="h-5 w-5 text-muted-foreground group-hover:text-[oklch(0.52_0.19_162)]" />
              <span className="text-xs font-medium">{bt.label}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">{bt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Stacks play only in open 24h message windows (when a lead messages you or taps a
        button). First-time commenters receive a text/button private reply that opens the
        window, and the stack follows once they respond.
      </p>
    </div>
  );
}

function BlockEditor({
  block,
  onChange,
}: {
  block: MessageBlockForm;
  onChange: (id: string, patch: Partial<MessageBlockForm>) => void;
}) {
  const inputCls =
    "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[oklch(0.52_0.19_162)]";

  switch (block.type) {
    case "text":
      return (
        <textarea
          value={block.text || ""}
          onChange={(e) => onChange(block.id, { text: e.target.value })}
          placeholder="Write your message… use {name} and {keyword} as placeholders"
          rows={3}
          className={inputCls}
        />
      );

    case "image_album": {
      const urls = block.image_urls || [""];
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            {(urls.length ? urls : [""]).map((url, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-xs text-muted-foreground">{i + 1}.</span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const next = [...(block.image_urls || [])];
                    next[i] = e.target.value;
                    onChange(block.id, { image_urls: next });
                  }}
                  placeholder="https://…/image.jpg"
                  className={inputCls}
                />
                {urls.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange(block.id, {
                        image_urls: (block.image_urls || []).filter((_, j) => j !== i),
                      })
                    }
                    className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {urls.length < MAX_ALBUM_IMAGES && (
              <button
                type="button"
                onClick={() =>
                  onChange(block.id, { image_urls: [...(block.image_urls || []), ""] })
                }
                className="flex items-center gap-1 text-xs font-medium text-[oklch(0.52_0.19_162)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add image ({urls.length}/{MAX_ALBUM_IMAGES})
              </button>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Caption (optional, sent as part of the album)
            </label>
            <textarea
              value={block.text || ""}
              onChange={(e) => onChange(block.id, { text: e.target.value })}
              rows={2}
              placeholder="Album caption…"
              className={inputCls}
            />
          </div>
        </div>
      );
    }

    case "pdf":
      return (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              PDF URL (publicly accessible, max 25MB)
            </label>
            <input
              type="url"
              value={block.file_url || ""}
              onChange={(e) => onChange(block.id, { file_url: e.target.value })}
              placeholder="https://your-cdn.com/brochure.pdf"
              className={inputCls}
            />
          </div>
          <p className="flex items-start gap-1.5 rounded-lg bg-[oklch(0.52_0.19_162/6%)] p-2 text-[11px] text-muted-foreground">
            Opens as a clean card with an &quot;Open PDF&quot; button — no
            &quot;leaving Instagram&quot; warning screen.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Tip: add a Text block above to act as the PDF&apos;s caption — Instagram sends
            captions and files as separate messages.
          </p>
        </div>
      );

    case "button_card":
      return (
        <ButtonCardEditor block={block} onChange={onChange} inputCls={inputCls} />
      );

    case "quick_replies":
      return (
        <QuickReplyEditor block={block} onChange={onChange} inputCls={inputCls} />
      );

    case "carousel":
      return (
        <CarouselEditor block={block} onChange={onChange} inputCls={inputCls} />
      );

    case "media_share":
      return (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Instagram media ID to share
          </label>
          <input
            type="text"
            value={block.media_id || ""}
            onChange={(e) => onChange(block.id, { media_id: e.target.value })}
            placeholder="e.g. 17900000000000000"
            className={inputCls}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Found in Insights → Content Performance → post IDs, or from the post URL.
          </p>
        </div>
      );

    default:
      return null;
  }
}

function ButtonCardEditor({
  block,
  onChange,
  inputCls,
}: {
  block: MessageBlockForm;
  onChange: (id: string, patch: Partial<MessageBlockForm>) => void;
  inputCls: string;
}) {
  const buttons = block.buttons || [];
  return (
    <div className="space-y-3">
      <input
        value={block.text || ""}
        onChange={(e) => onChange(block.id, { text: e.target.value })}
        placeholder="Card title (max 80 chars)"
        maxLength={MAX_CARD_TITLE}
        className={inputCls}
      />
      <input
        value={block.subtitle || ""}
        onChange={(e) => onChange(block.id, { subtitle: e.target.value })}
        placeholder="Subtitle (optional)"
        className={inputCls}
      />
      <input
        type="url"
        value={block.image_url || ""}
        onChange={(e) => onChange(block.id, { image_url: e.target.value })}
        placeholder="Header image URL (optional)"
        className={inputCls}
      />
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Buttons ({buttons.length}/{MAX_BUTTONS})
        </p>
        {buttons.map((btn, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={btn.type}
              onChange={(e) => {
                const next = [...buttons];
                next[i] = { ...btn, type: e.target.value as TemplateButton["type"] };
                onChange(block.id, { buttons: next });
              }}
              className="rounded-md border bg-background px-2 py-2 text-sm"
            >
              <option value="web_url">Link</option>
              <option value="postback">Action</option>
            </select>
            <input
              value={btn.title}
              onChange={(e) => {
                const next = [...buttons];
                next[i] = { ...btn, title: e.target.value.slice(0, 20) };
                onChange(block.id, { buttons: next });
              }}
              placeholder="Label (max 20)"
              className={inputCls}
            />
            <input
              type={btn.type === "web_url" ? "url" : "text"}
              value={btn.type === "web_url" ? btn.url || "" : btn.payload || ""}
              onChange={(e) => {
                const next = [...buttons];
                next[i] =
                  btn.type === "web_url"
                    ? { ...btn, url: e.target.value }
                    : { ...btn, payload: e.target.value };
                onChange(block.id, { buttons: next });
              }}
              placeholder={btn.type === "web_url" ? "https://…" : "payload id"}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() =>
                onChange(block.id, { buttons: buttons.filter((_, j) => j !== i) })
              }
              className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remove button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {buttons.length < MAX_BUTTONS && (
          <button
            type="button"
            onClick={() =>
              onChange(block.id, {
                buttons: [...buttons, { type: "web_url", title: "", url: "" }],
              })
            }
            className="flex items-center gap-1 text-xs font-medium text-[oklch(0.52_0.19_162)] hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add button
          </button>
        )}
      </div>
    </div>
  );
}

function QuickReplyEditor({
  block,
  onChange,
  inputCls,
}: {
  block: MessageBlockForm;
  onChange: (id: string, patch: Partial<MessageBlockForm>) => void;
  inputCls: string;
}) {
  const qrs = block.quick_replies || [];
  const emailCount = qrs.filter((q) => q.content_type === "user_email").length;
  const phoneCount = qrs.filter((q) => q.content_type === "user_phone_number").length;
  const dupeLabels = qrs
    .map((q) => (q.title || "").trim().toLowerCase())
    .filter((t) => t)
    .filter((t, i, arr) => arr.indexOf(t) !== i);
  const hasDupes = dupeLabels.length > 0;

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Prompt message (the text the quick replies attach to)
        </label>
        <textarea
          value={block.text || ""}
          onChange={(e) => onChange(block.id, { text: e.target.value })}
          rows={2}
          placeholder="e.g. Want the full guide? Drop your email below 👇"
          className={inputCls}
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Options ({qrs.length}/{MAX_QUICK_REPLIES}) — <Heart className="inline h-3 w-3 text-[oklch(0.52_0.19_162)]" /> email &amp; phone types ask the lead natively and save to your Leads table
        </p>
        <p className="text-[11px] text-muted-foreground">
          <strong>Payload ID</strong> is the secret code each button sends back when tapped —
          it tells ChirplyMint <em>which</em> option was chosen (used for automations and tags).
          Leave the auto-generated ones as they are, or name them something readable like
          <code className="mx-1 rounded bg-muted px-1">pricing_yes</code>.
        </p>
        {qrs.map((qr, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={qr.content_type || "text"}
              onChange={(e) => {
                const next = [...qrs];
                next[i] = { ...qr, content_type: e.target.value as QuickReplyOption["content_type"] };
                onChange(block.id, { quick_replies: next });
              }}
              className="rounded-md border bg-background px-2 py-2 text-sm"
            >
              <option value="text">Text</option>
              <option value="user_email" disabled={emailCount >= 1}>
                📧 Ask email
              </option>
              <option value="user_phone_number" disabled={phoneCount >= 1}>
                📱 Ask phone
              </option>
            </select>
            <input
              value={qr.title}
              onChange={(e) => {
                const next = [...qrs];
                next[i] = { ...qr, title: e.target.value.slice(0, MAX_QR_TITLE) };
                onChange(block.id, { quick_replies: next });
              }}
              placeholder={`Label (max ${MAX_QR_TITLE})`}
              maxLength={MAX_QR_TITLE}
              className={inputCls}
            />
            <input
              value={qr.payload}
              onChange={(e) => {
                const next = [...qrs];
                next[i] = { ...qr, payload: e.target.value };
                onChange(block.id, { quick_replies: next });
              }}
              placeholder="payload id (what tapping sends)"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() =>
                onChange(block.id, { quick_replies: qrs.filter((_, j) => j !== i) })
              }
              className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remove option"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {hasDupes && (
          <p className="text-xs font-medium text-red-500">
            Two options have the same label — make each one unique (duplicates would be
            impossible to tell apart when tapped).
          </p>
        )}
        {qrs.length < MAX_QUICK_REPLIES && (
          <button
            type="button"
            disabled={hasDupes}
            onClick={() =>
              onChange(block.id, {
                quick_replies: [
                  ...qrs,
                  { title: "", payload: `qr_${Date.now()}_${qrs.length}`, content_type: "text" },
                ],
              })
            }
            className="flex items-center gap-1 text-xs font-medium text-[oklch(0.52_0.19_162)] hover:underline disabled:opacity-40 disabled:no-underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add option
          </button>
        )}
        <p className="text-[11px] text-muted-foreground">
          📱 The 📧 ask-email and 📱 ask-phone chips are drawn by Instagram itself and appear
          on the <strong>Instagram mobile app</strong> (desktop web shows only text chips) —
          test there.
        </p>
      </div>
    </div>
  );
}

function CarouselEditor({
  block,
  onChange,
  inputCls,
}: {
  block: MessageBlockForm;
  onChange: (id: string, patch: Partial<MessageBlockForm>) => void;
  inputCls: string;
}) {
  const cards = block.elements || [];

  function updateCard(i: number, patch: Partial<CarouselCard>) {
    const next = [...cards];
    next[i] = { ...next[i], ...patch };
    onChange(block.id, { elements: next });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        Cards ({cards.length}/{MAX_CAROUSEL_CARDS}) — swipeable in the DM
      </p>
      {cards.map((card, i) => (
        <div key={i} className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Card {i + 1}</span>
            <button
              type="button"
              onClick={() =>
                onChange(block.id, { elements: cards.filter((_, j) => j !== i) })
              }
              className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remove card"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input
            value={card.title}
            onChange={(e) => updateCard(i, { title: e.target.value.slice(0, MAX_CARD_TITLE) })}
            placeholder="Card title (max 80)"
            maxLength={MAX_CARD_TITLE}
            className={inputCls}
          />
          <input
            value={card.subtitle || ""}
            onChange={(e) => updateCard(i, { subtitle: e.target.value })}
            placeholder="Subtitle (optional)"
            className={inputCls}
          />
          <input
            type="url"
            value={card.image_url || ""}
            onChange={(e) => updateCard(i, { image_url: e.target.value })}
            placeholder="Image URL (optional)"
            className={inputCls}
          />
          <div className="space-y-1">
            {(card.buttons || []).map((btn, j) => (
              <div key={j} className="flex items-center gap-2">
                <input
                  value={btn.title}
                  onChange={(e) => {
                    const next = [...(card.buttons || [])];
                    next[j] = { ...btn, title: e.target.value.slice(0, 20) };
                    updateCard(i, { buttons: next });
                  }}
                  placeholder="Button label (max 20)"
                  className={inputCls}
                />
                <input
                  type="url"
                  value={btn.url || ""}
                  onChange={(e) => {
                    const next = [...(card.buttons || [])];
                    next[j] = { ...btn, url: e.target.value };
                    updateCard(i, { buttons: next });
                  }}
                  placeholder="https://…"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() =>
                    updateCard(i, { buttons: (card.buttons || []).filter((_, k) => k !== j) })
                  }
                  className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remove button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {(card.buttons || []).length < MAX_BUTTONS && (
              <button
                type="button"
                onClick={() =>
                  updateCard(i, {
                    buttons: [...(card.buttons || []), { type: "web_url", title: "", url: "" }],
                  })
                }
                className="flex items-center gap-1 text-xs font-medium text-[oklch(0.52_0.19_162)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add button ({(card.buttons || []).length}/{MAX_BUTTONS})
              </button>
            )}
          </div>
        </div>
      ))}
      {cards.length < MAX_CAROUSEL_CARDS && (
        <button
          type="button"
          onClick={() =>
            onChange(block.id, {
              elements: [...cards, { title: "", buttons: [] }],
            })
          }
          className="flex items-center gap-1 text-xs font-medium text-[oklch(0.52_0.19_162)] hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Add card
        </button>
      )}
    </div>
  );
}
