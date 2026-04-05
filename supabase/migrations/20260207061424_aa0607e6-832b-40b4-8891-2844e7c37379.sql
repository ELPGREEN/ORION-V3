-- Criar tabela de perfis de clientes com dados jurídicos
CREATE TABLE public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  cpf TEXT,
  tipo_caso TEXT,
  descricao_problema TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas: Cliente pode ver/editar seu próprio perfil
CREATE POLICY "Clientes can view their own profile"
ON public.client_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Clientes can update their own profile"
ON public.client_profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Clientes can insert their own profile"
ON public.client_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Advogados podem ver todos os perfis (CRM)
CREATE POLICY "Advogados can view all client profiles"
ON public.client_profiles
FOR SELECT
USING (has_role(auth.uid(), 'advogado'));

-- Advogados podem atualizar status dos clientes
CREATE POLICY "Advogados can update client profiles"
ON public.client_profiles
FOR UPDATE
USING (has_role(auth.uid(), 'advogado'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_client_profiles_updated_at
BEFORE UPDATE ON public.client_profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();