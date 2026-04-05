-- Corrigir client_profile de padilhabernardelli@gmail.com que usa o user_id do advogado
-- Gerar um UUID placeholder único para este cliente
UPDATE public.client_profiles 
SET user_id = gen_random_uuid()
WHERE email = 'padilhabernardelli@gmail.com' 
  AND user_id = 'e3f21755-fb14-4926-9c25-1f5e6570840f';