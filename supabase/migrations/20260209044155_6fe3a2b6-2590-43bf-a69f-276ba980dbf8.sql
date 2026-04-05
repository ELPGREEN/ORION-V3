-- Add client_profile_id column to document_folders for folder-client linking
ALTER TABLE public.document_folders 
ADD COLUMN client_profile_id uuid REFERENCES public.client_profiles(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_document_folders_client_profile_id ON public.document_folders(client_profile_id);

-- Comment explaining the purpose
COMMENT ON COLUMN public.document_folders.client_profile_id IS 'Links folder to a client for automatic document sharing';