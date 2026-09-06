# ChirplyMint 🌿

**Instagram DM automation for the Indian creator economy.** Turn every comment into a conversation: keyword-triggered auto-DMs, story-reply automation, drip sequences, AI smart replies, lead capture, link-in-bio, and A/B testing — with UPI-native payments via Cashfree.

> Plan pricing lives in **one place**: [`src/lib/utils/plan-limits.ts`](src/lib/utils/plan-limits.ts). Starter (free, 50 DMs/mo) · Pro (₹499) · Business (₹1,499). Every pricing surface reads from it.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Server Actions) + React 19 + TypeScript |
| Database & Auth | Supabase (Postgres, RLS on every table, SSR sessions) |
| Instagram | Instagram API with Instagram Login (`graph.instagram.com/v25.0`), Meta webhooks |
| Payments | Cashfree PG (orders + signed webhooks + API verification fallback) |
| Email | Resend (transactional + weekly reports, Svix-verified webhooks) |
| AI | NVIDIA NIM (smart replies, FAQ knowledge base) |
| Rate limiting | Upstash Redis (auth / api / dm / ai limiters, fails open when unset) |
| Analytics | PostHog (web + server), optional Sentry (`SENTRY_DSN`) |
| Hosting | Vercel (`bom1` region) + 10 externally-scheduled cron jobs (cron-job.org) |

## Project Layout

```
src/
├── app/
│   ├── (marketing)/        # landing, pricing, privacy, terms, data-policy, help…
│   ├── (auth)/             # login, signup, forgot-password
│   ├── (app)/dashboard/    # automations, leads, analytics, ai-agent, bio, settings…
│   ├── api/
│   │   ├── webhooks/       # instagram (Meta), cashfree, resend — all signature-verified
│   │   ├── cron/           # 10 secret-protected jobs (see vercel.json crons)
│   │   ├── payments/       # create-order + verify (server-side pricing only)
│   │   └── auth/instagram/ # OAuth callback + data-deletion + deauthorize (Meta compliance)
│   └── u/[slug]/           # public link-in-bio pages
├── lib/
│   ├── actions/            # server actions (ownership-checked, user-scoped queries)
│   ├── instagram/          # DM engine: retries, rate-limit taxonomy, HUMAN_AGENT
│   ├── utils/plan-limits.ts# single source of truth for plans & gating
│   └── supabase/           # server / client / middleware session helpers
└── middleware.ts           # session refresh + dashboard guard + onboarding redirect
```

## Local Development

```bash
npm install
cp .env.example .env.local   # fill in the values (see LAUNCH_GUIDE.md)
npm run dev                  # http://localhost:3000
```

Useful checks:

```bash
npx tsc --noEmit    # type check
npm run lint        # eslint
npm run build       # production build
```

## Database Migrations

Schema lives in `supabase/`. ⚠️ The live database has drifted from the repo files (migrations were applied ad hoc), so `20260906_security_hardening.sql` was written against the **verified live schema** — it has been **applied to the live database (2026-09-06) and behaviorally verified** (`node ../db-probe.mjs`). For a **fresh** database, run in this order via the Supabase SQL editor (or CLI):

1. `supabase/migration.sql` — core tables (profiles, automations, dm_logs, leads, …) + RLS + signup trigger
2. `supabase/migrations/20260905_comprehensive_schema.sql` — everything added since (IG multi-account, drips, A/B, postbacks, AI, bio pages, referrals) + RLS + indexes
3. `supabase/migrations/20260906_security_hardening.sql` — **required**: adds missing columns, locks plan/DM-limit/subscription/payment-order writes to the server, adds the missing dm_logs UPDATE policy

## Cron Jobs

All `/api/cron/*` routes require `Authorization: Bearer $CRON_SECRET` and are scheduled **externally** (cron-job.org — there is deliberately no `crons` section in `vercel.json`). There are 11 jobs — `daily-digest` bundles notifications for users who enable it in Settings.

| Job | Schedule | Purpose |
|---|---|---|
| `drip-processor` | hourly | send due drip-sequence steps |
| `onboarding-drip` | hourly | onboarding email nurture |
| `dm-retry` | every 30 min | retry rate-limited DMs |
| `subscription-check` | daily | renewals, 3-day grace, auto-downgrade |
| `token-refresh` | daily | refresh Instagram long-lived tokens |
| `plan-limit-check` | daily | warn users nearing DM limits |
| `dm-reset` | monthly (1st) | reset free-plan DM counters |
| `weekly-report` | Mon 08:00 | performance report email |
| `engagement-emails` | Mon 09:00 | re-engagement campaigns |
| `daily-digest` | daily 09:00 IST | bundled digest email for digest-mode users |

## Deployment (Vercel)

1. Push to GitHub → import in Vercel (framework auto-detected).
2. Add every variable from `.env.example` in **Project → Settings → Environment Variables** (Production + Preview).
3. Set `NEXT_PUBLIC_APP_URL` to your production domain — it drives OAuth redirects, webhook URLs, sitemap, and emails.
4. Point your domain, then configure the Meta webhook callback + Cashfree/Resend webhook URLs against it.

The complete go-live checklist (Cashfree live keys, Upstash, Resend domain, Meta app review, Supabase hardening migration) is in **[LAUNCH_GUIDE.md](../LAUNCH_GUIDE.md)**.

## Security Model

- Webhooks: Meta HMAC (timing-safe), Cashfree SDK signature, Resend Svix — all fail closed.
- OAuth: Instagram connect uses a random `state` nonce bound to an httpOnly cookie and requires an authenticated session — no forged account binding. Auth callback redirects are same-origin only.
- Payments: prices are resolved server-side from `plan-limits.ts`; plans activate only after Cashfree API/webhook verification; subscriptions expire with a 3-day grace period.
- DB: RLS on all 24 tables; plan/DM-limit/subscription/payment-order writes are server-only (column-level grants + dropped client policies); tokens/crons never exposed to the client.
- Verified: `node db-probe.mjs` (repo parent folder) re-runs a behavioral RLS probe — it should report the escalation attempts as BLOCKED.
