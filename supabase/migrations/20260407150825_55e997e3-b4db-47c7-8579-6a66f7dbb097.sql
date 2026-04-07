-- Email campaigns table
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL DEFAULT '',
  text_content text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  recipients jsonb DEFAULT '[]'::jsonb,
  total_recipients integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  esp_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own campaigns" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Email automation rules table
CREATE TABLE public.email_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_event text NOT NULL CHECK (trigger_event IN ('purchase', 'signup', 'abandoned_cart', 'post_purchase', 'upsell', 'welcome')),
  delay_minutes integer DEFAULT 0,
  template_name text,
  subject text NOT NULL,
  html_content text NOT NULL DEFAULT '',
  is_active boolean DEFAULT true,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  stats jsonb DEFAULT '{"sent": 0, "opened": 0, "clicked": 0}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own automation rules" ON public.email_automation_rules
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);