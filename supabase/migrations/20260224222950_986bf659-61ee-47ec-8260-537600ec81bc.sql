-- Fix stuck document_viewed: score should be 0.75 (threshold is 0.65)
UPDATE neural_learning_data 
SET quality_score = 0.75, learned = true, updated_at = now()
WHERE interaction_type = 'document_viewed' AND learned = false AND quality_score = 0.60;

-- Fix stuck crm_client_event
UPDATE neural_learning_data 
SET quality_score = 0.70, learned = true, updated_at = now()
WHERE interaction_type = 'crm_client_event' AND learned = false;

-- Fix any records with score >= 0.65 that aren't marked as learned
UPDATE neural_learning_data 
SET learned = true, updated_at = now()
WHERE learned = false AND quality_score >= 0.65;