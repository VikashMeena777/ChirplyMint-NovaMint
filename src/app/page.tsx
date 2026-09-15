"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import {
  Shield,
  ArrowRight,
  Check,
  Send,
  ChevronRight,
  Play,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { LiveActivityFeed } from "@/components/marketing/live-activity-feed";
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
      {/* Backdrop — one restrained device: a fine engineering grid faded
          by a radial mask, plus a single soft light source at the top
          edge. No gradient blobs, no floating particles. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-grid-fine opacity-75"
          style={{
            maskImage:
              "radial-gradient(ellipse 90% 70% at 50% 32%, black 25%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 70% at 50% 32%, black 25%, transparent 72%)",
          }}
        />
        <div className="absolute inset-0 bg-radial-light" />
      </div>

      <div className="relative w-full max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          {/* ── Left: message ── */}
          <div className="lg:col-span-7 flex flex-col items-start gap-6">
            <FadeIn direction="none" delay={0}>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-1.5">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  New: AI Agent with your persona &amp; FAQs
                </span>
              </div>
            </FadeIn>

            <HeroHeadline />

            <FadeIn delay={0.35}>
              <p className="max-w-xl text-base leading-[1.7] text-muted-foreground">
                ChirplyMint watches your Instagram around the clock and sends the
                perfect DM the second someone comments your keyword — PDFs,
                carousels, quick replies and an AI agent that talks like you.
              </p>
            </FadeIn>

            <FadeIn delay={0.5} className="w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={springSnappy}>
                  <Link
                    href="/signup"
                    className="group inline-flex items-center justify-center gap-2.5 rounded-lg bg-gradient-mint px-7 py-3.5 text-[15px] font-semibold text-white"
                  >
                    <Send className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    Start free — no card
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </motion.div>
                <motion.div whileTap={{ scale: 0.97 }} transition={springTap}>
                  <Link
                    href="#demo"
                    className="group inline-flex items-center justify-center gap-2.5 rounded-lg border border-border bg-card px-7 py-3.5 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted/60"
                  >
                    <Play className="w-4 h-4 fill-current text-primary" />
                    See it in action
                  </Link>
                </motion.div>
              </div>
            </FadeIn>

            <FadeIn delay={0.65}>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary" /> Free forever plan
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary" /> 7-day Pro trial
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary" /> Official Meta API
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

/* ─── Niche marquee ─── */
function NicheMarquee() {
  return (
    <section className="relative border-y border-border/60 bg-card/45 py-8">
      <div className="max-w-6xl mx-auto px-6">
        <p className="eyebrow mb-6 text-muted-foreground">
          Built for every creator niche
        </p>
      </div>
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
              className="text-base font-medium font-heading tracking-tight text-muted-foreground/50 transition-colors duration-300 hover:text-primary"
            >
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
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="mb-14 md:mb-16">
          <p className="eyebrow mb-5 text-muted-foreground">
            <span className="text-primary">01</span> / How it works
          </p>
          <SplitHeadline
            text="Three steps. Zero manual DMs."
            className="text-section font-bold font-heading text-foreground"
          />
        </FadeIn>

        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-4" amount={0.2}>
          {STEPS.map((step) => (
            <StaggerItem key={step.n}>
              <AnimatedCard className="rounded-lg">
                <div className="rounded-lg bg-muted/40 p-6 h-full">
                  <span className="font-mono text-xs font-medium tracking-[0.08em] text-primary">
                    {step.n}
                  </span>
                  <h3 className="mt-5 text-xl font-semibold font-heading tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground">
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

/* ─── Feature Bento ─── */
function FeatureBento() {
  return (
    <section id="features" className="cv-auto relative border-t border-border py-24 md:py-32">
      <div className="relative max-w-6xl mx-auto px-6">
        <FadeIn className="mb-14 md:mb-16 max-w-3xl">
          <p className="eyebrow mb-5 text-muted-foreground">
            <span className="text-primary">02</span> / Everything included
          </p>
          <SplitHeadline
            text="A DM machine, not a chatbot"
            className="text-section font-bold font-heading text-foreground"
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
              iconBoxClass="bg-foreground/5 group-hover:-rotate-6"
              className="group h-full rounded-lg bg-muted/40 p-6 flex flex-col justify-between transition-colors hover:bg-muted/70"
            >
              <div>
                <h4 className="text-xl font-bold font-heading tracking-tight text-foreground">AI Persona Engine</h4>
                <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground">
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
              iconBoxClass="bg-foreground/5 group-hover:rotate-6"
              className="group h-full rounded-lg bg-muted/40 p-6 flex flex-col justify-between transition-colors hover:bg-muted/70"
            >
              <div>
                <h4 className="text-xl font-bold font-heading tracking-tight text-foreground">Interactive Button DMs</h4>
                <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground">
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
              iconBoxClass="bg-foreground/5 group-hover:-rotate-6"
              className="group h-full rounded-lg bg-muted/40 p-6 flex flex-col justify-between transition-colors hover:bg-muted/70"
            >
              <div>
                <h4 className="text-xl font-bold font-heading tracking-tight text-foreground">Lead Capture &amp; Tagging</h4>
                <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground">
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
              iconBoxClass="bg-foreground/5 group-hover:rotate-6"
              className="group h-full rounded-lg bg-muted/40 p-6 flex flex-col justify-between transition-colors hover:bg-muted/70"
            >
              <div>
                <h4 className="text-xl font-bold font-heading tracking-tight text-foreground">Real-Time Analytics</h4>
                <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground">
                  Conversion funnel from delivered DM to captured contact, per
                  automation — with smart send-times.
                </p>
              </div>
            </IconDrawCard>
          </StaggerItem>

          {/* CTA card — the single inverted surface */}
          <StaggerItem className="md:col-span-1">
            <Link
              href="/signup"
              className="group relative h-full overflow-hidden rounded-lg bg-neutral-950 p-6 text-white dark:bg-neutral-900 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-white/50">
                  Free plan
                </span>
                <div className="flex size-9 items-center justify-center rounded-full border border-white/15 text-base transition-all duration-500 group-hover:rotate-45 group-hover:border-primary/60 group-hover:text-primary">
                  ↗
                </div>
              </div>
              <div>
                <h4 className="text-2xl font-bold font-heading tracking-tight leading-[1.05]">
                  Start with
                  <br />
                  50 free DMs
                </h4>
                <p className="mt-3 text-sm text-white/60">No card. No feature limits.</p>
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
    <section id="pricing" className="cv-auto relative border-t border-border py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn className="mb-14 md:mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-5 text-muted-foreground">
              <span className="text-primary">03</span> / Pricing
            </p>
            <SplitHeadline
              text="Simple pricing, Indian rupees"
              className="text-section font-bold font-heading text-foreground"
            />
          </div>
          <p className="max-w-xs text-[15px] leading-[1.7] text-muted-foreground">
            Start free. Upgrade when the DMs start turning into revenue.
          </p>
        </FadeIn>

        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-4" amount={0.2}>
          {allPlans.map((plan) => (
            <StaggerItem key={plan.key} className="h-full">
              <AnimatedCard className="h-full rounded-lg">
                <div
                  className={`h-full rounded-lg border p-6 flex flex-col transition-colors duration-300 ${
                    plan.key === "pro"
                      ? "border-primary/50 bg-card ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-foreground/25"
                  }`}
                >
                  {plan.key === "pro" && (
                    <span className="eyebrow mb-4 text-primary">Most popular</span>
                  )}
                  <h3 className="text-lg font-semibold font-heading tracking-tight text-foreground">{plan.name}</h3>
                  <p className="mt-3 text-4xl font-bold font-heading tracking-tight text-foreground">
                    {plan.price}
                    <span className="text-base font-medium text-muted-foreground">{plan.period}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <motion.div whileTap={{ scale: 0.97 }} transition={springTap} className="mt-6">
                    <Link
                      href={plan.key === "free" ? "/signup" : "/dashboard/settings/billing"}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-[15px] font-semibold transition-colors ${
                        plan.key === "pro"
                          ? "bg-gradient-mint text-white"
                          : "border border-border bg-card text-foreground hover:bg-muted/60"
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

        <FadeIn delay={0.2} className="mt-8">
          <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
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
    <section className="cv-auto relative border-t border-border py-24 md:py-32 overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-gradient-section" />

      <FadeIn className="relative max-w-3xl mx-auto px-6">
        <p className="eyebrow mb-5 text-muted-foreground">
          <span className="text-primary">04</span> / Get started
        </p>
        <SplitHeadline
          text="Ready to automate your Instagram?"
          className="text-section font-bold font-heading text-foreground"
        />
        <p className="mt-5 max-w-xl text-base leading-[1.7] text-muted-foreground">
          Set up your first automation in minutes. Your next commenter becomes
          your next customer.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={springSnappy}
            onMouseEnter={() => sendRef.current?.startAnimation()}
            onMouseLeave={() => sendRef.current?.stopAnimation()}
          >
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2.5 rounded-lg bg-gradient-mint px-8 py-3.5 text-[15px] font-semibold text-white"
            >
              Get started — it&apos;s free
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>
          {/* linked to the button: hovering 'Get started' draws the plane */}
          <SendIcon ref={sendRef} />
        </div>
        <p className="mt-8 font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
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
        {/* everything below the hero — the hero's backdrop language (fine
            grid + dark wash) extended down the page, dark-mode only,
            ending above the footer */}
        <div className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden dark:block">
            {/* ONE continuous world: a uniform green-navy wash covers
                everything evenly — no localized blobs behind sections */}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.16_0.025_250/60%)_0%,oklch(0.14_0.035_168/45%)_25%,oklch(0.14_0.035_168/45%)_75%,oklch(0.16_0.025_250/60%)_100%)]" />
            {/* the hero's fine grid, continued */}
            <div className="absolute inset-0 bg-grid-fine opacity-30" />
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
