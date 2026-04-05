
-- Table for configurable fees/pricing (advogado admin)
CREATE TABLE public.honorarios_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo_servico text NOT NULL,
  descricao text,
  valor numeric(10,2) NOT NULL DEFAULT 200.00,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tipo_servico)
);

ALTER TABLE public.honorarios_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advogados can manage their own honorarios"
  ON public.honorarios_config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view active honorarios"
  ON public.honorarios_config FOR SELECT
  TO authenticated
  USING (ativo = true);

-- Trigger for updated_at
CREATE TRIGGER update_honorarios_config_updated_at
  BEFORE UPDATE ON public.honorarios_config
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Table for contacts (advogado address book)
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  email text NOT NULL,
  empresa text,
  telefone text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own contacts"
  ON public.contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Table for appointments/consultas
CREATE TABLE public.consultas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL,
  advogado_id uuid,
  tipo text NOT NULL DEFAULT 'inicial',
  status text NOT NULL DEFAULT 'pendente',
  data_hora timestamptz,
  valor numeric(10,2),
  notas text,
  payment_status text DEFAULT 'pendente',
  payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes can view their own consultas"
  ON public.consultas FOR SELECT
  USING (auth.uid() = cliente_id);

CREATE POLICY "Clientes can create consultas"
  ON public.consultas FOR INSERT
  WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "Advogados can view all consultas"
  ON public.consultas FOR SELECT
  USING (public.has_role(auth.uid(), 'advogado'));

CREATE POLICY "Advogados can update consultas"
  ON public.consultas FOR UPDATE
  USING (public.has_role(auth.uid(), 'advogado'));

-- Trigger for updated_at
CREATE TRIGGER update_consultas_updated_at
  BEFORE UPDATE ON public.consultas
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Table for tarefas/tasks
CREATE TABLE public.tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  prioridade text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'pendente',
  prazo timestamptz,
  processo_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tarefas"
  ON public.tarefas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_tarefas_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();
