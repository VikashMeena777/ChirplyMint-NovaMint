"use client";

import { MessageCircle } from "lucide-react";

interface DMPreviewProps {
  senderUsername: string;
  senderAvatar?: string;
  templateType: "text" | "button";
  messageText: string;
  templateTitle?: string;
  templateSubtitle?: string;
  templateImageUrl?: string;
  templateButtons?: Array<{
    type: string;
    title: string;
    url?: string;
    payload?: string;
  }>;
}

export function DMPreview({
  senderUsername,
  senderAvatar,
  templateType,
  messageText,
  templateTitle,
  templateSubtitle,
  templateImageUrl,
  templateButtons = [],
}: DMPreviewProps) {
  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const displayMessage =
    messageText
      ?.replace(/\{name\}/g, "Alex")
      .replace(/\{keyword\}/g, "INFO") || "Your message will appear here…";

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        📱 Live DM Preview
      </label>

      <div className="relative mx-auto w-full max-w-[300px]">
        {/* iPhone Frame */}
        <div className="rounded-[28px] border-2 border-zinc-700 bg-black overflow-hidden shadow-2xl">
          {/* Status Bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1 bg-black">
            <span className="text-[10px] font-semibold text-white">
              {now.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <div className="flex items-center gap-1">
              <div className="flex gap-[2px]">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-sm bg-white"
                    style={{ height: `${6 + i * 2}px` }}
                  />
                ))}
              </div>
              <svg
                className="w-4 h-4 text-white ml-1"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="1" y="6" width="20" height="12" rx="2" />
                <rect x="22" y="9" width="2" height="6" rx="1" />
              </svg>
            </div>
          </div>

          {/* Chat Header */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
            <button className="text-blue-400 text-sm">‹</button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shrink-0 overflow-hidden">
              {senderAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={senderAvatar}
                  alt={senderUsername}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xs font-bold">
                  {(senderUsername || "C")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {senderUsername || "chirplymint"}
              </p>
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

          {/* Chat Body */}
          <div className="bg-black min-h-[260px] max-h-[320px] overflow-y-auto px-3 py-4 space-y-3">
            {/* Incoming comment context */}
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-blue-600 rounded-2xl rounded-br-md px-3.5 py-2">
                <p className="text-white text-xs leading-relaxed">
                  INFO 🙋
                </p>
              </div>
            </div>

            {/* Sender's DM response */}
            {templateType === "text" ? (
              <div className="flex gap-2 items-end">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 shrink-0 flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">
                    {(senderUsername || "C")[0].toUpperCase()}
                  </span>
                </div>
                <div className="max-w-[80%]">
                  <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-3.5 py-2.5">
                    <p className="text-white text-xs leading-relaxed whitespace-pre-wrap">
                      {displayMessage}
                    </p>
                  </div>
                  <p className="text-zinc-600 text-[9px] mt-1 ml-1">
                    {timeString}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 items-end">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 shrink-0 flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">
                    {(senderUsername || "C")[0].toUpperCase()}
                  </span>
                </div>
                <div className="max-w-[85%]">
                  {/* Button Template Card */}
                  <div className="rounded-2xl rounded-bl-md overflow-hidden border border-zinc-700 bg-zinc-800">
                    {templateImageUrl && (
                      <div className="h-28 bg-zinc-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={templateImageUrl}
                          alt="Template"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-white text-xs font-semibold">
                        {templateTitle || "Card Title"}
                      </p>
                      {templateSubtitle && (
                        <p className="text-zinc-400 text-[10px] mt-0.5">
                          {templateSubtitle}
                        </p>
                      )}
                    </div>
                    {templateButtons.length > 0 && (
                      <div className="border-t border-zinc-700">
                        {templateButtons.map((btn, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-blue-400 border-b border-zinc-700 last:border-b-0"
                          >
                            {btn.title || "Button"}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-zinc-600 text-[9px] mt-1 ml-1">
                    {timeString}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900 border-t border-zinc-800">
            <div className="flex-1 h-8 rounded-full bg-zinc-800 border border-zinc-700 px-3 flex items-center">
              <span className="text-zinc-600 text-xs">Message…</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
              <MessageCircle className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Home Indicator */}
          <div className="flex justify-center py-2 bg-black">
            <div className="w-28 h-1 rounded-full bg-zinc-700" />
          </div>
        </div>
      </div>
    </div>
  );
}
