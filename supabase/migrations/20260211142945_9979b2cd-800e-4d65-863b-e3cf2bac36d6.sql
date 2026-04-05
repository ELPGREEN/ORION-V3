-- Correção 1: Advogados podem ver todos os dados de aprendizado
CREATE POLICY "Advogados can view all learning data"
ON public.neural_learning_data FOR SELECT
USING (has_role(auth.uid(), 'advogado'::app_role));

-- Atualizar registros existentes sem user_id com o user_id do advogado
UPDATE public.neural_learning_data
SET user_id = (
  SELECT user_id FROM public.user_roles WHERE role = 'advogado' LIMIT 1
)
WHERE user_id IS NULL;