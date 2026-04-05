-- Remover foreign key que impede cadastrar clientes antes deles terem conta auth
-- O user_id será vinculado quando o cliente se registrar com o mesmo email
ALTER TABLE public.client_profiles 
DROP CONSTRAINT IF EXISTS client_profiles_user_id_fkey;

-- Comentário: Agora o advogado pode cadastrar um cliente com um user_id placeholder (UUID aleatório)
-- Quando o cliente se registrar pelo formulário, o edge function create-client-profile 
-- encontrará o perfil existente pelo email e atualizará o user_id para o correto