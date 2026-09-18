"use client";

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";

/**
 * Presentational only — the decision (is this an embedded browser, and is
 * there a Chrome hand-off) is made server-side in the layout so there is no
 * flash of the wrong state. See lib/utils/in-app-browser.ts.
 */
export function InAppBrowserNotice({
  host,
  chromeIntent,
}: {
  host: string;
  chromeIntent: string | null;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md">
      <div className="relative rounded-xl border border-amber-500/40 bg-card shadow-lg p-4 pr-10">
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">
            You&apos;re viewing this inside an app
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This browser is separate from Chrome or Safari, so signing in here won&apos;t sign you in
            on your phone. To keep using ChirplyMint on mobile, open{" "}
            <span className="font-medium text-foreground">{host}</span> in your normal browser.
          </p>
          {chromeIntent ? (
            <a
              href={chromeIntent}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[oklch(0.52_0.19_162)] hover:underline"
            >
              Open in Chrome <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">
              Tap the <span className="font-medium text-foreground">⋯</span> menu in the corner and
              choose <span className="font-medium text-foreground">Open in browser</span>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
