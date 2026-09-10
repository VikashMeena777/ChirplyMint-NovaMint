"use client";

import { useState, useEffect } from "react";
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
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import {
  FadeIn,
  Stagger,
  StaggerItem,
  AnimatedCard,
} from "@/components/motion/kit";
import { springSnappy, springTap } from "@/components/motion/transitions";
import { SendIcon } from "@/components/icons/send/send";
import { IconDrawCard } from "@/components/motion/icon-draw";
import { BotIcon } from "@/components/icons/bot/bot";
import { ZapIcon } from "@/components/icons/zap/zap";
import { UsersIcon } from "@/components/icons/users/users";
import { TrendingUpIcon } from "@/components/icons/trending-up/trending-up";
import { InstagramIcon } from "@/components/icons/instagram/instagram";
import { LiveDemoCard } from "@/components/marketing/live-demo-card";
import { FunnelChart } from "@/components/marketing/funnel-chart";
import { IntroOverlay } from "@/components/motion/intro-overlay";

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
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,oklch(0.15_0.02_160/40%),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.62 0.19 162/6%) 1px, transparent 1px), linear-gradient(90deg, oklch(0.62 0.19 162/6%) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 70%)",
          }}
        />
        {/* aurora blobs — slow drift, transform-only */}
        <div className="animate-aurora-1 absolute -top-32 left-[8%] h-[480px] w-[480px] rounded-full bg-mint/12 blur-[140px]" />
        <div className="animate-aurora-2 absolute bottom-[-10%] right-[4%] h-[420px] w-[420px] rounded-full bg-emerald/10 blur-[150px]" />
        <div className="animate-aurora-3 absolute top-[30%] left-[45%] h-[360px] w-[360px] rounded-full bg-teal-400/8 blur-[130px]" />
        {/* floating particles */}
        <div className="animate-float-1 absolute left-[18%] top-[30%] h-1.5 w-1.5 rounded-full bg-mint/50" />
        <div className="animate-float-2 absolute left-[70%] top-[22%] h-1 w-1 rounded-full bg-emerald/60" />
        <div className="animate-float-3 absolute left-[55%] top-[64%] h-1.5 w-1.5 rounded-full bg-mint/40" />
        <div className="animate-float-2 absolute left-[30%] top-[72%] h-1 w-1 rounded-full bg-emerald/50" />
        <div className="animate-float-1 absolute left-[85%] top-[55%] h-1 w-1 rounded-full bg-mint/50" />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* ── Left: message ── */}
          <div className="lg:col-span-7 flex flex-col items-start gap-7">
            <FadeIn direction="none" delay={0}>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-mint/25 bg-mint/8 px-4 py-1.5 backdrop-blur-md">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-mint" />
                </span>
                <span className="text-xs font-semibold tracking-wide text-mint-light">
                  New: AI Agent with your persona &amp; FAQs
                </span>
              </div>
            </FadeIn>

            <SplitHeadline
              as="h1"
              text="Turn every comment into a customer"
              className="text-[2.9rem] sm:text-6xl lg:text-7xl font-bold font-heading tracking-tight leading-[1.02] bg-gradient-to-r from-foreground via-foreground to-mint bg-clip-text text-transparent"
            />

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
                    className="group inline-flex items-center justify-center gap-2.5 rounded-2xl border border-border bg-card/60 px-8 py-4 text-base font-semibold text-foreground backdrop-blur-sm transition-colors hover:border-mint/40 hover:bg-mint/5"
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
    <section className="relative border-y border-border/60 bg-card/20 py-8 backdrop-blur-sm">
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
    <section id="demo" className="relative py-24 md:py-32">
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
                <div className="rounded-3xl border border-border bg-card/60 p-8 h-full backdrop-blur-sm">
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
    <section id="features" className="relative py-24 md:py-32">
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-mint/5 blur-[180px] rounded-full"
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
          {/* Hero card — Smart Comment Triggers */}
          <StaggerItem className="md:col-span-2 md:row-span-2">
            <div className="group relative h-full overflow-hidden rounded-3xl border border-mint/20 bg-gradient-to-br from-mint/15 via-card to-card p-10 flex flex-col justify-between">
              <div aria-hidden className="absolute -right-20 -top-20 size-64 rounded-full bg-mint/15 blur-3xl transition-transform duration-700 group-hover:scale-125" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-mint/15 px-3.5 py-1.5 text-xs font-medium text-mint-light backdrop-blur-sm">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  Comment triggers
                </div>
                <h3 className="mt-6 text-3xl md:text-4xl font-bold font-heading tracking-tight text-foreground">
                  They comment.
                  <br />
                  You deliver.
                </h3>
                <p className="mt-4 max-w-md text-muted-foreground leading-relaxed">
                  Keyword matching with typo tolerance and comment-edit support.
                  The first DM opens the window with a button — the full stack
                  (PDFs, carousels, albums) plays the moment they tap.
                </p>
              </div>
              {/* illustrative comment→DM flow */}
              <div className="relative mt-8 space-y-2.5 max-w-sm">
                <div className="w-fit rounded-2xl rounded-bl-md border border-border bg-card/80 px-4 py-2.5 text-sm text-foreground backdrop-blur-sm">
                  <span className="text-mint font-medium">@fan</span> SEND 🙌
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  className="ml-auto w-fit rounded-2xl rounded-br-md bg-gradient-mint px-4 py-2.5 text-sm text-white"
                >
                  Here&apos;s the guide you asked for 📩
                </motion.div>
              </div>
            </div>
          </StaggerItem>

          {/* AI Persona */}
          <StaggerItem>
            <IconDrawCard
              icon={BotIcon}
              iconBoxClass="bg-violet-500/10 group-hover:-rotate-6"
              className="group h-full rounded-3xl border border-border bg-card/60 p-8 flex flex-col justify-between backdrop-blur-sm transition-colors hover:border-violet-400/30"
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
              className="group h-full rounded-3xl border border-border bg-card/60 p-8 flex flex-col justify-between backdrop-blur-sm transition-colors hover:border-mint/30"
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
              className="group h-full rounded-3xl border border-border bg-card/60 p-8 flex flex-col justify-between backdrop-blur-sm transition-colors hover:border-sky-400/30"
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
              className="group h-full rounded-3xl border border-border bg-card/60 p-8 flex flex-col justify-between backdrop-blur-sm transition-colors hover:border-amber-400/30"
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
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-sm">
                  Free plan
                </span>
                <div className="flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-lg transition-all duration-500 group-hover:rotate-45 group-hover:bg-mint/30">
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
    <section id="pricing" className="relative py-24 md:py-32">
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
                  className={`h-full rounded-3xl border p-8 flex flex-col backdrop-blur-sm ${
                    plan.key === "pro"
                      ? "border-mint/40 bg-gradient-to-b from-mint/10 to-card shadow-[0_0_60px_-20px_oklch(0.62_0.19_162/35%)]"
                      : "border-border bg-card/60"
                  }`}
                >
                  {plan.key === "pro" && (
                    <span className="mb-4 w-fit rounded-full bg-mint/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-mint-light">
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
                      href={plan.key === "free" ? "/signup" : "/dashboard/settings?tab=billing"}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all ${
                        plan.key === "pro"
                          ? "bg-gradient-mint text-white glow-mint"
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
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-gradient-section" />
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-mint/10 blur-[150px] rounded-full"
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
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={springSnappy}>
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2.5 rounded-2xl bg-gradient-mint px-9 py-4 text-base font-semibold text-white glow-mint"
            >
              Get started — it&apos;s free
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>
          <SendIcon />
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
  const [feedItems, setFeedItems] = useState<
    { id: string; detail: string; timeAgo: string }[]
  >([]);

  useEffect(() => {
    getLiveFeedItems(12).then((items) => {
      setFeedItems(items);
    });
  }, []);

  return (
    <SmoothScroll>
      <IntroOverlay />
      <main className="relative overflow-hidden bg-background">
        <Navbar />
        <Hero />
        <NicheMarquee />
        <HowItWorks />
        <FeatureBento />
        <FunnelChart />
        <Pricing />
        <FinalCTA />
        <Footer />
        {feedItems.length > 0 && <LiveActivityFeed initialItems={feedItems} />}
      </main>
    </SmoothScroll>
  );
}
