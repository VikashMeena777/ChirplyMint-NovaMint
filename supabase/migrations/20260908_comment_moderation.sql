-- Comment Auto-Moderation (Graph API v26):
-- Account-level keyword list. Any incoming comment containing one of these
-- words is hidden from the public feed (POST /{comment-id}?hide=true) and
-- never triggers automations. Empty array = moderation disabled.
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS auto_hide_keywords text[] DEFAULT '{}';
