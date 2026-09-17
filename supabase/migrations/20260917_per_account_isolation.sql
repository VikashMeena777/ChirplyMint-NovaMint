-- Per-account isolation (R71)
-- Each connected Instagram account gets its own AI agent, AI inbox,
-- leads and link-in-bio page. Billing/team/profile stay per user.
--
-- Safe order per table: add nullable column → backfill → constrain/index.
-- Idempotent: every step can be re-run.

-- ─────────────────────────────────────────────────────────────
-- 1. AI AGENTS — one agent per (user, account)
--    Was UNIQUE(user_id): activating the agent for one account turned it
--    on for ALL of the user's accounts.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE ai_agents
  ADD COLUMN IF NOT EXISTS instagram_account_id uuid
  REFERENCES instagram_accounts(id) ON DELETE CASCADE;

-- Backfill: the account this agent has actually been working on = the one
-- with the most DM activity; else the user's oldest active account; else any.
UPDATE ai_agents a
SET instagram_account_id = sub.account_id
FROM (
  SELECT ia.id AS agent_id,
         COALESCE(
           (SELECT d.instagram_account_id FROM dm_logs d
             WHERE d.user_id = ia.user_id AND d.instagram_account_id IS NOT NULL
             GROUP BY d.instagram_account_id
             ORDER BY count(*) DESC LIMIT 1),
           (SELECT acc.id FROM instagram_accounts acc
             WHERE acc.user_id = ia.user_id AND acc.is_active
             ORDER BY acc.created_at ASC LIMIT 1),
           (SELECT acc.id FROM instagram_accounts acc
             WHERE acc.user_id = ia.user_id
             ORDER BY acc.created_at ASC LIMIT 1)
         ) AS account_id
  FROM ai_agents ia
) sub
WHERE a.id = sub.agent_id
  AND a.instagram_account_id IS NULL
  AND sub.account_id IS NOT NULL;

ALTER TABLE ai_agents DROP CONSTRAINT IF EXISTS ai_agents_user_id_key;
ALTER TABLE ai_agents DROP CONSTRAINT IF EXISTS ai_agents_user_account_key;
ALTER TABLE ai_agents
  ADD CONSTRAINT ai_agents_user_account_key UNIQUE (user_id, instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_account ON ai_agents(instagram_account_id);

-- ─────────────────────────────────────────────────────────────
-- 2. AI CONVERSATIONS (AI Inbox) — per account
-- ─────────────────────────────────────────────────────────────
ALTER TABLE ai_conversations
  ADD COLUMN IF NOT EXISTS instagram_account_id uuid
  REFERENCES instagram_accounts(id) ON DELETE CASCADE;

-- From the agent that produced the conversation…
UPDATE ai_conversations c
SET instagram_account_id = aa.instagram_account_id
FROM ai_agents aa
WHERE aa.id = c.agent_id
  AND c.instagram_account_id IS NULL
  AND aa.instagram_account_id IS NOT NULL;

-- …then from the DM log to that sender (most recent).
UPDATE ai_conversations c
SET instagram_account_id = (
  SELECT d.instagram_account_id FROM dm_logs d
  WHERE d.user_id = c.user_id
    AND d.recipient_ig_id = c.sender_ig_id
    AND d.instagram_account_id IS NOT NULL
  ORDER BY d.created_at DESC LIMIT 1
)
WHERE c.instagram_account_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_conversations_account ON ai_conversations(instagram_account_id);

-- ─────────────────────────────────────────────────────────────
-- 3. LEADS — per account, and fix the uniqueness collision
--    UNIQUE(user_id, ig_user_id) meant the same commenter could not be a
--    lead on TWO of the user's accounts (the second insert conflicted).
-- ─────────────────────────────────────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS instagram_account_id uuid
  REFERENCES instagram_accounts(id) ON DELETE SET NULL;

UPDATE leads l
SET instagram_account_id = COALESCE(
  (SELECT d.instagram_account_id FROM dm_logs d
    WHERE d.user_id = l.user_id
      AND d.recipient_ig_id = l.ig_user_id
      AND d.instagram_account_id IS NOT NULL
    ORDER BY d.created_at DESC LIMIT 1),
  (SELECT a.instagram_account_id FROM automations a WHERE a.id = l.automation_id)
)
WHERE l.instagram_account_id IS NULL;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_user_id_ig_user_id_key;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_user_account_ig_key;
ALTER TABLE leads
  ADD CONSTRAINT leads_user_account_ig_key UNIQUE (user_id, instagram_account_id, ig_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_account ON leads(instagram_account_id);

-- ─────────────────────────────────────────────────────────────
-- 4. BIO PAGES (Link-in-Bio) — one page per account
--    (slug stays globally unique; user_id uniqueness never existed)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE bio_pages
  ADD COLUMN IF NOT EXISTS instagram_account_id uuid
  REFERENCES instagram_accounts(id) ON DELETE SET NULL;

UPDATE bio_pages bp
SET instagram_account_id = (
  SELECT acc.id FROM instagram_accounts acc
  WHERE acc.user_id = bp.user_id AND acc.is_active
  ORDER BY acc.created_at ASC LIMIT 1
)
WHERE bp.instagram_account_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_bio_pages_account ON bio_pages(instagram_account_id);

-- ─────────────────────────────────────────────────────────────
-- 5. DM LOGS already carries instagram_account_id (the analytics source)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dm_logs_account_created
  ON dm_logs(instagram_account_id, created_at DESC);
