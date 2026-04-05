
-- Fix 37 document_shared with high quality (0.9) stuck as not learned
UPDATE neural_learning_data SET learned = true WHERE interaction_type = 'document_shared' AND quality_score >= 0.65 AND learned = false;

-- Fix 100 catalogo_senado items that have embeddings but is_processed = false
UPDATE neural_knowledge_base SET is_processed = true WHERE source_type = 'catalogo_senado' AND is_processed = false AND embedding IS NOT NULL;

-- Fix remaining high-quality items in other types stuck as not learned
UPDATE neural_learning_data SET learned = true WHERE quality_score >= 0.65 AND learned = false;
