import type { Metadata } from "next";
import Link from "next/link";
import { AtSign, MousePointerClick, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Public Roadmap — ChirplyMint",
  description:
    "What's shipped, what we're building, and what we're considering for ChirplyMint.",
};

interface RoadmapItem {
  title: string;
  description?: string;
}

const shipped: RoadmapItem[] = [
  {
    title: "Message Stacks",
    description: "Send any combination of DMs — text, images, links, and more in one flow.",
  },
  {
    title: "AI Agent",
    description: "Trained on your persona and FAQs, answering DMs for you.",
  },
  {
    title: "Drip sequences",
    description: "Multi-step follow-ups delivered over time.",
  },
  {
    title: "A/B testing with auto-winner",
    description: "Test message variants and let the better one win automatically.",
  },
  {
    title: "Quick replies with email/phone capture",
    description: "Collect contact details right inside the DM conversation.",
  },
  {
    title: "Real inbox with manual takeover",
    description: "Step in and reply yourself whenever you want.",
  },
  {
    title: "Comment moderation",
    description: "Hide or delete spam and negative comments automatically.",
  },
  {
    title: "Conversion funnel analytics",
    description: "See how comments turn into DMs and leads.",
  },
  {
    title: "Team seats",
    description: "Invite teammates into your workspace.",
  },
  {
    title: "Public API",
    description: "Automate and integrate ChirplyMint with your own stack.",
  },
  {
    title: "Instagram insights",
    description: "Follower and engagement data pulled into your dashboard.",
  },
];

const inProgress: RoadmapItem[] = [
  {
    title: "Human Agent permission approval",
    description: "Awaiting Meta review to enable human-agent messaging windows.",
  },
  {
    title: "Auto-like comments",
    description: "Awaiting Meta review before this can ship.",
  },
];

const considering: RoadmapItem[] = [
  {
    title: "White-label domains",
    description: "Host automations on your own branded domain.",
  },
  {
    title: "Team analytics",
    description: "Per-member performance reporting for teams.",
  },
  {
    title: "Ad integrations",
    description: "Trigger automations from Meta ad activity.",
  },
];

const howItWorks = [
  {
    step: "1",
    icon: AtSign,
    title: "Connect Instagram",
    description:
      "Link your Instagram Business account in one click through the official Meta API. No password needed.",
  },
  {
    step: "2",
    icon: MousePointerClick,
    title: "Pick a keyword",
    description:
      "Choose the comment keyword that triggers your automation on any post or reel.",
  },
  {
    step: "3",
    icon: MessageCircle,
    title: "Auto-DM your leads",
    description:
      "Everyone who comments gets your message in DMs instantly — while you watch leads roll in.",
  },
];

function Column({
  label,
  marker,
  items,
  emptyNote,
}: {
  label: string;
  marker: string;
  items: RoadmapItem[];
  emptyNote?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <span aria-hidden className="text-lg leading-none">
          {marker}
        </span>
        <h2 className="text-lg font-bold text-foreground">{label}</h2>
        <span className="ml-auto text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted/40">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyNote}</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span
                aria-hidden
                className="shrink-0 mt-0.5 text-sm leading-5"
              >
                {marker}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground leading-5">
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <div className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)] text-sm font-medium mb-4">
            Public Roadmap
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
            What&apos;s shipped and what&apos;s next
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
            We keep this page honest and up to date. Everything listed under
            Shipped is live in the product today.
          </p>
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">
            How ChirplyMint works
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            Three steps from comment to conversation.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="relative rounded-2xl border border-border bg-card shadow-sm p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[oklch(0.52_0.19_162/10%)] text-[oklch(0.52_0.19_162)]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[oklch(0.52_0.19_162)] px-2 py-0.5 rounded-full bg-[oklch(0.52_0.19_162/10%)]">
                      Step {step.step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Roadmap columns */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          <Column label="Shipped" marker="✅" items={shipped} />
          <Column
            label="In Progress"
            marker="🚧"
            items={inProgress}
          />
          <Column
            label="Considering"
            marker="💡"
            items={considering}
          />
        </div>

        {/* Footer note */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground">
            Have a suggestion?{" "}
            <Link
              href="/contact"
              className="text-[oklch(0.52_0.19_162)] font-semibold hover:underline"
            >
              Tell us what to build next
            </Link>
            . Released changes are documented in the{" "}
            <Link
              href="/changelog"
              className="text-[oklch(0.52_0.19_162)] font-semibold hover:underline"
            >
              changelog
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
