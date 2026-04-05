-- Adiciona política para permitir que clientes façam upload de documentos para sua própria pasta
-- O cliente só pode inserir documentos na pasta vinculada ao seu próprio client_profile

-- Primeiro, precisamos de uma função para verificar se o usuário é dono do client_profile
CREATE OR REPLACE FUNCTION public.is_client_owner(_user_id uuid, _client_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_profiles
    WHERE id = _client_profile_id
      AND user_id = _user_id
  )
$$;

-- Política para clientes poderem inserir documentos em sua própria pasta
CREATE POLICY "Clients can insert their own documents"
ON public.client_documents
FOR INSERT
WITH CHECK (
  public.is_client_owner(auth.uid(), client_profile_id)
  AND auth.uid() = user_id
);

-- Política para clientes poderem excluir seus próprios documentos enviados
CREATE POLICY "Clients can delete their own uploaded documents"
ON public.client_documents
FOR DELETE
USING (
  auth.uid() = user_id
  AND public.is_client_owner(auth.uid(), client_profile_id)
);

-- Atualiza política de storage para permitir que clientes façam upload na pasta do seu perfil
-- Clientes podem fazer upload na pasta clients/{client_profile_id}/*
CREATE POLICY "Clients can upload to their folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'clients'
  AND EXISTS (
    SELECT 1 FROM public.client_profiles cp
    WHERE cp.user_id = auth.uid()
      AND (storage.foldername(name))[2] = cp.id::text
  )
);

-- Clientes podem ler arquivos da sua própria pasta
CREATE POLICY "Clients can read their folder files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'clients'
  AND EXISTS (
    SELECT 1 FROM public.client_profiles cp
    WHERE cp.user_id = auth.uid()
      AND (storage.foldername(name))[2] = cp.id::text
  )
);

-- Clientes podem excluir arquivos que eles mesmos enviaram
CREATE POLICY "Clients can delete their own uploaded files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'clients'
  AND EXISTS (
    SELECT 1 FROM public.client_profiles cp
    WHERE cp.user_id = auth.uid()
      AND (storage.foldername(name))[2] = cp.id::text
  )
  AND owner = auth.uid()
);

-- Advogados podem gerenciar todos os arquivos do bucket documents
CREATE POLICY "Lawyers can manage all document files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'documents'
  AND public.has_role(auth.uid(), 'advogado')
)
WITH CHECK (
  bucket_id = 'documents'
  AND public.has_role(auth.uid(), 'advogado')
);