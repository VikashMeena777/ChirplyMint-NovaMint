/**
 * Help-center FAQ content — the single source both the /help page AND its
 * FAQPage JSON-LD render from, so the visible answers and the structured
 * data can never drift apart (Google requires markup to mirror visible
 * content).
 *
 * (Rich-result note: Google retired the FAQ rich result in May 2026, so
 * this markup is understanding-only — but keeping it truthful + in sync
 * costs nothing and helps every non-Google consumer.)
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  faqs: FaqItem[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "getting-started",
    label: "Getting Started",
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
    faqs: [
      {
        q: "What are trigger keywords?",
        a: "A trigger keyword is the word a user comments on your post to receive an automated DM. For example, if your keyword is 'GUIDE', anyone commenting 'GUIDE' on the linked post will receive your DM automatically.",
      },
      {
        q: "How does AI Smart Replies work?",
        a: "When AI Smart Replies is enabled, instead of sending a fixed template, our AI generates a personalized, context-aware DM based on the user's comment and your automation settings. On paid plans you can train it with your own persona and FAQs so it replies like you would. It's like having a 24/7 virtual assistant.",
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
    faqs: [
      {
        q: "What permissions does ChirplyMint need?",
        a: "We request: instagram_business_manage_messages (to send DMs), instagram_business_manage_comments (to read comments), and instagram_business_basic (account info). We never post on your behalf or access your personal data.",
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
    faqs: [
      {
        q: "Is ChirplyMint free?",
        a: "Yes! The Starter plan is completely free forever and includes 1 active automation and 50 DMs per month. Upgrade to Pro or Business when you need more.",
      },
      {
        q: "How much do paid plans cost?",
        a: "Pro is ₹499/month with 2,000 DMs, 10 automations and AI Smart Replies. Business is ₹1,499/month with unlimited DMs and automations, team workspace and API access. Both have annual variants that save 2 months, and DM top-ups start at ₹99.",
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
