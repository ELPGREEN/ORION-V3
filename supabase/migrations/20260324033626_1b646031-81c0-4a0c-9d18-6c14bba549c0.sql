-- Fix get_unread_count: advogados should only see unread from THEIR conversations (not all)
CREATE OR REPLACE FUNCTION public.get_unread_count(user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.chat_messages m
  JOIN public.chat_conversations c ON c.id = m.conversation_id
  WHERE m.read_at IS NULL
    AND m.sender_id != user_id
    AND (c.cliente_id = user_id OR c.advogado_id = user_id)
$$;