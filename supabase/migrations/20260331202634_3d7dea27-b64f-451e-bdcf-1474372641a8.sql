ALTER TABLE public.escritorio_config
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS frase_impacto TEXT,
  ADD COLUMN IF NOT EXISTS experiencia_anos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_description TEXT;