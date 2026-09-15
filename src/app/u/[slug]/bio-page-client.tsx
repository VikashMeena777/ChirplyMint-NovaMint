"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { trackBioLinkClick, type BioPage, type BioLink } from "@/lib/actions/bio";
import { ArrowUpRight, Share2, Check } from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   ChirplyMint Link-in-Bio — redesigned on 2026 market research
   (Linktree / Beacons / Bio.link / Campsite, from their served CSS):

   • Anatomy: header (avatar → name → one-liner) → FEATURED first link
     (bigger, accent-filled, the only animated element) → supporting
     link cards → quiet footer. Top link gets the clicks — the first
     screen carries everything.
   • Motion: ONE 1.2s fade-up entrance (bio.link's exact curve),
     ≤200ms tap feedback, a slow shine only on the featured CTA.
     Nothing loops page-wide — battery + taste.
   • Surfaces: solid cards with soft shadows, no glass/blur (reads
     2021-template). Tap targets ≥56px, 16px base text.
   • Themes: a ~15-variable token system per theme — background,
     text, card, border, muted — each visually distinct, all muted
     and tonal so the CREATOR's accent + avatar are the loud elements.
   • Instagram in-app browser: SSR page, no login/cookies needed,
     safe-area insets top+bottom, -webkit-text-size-adjust: 100%.
   ────────────────────────────────────────────────────────────── */

// ─── Theme tokens (Campsite-style variable model) ───────────

interface BioTheme {
  /** page background (base + optional tonal wash) */
  bg: string;
  /** primary text */
  text: string;
  /** secondary text (bio, footer) */
  muted: string;
  /** link-card background — SOLID, not glass */
  card: string;
  /** card border */
  border: string;
  /** card border on hover/press */
  borderActive: string;
  /** soft shadow under cards */
  shadow: string;
  /** footer/branding color */
  footer: string;
  /** swatch for the builder picker */
  swatch: [string, string];
}

const THEMES: Record<string, BioTheme> = {
  midnight: {
    bg: "linear-gradient(180deg, #0b0b16 0%, #12122a 100%)",
    text: "#f4f4f8",
    muted: "rgba(244,244,248,0.62)",
    card: "#1a1a30",
    border: "rgba(255,255,255,0.07)",
    borderActive: "rgba(255,255,255,0.16)",
    shadow: "0 1px 2px rgba(0,0,0,0.4)",
    footer: "rgba(244,244,248,0.34)",
    swatch: ["#0b0b16", "#1a1a30"],
  },
  ocean: {
    bg: "linear-gradient(180deg, #071a2e 0%, #0a2942 100%)",
    text: "#eef6fb",
    muted: "rgba(238,246,251,0.62)",
    card: "#0f3050",
    border: "rgba(255,255,255,0.08)",
    borderActive: "rgba(255,255,255,0.18)",
    shadow: "0 1px 2px rgba(0,0,0,0.35)",
    footer: "rgba(238,246,251,0.34)",
    swatch: ["#071a2e", "#0f3050"],
  },
  forest: {
    bg: "linear-gradient(180deg, #0a1710 0%, #10271a 100%)",
    text: "#eef6f0",
    muted: "rgba(238,246,240,0.6)",
    card: "#16301f",
    border: "rgba(255,255,255,0.07)",
    borderActive: "rgba(255,255,255,0.16)",
    shadow: "0 1px 2px rgba(0,0,0,0.35)",
    footer: "rgba(238,246,240,0.34)",
    swatch: ["#0a1710", "#16301f"],
  },
  sunset: {
    bg: "linear-gradient(180deg, #221226 0%, #331b2e 100%)",
    text: "#faf3f6",
    muted: "rgba(250,243,246,0.6)",
    card: "#3d2338",
    border: "rgba(255,255,255,0.08)",
    borderActive: "rgba(255,255,255,0.16)",
    shadow: "0 1px 2px rgba(0,0,0,0.35)",
    footer: "rgba(250,243,246,0.34)",
    swatch: ["#221226", "#3d2338"],
  },
  noir: {
    bg: "linear-gradient(180deg, #08080a 0%, #111114 100%)",
    text: "#f5f5f6",
    muted: "rgba(245,245,246,0.55)",
    card: "#16161a",
    border: "rgba(255,255,255,0.06)",
    borderActive: "rgba(255,255,255,0.14)",
    shadow: "0 1px 2px rgba(0,0,0,0.5)",
    footer: "rgba(245,245,246,0.3)",
    swatch: ["#08080a", "#16161a"],
  },
  ember: {
    bg: "linear-gradient(180deg, #1c0e08 0%, #2e150b 100%)",
    text: "#fbf3ee",
    muted: "rgba(251,243,238,0.6)",
    card: "#3a1c10",
    border: "rgba(255,190,140,0.1)",
    borderActive: "rgba(255,190,140,0.22)",
    shadow: "0 1px 2px rgba(0,0,0,0.4)",
    footer: "rgba(251,243,238,0.32)",
    swatch: ["#1c0e08", "#3a1c10"],
  },
  sand: {
    bg: "linear-gradient(180deg, #f6f1e9 0%, #ede5d8 100%)",
    text: "#2b241a",
    muted: "rgba(43,36,26,0.58)",
    card: "#fffdf9",
    border: "rgba(43,36,26,0.09)",
    borderActive: "rgba(43,36,26,0.2)",
    shadow: "0 1px 3px rgba(43,36,26,0.07)",
    footer: "rgba(43,36,26,0.36)",
    swatch: ["#f6f1e9", "#fffdf9"],
  },
  rose: {
    bg: "linear-gradient(180deg, #f9eef0 0%, #f0dde1 100%)",
    text: "#2e1a20",
    muted: "rgba(46,26,32,0.58)",
    card: "#fef8f9",
    border: "rgba(46,26,32,0.09)",
    borderActive: "rgba(46,26,32,0.2)",
    shadow: "0 1px 3px rgba(46,26,32,0.06)",
    footer: "rgba(46,26,32,0.36)",
    swatch: ["#f9eef0", "#fef8f9"],
  },
  mono: {
    bg: "#ffffff",
    text: "#000000",
    muted: "rgba(0,0,0,0.55)",
    card: "#ffffff",
    border: "rgba(0,0,0,0.22)",
    borderActive: "rgba(0,0,0,0.45)",
    shadow: "3px 3px 0 rgba(0,0,0,1)",
    footer: "rgba(0,0,0,0.4)",
    swatch: ["#ffffff", "#000000"],
  },
  sky: {
    bg: "linear-gradient(180deg, #e8f1f8 0%, #d9e8f3 100%)",
    text: "#122432",
    muted: "rgba(18,36,50,0.58)",
    card: "#f8fbfe",
    border: "rgba(18,36,50,0.09)",
    borderActive: "rgba(18,36,50,0.2)",
    shadow: "0 1px 3px rgba(18,36,50,0.06)",
    footer: "rgba(18,36,50,0.36)",
    swatch: ["#e8f1f8", "#f8fbfe"],
  },
  snow: {
    bg: "linear-gradient(180deg, #fafafa 0%, #f0f1f3 100%)",
    text: "#17181c",
    muted: "rgba(23,24,28,0.58)",
    card: "#ffffff",
    border: "rgba(23,24,28,0.08)",
    borderActive: "rgba(23,24,28,0.18)",
    shadow: "0 1px 3px rgba(23,24,28,0.07)",
    footer: "rgba(23,24,28,0.36)",
    swatch: ["#fafafa", "#ffffff"],
  },
  lavender: {
    bg: "linear-gradient(180deg, #f2edf7 0%, #e6def0 100%)",
    text: "#221a2e",
    muted: "rgba(34,26,46,0.58)",
    card: "#fdfbff",
    border: "rgba(34,26,46,0.09)",
    borderActive: "rgba(34,26,46,0.18)",
    shadow: "0 1px 3px rgba(34,26,46,0.06)",
    footer: "rgba(34,26,46,0.36)",
    swatch: ["#f2edf7", "#fdfbff"],
  },
};

// ─── Fonts (kept from the builder's picker) ─────────────────

const FONT_MAP: Record<string, string> = {
  inter: "'Inter', sans-serif",
  poppins: "'Poppins', sans-serif",
  outfit: "'Outfit', sans-serif",
  "dm-sans": "'DM Sans', sans-serif",
  "space-grotesk": "'Space Grotesk', sans-serif",
  "plus-jakarta": "'Plus Jakarta Sans', sans-serif",
  sora: "'Sora', sans-serif",
  manrope: "'Manrope', sans-serif",
  "playfair-display": "'Playfair Display', serif",
  lora: "'Lora', serif",
  "bebas-neue": "'Bebas Neue', sans-serif",
  caveat: "'Caveat', cursive",
};

// Google Fonts family per key — the page must LOAD the font for the
// font-family to actually apply (it silently fell back to the system
// default before, which is why custom fonts never showed).
const FONT_GOOGLE: Record<string, string> = {
  inter: "Inter:wght@400;600;700;800",
  poppins: "Poppins:wght@400;600;700;800",
  outfit: "Outfit:wght@400;600;700;800",
  "dm-sans": "DM+Sans:wght@400;600;700;800",
  "space-grotesk": "Space+Grotesk:wght@400;600;700",
  "plus-jakarta": "Plus+Jakarta+Sans:wght@400;600;700;800",
  sora: "Sora:wght@400;600;700;800",
  manrope: "Manrope:wght@400;600;700;800",
  "playfair-display": "Playfair+Display:wght@400;600;700;800",
  lora: "Lora:wght@400;600;700",
  "bebas-neue": "Bebas+Neue",
  caveat: "Caveat:wght@400;700",
};

const RADIUS_MAP: Record<string, string> = {
  sharp: "8px",
  rounded: "16px",
  pill: "9999px",
};

// bio.link's production entrance curve — slow, soft, fires once
const ENTRANCE = {
  initial: { opacity: 0, y: 44 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1.2, ease: [0.2, 0.75, 0.28, 0.9] as const },
};

export default function BioPageClient({ page, links }: { page: BioPage; links: BioLink[] }) {
  const [clickedLinks, setClickedLinks] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const reduceMotion = useReducedMotion();

  const theme = THEMES[page.theme] || THEMES.midnight;
  const accent = page.accent_color || "#8b5cf6";
  const fontFamily = page.custom_font ? FONT_MAP[page.custom_font] : undefined;
  const radius = RADIUS_MAP[page.card_border_radius] || "16px";
  const cardOpacity = page.card_opacity ?? 100;

  // load the chosen font from Google Fonts (display=swap so text renders
  // immediately in the fallback and swaps in)
  useEffect(() => {
    if (!page.custom_font || !FONT_GOOGLE[page.custom_font]) return;
    const id = "cm-bio-font";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${FONT_GOOGLE[page.custom_font]}&display=swap`;
    return () => {
      link?.remove();
    };
  }, [page.custom_font]);

  const [featured, ...rest] = links;
  const entrance = reduceMotion ? { initial: false, animate: undefined } : ENTRANCE;

  async function handleLinkClick(link: BioLink) {
    if (!clickedLinks.has(link.id)) {
      setClickedLinks((prev) => new Set([...prev, link.id]));
      const cmkLead = new URLSearchParams(window.location.search).get("cmk_lead") || undefined;
      trackBioLinkClick(link.id, page.id, cmkLead).catch(() => {});
    }
    window.open(link.url, "_blank", "noopener,noreferrer");
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // in-app browsers can block clipboard — the link is in the address bar anyway
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{
        background: theme.bg,
        color: theme.text,
        fontFamily,
        WebkitTextSizeAdjust: "100%",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      {/* accent wash — tonal, one colour, top-anchored */}
      <div
        aria-hidden
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[560px] h-[340px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(closest-side, ${accent}26, transparent)` }}
      />

      <div
        className="relative z-10 w-full max-w-md mx-auto px-5 flex flex-col items-center"
        style={{ paddingTop: "clamp(40px, 9vh, 72px)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 48px)" }}
      >
        {/* ── Header ── */}
        <motion.div className="flex flex-col items-center text-center" {...entrance}>
          <div
            className="w-[88px] h-[88px] rounded-full flex items-center justify-center overflow-hidden text-[32px] font-bold"
            style={{
              border: `3px solid ${accent}`,
              background: `${accent}1e`,
              boxShadow: `0 8px 28px -8px ${accent}55`,
            }}
          >
            {page.show_avatar && page.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote creator URLs; next/image would need per-domain config
              <img src={page.avatar_url} alt={page.display_name || page.slug} className="w-full h-full object-cover" />
            ) : (
              (page.display_name || page.slug).charAt(0).toUpperCase()
            )}
          </div>

          <h1 className="mt-4 text-[22px] font-bold tracking-tight leading-snug">
            {page.display_name || page.slug}
          </h1>
          {page.bio && (
            <p className="mt-1.5 text-[15px] leading-relaxed max-w-[300px]" style={{ color: theme.muted }}>
              {page.bio}
            </p>
          )}

          <button
            onClick={handleShare}
            aria-label="Copy link to this page"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors duration-200"
            style={{ borderColor: theme.borderActive, color: theme.muted }}
          >
            {copied ? <Check className="size-3" /> : <Share2 className="size-3" />}
            {copied ? "Link copied" : "Share"}
          </button>
        </motion.div>

        {/* ── Featured link (the first one — gets the clicks) ── */}
        {featured && (
          <motion.button
            onClick={() => handleLinkClick(featured)}
            className="group relative mt-8 w-full overflow-hidden"
            style={{ borderRadius: radius }}
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.2, 0.75, 0.28, 0.9] }}
            whileTap={{ scale: 0.975 }}
          >
            {/* accent-filled surface — the ONE loud element on the page */}
            <span
              className="flex w-full items-center gap-3.5 px-5 text-left"
              style={{
                minHeight: 64,
                background: accent,
                color: "#fff",
                borderRadius: radius,
                boxShadow: `0 10px 30px -10px ${accent}aa`,
              }}
            >
              <span className="text-[22px]">{featured.emoji}</span>
              <span className="flex-1 text-[16px] font-bold tracking-tight">{featured.title}</span>
              <ArrowUpRight
                className="size-5 opacity-80 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </span>
            {/* slow shine sweep — featured CTA only */}
            {!reduceMotion && (
              <span
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: radius,
                  background:
                    "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.18) 48%, transparent 62%)",
                  backgroundSize: "250% 100%",
                  animation: "cm-bio-shine 4.5s ease-in-out infinite",
                }}
              />
            )}
          </motion.button>
        )}

        {/* ── Supporting links ── */}
        <div className="w-full mt-3.5 flex flex-col gap-3">
          {rest.map((link, i) => (
            <motion.button
              key={link.id}
              onClick={() => handleLinkClick(link)}
              className="group w-full flex items-center gap-3.5 px-5 text-left"
              style={{
                minHeight: 60,
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: radius,
                boxShadow: theme.shadow,
                opacity: (cardOpacity / 100) * (clickedLinks.has(link.id) ? 0.75 : 1),
                transition: "border-color 0.2s ease, opacity 0.3s ease",
              }}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: cardOpacity / 100, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 + i * 0.09, ease: [0.2, 0.75, 0.28, 0.9] }}
              whileHover={{ borderColor: theme.borderActive }}
              whileTap={{ scale: 0.985 }}
            >
              <span className="text-[19px]">{link.emoji}</span>
              <span className="flex-1 text-[15.5px] font-semibold tracking-tight">{link.title}</span>
              <ArrowUpRight
                className="size-4.5 opacity-35 transition-all duration-200 group-hover:opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </motion.button>
          ))}
        </div>

        {links.length === 0 && (
          <div className="mt-10 text-center" style={{ color: theme.muted }}>
            <p className="text-[15px]">No links yet — check back soon</p>
          </div>
        )}

        {/* ── Footer: quiet, low-contrast ── */}
        {!page.hide_branding && (
          <motion.div
            className="mt-14"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <a
              href="/"
              className="text-[11px] font-medium tracking-wide transition-opacity duration-200 hover:opacity-70"
              style={{ color: theme.footer }}
            >
              ✦ Powered by ChirplyMint
            </a>
          </motion.div>
        )}
      </div>

      {/* shine keyframes — scoped to this page via a style tag (bio pages
          don't share the app's global stylesheet scope) */}
      <style>{`
        @keyframes cm-bio-shine {
          0% { background-position: 200% 0; }
          55% { background-position: -60% 0; }
          100% { background-position: -60% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cm-bio-shine, [style*="cm-bio-shine"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
