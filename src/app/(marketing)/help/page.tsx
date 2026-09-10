"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  ChevronDown,
  MessageSquare,
  Zap,
  Shield,
  CreditCard,
  Link2,
  Bot,
  Search,
  ArrowRight,
} from "lucide-react";
import PageHero from "@/components/marketing/page-hero";
import Reveal from "@/components/motion/reveal";

const categories = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: Zap,
    faqs: [
      {
        q: "What is ChirplyMint?",
        a: "ChirplyMint is an Instagram DM automation platform. When someone comments a specific keyword on your post, we automatically send them a personalized DM with your content — a link, PDF, discount code, or an AI-generated reply.",
      },
      {
        q: "How do I connect my Instagram account?",
        a: "Go to Settings → Instagram Connection and click 'Connect Instagram'. You'll be redirected to Meta to authorize ChirplyMint. We only request the permissions needed to read comments and send DMs on your behalf.",
      },
      {
        q: "Is my Instagram account safe?",
        a: "Yes! We use the official Meta/Instagram Graph API exclusively. We never scrape, use unofficial methods, or do anything that could risk your account. Your data is encrypted and never shared.",
      },
      {
        q: "How do I create my first automation?",
        a: "Go to Dashboard → Automations → click 'New Automation'. Set your trigger keyword (e.g., 'INFO'), write the DM reply message, and optionally paste the Instagram post URL. Enable it and you're live!",
      },
    ],
  },
  {
    id: "automations",
    label: "Automations",
    icon: Bot,
    faqs: [
      {
        q: "What are trigger keywords?",
        a: "A trigger keyword is the word a user comments on your post to receive an automated DM. For example, if your keyword is 'GUIDE', anyone commenting 'GUIDE' on the linked post will receive your DM automatically.",
      },
      {
        q: "How does AI Smart Replies work?",
        a: "When AI Smart Replies is enabled, instead of sending a fixed template, our AI (powered by NVIDIA NIM) generates a personalized, context-aware DM based on the user's comment and your automation settings. It's like having a 24/7 virtual assistant.",
      },
      {
        q: "Can I have multiple automations per post?",
        a: "Yes! You can create multiple automations with different keywords for the same or different posts. Each keyword triggers its own unique DM reply.",
      },
      {
        q: "What happens if someone comments the keyword multiple times?",
        a: "We have built-in deduplication. A user will only receive one DM per automation — even if they comment the keyword multiple times.",
      },
    ],
  },
  {
    id: "instagram",
    label: "Instagram & Meta",
    icon: Link2,
    faqs: [
      {
        q: "What permissions does ChirplyMint need?",
        a: "We request: instagram_manage_messages (to send DMs), instagram_manage_comments (to read comments), and pages_read_engagement (required by Meta). We never post on your behalf or access your personal data.",
      },
      {
        q: "Does it work with personal accounts?",
        a: "No. Instagram DM automation requires a Business or Creator account connected to a Facebook Page. This is a requirement from Meta's API, not a ChirplyMint limitation.",
      },
      {
        q: "Will my followers know I'm using automation?",
        a: "No. DMs are sent from your account as normal messages. There's no branding or 'sent via ChirplyMint' tag on the messages.",
      },
    ],
  },
  {
    id: "billing",
    label: "Plans & Billing",
    icon: CreditCard,
    faqs: [
      {
        q: "Is ChirplyMint free?",
        a: "Yes! The Starter plan is completely free and includes 1 active automation and 50 DMs per month. Upgrade to Pro or Business when you need more.",
      },
      {
        q: "How do I upgrade my plan?",
        a: "Go to Settings → Subscription and choose Pro (₹999/mo) or Business (₹2,999/mo). Payment is processed securely through our payment gateway.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Absolutely. No contracts, no lock-in. Cancel anytime from your Settings page. Your account will continue working until the end of your billing period.",
      },
    ],
  },
  {
    id: "security",
    label: "Security & Privacy",
    icon: Shield,
    faqs: [
      {
        q: "How is my data stored?",
        a: "All data is stored in encrypted Supabase (PostgreSQL) databases with Row Level Security (RLS). Each user can only access their own data. We never share or sell your information.",
      },
      {
        q: "Can I delete my data?",
        a: "Yes. You can delete individual leads, messages, or your entire account from the Settings page. All associated data is permanently removed.",
      },
      {
        q: "Is ChirplyMint GDPR compliant?",
        a: "Yes. We follow GDPR guidelines including data minimization, right to erasure, and transparent data handling. See our Privacy Policy for details.",
      },
    ],
  },
];

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState("getting-started");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const currentCategory = categories.find((c) => c.id === activeCategory);
  const q = query.trim().toLowerCase();
  const visibleFaqs = q
    ? categories.flatMap((c) => c.faqs.map((f) => ({ ...f, cat: c.label }))).filter(
        (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
      )
    : (currentCategory?.faqs ?? []);

  return (
    <div className="pb-24">
      <PageHero
        kicker="Help center"
        title={<>How can we <span className="text-gradient">help?</span></>}
        subtitle="Search everything, or browse by topic. Most answers take 30 seconds to read."
      >
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search answers… (try “refund”, “business account”, “keyword”)"
            className="w-full h-13 py-3.5 pl-11 pr-4 rounded-2xl glass text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-mint/50 placeholder:text-muted-foreground/70"
          />
        </div>
      </PageHero>

      <div className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-[240px_1fr] gap-6 items-start">
          {/* Category Sidebar */}
          {!q && (
            <nav className="md:sticky md:top-24 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-6 px-6 md:mx-0 md:px-0">
              {categories.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setOpenFaq(null);
                    }}
                    className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      active ? "text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="help-cat"
                        className="absolute inset-0 rounded-xl bg-gradient-mint shadow-md shadow-mint/25"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <cat.icon className="w-4 h-4 relative" />
                    <span className="relative">{cat.label}</span>
                    <span className={`relative ml-auto text-[11px] px-1.5 py-0.5 rounded-md ${active ? "bg-white/20" : "bg-muted"}`}>
                      {cat.faqs.length}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* FAQ Content */}
          <div className="space-y-3 min-w-0">
            {q && (
              <p className="text-sm text-muted-foreground">
                <b className="text-foreground">{visibleFaqs.length}</b> result{visibleFaqs.length !== 1 ? "s" : ""} for “{query.trim()}”
              </p>
            )}
            {visibleFaqs.length === 0 && (
              <div className="rounded-3xl card-elevated p-10 text-center">
                <HelpCircle className="w-8 h-8 text-mint mx-auto mb-3" />
                <p className="font-semibold">No matches found</p>
                <p className="text-sm text-muted-foreground mt-1">Try different words — or ask us directly below.</p>
              </div>
            )}
            {visibleFaqs.map((faq, i) => {
              const faqId = `${"cat" in faq ? (faq as { cat: string }).cat : activeCategory}-${i}-${faq.q}`;
              const isOpen = openFaq === faqId;

              return (
                <Reveal key={faqId} delay={Math.min(i * 0.03, 0.15)}>
                <div
                  className={`rounded-2xl border overflow-hidden transition-colors ${
                    isOpen ? "border-mint/40 bg-mint/[0.04]" : "border-border bg-card"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : faqId)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left"
                  >
                    <span>
                      {"cat" in faq && (
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-mint mb-1">
                          {(faq as { cat: string }).cat}
                        </span>
                      )}
                      <span className="text-[15px] font-semibold text-foreground">{faq.q}</span>
                    </span>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${isOpen ? "bg-gradient-mint text-white rotate-180" : "bg-muted text-muted-foreground"}`}>
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="c"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        {/* Contact CTA */}
        <Reveal className="mt-16 text-center rounded-3xl bg-gradient-to-br from-mint/10 to-emerald/5 border border-mint/20 p-10">
          <span className="w-12 h-12 rounded-2xl bg-gradient-mint flex items-center justify-center mx-auto mb-4 shadow-lg shadow-mint/25">
            <MessageSquare className="w-5 h-5 text-white" />
          </span>
          <h2 className="text-2xl font-bold mb-2">Still stuck?</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Can&apos;t find what you&apos;re looking for? Our humans reply within a day.
          </p>
          <Link
            href="/contact"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-mint text-white font-semibold text-sm btn-shine glow-mint-sm hover:scale-[1.02] transition-transform"
          >
            <MessageSquare className="w-4 h-4" />
            Contact Support
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
