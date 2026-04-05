-- Add UPDATE policy for avatars bucket (needed for upsert)
CREATE POLICY "Usuários podem atualizar seus próprios avatars"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);