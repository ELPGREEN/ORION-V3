
-- Tabela de logs forenses do Orion Defense System
CREATE TABLE public.orion_threat_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  threat_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('probe', 'attempt', 'attack', 'critical')),
  details TEXT,
  fingerprint TEXT,
  countermeasure TEXT,
  user_agent TEXT,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX idx_orion_threat_log_user ON public.orion_threat_log(user_id);
CREATE INDEX idx_orion_threat_log_severity ON public.orion_threat_log(severity);
CREATE INDEX idx_orion_threat_log_created ON public.orion_threat_log(created_at DESC);

-- RLS
ALTER TABLE public.orion_threat_log ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode inserir logs (do próprio browser)
CREATE POLICY "Users can insert own threat logs"
  ON public.orion_threat_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Somente admins podem ver todos os logs
CREATE POLICY "Admins can view all threat logs"
  ON public.orion_threat_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Usuários podem ver seus próprios logs
CREATE POLICY "Users can view own threat logs"
  ON public.orion_threat_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Inserção anônima para capturar ameaças de usuários não logados
CREATE POLICY "Anonymous can insert threat logs"
  ON public.orion_threat_log FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);
