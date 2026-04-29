"use client";

import { useState } from "react";
import { trackBioLinkClick, type BioPage, type BioLink } from "@/lib/actions/bio";
import { ExternalLink } from "lucide-react";

// ─── Theme Styles ────────────────────────────────────────

const THEME_STYLES: Record<string, { bg: string; textClass: string; cardBg: string }> = {
  midnight: {
    bg: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)",
    textClass: "text-white",
    cardBg: "rgba(255,255,255,0.06)",
  },
  ocean: {
    bg: "linear-gradient(135deg, #0c1445 0%, #1a3a6c 50%, #0c2a5c 100%)",
    textClass: "text-white",
    cardBg: "rgba(255,255,255,0.08)",
  },
  forest: {
    bg: "linear-gradient(135deg, #0a1f0a 0%, #1a3d1a 50%, #0a2f0a 100%)",
    textClass: "text-white",
    cardBg: "rgba(255,255,255,0.06)",
  },
  sunset: {
    bg: "linear-gradient(135deg, #2d1b42 0%, #441a2a 50%, #2d1b42 100%)",
    textClass: "text-white",
    cardBg: "rgba(255,255,255,0.06)",
  },
  snow: {
    bg: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #f8f9fa 100%)",
    textClass: "text-gray-900",
    cardBg: "rgba(0,0,0,0.04)",
  },
  lavender: {
    bg: "linear-gradient(135deg, #e8e0f0 0%, #d4c5e8 50%, #e8e0f0 100%)",
    textClass: "text-gray-900",
    cardBg: "rgba(0,0,0,0.04)",
  },
};

export default function BioPageClient({ page, links }: { page: BioPage; links: BioLink[] }) {
  const [clickedLinks, setClickedLinks] = useState<Set<string>>(new Set());

  const theme = THEME_STYLES[page.theme] || THEME_STYLES.midnight;
  const accent = page.accent_color || "#8b5cf6";

  async function handleLinkClick(link: BioLink) {
    if (!clickedLinks.has(link.id)) {
      setClickedLinks(prev => new Set([...prev, link.id]));
      trackBioLinkClick(link.id, page.id).catch(() => {});
    }
    window.open(link.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className={`min-h-screen flex flex-col items-center ${theme.textClass}`}
      style={{ background: theme.bg }}
    >
      {/* Decorative glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-20 pointer-events-none"
        style={{ backgroundColor: accent }}
      />

      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-12 flex flex-col items-center">
        {/* Avatar */}
        <div
          className="w-24 h-24 rounded-full border-[3px] flex items-center justify-center text-4xl font-bold mb-4 shadow-lg"
          style={{
            borderColor: accent,
            backgroundColor: accent + "22",
            boxShadow: `0 0 40px ${accent}30`,
          }}
        >
          {(page.display_name || page.slug).charAt(0).toUpperCase()}
        </div>

        {/* Name & Bio */}
        <h1 className="text-xl font-bold tracking-tight">{page.display_name || page.slug}</h1>
        {page.bio && (
          <p className="text-sm opacity-70 mt-1.5 text-center max-w-xs leading-relaxed">
            {page.bio}
          </p>
        )}

        {/* Links */}
        <div className="w-full mt-8 space-y-3">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link)}
              className="group w-full py-3.5 px-5 rounded-xl text-sm font-medium flex items-center gap-3 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                backgroundColor: theme.cardBg,
                border: `1.5px solid ${accent}44`,
                boxShadow: `0 2px 12px ${accent}10`,
              }}
            >
              <span className="text-lg">{link.emoji}</span>
              <span className="flex-1 text-left">{link.title}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70 transition-opacity" />
            </button>
          ))}
        </div>

        {links.length === 0 && (
          <div className="mt-8 text-center opacity-50">
            <p className="text-sm">No links available yet</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 opacity-30 text-center">
          <a
            href="/"
            className="text-[11px] hover:opacity-70 transition-opacity"
          >
            Powered by ChirplyMint ✨
          </a>
        </div>
      </div>
    </div>
  );
}
