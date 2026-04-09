
-- Grant admin role to info@iasofthub.com if user exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'info@iasofthub.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Update trigger to recognize both owner emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _account_type text;
  _full_name text;
  _telefone text;
  _oab_number text;
  _oab_uf text;
  _areas text[];
  _cpf text;
  _tipo_caso text;
  _descricao text;
  _role app_role;
BEGIN
  _full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'nome',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  _account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'cliente');
  _telefone := NEW.raw_user_meta_data->>'telefone';
  _oab_number := NEW.raw_user_meta_data->>'oab_number';
  _oab_uf := NEW.raw_user_meta_data->>'oab_uf';
  _cpf := NEW.raw_user_meta_data->>'cpf';
  _tipo_caso := NEW.raw_user_meta_data->>'tipo_caso';
  _descricao := NEW.raw_user_meta_data->>'descricao_problema';

  BEGIN
    SELECT array_agg(elem::text)
    INTO _areas
    FROM jsonb_array_elements_text(
      COALESCE((NEW.raw_user_meta_data->'areas_atuacao')::jsonb, '[]'::jsonb)
    ) AS elem;
  EXCEPTION WHEN OTHERS THEN
    _areas := NULL;
  END;

  -- 1. Create profile
  INSERT INTO public.profiles (user_id, email, full_name, telefone, oab_number, oab_uf, areas_atuacao)
  VALUES (NEW.id, NEW.email, _full_name, _telefone, _oab_number, _oab_uf, _areas)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    telefone = COALESCE(EXCLUDED.telefone, profiles.telefone),
    oab_number = COALESCE(EXCLUDED.oab_number, profiles.oab_number),
    oab_uf = COALESCE(EXCLUDED.oab_uf, profiles.oab_uf),
    areas_atuacao = COALESCE(EXCLUDED.areas_atuacao, profiles.areas_atuacao),
    updated_at = now();

  -- 2. Assign role (now supports nomade)
  _role := CASE _account_type
    WHEN 'advogado' THEN 'advogado'::app_role
    WHEN 'produtor' THEN 'produtor'::app_role
    WHEN 'afiliado' THEN 'afiliado'::app_role
    WHEN 'nomade' THEN 'nomade'::app_role
    ELSE 'cliente'::app_role
  END;

  -- Both owner emails get admin role
  IF NEW.email IN ('info@elpgreen.com', 'info@iasofthub.com') THEN
    _role := 'admin'::app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Create client_profile if cliente
  IF _account_type = 'cliente' THEN
    INSERT INTO public.client_profiles (user_id, nome, email, telefone, cpf, tipo_caso, descricao_problema)
    VALUES (NEW.id, _full_name, NEW.email, _telefone, _cpf, _tipo_caso, _descricao)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
