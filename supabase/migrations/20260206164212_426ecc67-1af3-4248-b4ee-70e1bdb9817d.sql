-- Create escritorio_config table for office settings and email customization
CREATE TABLE public.escritorio_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_escritorio TEXT NOT NULL DEFAULT 'Diego Hermann Advocacia',
  oab TEXT DEFAULT 'OAB/RS 137.608',
  telefone TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  email_contato TEXT DEFAULT '',
  website TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  timbre_endereco TEXT DEFAULT '',
  timbre_contatos TEXT DEFAULT '',
  -- Email customization
  email_remetente_nome TEXT DEFAULT 'Diego Hermann Advocacia',
  email_cor_primaria TEXT DEFAULT '#d4a418',
  email_cor_fundo TEXT DEFAULT '#0a0a0a',
  email_rodape_texto TEXT DEFAULT 'Provimento 205/2021 e LGPD aplicáveis.',
  email_assinatura_texto TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT escritorio_config_user_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.escritorio_config ENABLE ROW LEVEL SECURITY;

-- Only the owner can manage their config
CREATE POLICY "Users can manage their own escritorio config"
  ON public.escritorio_config
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can read (for edge functions)
CREATE POLICY "Service can read escritorio config"
  ON public.escritorio_config
  FOR SELECT
  USING (true);
