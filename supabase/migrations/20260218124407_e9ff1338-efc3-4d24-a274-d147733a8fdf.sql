
-- Enable realtime for andamentos table
ALTER PUBLICATION supabase_realtime ADD TABLE andamentos;

-- Add attachment columns to andamentos
ALTER TABLE public.andamentos
ADD COLUMN IF NOT EXISTS attachment_storage_path TEXT,
ADD COLUMN IF NOT EXISTS attachment_file_name TEXT;
