import Link from "next/link";
import { KeyRound, Terminal, ShieldCheck, Gauge, BookOpen } from "lucide-react";

export const metadata = { title: "API Documentation — ChirplyMint" };

const BASE = "https://chirplymint.novamintnetworks.in/api/v1";

const ENDPOINTS = [
  {
    path: "/leads",
    desc: "Your captured leads with contact info, tags and engagement.",
    example: `curl ${BASE}/leads?limit=10 \\
  -H "Authorization: Bearer cmk_your_key"`,
    response: `{
  "object": "list",
  "count": 2,
  "data": [
    {
      "ig_username": "fitness_fan",
      "ig_user_id": "178414...",
      "email": "fan@example.com",
      "phone": null,
      "source": "comment",
      "tags": ["interested"],
      "engagement": "interested",
      "custom_notes": null,
      "captured_at": "2026-09-11T10:24:00Z"
    }
  ]
}`,
  },
  {
    path: "/automations",
    desc: "Your automations with status and performance counters.",
    example: `curl ${BASE}/automations \\
  -H "Authorization: Bearer cmk_your_key"`,
    response: `{
  "object": "list",
  "count": 1,
  "data": [
    {
      "id": "uuid",
      "name": "Shred Guide",
      "keyword": "SEND",
      "status": "active",
      "template_type": "stack",
      "dms_sent": 220,
      "leads_captured": 90,
      "created_at": "2026-09-01T08:00:00Z"
    }
  ]
}`,
  },
  {
    path: "/dm-logs",
    desc: "Every DM delivered, with seen status.",
    example: `curl ${BASE}/dm-logs?limit=5 \\
  -H "Authorization: Bearer cmk_your_key"`,
    response: `{
  "object": "list",
  "count": 5,
  "data": [
    {
      "recipient_username": "fitness_fan",
      "message_text": "Here's the 7-day shred guide 📩",
      "status": "sent",
      "sent_at": "2026-09-11T10:24:01Z",
      "seen_at": "2026-09-11T10:25:10Z"
    }
  ]
}`,
  },
  {
    path: "/stats",
    desc: "Headline counters for your workspace.",
    example: `curl ${BASE}/stats \\
  -H "Authorization: Bearer cmk_your_key"`,
    response: `{
  "leads": 90,
  "dms_sent": 220,
  "active_automations": 1,
  "generated_at": "2026-09-11T12:00:00Z"
}`,
  },
];

export default function ApiDocsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 py-4">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/8 px-3 py-1 text-xs font-semibold text-mint-dark dark:text-mint-light">
          <BookOpen className="h-3.5 w-3.5" />
          API v1 · read-only
        </div>
        <h1 className="mt-4 text-3xl font-bold font-heading tracking-tight text-foreground">
          ChirplyMint API
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Pull your leads, automations, DM logs and stats into any tool —
          dashboards, sheets, your own app. The API is read-only and available
          on the <strong className="text-foreground">Business plan</strong>.
        </p>
      </div>

      {/* Auth */}
      <section className="rounded-2xl border border-border bg-card/60 p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <KeyRound className="h-4 w-4 text-mint" />
          Authentication
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Every request needs an API key in the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Authorization</code>{" "}
          header. Create keys in{" "}
          <Link href="/dashboard/settings/team" className="font-medium text-mint-dark underline dark:text-mint-light">
            Settings → Team &amp; API
          </Link>{" "}
          — the full key is shown exactly once and stored hashed, so save it
          somewhere safe.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-neutral-950 p-4 text-xs leading-relaxed text-neutral-100">
{`Authorization: Bearer cmk_live_xxxxxxxxxxxxxxxx`}
        </pre>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-mint" />
          Revoking a key in Settings takes effect immediately.
        </p>
      </section>

      {/* Endpoints */}
      <section className="space-y-6">
        <h2 className="text-base font-semibold text-foreground">Endpoints</h2>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" />
          Base URL:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">{BASE}</code> ·
          every list endpoint accepts{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">?limit=1-100</code>{" "}
          (default 50) · 60 requests/minute per key.
        </p>

        {ENDPOINTS.map((ep) => (
          <div key={ep.path} className="rounded-2xl border border-border bg-card/60 p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-mint/12 px-2.5 py-1 text-xs font-bold text-mint-dark dark:text-mint-light">GET</span>
              <code className="text-sm font-semibold text-foreground">{ep.path}</code>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{ep.desc}</p>
            <p className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              <Terminal className="h-3 w-3" /> Request
            </p>
            <pre className="mt-1.5 overflow-x-auto rounded-xl bg-neutral-950 p-4 text-xs leading-relaxed text-neutral-100">
{ep.example}
            </pre>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Response
            </p>
            <pre className="mt-1.5 overflow-x-auto rounded-xl bg-neutral-950 p-4 text-xs leading-relaxed text-neutral-100">
{ep.response}
            </pre>
          </div>
        ))}
      </section>

      {/* Errors */}
      <section className="rounded-2xl border border-border bg-card/60 p-6">
        <h2 className="text-base font-semibold text-foreground">Errors</h2>
        <div className="mt-3 space-y-2 text-sm">
          {[
            ["401", "Missing, malformed, or revoked API key"],
            ["404", "Unknown resource path"],
            ["429", "Rate limit exceeded (60 req/min) — retry after a minute"],
          ].map(([code, msg]) => (
            <p key={code} className="flex items-start gap-3">
              <span className="w-10 shrink-0 rounded-md bg-red-500/10 px-1.5 py-0.5 text-center text-xs font-bold text-red-500">{code}</span>
              <span className="text-muted-foreground">{msg}</span>
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
