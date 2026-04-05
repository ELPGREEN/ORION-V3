-- Mark all neural_knowledge_base entries as processed so they appear in text searches
-- These entries were ingested but never marked as processed
UPDATE public.neural_knowledge_base SET is_processed = true WHERE is_processed = false;