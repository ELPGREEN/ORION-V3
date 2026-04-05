INSERT INTO public.user_roles (user_id, role)
VALUES ('6699c758-cad4-4102-a606-eb68a333bbc6', 'advogado'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;