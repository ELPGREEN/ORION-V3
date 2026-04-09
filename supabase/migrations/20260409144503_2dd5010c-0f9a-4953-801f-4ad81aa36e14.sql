
-- ============================================
-- Remoção de 3 funções DB obsoletas
-- ============================================
DROP FUNCTION IF EXISTS public.increment_loi_download(character varying);
DROP FUNCTION IF EXISTS public.clean_expired_cache();
DROP FUNCTION IF EXISTS public.get_child_network_stats();

-- ============================================
-- Remoção de 26 tabelas órfãs (CASCADE para FKs)
-- ============================================
DROP TABLE IF EXISTS public.analises CASCADE;
DROP TABLE IF EXISTS public.barcode_cache CASCADE;
DROP TABLE IF EXISTS public.cgu_sanctions_cache CASCADE;
DROP TABLE IF EXISTS public.cpf_cache CASCADE;
DROP TABLE IF EXISTS public.document_validation_cache CASCADE;
DROP TABLE IF EXISTS public.document_validations CASCADE;
DROP TABLE IF EXISTS public.document_versions CASCADE;
DROP TABLE IF EXISTS public.email_signature_settings CASCADE;
DROP TABLE IF EXISTS public.execution_plans CASCADE;
DROP TABLE IF EXISTS public.face_templates CASCADE;
DROP TABLE IF EXISTS public.feasibility_market_data CASCADE;
DROP TABLE IF EXISTS public.impact_stats CASCADE;
DROP TABLE IF EXISTS public.lead_documents CASCADE;
DROP TABLE IF EXISTS public.lead_notes CASCADE;
DROP TABLE IF EXISTS public.loi_documents CASCADE;
DROP TABLE IF EXISTS public.neural_evolution_log CASCADE;
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.pyrolysis_readings CASCADE;
DROP TABLE IF EXISTS public.security_scan_results CASCADE;
DROP TABLE IF EXISTS public.security_scan_runs CASCADE;
DROP TABLE IF EXISTS public.serpapi_cache CASCADE;
DROP TABLE IF EXISTS public.signature_log CASCADE;
DROP TABLE IF EXISTS public.signed_urls CASCADE;
DROP TABLE IF EXISTS public.workspace_connector_settings CASCADE;
DROP TABLE IF EXISTS public.workspace_settings CASCADE;
DROP TABLE IF EXISTS public.youtube_cache CASCADE;
