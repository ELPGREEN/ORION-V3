DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '6699c758-cad4-4102-a606-eb68a333bbc6') THEN
    INSERT INTO public.user_roles (user_id, role)
VALUES ('6699c758-cad4-4102-a606-eb68a333bbc6', 'advogado'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
