-- Corrigir o user_id do client_profile do elpenergia@gmail.com
-- O user_id atual (e3f21755-fb14-4926-9c25-1f5e6570840f) está errado
-- O correto é (0ea8e92d-2327-4f5c-bd89-aca345f05580)

UPDATE public.client_profiles 
SET user_id = '0ea8e92d-2327-4f5c-bd89-aca345f05580'
WHERE email = 'elpenergia@gmail.com';

-- Também atualizar documentos compartilhados que possam existir com o user_id antigo
UPDATE public.shared_documents 
SET shared_with = '0ea8e92d-2327-4f5c-bd89-aca345f05580'
WHERE shared_with = 'e3f21755-fb14-4926-9c25-1f5e6570840f';