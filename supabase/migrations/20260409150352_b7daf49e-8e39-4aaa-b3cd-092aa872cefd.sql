
-- PASSO 1: Reduzir frequência dos cron jobs (IDs fixos)
SELECT cron.alter_job(5, schedule := '*/5 * * * *');
SELECT cron.alter_job(3, schedule := '0 * * * *');
SELECT cron.alter_job(1, schedule := '0 */2 * * *');

-- PASSO 2: Limpar dados acumulados antigos
DELETE FROM public.orion_threat_log WHERE created_at < now() - interval '30 days';
DELETE FROM public.neural_evolution_proposals WHERE status IN ('approved', 'rejected') AND created_at < now() - interval '7 days';
DELETE FROM public.ai_metrics WHERE created_at < now() - interval '30 days';

-- Função de limpeza periódica reutilizável
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  threat_count INTEGER;
  proposals_count INTEGER;
  metrics_count INTEGER;
BEGIN
  DELETE FROM public.orion_threat_log WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS threat_count = ROW_COUNT;
  DELETE FROM public.neural_evolution_proposals WHERE status IN ('approved', 'rejected') AND created_at < now() - interval '7 days';
  GET DIAGNOSTICS proposals_count = ROW_COUNT;
  DELETE FROM public.ai_metrics WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS metrics_count = ROW_COUNT;
  RETURN jsonb_build_object('threat_log_deleted', threat_count, 'proposals_deleted', proposals_count, 'metrics_deleted', metrics_count, 'cleaned_at', now());
END;
$$;
