
-- 1. Remove duplicates keeping only the most recent entry per user
DELETE FROM neural_agent_config
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id
    FROM neural_agent_config
    ORDER BY user_id, updated_at DESC
);

-- 2. Add unique constraint to prevent future duplicates
ALTER TABLE neural_agent_config ADD CONSTRAINT unique_neural_agent_config_user_id UNIQUE (user_id);
