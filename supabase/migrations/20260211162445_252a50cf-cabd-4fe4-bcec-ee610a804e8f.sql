
DELETE FROM public.notificacoes
WHERE id NOT IN (
  SELECT MIN(id::text)::uuid
  FROM public.notificacoes
  GROUP BY created_at, tipo, titulo, user_id
);
