-- Auto-detect is now the default language for AI agents.
-- The column used to default to 'en' (which the reply logic silently treated
-- as auto anyway, but the settings UI showed nothing selected). Make the
-- intent explicit: new agents default to 'auto', and any legacy 'en'/null
-- rows are moved to 'auto' so the UI shows "Auto-detect" selected.

UPDATE ai_agents
SET language = 'auto'
WHERE language IS NULL OR language IN ('', 'en');

ALTER TABLE ai_agents
  ALTER COLUMN language SET DEFAULT 'auto';
