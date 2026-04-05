ALTER TABLE public.client_profiles 
ADD COLUMN IF NOT EXISTS advogado_id uuid REFERENCES auth.users(id);