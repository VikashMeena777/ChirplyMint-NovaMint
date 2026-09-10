"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  MessageCircle, Zap, Bot, BarChart3, Shield, Clock, ArrowRight, Check,
  Link2, Sparkles, Send, Users, ChevronRight, Star, UserCheck,
  MousePointerClick, Bell, TrendingUp, Heart, Play, Pause, Quote,
  BadgeCheck, Plus, Minus,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { InstagramIcon } from "@/components/marketing/brand-icons";
import { LiveActivityFeed } from "@/components/marketing/live-activity-feed";
import { getLiveFeedItems } from "@/lib/actions/live-feed";
import { getPlanDisplayData } from "@/lib/utils/plan-limits";
import SmoothScroll from "@/components/motion/smooth-scroll";
import Reveal from "@/components/motion/reveal";
import Magnetic from "@/components/motion/magnetic";
import CountUp from "@/components/motion/count-up";
import SectionHeading from "@/components/motion/section-heading";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ═══════════ HERO ═══════════ */
function Hero() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.to(".hero-orb-a", {
        yPercent: 24, ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(".hero-orb-b", {
        yPercent: -18, ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(".hero-visual", {
        y: -46, ease: "none",
        scrollTrigger: { trigger: ".hero-visual", start: "top 90%", end: "bottom 20%", scrub: true },
      });
    },
    { scope: root }
  );

  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <section ref={root} className="relative overflow-hidden pt-36 pb-16 md:pt-44 md:pb-20">
      {/* backdrop */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 dot-grid opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,black,transparent)]" />
      <div className="hero-orb-a absolute -top-32 left-1/2 -translate-x-1/2 w-[820px] h-[520px] rounded-full bg-mint/15 blur-[140px]" />
      <div className="hero-orb-b absolute top-64 -left-40 w-[420px] h-[420px] rounded-full bg-emerald/10 blur-[120px]" />
      <div className="hero-orb-b absolute top-72 -right-40 w-[420px] h-[420px] rounded-full bg-teal-400/10 blur-[120px]" />

      <div className="relative max-w-6xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease }}
          className="inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full glass mb-7 shadow-sm"
        >
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-mint text-white text-[11px] font-bold">
            <Sparkles className="w-3 h-3 animate-twinkle" /> NEW
          </span>
          <span className="text-[13px] font-medium text-muted-foreground">
            AI Persona Engine is live <span className="text-mint-dark dark:text-mint-light font-semibold">— try it free</span>
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.08, ease }}
          className="text-[2.75rem] leading-[1.04] sm:text-6xl md:text-7xl lg:text-[5.4rem] font-bold tracking-[-0.03em] text-foreground text-balance"
        >
          Turn Comments Into
          <br />
          <span className="text-gradient">Customers on Autopilot</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
          className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6 leading-relaxed text-balance"
        >
          Someone comments <span className="font-mono text-[0.9em] px-1.5 py-0.5 rounded-md bg-mint/10 border border-mint/20 text-mint-dark dark:text-mint-light">“guide”</span> on
          your reel — ChirplyMint instantly DMs them your link, answers questions
          in your voice, and saves the lead. <span className="text-foreground font-semibold">While you sleep.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-9"
        >
          <Magnetic>
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-mint text-white font-semibold text-base btn-shine glow-mint transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Start Free — 2 min setup
              <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </Magnetic>
          <Link
            href="#demo"
            className="group inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl glass font-semibold text-foreground transition-all hover:border-mint/40 hover:shadow-lg"
          >
            <span className="w-7 h-7 rounded-full bg-mint/15 flex items-center justify-center transition-transform group-hover:scale-110">
              <Play className="w-3.5 h-3.5 text-mint-dark dark:text-mint-light fill-current" />
            </span>
            Watch it work
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.8 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[13px] text-muted-foreground"
        >
          <span className="inline-flex items-center gap-2">
            <span className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </span>
            <b className="text-foreground">4.9</b> loved by creators
          </span>
          <span className="hidden sm:inline w-px h-4 bg-border" />
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="w-4 h-4 text-mint" /> 100% Meta Approved API
          </span>
          <span className="hidden sm:inline w-px h-4 bg-border" />
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-mint" /> No credit card needed
          </span>
        </motion.div>

        {/* Visual — DM window mockup */}
        <HeroVisual />
      </div>
    </section>
  );
}

/* ─── Hero DM-window mockup with floating proof cards ─── */
function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="hero-visual relative max-w-3xl mx-auto mt-16 md:mt-20"
    >
      {/* glow under window */}
      <div className="absolute -inset-x-8 top-10 bottom-0 bg-mint/15 blur-[90px] rounded-full pointer-events-none" />
      <div className="relative rounded-2xl glass shadow-2xl shadow-black/10 overflow-hidden text-left">
        {/* window bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/70">
          <span className="w-3 h-3 rounded-full bg-red-400/80" />
          <span className="w-3 h-3 rounded-full bg-amber-400/80" />
          <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-xs text-muted-foreground font-medium">instagram.com — Direct</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Automation live
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-0">
          {/* comment side */}
          <div className="p-5 border-b sm:border-b-0 sm:border-r border-border/70">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">They comment</p>
            <div className="flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center text-white text-xs font-bold shrink-0">S</span>
              <div className="rounded-2xl rounded-tl-md bg-muted/70 px-3.5 py-2.5 text-sm">
                <b>sneha.creates</b> <span className="text-muted-foreground">2m</span>
                <p className="mt-0.5">This is exactly what I needed!! <span className="font-semibold text-mint-dark dark:text-mint-light">guide</span> please 🙏</p>
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Zap className="w-3.5 h-3.5 text-mint" /> Keyword <b className="font-mono">“guide”</b> matched in 0.4s
            </div>
          </div>
          {/* DM side */}
          <div className="p-5 bg-mint/[0.04]">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">They instantly get</p>
            <div className="space-y-2.5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                className="max-w-[92%] rounded-2xl rounded-tl-md bg-gradient-mint text-white px-3.5 py-2.5 text-sm shadow-md"
              >
                Hey Sneha! Here&apos;s the free growth guide 📘👇
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="max-w-[92%] rounded-2xl rounded-tl-md bg-card border border-border px-3.5 py-2.5 text-sm shadow-sm"
              >
                <p className="font-semibold text-[13px] mb-2">Grab the Growth Guide</p>
                <div className="flex gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-mint/15 text-mint-dark dark:text-mint-light text-xs font-semibold">Download 📥</span>
                  <span className="px-3 py-1.5 rounded-lg bg-muted text-xs font-semibold text-muted-foreground">Not now</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* floating cards */}
      <motion.div
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.3, duration: 0.6 }}
        className="absolute -left-4 sm:-left-12 top-16 animate-float-slow"
      >
        <div className="glass rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </span>
          <div>
            <p className="text-xs font-bold">Lead captured</p>
            <p className="text-[11px] text-muted-foreground">@sneha.creates + email</p>
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.55, duration: 0.6 }}
        className="absolute -right-4 sm:-right-12 bottom-10 animate-float-slow [animation-delay:1.4s]"
      >
        <div className="glass rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-mint/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-mint" />
          </span>
          <div>
            <p className="text-xs font-bold">+38% replies</p>
            <p className="text-[11px] text-muted-foreground">this week</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════ NICHE MARQUEE ═══════════ */
function NicheMarquee() {
  const niches = ["Fitness Coaches", "Fashion Stores", "Realtors", "Food Pages", "Educators", "Agencies", "Musicians", "Photographers", "Cafes", "Consultants", "Boutiques", "Podcasters"];
  const row = [...niches, ...niches];
  return (
    <section className="py-10 border-y border-border/60 bg-muted/20">
      <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-6">
        Powering DMs for every kind of creator
      </p>
      <div className="marquee-mask marquee-paused overflow-hidden">
        <div className="animate-marquee flex w-max items-center gap-3 pr-3">
          {row.map((n, i) => (
            <span key={i} aria-hidden={i >= niches.length} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border text-sm font-medium text-muted-foreground whitespace-nowrap">
              <InstagramIcon className="w-3.5 h-3.5 text-mint" /> {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════ LIVE LOOP DEMO ═══════════ */
const demoSteps = [
  { who: "comment", user: "arjun.films", text: "brooo this transition 🔥 PRICE please?", time: "now" },
  { who: "dm", user: "you", text: "Hey Arjun! Full price list + booking link — sent in 2 seconds ⚡", time: "now" },
  { who: "dm", user: "you", text: "Also — want me to hold your slot for Saturday? Tap below 👇", time: "now", buttons: ["Yes, hold it ✅", "Just browsing"] },
  { who: "tap", user: "arjun.films", text: "Yes, hold it ✅", time: "now" },
  { who: "dm", user: "you", text: "Done! Slot held + details in your inbox. You're on the list 🎉", time: "now" },
];

function LiveDemo() {
  const [count, setCount] = useState(1);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    if (count >= demoSteps.length) {
      const reset = window.setTimeout(() => setCount(1), 2600);
      return () => window.clearTimeout(reset);
    }
    const t = window.setTimeout(() => setCount((c) => c + 1), 1500);
    return () => window.clearTimeout(t);
  }, [count, playing]);

  return (
    <section id="demo" className="relative py-24 md:py-32 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <SectionHeading
            align="left"
            kicker="Live demo"
            title={<>Watch a comment become a customer</>}
            subtitle="No actors, no slides. This is the exact loop running on thousands of accounts right now — comment in, qualified lead out."
          />
          <Reveal className="flex flex-wrap gap-3 -mt-6">
            <Link href="/signup" className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-mint text-white text-sm font-semibold btn-shine glow-mint-sm hover:scale-[1.02] transition-transform">
              Steal this flow <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <button onClick={() => { setPlaying(!playing); if (!playing) setCount(1); }} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass text-sm font-semibold hover:border-mint/40 transition-colors">
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {playing ? "Pause" : "Replay"}
            </button>
          </Reveal>
          <Reveal delay={0.1} className="grid grid-cols-3 gap-4 mt-10">
            {[
              { v: 0.4, suffix: "s", label: "median reply time", decimals: 1 },
              { v: 24, suffix: "/7", label: "always awake", decimals: 0 },
              { v: 100, suffix: "%", label: "Meta approved", decimals: 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl card-elevated p-4 text-center">
                <p className="text-2xl md:text-3xl font-bold text-foreground">
                  <CountUp to={s.v} suffix={s.suffix} decimals={s.decimals} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </Reveal>
        </div>

        {/* phone */}
        <Reveal delay={0.1}>
          <div className="relative mx-auto w-full max-w-[360px]">
            <div className="absolute -inset-6 bg-mint/10 blur-[70px] rounded-full pointer-events-none" />
            <div className="relative rounded-[2rem] border border-border bg-card shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/70 bg-muted/40">
                <span className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center text-white text-sm font-bold">V</span>
                <div>
                  <p className="text-sm font-bold leading-none">vikashbuilds.dev</p>
                  <p className="text-[11px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active now · via ChirplyMint
                  </p>
                </div>
                <Bell className="w-4 h-4 ml-auto text-muted-foreground icon-ring" />
              </div>
              <div className="h-[380px] overflow-hidden p-4 space-y-3 bg-gradient-to-b from-transparent to-mint/[0.05]">
                <AnimatePresence initial={false}>
                  {demoSteps.slice(0, count).map((s, i) => (
                    <motion.div
                      key={`${i}-${s.text}`}
                      initial={{ opacity: 0, y: 14, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className={`flex ${s.who === "dm" ? "justify-start" : "justify-end"}`}
                    >
                      <div className={`max-w-[85%] ${s.who === "dm" ? "" : "flex flex-col items-end"}`}>
                        {s.who !== "dm" && (
                          <p className="text-[10px] text-muted-foreground mb-1 mr-1">{s.user}</p>
                        )}
                        <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                          s.who === "dm"
                            ? "rounded-tl-md bg-gradient-mint text-white"
                            : s.who === "tap"
                              ? "rounded-tr-md bg-mint/15 border border-mint/30 text-foreground font-medium"
                              : "rounded-tr-md bg-muted text-foreground"
                        }`}>
                          {s.text}
                        </div>
                        {s.buttons && (
                          <div className="flex gap-1.5 mt-1.5">
                            {s.buttons.map((b) => (
                              <span key={b} className="px-2.5 py-1 rounded-full bg-card border border-mint/30 text-[11px] font-semibold text-mint-dark dark:text-mint-light">{b}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <div className="px-4 py-3 border-t border-border/70 flex items-center gap-2 text-[13px] text-muted-foreground bg-card">
                <MessageCircle className="w-4 h-4" /> Message…
                <Send className="w-4 h-4 ml-auto text-mint icon-send-fly" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════ HOW IT WORKS ═══════════ */
function HowItWorks() {
  const steps = [
    { step: "01", icon: Link2, title: "Connect Instagram", description: "Link your business account in one click. No code, no developer, no headaches." },
    { step: "02", icon: Bot, title: "Teach it your voice", description: "Set keywords, replies, and an AI persona that sounds exactly like you." },
    { step: "03", icon: Send, title: "Comments become DMs", description: "A keyword comment triggers an instant, personal DM — links, guides, bookings." },
    { step: "04", icon: BarChart3, title: "Watch leads roll in", description: "Every tap, email, and conversion tracked live on your dashboard." },
  ];
  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          kicker="How it works"
          title={<>From comment to customer <br /><span className="text-gradient">in 4 simple steps</span></>}
          subtitle="Live in under two minutes. If you can post a reel, you can run ChirplyMint."
        />
        <div className="relative grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-mint/40 to-transparent" />
          {steps.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.08}>
              <div className="group relative h-full p-7 rounded-3xl card-elevated card-lift overflow-hidden">
                <span className="absolute -top-2 right-4 text-[64px] font-bold leading-none text-mint/10 select-none group-hover:text-mint/20 transition-colors">{s.step}</span>
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-mint flex items-center justify-center mb-5 shadow-lg shadow-mint/25 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <s.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════ BENTO FEATURES ═══════════ */
function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32 scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-section" />
      <div className="relative max-w-6xl mx-auto px-6">
        <SectionHeading
          kicker="Features"
          title={<>Everything you need to <span className="text-gradient">automate & convert</span></>}
          subtitle="One dashboard for triggers, AI replies, lead capture, and analytics."
        />
        <div className="grid md:grid-cols-3 gap-5">
          {/* AI persona — large */}
          <Reveal className="md:col-span-2">
            <div className="group h-full p-7 md:p-8 rounded-3xl card-elevated card-lift overflow-hidden relative">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-500/10 blur-[80px] rounded-full" />
              <div className="flex items-center gap-3 mb-4">
                <span className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
                  <Bot className="w-5 h-5 text-white" />
                </span>
                <div>
                  <h3 className="text-xl font-bold">AI Persona Engine</h3>
                  <p className="text-xs text-muted-foreground">Remembers chats · matches your tone</p>
                </div>
                <Sparkles className="w-4 h-4 ml-auto text-violet-400 animate-twinkle" />
              </div>
              <div className="rounded-2xl bg-muted/50 border border-border/70 p-4 space-y-2.5 text-sm">
                <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-card border border-border px-3.5 py-2.5">do you ship to Jaipur? 👀</div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-gradient-mint text-white px-3.5 py-2.5">Yes! 2-day delivery, COD available 🚚 Want the size chart?</div>
                <div className="flex gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-card border border-mint/30 text-[11px] font-semibold text-mint-dark dark:text-mint-light">Yes please ✅</span>
                  <span className="px-2.5 py-1 rounded-full bg-card border border-border text-[11px] font-semibold text-muted-foreground">Track order</span>
                </div>
              </div>
            </div>
          </Reveal>
          {/* Analytics — tall */}
          <Reveal delay={0.08}>
            <div className="group h-full p-7 rounded-3xl card-elevated card-lift overflow-hidden">
              <span className="w-11 h-11 rounded-2xl bg-mint/15 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                <BarChart3 className="w-5 h-5 text-mint" />
              </span>
              <h3 className="text-xl font-bold mb-1.5">Real-time analytics</h3>
              <p className="text-sm text-muted-foreground mb-5">DMs, leads, conversions — live.</p>
              <div className="flex items-end gap-1.5 h-28">
                {[35, 55, 42, 70, 58, 86, 100].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex-1 rounded-t-md ${i === 6 ? "bg-gradient-mint shadow-lg shadow-mint/30" : "bg-mint/25"}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3"><b className="text-foreground text-sm"><CountUp to={12840} suffix="+" /></b> DMs sent this month</p>
            </div>
          </Reveal>
          {/* small cards */}
          {[
            { icon: MousePointerClick, title: "Keyword triggers", desc: "Any word on any post or reel fires your flow instantly." },
            { icon: UserCheck, title: "Follow-to-unlock", desc: "Trade DMs for followers. Grow while you deliver value." },
            { icon: Users, title: "Auto lead capture", desc: "Emails, phones, tags — saved to your CRM without lifting a finger." },
            { icon: Zap, title: "Multi-step funnels", desc: "Buttons branch into flows: qualify, book, sell — on autopilot." },
            { icon: Shield, title: "Meta approved", desc: "Official API only. No bans, no grey-area bots, ever." },
            { icon: Clock, title: "24/7 instant replies", desc: "0.4s median response. Nights, weekends, viral spikes." },
          ].map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.07}>
              <div className="group h-full p-6 rounded-3xl card-elevated card-lift">
                <span className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-mint/15 group-hover:scale-110 group-hover:-rotate-6">
                  <f.icon className="w-5 h-5 text-mint" />
                </span>
                <h3 className="font-bold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════ STATS BAND ═══════════ */
function StatsBand() {
  const stats = [
    { v: 2.4, suffix: "M+", decimals: 1, label: "DMs delivered" },
    { v: 180, suffix: "K+", decimals: 0, label: "Leads captured" },
    { v: 0.4, suffix: "s", decimals: 1, label: "Median reply time" },
    { v: 38, suffix: "%", decimals: 0, label: "Avg. reply uplift" },
  ];
  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-mint/10 via-emerald/5 to-mint/10" />
      <div className="relative max-w-6xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.07}>
            <p className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              <CountUp to={s.v} suffix={s.suffix} decimals={s.decimals} />
            </p>
            <p className="text-sm text-muted-foreground mt-2">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ═══════════ TESTIMONIALS ═══════════ */
const testimonials = [
  { name: "Sneha R.", role: "Fitness coach · 210K followers", text: "I posted a reel at midnight and woke up to 340 qualified leads. My DM used to be a graveyard — now it's my best salesperson.", metric: "+340 leads/ reel" },
  { name: "Arjun M.", role: "Streetwear store owner", text: "Price questions killed my evenings. Now the bot answers, shares the catalog, and only hot buyers reach me. Insane ROI.", metric: "3.1x sales" },
  { name: "Priya & Kabir", role: "Food page · 890K followers", text: "Recipe e-book delivery is fully automatic. Comment 'recipe' → DM in a second. Our email list grew 12x in two months.", metric: "12x list growth" },
  { name: "Rohan D.", role: "Realtor", text: "Site-visit bookings straight from comments. I stopped chasing cold leads entirely — every viewing now comes inbound.", metric: "47 viewings/mo" },
  { name: "Meera K.", role: "Educator · Spoken English", text: "Students get free lessons instantly, then upgrade to paid batches themselves. It sells while I teach.", metric: "+190 students" },
  { name: "Dev S.", role: "Agency founder", text: "We run ChirplyMint for 14 client accounts. Setup per client is literally minutes. Easiest retainer we've ever sold.", metric: "14 clients" },
];

function Testimonials() {
  const rowA = [...testimonials.slice(0, 3), ...testimonials.slice(0, 3)];
  const rowB = [...testimonials.slice(3), ...testimonials.slice(3)];
  const card = (t: (typeof testimonials)[number], i: number, len: number) => (
    <figure key={`${t.name}-${i}`} aria-hidden={i >= len} className="w-[320px] md:w-[380px] shrink-0 p-6 rounded-3xl card-elevated text-left">
      <Quote className="w-5 h-5 text-mint mb-3" />
      <blockquote className="text-sm leading-relaxed text-foreground/90">“{t.text}”</blockquote>
      <figcaption className="flex items-center gap-3 mt-5">
        <span className="w-10 h-10 rounded-full bg-gradient-mint flex items-center justify-center text-white text-sm font-bold shrink-0">{t.name[0]}</span>
        <span className="min-w-0">
          <span className="block text-sm font-bold truncate">{t.name}</span>
          <span className="block text-xs text-muted-foreground truncate">{t.role}</span>
        </span>
        <span className="ml-auto shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-mint/10 border border-mint/25 text-mint-dark dark:text-mint-light">{t.metric}</span>
      </figcaption>
    </figure>
  );
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeading
          kicker="Wall of love"
          title={<>Creators <span className="text-gradient">print with it</span></>}
          subtitle="Real accounts, real revenue. Hover to pause and read."
        />
      </div>
      <Reveal className="space-y-5">
        <div className="marquee-mask marquee-paused overflow-hidden">
          <div className="animate-marquee flex w-max gap-5 pr-5">{rowA.map((t, i) => card(t, i, 3))}</div>
        </div>
        <div className="marquee-mask marquee-paused overflow-hidden">
          <div className="animate-marquee-fast flex w-max gap-5 pr-5 [animation-direction:reverse]">{rowB.map((t, i) => card(t, i, 3))}</div>
        </div>
      </Reveal>
    </section>
  );
}

/* ═══════════ PRICING ═══════════ */
function Pricing() {
  const plans = getPlanDisplayData();
  return (
    <section id="pricing" className="relative py-24 md:py-32 scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-section" />
      <div className="relative max-w-6xl mx-auto px-6">
        <SectionHeading
          kicker="Pricing"
          title="Start free. Scale when you blow up."
          subtitle="Every plan includes unlimited automations-in-waiting. No credit card to start."
        />
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.08} className="h-full">
              <div className={`relative h-full p-8 rounded-3xl flex flex-col transition-all duration-300 ${
                plan.highlight ? "card-highlight scale-[1.02] md:scale-[1.05] glow-mint" : "card-elevated card-lift"
              }`}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-mint text-xs font-bold text-white tracking-wide shadow-lg whitespace-nowrap">
                    ⚡ Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-5 min-h-10">{plan.description}</p>
                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="text-5xl font-bold tracking-tight">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                </div>
                <Magnetic strength={0.15}>
                  <Link
                    href="/signup"
                    className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold transition-all ${
                      plan.highlight
                        ? "bg-gradient-mint text-white btn-shine glow-mint hover:scale-[1.02]"
                        : "bg-secondary text-foreground hover:bg-accent border border-border"
                    }`}
                  >
                    {plan.cta} <ChevronRight className="w-4 h-4" />
                  </Link>
                </Magnetic>
                <ul className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <span className="w-5 h-5 rounded-full bg-mint/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-mint" strokeWidth={3} />
                      </span>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                  {plan.comingSoon.map((feature: string) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <span className="w-5 h-5 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-3 h-3 text-amber-500/70" />
                      </span>
                      <span className="text-muted-foreground/60">{feature}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold">Soon</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15}>
          <p className="text-center text-sm text-muted-foreground mt-8 inline-flex items-center gap-1.5 w-full justify-center">
            <Shield className="w-4 h-4 text-mint" /> 7-day Pro trial · Cancel anytime · UPI, cards & netbanking via Cashfree
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════ FAQ ═══════════ */
const faqs = [
  { q: "Will Instagram ban my account?", a: "No. ChirplyMint uses only the official Instagram Messaging API — the same one Meta reviews and approves. No password sharing, no grey-area bots, no automation that violates platform rules." },
  { q: "How fast is the setup, really?", a: "About 2 minutes: connect your Instagram business account, pick a keyword, write what to send. Your first automation can be live before your chai cools." },
  { q: "Does it sound robotic?", a: "Only if you want it to. The AI Persona Engine learns your tone, remembers past chats, and replies in Hinglish, Hindi, or English — your followers won't know it's automated." },
  { q: "What happens when I hit my DM limit?", a: "Automations pause gracefully and you get a heads-up to upgrade or grab a top-up. Nothing breaks, no lead is lost — everything resumes on reset." },
  { q: "Can I capture emails and phone numbers?", a: "Yes — quick-reply buttons ask once, and typed replies are auto-detected and saved to your leads with tags, ready for CSV export or webhooks." },
  { q: "Can I cancel anytime?", a: "Absolutely. Monthly plans cancel in one click and stay active till period end. Annual plans get 2 months free." },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="relative py-24 md:py-28">
      <div className="max-w-3xl mx-auto px-6">
        <SectionHeading kicker="FAQ" title="Questions? Answered." />
        <div className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.04}>
                <div className={`rounded-2xl border transition-colors overflow-hidden ${isOpen ? "border-mint/40 bg-mint/[0.04]" : "border-border bg-card"}`}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-4 px-5 sm:px-6 py-4 text-left"
                  >
                    <span className="font-semibold text-[15px] flex-1">{f.q}</span>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${isOpen ? "bg-gradient-mint text-white rotate-180" : "bg-muted text-muted-foreground"}`}>
                      {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="c"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 sm:px-6 pb-5 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════ FINAL CTA ═══════════ */
function FinalCTA() {
  return (
    <section className="relative py-24 md:py-32 px-6">
      <Reveal className="relative max-w-5xl mx-auto overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0c2b21] via-[#0a1f34] to-[#101a3a] px-6 py-16 md:py-24 text-center">
        <div className="absolute inset-0 dot-grid opacity-20 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,black,transparent)]" />
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-mint/25 blur-[120px] rounded-full animate-float-slow" />
        <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-fuchsia-500/15 blur-[120px] rounded-full" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-mint-200 text-xs font-bold uppercase tracking-[0.14em] mb-6">
            <Heart className="w-3.5 h-3.5 text-rose-300 animate-twinkle" /> Join 2,400+ creators
          </p>
          <h2 className="text-3xl md:text-6xl font-bold tracking-tight text-white text-balance">
            Your next viral reel
            <br />
            <span className="bg-gradient-to-r from-mint-300 via-emerald-200 to-teal-200 bg-clip-text text-transparent">should pay you back.</span>
          </h2>
          <p className="text-white/70 mt-5 max-w-xl mx-auto md:text-lg">
            Start free tonight. Wake up to leads tomorrow. No credit card, no risk, 2-minute setup.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-9">
            <Magnetic>
              <Link href="/signup" className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-emerald-950 font-bold btn-shine shadow-2xl transition-transform hover:scale-[1.03] active:scale-[0.98]">
                Get Started — It&apos;s Free
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <Link href="/pricing" className="px-8 py-4 rounded-2xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors">
              Compare plans
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ═══════════ PAGE ═══════════ */
export default function Home() {
  const [feedItems, setFeedItems] = useState<{ id: string; detail: string; timeAgo: string }[]>([]);

  useEffect(() => {
    getLiveFeedItems(12).then((items) => setFeedItems(items));
  }, []);

  return (
    <SmoothScroll>
      <main className="relative overflow-hidden bg-background">
        <Navbar />
        <Hero />
        <NicheMarquee />
        <LiveDemo />
        <HowItWorks />
        <Features />
        <StatsBand />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCTA />
        <Footer />
        {feedItems.length > 0 && <LiveActivityFeed initialItems={feedItems} />}
      </main>
    </SmoothScroll>
  );
}
