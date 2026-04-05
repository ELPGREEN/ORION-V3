-- Drop old constraint and add updated one with mistral
ALTER TABLE ai_providers DROP CONSTRAINT ai_providers_provider_name_check;
ALTER TABLE ai_providers ADD CONSTRAINT ai_providers_provider_name_check CHECK (provider_name = ANY (ARRAY['gemini', 'groq', 'anthropic', 'openai', 'mistral']));

-- Add Mistral as new provider
INSERT INTO ai_providers (provider_name, display_name, is_enabled, priority, use_for, config, fallback_to)
VALUES ('mistral', 'Mistral Small 4', true, 2, '["documents", "chat", "translation", "search"]', '{"model": "mistral-small-latest", "strength": "pt-br + custo", "cost_level": "very-low"}', 'gemini');

-- Update priorities: Groq=1, Mistral=2, Gemini=3, Anthropic=4, OpenAI=5
UPDATE ai_providers SET priority = 1, fallback_to = 'mistral', config = '{"model": "llama-3.3-70b-versatile", "strength": "velocidade", "cost_level": "low"}' WHERE provider_name = 'groq';
UPDATE ai_providers SET priority = 3, fallback_to = 'anthropic' WHERE provider_name = 'gemini';
UPDATE ai_providers SET priority = 4, fallback_to = 'openai', config = '{"model": "claude-sonnet-4-20250514", "strength": "seguranca-raciocinio", "cost_level": "medium"}' WHERE provider_name = 'anthropic';
UPDATE ai_providers SET priority = 5, fallback_to = null WHERE provider_name = 'openai';