"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HelpCircle,
  ChevronDown,
  MessageSquare,
  Zap,
  Shield,
  CreditCard,
  Link2,
  Bot,
} from "lucide-react";

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

  const currentCategory = categories.find((c) => c.id === activeCategory);

  return (
    <div className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)] text-sm font-medium mb-4">
            <HelpCircle className="w-4 h-4" />
            Help Center
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
            How can we help?
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
            Find answers to common questions about ChirplyMint.
          </p>
        </div>

        <div className="grid md:grid-cols-[220px_1fr] gap-8">
          {/* Category Sidebar */}
          <nav className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setOpenFaq(null);
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? "bg-[oklch(0.52_0.19_162)] text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </nav>

          {/* FAQ Content */}
          <div className="space-y-3">
            {currentCategory?.faqs.map((faq, i) => {
              const faqId = `${activeCategory}-${i}`;
              const isOpen = openFaq === faqId;

              return (
                <div
                  key={faqId}
                  className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : faqId)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-muted/10 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 -mt-1">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center rounded-2xl bg-gradient-to-br from-[oklch(0.52_0.19_162/8%)] to-[oklch(0.45_0.2_200/5%)] border border-[oklch(0.52_0.19_162/15%)] p-10">
          <MessageSquare className="w-10 h-10 text-[oklch(0.52_0.19_162)] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            Still have questions?
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Can&apos;t find what you&apos;re looking for? Our team is happy to
            help.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[oklch(0.52_0.19_162)] text-white font-semibold text-sm hover:bg-[oklch(0.48_0.19_162)] transition-colors shadow-md"
          >
            <MessageSquare className="w-4 h-4" />
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
