-- ═══════════════════════════════════════════════════════════════
-- ChirplyMint — Supplementary Migration (Missing Schema Audit Fix)
-- Covers all tables, columns, indexes, RLS policies, and RPC functions
-- referenced in code but missing from initial migration.sql.
-- ═══════════════════════════════════════════════════════════════

-- ─── 0. Utility RPC Functions ─────────────────────────────────

-- Atomic field increment function (used by webhook and drip engine)
CREATE OR REPLACE FUNCTION public.increment_field(
  table_name text,
  field_name text,
  row_id uuid
)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.%I SET %I = COALESCE(%I, 0) + 1 WHERE id = $1',
    table_name,
    field_name,
    field_name
  )
  USING row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 1. Alter Existing Tables (Add Missing Columns) ───────────

-- Profiles extensions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_upgraded_email_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_drip_sent JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- User settings extensions
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS page_access_token TEXT,
  ADD COLUMN IF NOT EXISTS access_token TEXT;

-- ─── 2. Connected Instagram Accounts (Multi-Account Support) ───
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ig_user_id TEXT NOT NULL,
  ig_username TEXT NOT NULL,
  ig_name TEXT,
  ig_profile_pic TEXT,
  access_token TEXT,
  page_id TEXT,
  page_access_token TEXT,
  is_active BOOLEAN DEFAULT true,
  failure_count INTEGER DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, ig_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ig_accounts_user_id ON public.instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_ig_accounts_ig_user_id ON public.instagram_accounts(ig_user_id);
CREATE INDEX IF NOT EXISTS idx_ig_accounts_is_active ON public.instagram_accounts(is_active);

-- Automations extensions (with FK to instagram_accounts)
ALTER TABLE public.automations
  ADD COLUMN IF NOT EXISTS instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dms_sent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_captured INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS require_follow BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS scope_type TEXT DEFAULT 'account',
  ADD COLUMN IF NOT EXISTS media_id TEXT,
  ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'text' CHECK (template_type IN ('text', 'button')),
  ADD COLUMN IF NOT EXISTS template_title TEXT,
  ADD COLUMN IF NOT EXISTS template_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS template_image_url TEXT,
  ADD COLUMN IF NOT EXISTS template_buttons JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS comment_reply_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS comment_reply_template TEXT;

CREATE INDEX IF NOT EXISTS idx_automations_ig_account_id ON public.automations(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_automations_media_id ON public.automations(media_id);

-- DM Logs extensions
ALTER TABLE public.dm_logs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'comment',
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comment_text TEXT,
  ADD COLUMN IF NOT EXISTS retry_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_dm_logs_created_at ON public.dm_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_dm_logs_ig_account_id ON public.dm_logs(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_dm_logs_retry_queue ON public.dm_logs(status, retry_after) WHERE status = 'rate_limited';

-- Leads extensions
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ig_username TEXT,
  ADD COLUMN IF NOT EXISTS ig_user_id TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_tags ON public.leads USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_leads_ig_user_id ON public.leads(ig_user_id);

-- ─── 3. Drip Sequences & Steps ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.drip_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  window_opener_text TEXT DEFAULT 'Do you follow me? Reply to unlock your bonus!',
  window_opener_buttons JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drip_sequences_automation_id ON public.drip_sequences(automation_id);
CREATE INDEX IF NOT EXISTS idx_drip_sequences_user_id ON public.drip_sequences(user_id);

CREATE TABLE IF NOT EXISTS public.drip_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.drip_sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  delay_hours INTEGER NOT NULL DEFAULT 1,
  message_text TEXT NOT NULL,
  template_type TEXT DEFAULT 'text' CHECK (template_type IN ('text', 'button')),
  template_title TEXT,
  template_subtitle TEXT,
  template_buttons JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sequence_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_drip_steps_sequence_id ON public.drip_steps(sequence_id);

CREATE TABLE IF NOT EXISTS public.drip_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.drip_sequences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  recipient_ig_id TEXT NOT NULL,
  recipient_username TEXT,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting_reply' CHECK (status IN ('waiting_reply', 'active', 'completed', 'cancelled', 'failed')),
  next_send_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(sequence_id, recipient_ig_id)
);

CREATE INDEX IF NOT EXISTS idx_drip_enrollments_status ON public.drip_enrollments(status, next_send_at);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_user_id ON public.drip_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_recipient ON public.drip_enrollments(recipient_ig_id);

-- ─── 4. A/B Testing Variants ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  dm_template TEXT NOT NULL,
  template_type TEXT DEFAULT 'text',
  template_title TEXT,
  template_subtitle TEXT,
  template_image_url TEXT,
  template_buttons JSONB DEFAULT '[]'::jsonb,
  sends INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'paused', 'winner', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ab_variants_automation_id ON public.ab_test_variants(automation_id);
CREATE INDEX IF NOT EXISTS idx_ab_variants_user_id ON public.ab_test_variants(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_variants_status ON public.ab_test_variants(status);

-- ─── 5. Postback Flows ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.postback_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  payload TEXT NOT NULL,
  label TEXT NOT NULL,
  response_type TEXT DEFAULT 'text' CHECK (response_type IN ('text', 'button')),
  response_text TEXT,
  response_template_title TEXT,
  response_template_subtitle TEXT,
  response_template_image_url TEXT,
  response_template_buttons JSONB DEFAULT '[]'::jsonb,
  lead_tag TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_postback_flows_automation_id ON public.postback_flows(automation_id);
CREATE INDEX IF NOT EXISTS idx_postback_flows_user_id ON public.postback_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_postback_flows_payload ON public.postback_flows(payload);

-- ─── 6. AI Agent System ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_active BOOLEAN DEFAULT false,
  agent_name TEXT NOT NULL DEFAULT 'Assistant',
  persona TEXT DEFAULT 'You are a helpful and friendly brand assistant on Instagram.',
  tone TEXT DEFAULT 'friendly' CHECK (tone IN ('friendly', 'professional', 'casual', 'enthusiastic')),
  language TEXT DEFAULT 'en',
  greeting_message TEXT DEFAULT 'Hey there! How can I help you today? 👋',
  fallback_message TEXT DEFAULT 'Thanks for reaching out! A human team member will get back to you shortly.',
  max_reply_length INTEGER DEFAULT 300,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_user_id ON public.ai_agents(user_id);

CREATE TABLE IF NOT EXISTS public.ai_agent_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_faqs_agent_id ON public.ai_agent_faqs(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_faqs_user_id ON public.ai_agent_faqs(user_id);

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  sender_ig_id TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_sender ON public.ai_conversations(user_id, sender_ig_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON public.ai_conversations(created_at);

CREATE TABLE IF NOT EXISTS public.ai_conversation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('good', 'bad')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON public.ai_conversation_feedback(user_id);

-- ─── 7. Link-in-Bio Pages & Clicks ────────────────────────────
CREATE TABLE IF NOT EXISTS public.bio_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  theme TEXT DEFAULT 'default',
  accent_color TEXT DEFAULT '#10b981',
  show_avatar BOOLEAN DEFAULT true,
  avatar_url TEXT,
  is_published BOOLEAN DEFAULT true,
  total_views INTEGER DEFAULT 0,
  custom_font TEXT,
  hide_branding BOOLEAN DEFAULT false,
  card_border_radius TEXT DEFAULT 'rounded-xl',
  card_opacity NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bio_pages_slug ON public.bio_pages(slug);
CREATE INDEX IF NOT EXISTS idx_bio_pages_user_id ON public.bio_pages(user_id);

CREATE TABLE IF NOT EXISTS public.bio_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.bio_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  emoji TEXT DEFAULT '🔗',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bio_links_page_id ON public.bio_links(page_id);
CREATE INDEX IF NOT EXISTS idx_bio_links_user_id ON public.bio_links(user_id);

CREATE TABLE IF NOT EXISTS public.bio_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.bio_pages(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES public.bio_links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bio_link_clicks_link_id ON public.bio_link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_bio_link_clicks_page_id ON public.bio_link_clicks(page_id);

-- ─── 8. Lead Exports & Referral Logs ──────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL DEFAULT 'csv',
  destination TEXT,
  records_exported INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_exports_user_id ON public.lead_exports(user_id);

CREATE TABLE IF NOT EXISTS public.referral_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reward_days INTEGER DEFAULT 14,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_log_email ON public.referral_log(referred_email);
CREATE INDEX IF NOT EXISTS idx_referral_log_referrer ON public.referral_log(referrer_id);

-- ═══════════════════════════════════════════════════════════════
-- Row Level Security (RLS) on All New Tables
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postback_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bio_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bio_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bio_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_log ENABLE ROW LEVEL SECURITY;

-- Instagram Accounts Policies
CREATE POLICY "Users view own ig accounts" ON public.instagram_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own ig accounts" ON public.instagram_accounts FOR ALL USING (auth.uid() = user_id);

-- Drip Sequences & Steps Policies
CREATE POLICY "Users view own drip sequences" ON public.drip_sequences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own drip sequences" ON public.drip_sequences FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own drip steps" ON public.drip_steps FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.drip_sequences s WHERE s.id = drip_steps.sequence_id AND s.user_id = auth.uid())
);
CREATE POLICY "Users manage own drip steps" ON public.drip_steps FOR ALL USING (
  EXISTS (SELECT 1 FROM public.drip_sequences s WHERE s.id = drip_steps.sequence_id AND s.user_id = auth.uid())
);

CREATE POLICY "Users view own drip enrollments" ON public.drip_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own drip enrollments" ON public.drip_enrollments FOR ALL USING (auth.uid() = user_id);

-- AB Test Variants Policies
CREATE POLICY "Users view own ab variants" ON public.ab_test_variants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own ab variants" ON public.ab_test_variants FOR ALL USING (auth.uid() = user_id);

-- Postback Flows Policies
CREATE POLICY "Users view own postback flows" ON public.postback_flows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own postback flows" ON public.postback_flows FOR ALL USING (auth.uid() = user_id);

-- AI Agent Policies
CREATE POLICY "Users view own ai agent" ON public.ai_agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own ai agent" ON public.ai_agents FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own ai faqs" ON public.ai_agent_faqs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own ai faqs" ON public.ai_agent_faqs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own ai conversations" ON public.ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own ai conversations" ON public.ai_conversations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own ai feedback" ON public.ai_conversation_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ai feedback" ON public.ai_conversation_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bio Pages & Links Policies (Public can view published bio pages and active links)
CREATE POLICY "Public can view published bio pages" ON public.bio_pages FOR SELECT USING (is_published = true OR auth.uid() = user_id);
CREATE POLICY "Users manage own bio page" ON public.bio_pages FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can view active bio links" ON public.bio_links FOR SELECT USING (is_active = true OR auth.uid() = user_id);
CREATE POLICY "Users manage own bio links" ON public.bio_links FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can insert bio link clicks" ON public.bio_link_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own bio link clicks" ON public.bio_link_clicks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bio_pages p WHERE p.id = bio_link_clicks.page_id AND p.user_id = auth.uid())
);

-- Lead Exports Policies
CREATE POLICY "Users view own lead exports" ON public.lead_exports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own lead exports" ON public.lead_exports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Referral Log Policies
CREATE POLICY "Users view own referrals" ON public.referral_log FOR SELECT USING (auth.uid() = referrer_id);
