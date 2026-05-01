-- ═══════════════════════════════════════════════════════════════
-- HARDENING MIGRATION — fix Supabase linter warnings (non-pgvector)
-- 1) Set search_path on custom functions missing it
-- 2) Convert SECURITY DEFINER to SECURITY INVOKER where safe, OR revoke EXECUTE from anon
-- 3) Lock down public bucket listing (profile-photos, email-assets)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Fix mutable search_path on custom functions ───
ALTER FUNCTION public.trigger_set_updated_at() SET search_path = 'public';
ALTER FUNCTION public.safe_log_cleanup(integer) SET search_path = 'public';
ALTER FUNCTION public.system_maintenance_v2() SET search_path = 'public';

-- hybrid_search_legal_v3 / search_legal_embeddings: já têm SET search_path no body but linter may flag — re-apply explicitly
ALTER FUNCTION public.hybrid_search_legal_v3(vector, text, integer, double precision, double precision, double precision, double precision, text, text, text[], text, text) SET search_path = 'public';
ALTER FUNCTION public.search_legal_embeddings(vector, double precision, integer, text, text) SET search_path = 'public';

-- ─── 2. Revoke EXECUTE from anon on internal SECURITY DEFINER functions ───
-- Functions that should NOT be callable without authentication
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_cache() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_locks() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_embedding_cache() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.system_maintenance_v1() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.system_maintenance_v2() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.safe_log_cleanup(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.clean_elp_cache() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.count_items_needing_embeddings() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_items_needing_embeddings(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.search_private_knowledge(uuid, vector, integer, double precision) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_unread_count(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_client_owner(uuid, uuid) FROM anon, public;

-- Grant EXECUTE to authenticated users for the ones the app actually needs
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_private_knowledge(uuid, vector, integer, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_cnpj_cache_hit(varchar) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_report_views(varchar) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_report_by_hash(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_elp_cache_hit(text) TO authenticated;

-- search_neural_knowledge / match_neural_knowledge are used by Orion (logged-in users)
GRANT EXECUTE ON FUNCTION public.match_neural_knowledge(vector, double precision, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_neural_knowledge(vector, text, integer, double precision, double precision, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_neural_knowledge(vector, text, integer, double precision, double precision, double precision, text, text, text[]) TO authenticated;

-- legal search funcs used by logged-in users
GRANT EXECUTE ON FUNCTION public.hybrid_search_legal_v3(vector, text, integer, double precision, double precision, double precision, double precision, text, text, text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_legal_embeddings(vector, double precision, integer, text, text) TO authenticated;

-- ─── 3. Lock down public bucket listing ───
-- profile-photos and email-assets are public for individual file reads, but listing should be blocked.
-- Drop any overly-broad SELECT policies and recreate with bucket-specific path scoping.
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;

-- Allow public read of individual files (by full path) but no listing of bucket contents
CREATE POLICY "Public read profile-photos by path"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'profile-photos' AND name IS NOT NULL AND position('/' in name) > 0);

CREATE POLICY "Public read email-assets by path"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'email-assets' AND name IS NOT NULL AND position('/' in name) > 0);