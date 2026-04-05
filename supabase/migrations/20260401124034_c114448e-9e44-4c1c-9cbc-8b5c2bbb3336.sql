ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'rascunho',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pdf_url text;