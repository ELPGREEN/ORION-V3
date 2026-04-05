-- Criar bucket público para avatares e fotos de avaliação
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas para o bucket avatars
CREATE POLICY "Avatars são públicos para leitura" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Usuários autenticados podem fazer upload de avatars" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Usuários podem deletar seus próprios avatars" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Garantir que tabela avaliacoes tem RLS correto
-- Clientes podem criar suas próprias avaliações
DROP POLICY IF EXISTS "Usuários podem criar suas avaliações" ON public.avaliacoes;
CREATE POLICY "Usuários podem criar suas avaliações" 
ON public.avaliacoes FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Todos podem ver avaliações aprovadas
DROP POLICY IF EXISTS "Todos podem ver avaliações aprovadas" ON public.avaliacoes;
CREATE POLICY "Todos podem ver avaliações aprovadas" 
ON public.avaliacoes FOR SELECT 
USING (aprovado = true);

-- Usuários podem ver suas próprias avaliações (aprovadas ou não)
DROP POLICY IF EXISTS "Usuários podem ver suas avaliações" ON public.avaliacoes;
CREATE POLICY "Usuários podem ver suas avaliações" 
ON public.avaliacoes FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Advogados podem ver e aprovar todas as avaliações
DROP POLICY IF EXISTS "Advogados podem ver todas avaliações" ON public.avaliacoes;
CREATE POLICY "Advogados podem ver todas avaliações" 
ON public.avaliacoes FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'advogado'));

DROP POLICY IF EXISTS "Advogados podem atualizar avaliações" ON public.avaliacoes;
CREATE POLICY "Advogados podem atualizar avaliações" 
ON public.avaliacoes FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'advogado'));