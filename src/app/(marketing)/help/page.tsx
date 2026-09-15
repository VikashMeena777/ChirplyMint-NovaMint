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

import { FAQ_CATEGORIES } from "@/lib/help-faqs";

// Icons live here (client); the shared data module stays plain so the
// server layout can also import it for the FAQPage JSON-LD.
const CATEGORY_ICONS: Record<string, typeof Zap> = {
  "getting-started": Zap,
  automations: Bot,
  instagram: Link2,
  billing: CreditCard,
  security: Shield,
};

const categories = FAQ_CATEGORIES.map((c) => ({
  ...c,
  icon: CATEGORY_ICONS[c.id] ?? HelpCircle,
}));

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
