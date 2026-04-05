DROP POLICY IF EXISTS "anon_insert_pro_bono_validated" ON public.pro_bono_requests;

CREATE POLICY "anon_insert_pro_bono_validated"
ON public.pro_bono_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  nome IS NOT NULL AND length(nome) >= 2
  AND email IS NOT NULL AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND descricao_caso IS NOT NULL AND length(descricao_caso) >= 20
  AND situacao_financeira IS NOT NULL AND length(situacao_financeira) >= 5
  AND status = 'pendente'
  AND notas_internas IS NULL
);