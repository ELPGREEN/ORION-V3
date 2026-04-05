-- Fix: Set piccoliericson as advogado
UPDATE public.user_roles 
SET role = 'advogado' 
WHERE user_id = 'e3f21755-fb14-4926-9c25-1f5e6570840f';

-- Fix: Insert elpenergia as cliente
INSERT INTO public.user_roles (user_id, role) 
VALUES ('0ea8e92d-2327-4f5c-bd89-aca345f05580', 'cliente')
ON CONFLICT DO NOTHING;