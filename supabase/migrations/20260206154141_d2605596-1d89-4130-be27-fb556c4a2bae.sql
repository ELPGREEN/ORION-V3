-- Fix: Set piccoliericson as advogado
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = 'e3f21755-fb14-4926-9c25-1f5e6570840f') THEN
    UPDATE public.user_roles
SET role = 'advogado' 
WHERE user_id = 'e3f21755-fb14-4926-9c25-1f5e6570840f';

-- Fix: Insert elpenergia as cliente
-- Fix: Insert elpenergia as cliente (only if user exists)
INSERT INTO public.user_roles (user_id, role) 
SELECT '0ea8e92d-2327-4f5c-bd89-aca345f05580', 'cliente'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '0ea8e92d-2327-4f5c-bd89-aca345f05580')
ON CONFLICT DO NOTHING;
  END IF;
END $$;
