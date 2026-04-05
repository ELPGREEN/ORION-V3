-- Drop unused indexes (0 scans, wasting ~29MB+)
DROP INDEX IF EXISTS idx_neural_knowledge_base_embedding;
DROP INDEX IF EXISTS idx_legal_embeddings_metadata;
DROP INDEX IF EXISTS idx_neural_knowledge_fulltext;
DROP INDEX IF EXISTS idx_neural_kb_fts;
DROP INDEX IF EXISTS idx_neural_learning_data_user_id;
DROP INDEX IF EXISTS idx_documents_status;
DROP INDEX IF EXISTS idx_documents_folder_id;
DROP INDEX IF EXISTS idx_document_folders_parent;
DROP INDEX IF EXISTS idx_document_folders_client_profile_id;
DROP INDEX IF EXISTS idx_user_roles_user_id_role;
DROP INDEX IF EXISTS idx_user_roles_user_id;
DROP INDEX IF EXISTS idx_blooms_parent_id;
DROP INDEX IF EXISTS idx_ai_metrics_complexity;
DROP INDEX IF EXISTS idx_ai_metrics_cost_tier;