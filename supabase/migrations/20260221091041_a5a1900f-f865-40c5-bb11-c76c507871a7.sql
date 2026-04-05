-- Clean up garbage binary data from PDF uploads that were incorrectly extracted
DELETE FROM legal_embeddings 
WHERE source = 'user_upload' 
AND content LIKE '%endstream%';

DELETE FROM neural_knowledge_base 
WHERE source_type = 'documento_upload' 
AND content LIKE '%endstream%';