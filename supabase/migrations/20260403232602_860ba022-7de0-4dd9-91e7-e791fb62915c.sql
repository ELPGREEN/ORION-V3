INSERT INTO public.generation_queue (source_type, job_type, params, status) VALUES
('system', 'generate_embeddings', '{"target": "both", "batchSize": 100}'::jsonb, 'pending'),
('system', 'neural_learn', '{"action": "full"}'::jsonb, 'pending');