-- AI agent onboarding: structured setup fields + the activation gate.
--
-- The agent used to activate with a placeholder persona ("You are a friendly
-- and helpful assistant.") and then hallucinated facts in DMs. Now the
-- wizard collects structured answers (what the owner does, what they post,
-- what they offer), assembles a rich persona from them, and only then can
-- the agent activate.

ALTER TABLE ai_agents
  ADD COLUMN IF NOT EXISTS setup_complete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS about_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS content_topics TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS offers_text TEXT DEFAULT '';

-- Backfill: agents whose persona was hand-written with real substance are
-- already set up. Anything still on a default/placeholder persona needs the
-- wizard — including previously "active" ones, which will stop auto-replying
-- until the owner completes setup (that is the point of the gate).
UPDATE ai_agents
SET setup_complete = true
WHERE length(trim(persona)) >= 60
  AND persona NOT ILIKE 'You are a helpful and friendly brand assistant%'
  AND persona NOT ILIKE 'You are a friendly and helpful assistant%';
