-- R6: Recreate trigger for handle_new_user_role on auth.users
-- The function exists but the trigger was missing
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();