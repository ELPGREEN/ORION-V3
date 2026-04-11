-- Fix owner emails that were created before the admin auto-assign trigger
UPDATE public.user_roles 
SET role = 'admin'::app_role 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('ericsonpiccoli.dev@gmail.com', 'ericson@elpgreen.com')
) AND role = 'cliente';

-- Also ensure admin role exists for these users (in case they only had cliente)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users 
WHERE email IN ('ericsonpiccoli.dev@gmail.com', 'ericson@elpgreen.com')
ON CONFLICT (user_id, role) DO NOTHING;