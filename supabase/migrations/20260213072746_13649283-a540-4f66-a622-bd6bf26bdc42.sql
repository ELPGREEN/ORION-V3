
-- =============================================
-- FIX 1: RLS Permissiva — pro_bono_requests INSERT
-- A política atual permite INSERT anônimo sem restrição (WITH CHECK true).
-- Substituímos por validação de campos obrigatórios para evitar spam.
-- =============================================

-- Drop a política permissiva existente
DROP POLICY IF EXISTS "anon_insert_pro_bono" ON public.pro_bono_requests;

-- Nova política: ainda permite inserção pública, mas exige campos preenchidos
CREATE POLICY "anon_insert_pro_bono_validated"
ON public.pro_bono_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  nome IS NOT NULL AND length(trim(nome)) >= 3
  AND email IS NOT NULL AND email ~ '^[^@]+@[^@]+\.[^@]+$'
  AND descricao_caso IS NOT NULL AND length(trim(descricao_caso)) >= 20
  AND situacao_financeira IS NOT NULL AND length(trim(situacao_financeira)) >= 5
);

-- =============================================
-- FIX 2: Restringir tabelas Senado com CNPJ/CPF
-- Mover de acesso público para autenticado apenas
-- =============================================

-- empresa contratadas
DROP POLICY IF EXISTS "Public read access" ON public."empresa contratadas";
CREATE POLICY "Authenticated read access"
ON public."empresa contratadas"
FOR SELECT
TO authenticated
USING (true);

-- licitações
DROP POLICY IF EXISTS "Public read access" ON public."licitações";
CREATE POLICY "Authenticated read access"
ON public."licitações"
FOR SELECT
TO authenticated
USING (true);
