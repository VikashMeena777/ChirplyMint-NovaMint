"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  MessageCircle,
  Shield,
  ArrowRight,
  Check,
  Sparkles,
  Send,
  ChevronRight,
  Play,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { LiveActivityFeed } from "@/components/marketing/live-activity-feed";
import { getLiveFeedItems } from "@/lib/actions/live-feed";
import { getPlanDisplayData } from "@/lib/utils/plan-limits";
import { SplitHeadline } from "@/components/motion/split-headline";
import { HeroHeadline } from "@/components/marketing/hero-headline";
import { FunnelRings } from "@/components/marketing/funnel-rings";
import { GenZCard } from "@/components/marketing/genz-card";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import {
  FadeIn,
  Stagger,
  StaggerItem,
  AnimatedCard,
} from "@/components/motion/kit";
import { springSnappy, springTap } from "@/components/motion/transitions";
import { IconDrawCard } from "@/components/motion/icon-draw";
import { SendIcon, type SendIconHandle } from "@/components/icons/send/send";
import { BotIcon } from "@/components/icons/bot/bot";
import { ZapIcon } from "@/components/icons/zap/zap";
import { UsersIcon } from "@/components/icons/users/users";
import { TrendingUpIcon } from "@/components/icons/trending-up/trending-up";
import { InstagramIcon } from "@/components/icons/instagram/instagram";
import { LiveDemoCard } from "@/components/marketing/live-demo-card";
import { IntroOverlay } from "@/components/motion/intro-overlay";
import { AmbientPause } from "@/components/motion/ambient-pause";

/* ─── Data (real product facts — no fabricated metrics) ─── */

const NICHES = [
  "Fitness Coaches",
  "Online Stores",
  "Musicians",
  "Coaches",
  "Photographers",
  "Food Creators",
  "Beauty Brands",
  "Authors",
  "Freelancers",
  "Nonprofits",
];

const STEPS = [
  {
    n: "01",
    title: "Connect your Instagram",
    desc: "One click with your professional account. No passwords stored, no browser extensions — official Meta integration.",
  },
  {
    n: "02",
    title: "Pick a keyword",
    desc: 'Comment "SEND" on your next reel, or start from one of 10 ready-made recipes for your niche.',
  },
  {
    n: "03",
    title: "Watch leads arrive",
    desc: "Every comment triggers the perfect DM — PDFs, carousels, quick replies — while you sleep. Leads land in your dashboard.",
  },
];

/* ─── HERO ─── */
function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden pt-28 pb-16">
      {/* Living aurora backdrop — drifting gradient blobs, grid, vignette */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.93_0.02_200/50%),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.52 0.19 162/12%) 1px, transparent 1px), linear-gradient(90deg, oklch(0.52 0.19 162/12%) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 70%)",
          }}
        />
        {/* ── colour psychology, theme-aware ──
             light: airy white + VISIBLE pastel aurora (saturation turned up)
             dark:  ink-navy depth (trust) + emerald/teal/indigo glow ── */}
        {/* base wash — light: cool white · dark: navy */}
        <div className="dark:hidden absolute inset-0 bg-[linear-gradient(180deg,oklch(0.985_0.008_200/80%)_0%,oklch(0.995_0_0)_35%,oklch(0.975_0.015_240/75%)_100%)]" />
        <div className="hidden dark:block absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,oklch(0.22_0.05_235/60%),transparent_60%)]" />
        <div className="hidden dark:block absolute inset-0 bg-[linear-gradient(180deg,oklch(0.17_0.03_240/50%)_0%,transparent_35%,oklch(0.15_0.025_250/60%)_100%)]" />
        {/* aurora — saturations tuned per theme so both are clearly visible */}
        <div className="aurora au-emerald animate-aurora-1 -top-[366px] left-[calc(8%-238px)] h-[956px] w-[956px] [--au-p:22.75] dark:[--au-p:10.98]" />
        <div className="aurora au-teal dark:au-teal-d animate-aurora-2 bottom-[calc(-10%-255px)] right-[calc(4%-255px)] h-[930px] w-[930px] [--au-p:15.29] dark:[--au-p:7.34]" />
        <div className="aurora au-indigo dark:au-indigo-d animate-aurora-3 top-[calc(30%-221px)] left-[calc(45%-221px)] h-[822px] w-[822px] [--au-p:13.07] dark:[--au-p:6.54]" />
        {/* soft top beam */}
        <div className="aurora au-mint left-1/2 -top-[204px] h-[688px] w-[1128px] -translate-x-1/2 [--au-p:15.29] dark:[--au-p:6.12]" />
        {/* floating particles */}
        <div className="animate-float-1 absolute left-[18%] top-[30%] h-1.5 w-1.5 rounded-full bg-emerald/70" />
        <div className="animate-float-2 absolute left-[70%] top-[22%] h-1 w-1 rounded-full bg-teal-500/70" />
        <div className="animate-float-3 absolute left-[55%] top-[64%] h-1.5 w-1.5 rounded-full bg-indigo-500/55" />
        <div className="animate-float-2 absolute left-[30%] top-[72%] h-1 w-1 rounded-full bg-emerald/65" />
        <div className="animate-float-1 absolute left-[85%] top-[55%] h-1 w-1 rounded-full bg-mint/70" />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* ── Left: message ── */}
          <div className="lg:col-span-7 flex flex-col items-start gap-7">
            <FadeIn direction="none" delay={0}>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-mint/25 bg-mint/12 px-4 py-1.5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-mint" />
                </span>
                <span className="text-xs font-semibold tracking-wide text-mint-dark dark:text-mint-light">
                  New: AI Agent with your persona &amp; FAQs
                </span>
              </div>
            </FadeIn>

            <HeroHeadline />

            <FadeIn delay={0.35}>
              <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
                ChirplyMint watches your Instagram around the clock and sends the
                perfect DM the second someone comments your keyword — PDFs,
                carousels, quick replies and an AI agent that talks like you.
              </p>
            </FadeIn>

            <FadeIn delay={0.5} className="w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={springSnappy}>
                  <Link
                    href="/signup"
                    className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-mint px-8 py-4 text-base font-semibold text-white glow-mint"
                  >
                    <Send className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    Start free — no card
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </motion.div>
                <motion.div whileTap={{ scale: 0.97 }} transition={springTap}>
                  <Link
                    href="#demo"
                    className="group inline-flex items-center justify-center gap-2.5 rounded-2xl border border-border bg-card/80 px-8 py-4 text-base font-semibold text-foreground transition-colors hover:border-mint/40 hover:bg-mint/5"
                  >
                    <Play className="w-4 h-4 fill-current text-mint" />
                    See it in action
                  </Link>
                </motion.div>
              </div>
            </FadeIn>

            <FadeIn delay={0.65}>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-mint" /> Free forever plan
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-mint" /> 7-day Pro trial
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-mint" /> Official Meta API
                </span>
              </div>
            </FadeIn>
          </div>

          {/* ── Right: live animated product demo ── */}
          <div className="lg:col-span-5">
            <FadeIn delay={0.4} direction="left">
              <LiveDemoCard />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Niche marquee (Trust Hero pattern) ─── */
function NicheMarquee() {
  return (
    <section className="relative border-y border-border/60 bg-card/45 py-8">
      <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Built for every creator niche
      </p>
      <div
        className="relative flex overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
        }}
      >
        <div className="flex w-max animate-[marquee_42s_linear_infinite] gap-10 whitespace-nowrap px-4">
          {[...NICHES, ...NICHES, ...NICHES].map((niche, i) => (
            <span
              key={i}
              className="flex items-center gap-2.5 text-lg font-semibold font-heading tracking-tight text-muted-foreground/50 transition-all duration-300 hover:text-mint"
            >
              <MessageCircle className="w-4 h-4" />
              {niche}
            </span>
          ))}
        </div>
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }`}</style>
    </section>
  );
}

/* ─── How it works ─── */
function HowItWorks() {
  return (
    <section id="demo" className="cv-auto relative py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint mb-4">
            How it works
          </p>
          <SplitHeadline
            text="Three steps. Zero manual DMs."
            className="text-3xl md:text-5xl font-bold font-heading tracking-tight text-foreground"
          />
        </FadeIn>

        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6" amount={0.2}>
          {STEPS.map((step) => (
            <StaggerItem key={step.n}>
              <AnimatedCard className="rounded-3xl">
                <div className="rounded-3xl border border-border bg-card/75 p-8 h-full">
                  <span className="text-5xl font-bold font-heading tracking-tight bg-gradient-to-br from-mint/60 to-mint bg-clip-text text-transparent">
                    {step.n}
                  </span>
                  <h3 className="mt-6 text-xl font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </AnimatedCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ─── Feature Bento (21st Dev Feature Bento adaptation) ─── */
function FeatureBento() {
  return (
    <section id="features" className="cv-auto relative py-24 md:py-32">
      <div
        aria-hidden
        className="aurora au-mint top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1312px] h-[1112px] [--au-p:3.9]"
      />
      <div className="relative max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint mb-4">
            Everything included
          </p>
          <SplitHeadline
            text="A DM machine, not a chatbot"
            className="text-3xl md:text-5xl font-bold font-heading tracking-tight text-foreground"
          />
        </FadeIn>

        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(240px,auto)]" amount={0.1}>
          {/* Gen-Z hero card — comments in, customers out */}
          <StaggerItem className="md:col-span-2">
            <GenZCard />
          </StaggerItem>

          {/* AI Persona */}
          <StaggerItem>
            <IconDrawCard
              icon={BotIcon}
              iconBoxClass="bg-violet-500/10 group-hover:-rotate-6"
              className="group h-full rounded-3xl border border-border bg-card/75 p-8 flex flex-col justify-between transition-colors hover:border-violet-400/30"
            >
              <div>
                <h4 className="text-xl font-bold font-heading text-foreground">AI Persona Engine</h4>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Trained on your tone and FAQs — it replies like you, captures
                  emails and phones, and hands off when a human matters.
                </p>
              </div>
            </IconDrawCard>
          </StaggerItem>

          {/* Button DMs */}
          <StaggerItem>
            <IconDrawCard
              icon={ZapIcon}
              iconBoxClass="bg-mint/10 group-hover:rotate-6"
              className="group h-full rounded-3xl border border-border bg-card/75 p-8 flex flex-col justify-between transition-colors hover:border-mint/30"
            >
              <div>
                <h4 className="text-xl font-bold font-heading text-foreground">Interactive Button DMs</h4>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Native Instagram buttons, quick replies and carousels — real
                  Message Stack blocks, not plain-text bots.
                </p>
              </div>
            </IconDrawCard>
          </StaggerItem>

          {/* Lead capture */}
          <StaggerItem>
            <IconDrawCard
              icon={UsersIcon}
              iconBoxClass="bg-sky-500/10 group-hover:-rotate-6"
              className="group h-full rounded-3xl border border-border bg-card/75 p-8 flex flex-col justify-between transition-colors hover:border-sky-400/30"
            >
              <div>
                <h4 className="text-xl font-bold font-heading text-foreground">Lead Capture &amp; Tagging</h4>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Every conversation becomes a tagged lead with engagement
                  scoring, notes and CSV export.
                </p>
              </div>
            </IconDrawCard>
          </StaggerItem>

          {/* Analytics */}
          <StaggerItem>
            <IconDrawCard
              icon={TrendingUpIcon}
              iconBoxClass="bg-amber-500/10 group-hover:rotate-6"
              className="group h-full rounded-3xl border border-border bg-card/75 p-8 flex flex-col justify-between transition-colors hover:border-amber-400/30"
            >
              <div>
                <h4 className="text-xl font-bold font-heading text-foreground">Real-Time Analytics</h4>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Conversion funnel from delivered DM to captured contact, per
                  automation — with smart send-times.
                </p>
              </div>
            </IconDrawCard>
          </StaggerItem>

          {/* CTA card */}
          <StaggerItem className="md:col-span-1">
            <Link
              href="/signup"
              className="group relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-950 to-neutral-800 dark:from-card dark:to-neutral-900 p-8 text-white flex flex-col justify-between border border-border"
            >
              <div className="flex items-start justify-between">
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80">
                  Free plan
                </span>
                <div className="flex size-10 items-center justify-center rounded-full bg-white/15 text-lg transition-all duration-500 group-hover:rotate-45 group-hover:bg-mint/30">
                  ↗
                </div>
              </div>
              <div>
                <h4 className="text-2xl font-bold font-heading leading-tight">
                  Start with
                  <br />
                  50 free DMs
                </h4>
                <p className="mt-2 text-sm text-white/60">No card. No feature limits.</p>
              </div>
            </Link>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */
function Pricing() {
  const allPlans = getPlanDisplayData();

  return (
    <section id="pricing" className="cv-auto relative py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint mb-4">
            Pricing
          </p>
          <SplitHeadline
            text="Simple pricing, Indian rupees"
            className="text-3xl md:text-5xl font-bold font-heading tracking-tight text-foreground"
          />
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Start free. Upgrade when the DMs start turning into revenue.
          </p>
        </FadeIn>

        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6" amount={0.2}>
          {allPlans.map((plan) => (
            <StaggerItem key={plan.key} className="h-full">
              <AnimatedCard className="h-full rounded-3xl">
                <div
                  className={`h-full rounded-3xl border p-8 flex flex-col transition-[border-color,box-shadow] duration-300 group-hover:border-mint/50 ${
                    plan.key === "pro"
                      ? "border-mint/50 ring-1 ring-mint/30 bg-gradient-to-b from-mint/10 to-card shadow-[inset_0_1px_0_oklch(0.72_0.15_162/25%)] group-hover:border-mint/80 group-hover:ring-mint/50 group-hover:shadow-[inset_0_0_48px_-6px_oklch(0.62_0.19_162/45%),inset_0_1px_0_oklch(0.72_0.15_162/25%)]"
                      : "border-border bg-card/85 group-hover:border-mint/45 group-hover:shadow-[inset_0_0_40px_-8px_oklch(0.62_0.19_162/32%)]"
                  }`}
                >
                  {plan.key === "pro" && (
                    <span className="mb-4 w-fit rounded-full bg-mint/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-mint-dark dark:text-mint-light">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-xl font-bold font-heading text-foreground">{plan.name}</h3>
                  <p className="mt-3 text-4xl font-bold font-heading tracking-tight text-foreground">
                    {plan.price}
                    <span className="text-base font-medium text-muted-foreground">{plan.period}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 mt-0.5 shrink-0 text-mint" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <motion.div whileTap={{ scale: 0.97 }} transition={springTap} className="mt-8">
                    <Link
                      href={plan.key === "free" ? "/signup" : "/dashboard/settings/billing"}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all ${
                        plan.key === "pro"
                          ? "bg-gradient-mint text-white shadow-sm"
                          : "border border-border bg-card text-foreground hover:border-mint/40 hover:bg-mint/5"
                      }`}
                    >
                      {plan.key === "free" ? "Start free" : `Choose ${plan.name}`}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                </div>
              </AnimatedCard>
            </StaggerItem>
          ))}
        </Stagger>

        <FadeIn delay={0.2} className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Annual plans save 2 months · DM top-ups from ₹99 · GST-free invoices
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Final CTA ─── */
function FinalCTA() {
  const sendRef = useRef<SendIconHandle>(null);

  return (
    <section className="cv-auto relative py-24 md:py-32 overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-gradient-section" />
      <div
        aria-hidden
        className="aurora au-mint top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1110px] h-[910px] [--au-p:7.8]"
      />

      <FadeIn className="relative max-w-3xl mx-auto px-6 text-center">
        <SplitHeadline
          text="Ready to automate your Instagram?"
          className="text-3xl md:text-5xl font-bold font-heading tracking-tight text-foreground"
        />
        <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
          Set up your first automation in minutes. Your next commenter becomes
          your next customer.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={springSnappy}
            onMouseEnter={() => sendRef.current?.startAnimation()}
            onMouseLeave={() => sendRef.current?.stopAnimation()}
          >
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2.5 rounded-2xl bg-gradient-mint px-9 py-4 text-base font-semibold text-white glow-mint"
            >
              Get started — it&apos;s free
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>
          {/* linked to the button: hovering 'Get started' draws the plane */}
          <SendIcon ref={sendRef} />
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Free forever plan · No credit card · Official Meta API integration
        </p>
      </FadeIn>
    </section>
  );
}

/* ─── Page ─── */
export default function Home() {
  return (
    <SmoothScroll>
      <IntroOverlay />
      <AmbientPause />
      <main className="relative overflow-hidden bg-background">
        <Navbar />
        <Hero />
        {/* everything below the hero — the HERO'S background language
            extended down the page (same aurora/grid/vignette style),
            dark-mode only, ending above the footer */}
        <div className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden dark:block">
            {/* ONE continuous world: a uniform green-navy wash (the hero's
                palette) covers everything evenly — no localized blobs that
                read as glow behind a specific section */}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.16_0.025_250/60%)_0%,oklch(0.14_0.035_168/45%)_25%,oklch(0.14_0.035_168/45%)_75%,oklch(0.16_0.025_250/60%)_100%)]" />
            {/* the hero's grid, continued */}
            <div
              className="absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  "linear-gradient(oklch(0.62 0.19 162/7%) 1px, transparent 1px), linear-gradient(90deg, oklch(0.62 0.19 162/7%) 1px, transparent 1px)",
                backgroundSize: "72px 72px",
              }}
            />
            {/* drifting auroras — evenly spaced down the page, diffuse */}
            <div className="aurora au-emerald animate-aurora-1 top-[calc(10%-289px)] -left-[289px] h-[1118px] w-[1118px] [--au-p:7.3]" />
            <div className="aurora au-teal-d animate-aurora-2 top-[calc(45%-306px)] right-[calc(-2%-306px)] h-[1192px] w-[1192px] [--au-p:6.57]" />
            <div className="aurora au-indigo-d animate-aurora-3 top-[calc(80%-272px)] left-[calc(28%-272px)] h-[1084px] w-[1084px] [--au-p:6]" />
          </div>
          <div className="relative z-10">
            <NicheMarquee />
            <HowItWorks />
            <FeatureBento />
            <FunnelRings />
            <Pricing />
            <FinalCTA />
          </div>
        </div>
        {/* footer stays OUTSIDE the ambience — background ends above it */}
        <Footer />
        <LiveActivityFeed />
      </main>
    </SmoothScroll>
  );
}
