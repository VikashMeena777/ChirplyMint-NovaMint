-- Message Stack composer: composable multi-block DM sequences
-- blocks: [{type, ...content}] — text / image_album / pdf / button_card /
-- quick_replies / media_share / sticker, sent sequentially in an open window.
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS template_blocks JSONB DEFAULT '[]'::jsonb;
-- Welcome flow toggle (ice breakers + persistent menu auto-setup on connect)
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS auto_react BOOLEAN DEFAULT false;
ALTER TABLE public.instagram_accounts ADD COLUMN IF NOT EXISTS welcome_flow_setup BOOLEAN DEFAULT false;
-- Granular notification prefs are stored in profiles.notification_preferences (JSONB) — no DDL needed.
-- A/B auto-winner
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS ab_auto_winner BOOLEAN DEFAULT false;
-- Story-link branching: map link_sticker_url -> custom DM text
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS story_link_branches JSONB DEFAULT '[]'::jsonb;
