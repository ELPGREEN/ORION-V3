
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '6699c758-cad4-4102-a606-eb68a333bbc6') THEN
    INSERT INTO user_plans (user_id, plan_type, ai_tokens_remaining, features_enabled)
VALUES ('6699c758-cad4-4102-a606-eb68a333bbc6', 'premium', 99999, '{"orion": true, "vision": true, "voice": true, "documents": true, "ai_chat": true}'::jsonb)
ON CONFLICT DO NOTHING;
  END IF;
END $$;
