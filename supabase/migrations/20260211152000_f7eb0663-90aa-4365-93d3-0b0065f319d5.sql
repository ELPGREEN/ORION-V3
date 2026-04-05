-- Remove duplicate indexes on legal_embeddings
-- idx_legal_embeddings_content_type is duplicate of idx_le_content_type
DROP INDEX IF EXISTS idx_legal_embeddings_content_type;

-- idx_legal_embeddings_type is also duplicate of idx_le_content_type
DROP INDEX IF EXISTS idx_legal_embeddings_type;

-- idx_legal_embeddings_fts is duplicate of idx_le_fts
DROP INDEX IF EXISTS idx_legal_embeddings_fts;

-- idx_legal_embeddings_source is covered by idx_le_source_type (source, content_type)
DROP INDEX IF EXISTS idx_legal_embeddings_source;