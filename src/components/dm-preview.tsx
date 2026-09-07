"use client";

import { MessageCircle, FileText, Images, MousePointerClick, Share2, Heart } from "lucide-react";
import type { MessageBlockForm } from "@/app/(app)/dashboard/automations/automation-types";

/**
 * Live DM Preview — a phone-style chat that renders EXACTLY what the lead
 * will receive, block by block, updating live while composing. Supports
 * every message type including Message Stacks.
 */

interface PreviewButton {
  type: string;
  title: string;
  url?: string;
  payload?: string;
}

interface DMPreviewProps {
  senderUsername: string;
  senderAvatar?: string;
  /** Universal: the ordered blocks the lead will receive */
  blocks: MessageBlockForm[];
  /** The keyword the lead commented (shows as their blue message) */
  triggerKeyword?: string;
}

function fillVars(text: string | undefined): string {
  if (!text) return "";
  return text.replace(/\{name\}/gi, "Alex").replace(/\{keyword\}/gi, "INFO");
}

export function DMPreview({ senderUsername, senderAvatar, blocks, triggerKeyword }: DMPreviewProps) {
  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const initial = (senderUsername || "C")[0].toUpperCase();

  const hasContent = blocks.length > 0;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        📱 Live DM Preview — exactly what they&apos;ll get
      </label>

      <div className="relative mx-auto w-full max-w-[300px]">
        <div className="rounded-[28px] border-2 border-zinc-700 bg-black overflow-hidden shadow-2xl">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1 bg-black">
            <span className="text-[10px] font-semibold text-white">
              {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
            <div className="flex items-center gap-1">
              <div className="flex gap-[2px]">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-[3px] rounded-sm bg-white" style={{ height: `${6 + i * 2}px` }} />
                ))}
              </div>
              <svg className="w-4 h-4 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                <rect x="1" y="6" width="20" height="12" rx="2" />
                <rect x="22" y="9" width="2" height="6" rx="1" />
              </svg>
            </div>
          </div>

          {/* Chat header */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
            <button className="text-blue-400 text-sm">‹</button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shrink-0 overflow-hidden">
              {senderAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={senderAvatar} alt={senderUsername} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">{initial}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{senderUsername || "your_brand"}</p>
              <p className="text-zinc-500 text-[10px]">Instagram</p>
            </div>
            <div className="flex items-center gap-3 text-blue-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" />
              </svg>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
              </svg>
            </div>
          </div>

          {/* Chat body */}
          <div className="bg-black min-h-[280px] max-h-[420px] overflow-y-auto px-3 py-4 space-y-3">
            {/* Lead's comment bubble */}
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-blue-600 rounded-2xl rounded-br-md px-3.5 py-2">
                <p className="text-white text-xs leading-relaxed">
                  {triggerKeyword || "INFO"} 🙋
                </p>
              </div>
            </div>

            {!hasContent && (
              <div className="flex justify-center py-6">
                <p className="text-zinc-600 text-[11px] text-center px-4">
                  Start composing — messages appear here live
                </p>
              </div>
            )}

            {/* Each block = one chat bubble, in delivery order */}
            {blocks.map((block) => {
              const avatar = (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 shrink-0 flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">{initial}</span>
                </div>
              );

              /* ── TEXT ── */
              if (block.type === "text" && fillVars(block.text)) {
                return (
                  <div key={block.id} className="flex gap-2 items-end">
                    {avatar}
                    <div className="max-w-[80%]">
                      <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                        <p className="text-white text-xs leading-relaxed whitespace-pre-wrap">{fillVars(block.text)}</p>
                      </div>
                      <p className="text-zinc-600 text-[9px] mt-1 ml-1">{timeString}</p>
                    </div>
                  </div>
                );
              }

              /* ── IMAGE ALBUM ── */
              if (block.type === "image_album") {
                const urls = (block.image_urls || []).filter((u) => u.trim());
                if (urls.length === 0) {
                  return (
                    <div key={block.id} className="flex gap-2 items-end">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 shrink-0 flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">{initial}</span>
                      </div>
                      <div className="max-w-[85%]">
                        <div className="rounded-2xl rounded-bl-md border border-dashed border-zinc-600 bg-zinc-900 p-4 flex items-center gap-2">
                          <Images className="w-4 h-4 text-zinc-600" />
                          <p className="text-zinc-500 text-[10px]">Album — add image URLs to preview</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={block.id} className="flex gap-2 items-end">
                    {avatar}
                    <div className="max-w-[85%]">
                      <div className="rounded-2xl rounded-bl-md overflow-hidden border border-zinc-700 bg-zinc-800 p-1.5">
                        <div className={`grid gap-1 ${urls.length === 1 ? "grid-cols-1" : urls.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
                          {urls.slice(0, 4).map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={url}
                              alt={`Album ${i + 1}`}
                              className={`w-full rounded-md object-cover bg-zinc-700 ${urls.length === 1 ? "h-32" : "h-16"}`}
                              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.25"; }}
                            />
                          ))}
                        </div>
                        {urls.length > 4 && (
                          <p className="text-zinc-400 text-[9px] text-center pt-1">+{urls.length - 4} more</p>
                        )}
                        {fillVars(block.text) && (
                          <p className="text-white text-[11px] leading-relaxed px-1.5 pt-1.5 pb-0.5">{fillVars(block.text)}</p>
                        )}
                      </div>
                      <p className="text-zinc-600 text-[9px] mt-1 ml-1 flex items-center gap-1">
                        <Images className="w-2.5 h-2.5" /> album · {urls.length} image{urls.length === 1 ? "" : "s"} {timeString}
                      </p>
                    </div>
                  </div>
                );
              }

              /* ── PDF ── */
              if (block.type === "pdf" && !block.file_url) {
                return (
                  <div key={block.id} className="flex gap-2 items-end">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 shrink-0 flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">{initial}</span>
                    </div>
                    <div className="max-w-[85%]">
                      <div className="rounded-2xl rounded-bl-md border border-dashed border-zinc-600 bg-zinc-900 p-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-600" />
                        <p className="text-zinc-500 text-[10px]">PDF — add the file URL to preview</p>
                      </div>
                    </div>
                  </div>
                );
              }
              if (block.type === "pdf" && block.file_url) {
                const isLink = block.pdf_mode === "link_button";
                return (
                  <div key={block.id} className="flex gap-2 items-end">
                    {avatar}
                    <div className="max-w-[85%]">
                      {isLink ? (
                        <div className="rounded-2xl rounded-bl-md overflow-hidden border border-zinc-700 bg-zinc-800">
                          <div className="p-2.5 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-red-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-[11px] font-semibold truncate">
                                {fillVars(block.text) || "Your file is ready"}
                              </p>
                              <p className="text-zinc-500 text-[9px] truncate">Tap below to open it</p>
                            </div>
                          </div>
                          <div className="border-t border-zinc-700 py-2 text-center text-[11px] font-semibold text-blue-400">
                            Open PDF →
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl rounded-bl-md bg-zinc-800 border border-zinc-700 p-3 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-red-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-[11px] font-semibold truncate">Invoice.pdf</p>
                            <p className="text-zinc-500 text-[9px]">PDF file · in-chat</p>
                          </div>
                        </div>
                      )}
                      <p className="text-zinc-600 text-[9px] mt-1 ml-1">
                        {isLink ? "clean link — no warning screen" : "in-chat file"} · {timeString}
                      </p>
                    </div>
                  </div>
                );
              }

              /* ── BUTTON CARD ── */
              if (block.type === "button_card" && (fillVars(block.text) || (block.buttons || []).length > 0)) {
                return (
                  <div key={block.id} className="flex gap-2 items-end">
                    {avatar}
                    <div className="max-w-[85%]">
                      <div className="rounded-2xl rounded-bl-md overflow-hidden border border-zinc-700 bg-zinc-800">
                        {block.image_url && (
                          <div className="h-24 bg-zinc-700">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={block.image_url}
                              alt="Card"
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-white text-xs font-semibold">{fillVars(block.text) || "Card title"}</p>
                          {block.subtitle && <p className="text-zinc-400 text-[10px] mt-0.5">{fillVars(block.subtitle)}</p>}
                        </div>
                        {(block.buttons || []).length > 0 && (
                          <div className="border-t border-zinc-700">
                            {block.buttons!.map((btn, i) => (
                              <div key={i} className="flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-blue-400 border-b border-zinc-700 last:border-b-0">
                                <MousePointerClick className="w-3 h-3" />
                                {btn.title || "Button"}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-zinc-600 text-[9px] mt-1 ml-1">{timeString}</p>
                    </div>
                  </div>
                );
              }

              /* ── QUICK REPLIES ── */
              if (block.type === "quick_replies" && (block.quick_replies || []).length > 0) {
                return (
                  <div key={block.id} className="flex gap-2 items-end">
                    {avatar}
                    <div className="max-w-[85%]">
                      <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                        <p className="text-white text-xs leading-relaxed whitespace-pre-wrap">
                          {fillVars(block.text) || "Choose an option:"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {block.quick_replies!.map((qr, i) => (
                          <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full border border-blue-400/60 text-blue-300 text-[10px] font-medium">
                            {qr.content_type === "user_email" && "📧 "}
                            {qr.content_type === "user_phone_number" && "📱 "}
                            {qr.title || "Option"}
                          </span>
                        ))}
                      </div>
                      <p className="text-zinc-600 text-[9px] mt-1 ml-1">{timeString}</p>
                    </div>
                  </div>
                );
              }

              /* ── CAROUSEL ── */
              if (block.type === "carousel" && (block.elements || []).length > 0) {
                return (
                  <div key={block.id} className="flex gap-2 items-end">
                    {avatar}
                    <div className="max-w-[90%]">
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {block.elements!.slice(0, 3).map((card, i) => (
                          <div key={i} className="w-24 shrink-0 rounded-xl border border-zinc-700 bg-zinc-800 overflow-hidden">
                            {card.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={card.image_url} alt={card.title} className="w-full h-14 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <div className="w-full h-14 bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                                <Share2 className="w-4 h-4 text-zinc-600" />
                              </div>
                            )}
                            <div className="p-1.5">
                              <p className="text-white text-[9px] font-semibold leading-tight">{card.title || "Card"}</p>
                              {(card.buttons || []).length > 0 && (
                                <p className="text-blue-400 text-[8px] font-semibold mt-1 text-center border-t border-zinc-700 pt-1">
                                  {card.buttons![0].title || "Button"}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-zinc-600 text-[9px] mt-1 ml-1">
                        carousel · swipeable {timeString}
                      </p>
                    </div>
                  </div>
                );
              }

              /* ── MEDIA SHARE ── */
              if (block.type === "media_share" && block.media_id) {
                return (
                  <div key={block.id} className="flex gap-2 items-end">
                    {avatar}
                    <div className="max-w-[85%]">
                      <div className="rounded-2xl rounded-bl-md bg-zinc-800 border border-zinc-700 p-3 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center shrink-0">
                          <Share2 className="w-4 h-4 text-pink-400" />
                        </div>
                        <div>
                          <p className="text-white text-[11px] font-semibold">Shared post</p>
                          <p className="text-zinc-500 text-[9px]">Your Instagram post, in the chat</p>
                        </div>
                      </div>
                      <p className="text-zinc-600 text-[9px] mt-1 ml-1">{timeString}</p>
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* Auto-react hint */}
            {blocks.length > 0 && (
              <div className="flex justify-center pt-1">
                <span className="inline-flex items-center gap-1 text-zinc-600 text-[9px]">
                  <Heart className="w-2.5 h-2.5 text-red-400/60" />
                  delivered instantly · typing indicator on
                </span>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900 border-t border-zinc-800">
            <div className="flex-1 h-8 rounded-full bg-zinc-800 border border-zinc-700 px-3 flex items-center">
              <span className="text-zinc-600 text-xs">Message…</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
              <MessageCircle className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center py-2 bg-black">
            <div className="w-28 h-1 rounded-full bg-zinc-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
