-- Fix missing roles for existing users (backfill)
-- Users who registered before the handle_new_user trigger was active
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 
  CASE 
    WHEN u.raw_user_meta_data->>'account_type' = 'advogado' THEN 'advogado'::app_role
    WHEN u.raw_user_meta_data->>'account_type' = 'produtor' THEN 'produtor'::app_role
    WHEN u.raw_user_meta_data->>'account_type' = 'afiliado' THEN 'afiliado'::app_role
    ELSE 'cliente'::app_role
  END
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure profiles exist for all users
INSERT INTO public.profiles (user_id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'nome', '')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Recreate trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();