-- Drop unused indexes (0 scans, not PK/unique)
DROP INDEX IF EXISTS idx_blooms_root_id;
DROP INDEX IF EXISTS idx_ai_metrics_provider;
DROP INDEX IF EXISTS idx_chat_ia_conversations_updated_at;
DROP INDEX IF EXISTS idx_signature_envelopes_user_id;
DROP INDEX IF EXISTS idx_documents_document_type;
DROP INDEX IF EXISTS idx_webhook_events_type;
DROP INDEX IF EXISTS idx_webhook_events_processed;
DROP INDEX IF EXISTS idx_lovable_events_user_lovable_id;
DROP INDEX IF EXISTS idx_lovable_events_received_at;
DROP INDEX IF EXISTS idx_lovable_events_lovable_id;