-- Rich DM templates: multi-image + PDF (Graph API v26 capabilities)
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS template_image_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.automations ADD COLUMN IF NOT EXISTS template_file_url TEXT;
