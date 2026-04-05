-- Adaptive System Prompts
INSERT INTO public.adaptive_system_prompts (perfil_fala, instrucao_sistema, humor_modo, ativo, exemplos_resposta) VALUES
('formal_juridico', 'Voce e um assistente juridico especializado. Responda com precisao tecnica, citando legislacao e jurisprudencia quando relevante.', 'neutro', true, '[]'::jsonb),
('consultivo', 'Voce e um consultor estrategico e juridico. Analise cenarios de forma pratica, identifique riscos e oportunidades.', 'profissional', true, '[]'::jsonb),
('tecnico', 'Voce e um engenheiro de sistemas e arquiteto de IA. Forneca respostas tecnicas detalhadas sobre infraestrutura e algoritmos.', 'analitico', true, '[]'::jsonb);

-- Neural Network Configs: 8 modelos do pipeline
INSERT INTO public.neural_network_configs (name, description, model_type, provider, config, hyperparameters, training_status, accuracy, is_active) VALUES
('LLM-Core', 'Large Language Model principal', 'transformer', 'groq', '{"model":"llama-3.3-70b-versatile","max_tokens":4096,"temperature":0.7}'::jsonb, '{"epochs":10,"batch_size":32,"learning_rate":0.0001}'::jsonb, 'deployed', 0.92, true),
('LCM-Semantic', 'Legal Concept Model para mapeamento semantico', 'transformer', 'openai', '{"model":"text-embedding-3-small","dimensions":768}'::jsonb, '{"epochs":5,"batch_size":64}'::jsonb, 'deployed', 0.88, true),
('LAM-Action', 'Legal Action Model para automacao processual', 'transformer', 'anthropic', '{"model":"claude-sonnet-4-20250514","max_tokens":2048}'::jsonb, '{"epochs":8,"batch_size":16}'::jsonb, 'deployed', 0.85, true),
('MoE-Router', 'Mixture of Experts para roteamento', 'mixture_of_experts', 'groq', '{"gating":"softmax","num_experts":8,"top_k":2}'::jsonb, '{"epochs":15,"batch_size":128}'::jsonb, 'deployed', 0.91, true),
('VLM-Vision', 'Vision Language Model para documentos', 'multimodal', 'gemini', '{"model":"gemini-2.0-flash","vision":true}'::jsonb, '{"epochs":12,"batch_size":8}'::jsonb, 'deployed', 0.87, true),
('SLM-Slim', 'Small Language Model para triagem rapida', 'transformer', 'groq', '{"model":"llama-3.1-8b-instant","max_tokens":1024}'::jsonb, '{"epochs":20,"batch_size":256}'::jsonb, 'deployed', 0.89, true),
('MLM-Masked', 'Masked Language Model para validacao documental', 'transformer', 'mistral', '{"model":"mistral-large-latest","max_tokens":2048}'::jsonb, '{"epochs":10,"batch_size":32}'::jsonb, 'deployed', 0.86, true),
('SAM-Security', 'Security Assessment Model', 'transformer', 'anthropic', '{"model":"claude-sonnet-4-20250514","max_tokens":4096}'::jsonb, '{"epochs":8,"batch_size":16}'::jsonb, 'deployed', 0.93, true);