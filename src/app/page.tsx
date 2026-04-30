"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Zap,
  Bot,
  BarChart3,
  Shield,
  Clock,
  ArrowRight,
  Check,
  Link2,
  Sparkles,
  Send,
  Users,
  ChevronRight,
  Star,
  UserCheck,
  MousePointerClick,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { LiveActivityFeed } from "@/components/marketing/live-activity-feed";
import { getLiveFeedItems } from "@/lib/actions/live-feed";


/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ─── HERO ─── */
function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 dot-grid opacity-30" />

      {/* Soft glowing orbs */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-mint/8 blur-[120px]" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald/6 blur-[100px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center pt-20">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-mint/15 mb-8"
        >
          <Sparkles className="w-4 h-4 text-mint" />
          <span className="text-sm text-mint-dark font-semibold">
            AI-Powered Instagram Automation
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight leading-[1.08] mb-6 text-foreground"
        >
          Turn Comments Into
          <br />
          <span className="text-gradient">Customers</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          ChirplyMint automatically replies to Instagram comments with
          personalized DMs — delivering guides, links, and answers using AI.
          <span className="text-foreground font-semibold">
            {" "}24/7, zero effort.
          </span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-mint text-white font-semibold text-base glow-mint transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Free
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="#demo"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-border bg-card font-medium text-foreground transition-all hover:border-mint/30 hover:shadow-md"
          >
            See How It Works
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-2 font-medium">Loved by creators</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-mint" />
            <span>100% Meta Approved</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-mint" />
            <span>Setup in 2 Minutes</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: Link2,
      title: "Connect Instagram",
      description:
        "Link your Instagram business account in one click. No coding required.",
    },
    {
      step: "02",
      icon: Bot,
      title: "Set Your AI Persona",
      description:
        "Tell the AI what to say, how to reply, and what to send. It acts like you.",
    },
    {
      step: "03",
      icon: Send,
      title: "Auto-Reply to Comments",
      description:
        "When someone comments a keyword, they instantly get your guide or link via DM.",
    },
    {
      step: "04",
      icon: BarChart3,
      title: "Track & Optimize",
      description:
        "See who engaged, what converted, and refine your funnel in real-time.",
    },
  ];

  return (
    <section id="demo" className="relative py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.p
            variants={fadeUp}
            className="text-mint font-semibold text-sm uppercase tracking-widest mb-3"
          >
            How It Works
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-5xl font-bold text-foreground"
          >
            From Comment to Customer
            <br />
            <span className="text-muted-foreground font-medium">in 4 Simple Steps</span>
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              custom={i}
              variants={fadeUp}
              className="group relative p-6 rounded-2xl card-elevated-hover"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-mono text-mint-dark/50 font-bold">
                  {step.step}
                </span>
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center group-hover:bg-mint/15 transition-colors">
                  <step.icon className="w-5 h-5 text-mint" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── FEATURES ─── */
function Features() {
  const features = [
    {
      icon: MessageCircle,
      title: "Smart Comment Triggers",
      description:
        "Set keywords on any post or reel. When someone comments that word, they instantly get your content via DM.",
    },
    {
      icon: Bot,
      title: "AI Persona Engine",
      description:
        "Create custom AI personalities for your brand. Your AI remembers past chats and replies in your unique voice.",
    },
    {
      icon: UserCheck,
      title: "Follow-Check Gating",
      description:
        "Require users to follow your account before receiving a DM. Grow your followers while delivering value.",
    },
    {
      icon: MousePointerClick,
      title: "Interactive Button DMs",
      description:
        "Send rich button templates — URL links and postback buttons — directly in DMs for higher engagement.",
    },
    {
      icon: Zap,
      title: "Postback Flow Builder",
      description:
        "Build multi-step interactive funnels. When users tap a button, trigger follow-up messages, tag leads, and more.",
    },
    {
      icon: Users,
      title: "Lead Capture & Tagging",
      description:
        "Automatically capture leads from DM interactions. Tag and segment them based on button clicks and behavior.",
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description:
        "Track DMs sent, comment replies, lead conversions, and top-performing posts — all in one dashboard.",
    },
    {
      icon: Shield,
      title: "100% Meta Compliant",
      description:
        "Built on the official Instagram API. No shadow bans, no account risks. Fully reviewed and approved by Meta.",
    },
  ];

  return (
    <section className="relative py-24 md:py-32" id="features">
      {/* Subtle background accent */}
      <div className="absolute inset-0 bg-gradient-section" />

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.p
            variants={fadeUp}
            className="text-mint font-semibold text-sm uppercase tracking-widest mb-3"
          >
            Features
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-5xl font-bold text-foreground"
          >
            Everything You Need to
            <br />
            <span className="text-gradient">Automate & Convert</span>
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              variants={fadeUp}
              className="group relative p-8 rounded-2xl card-elevated-hover transition-all duration-300 hover:border-mint/60 hover:shadow-[0_0_24px_oklch(0.52_0.19_162/15%)] hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-5 group-hover:bg-mint/15 transition-colors">
                <feature.icon className="w-6 h-6 text-mint" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── PRICING ─── */
function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "Free",
      period: "",
      description: "Perfect for testing the waters",
      features: [
        "1 Instagram Account",
        "50 DMs / month",
        "1 Automation",
        "Comment Auto-Reply",
        "Story Reply Triggers",
        "Text & Button DM Templates",
        "Follow-Check (Followers Only)",
        "Basic Analytics",
      ],
      comingSoon: [] as string[],
      cta: "Start Free",
      highlight: false,
    },
    {
      name: "Pro",
      price: "₹499",
      period: "/month",
      description: "For creators who mean business",
      features: [
        "3 Instagram Accounts",
        "2,000 DMs / month",
        "10 Automations",
        "Everything in Starter",
        "AI Smart Replies",
        "Postback Flow Builder",
        "A/B Testing",
        "Lead Capture & Export",
        "Advanced Analytics",
        "Priority Email Support",
      ],
      comingSoon: [] as string[],
      cta: "Upgrade to Pro",
      highlight: true,
    },
    {
      name: "Business",
      price: "₹1,499",
      period: "/month",
      description: "For teams and agencies",
      features: [
        "10 Instagram Accounts",
        "Unlimited DMs",
        "Unlimited Automations",
        "Everything in Pro",
        "Advanced AI",
        "Multi-Step DM Funnels",
        "Dedicated WhatsApp Support",
      ],
      comingSoon: [
        "Multi IG Account Connect",
        "Team Members",
        "API Access",
        "White-Label",
      ],
      cta: "Upgrade to Business",
      highlight: false,
    },
  ];

  return (
    <section className="relative py-24 md:py-32" id="pricing">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.p
            variants={fadeUp}
            className="text-mint font-semibold text-sm uppercase tracking-widest mb-3"
          >
            Pricing
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-3xl md:text-5xl font-bold text-foreground"
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground mt-4 max-w-md mx-auto"
          >
            Start free. Upgrade when you&apos;re ready.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              custom={i}
              variants={fadeUp}
              className={`relative p-8 rounded-2xl transition-all duration-300 ${
                plan.highlight
                  ? "card-highlight scale-[1.03]"
                  : "card-elevated-hover"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-mint text-xs font-bold text-white tracking-wide">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl font-bold mb-1 text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {plan.description}
              </p>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                )}
              </div>

              <Link
                href="/signup"
                className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  plan.highlight
                    ? "bg-gradient-mint text-white glow-mint hover:scale-[1.02]"
                    : "bg-secondary text-foreground hover:bg-accent border border-border"
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-mint" />
                    </div>
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
                {plan.comingSoon.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0">
                      <Clock className="w-3 h-3 text-amber-500/60" />
                    </div>
                    <span className="text-muted-foreground/60">{feature}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium leading-none">Soon</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function FinalCTA() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute inset-0 bg-gradient-section" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-mint/6 blur-[150px] rounded-full" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={stagger}
        className="relative max-w-3xl mx-auto px-6 text-center"
      >
        <motion.h2
          variants={fadeUp}
          className="text-3xl md:text-5xl font-bold mb-6 text-foreground"
        >
          Ready to Automate
          <br />
          <span className="text-gradient">Your Instagram?</span>
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto"
        >
          Join thousands of creators who save hours every week with ChirplyMint. Start free — no credit card required.
        </motion.p>
        <motion.div variants={fadeUp}>
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-mint text-white font-semibold text-base glow-mint transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started — It&apos;s Free
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── PAGE ─── */
export default function Home() {
  const [feedItems, setFeedItems] = useState<
    { id: string; detail: string; timeAgo: string }[]
  >([]);

  useEffect(() => {
    // Fetch live feed data
    getLiveFeedItems(12).then((items) => {
      setFeedItems(items);
    });
  }, []);

  return (
    <main className="relative overflow-hidden bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Pricing />
      <FinalCTA />
      <Footer />
      {feedItems.length > 0 && <LiveActivityFeed initialItems={feedItems} />}
    </main>
  );
}
