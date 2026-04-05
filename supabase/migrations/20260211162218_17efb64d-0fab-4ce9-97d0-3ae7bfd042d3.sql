-- Fix existing notifications with wrong generic links
UPDATE public.notificacoes SET link = '/dashboard/contatos' WHERE tipo = 'contato' AND link = '/dashboard';
UPDATE public.notificacoes SET link = '/dashboard/clientes' WHERE tipo = 'pro_bono' AND link = '/dashboard';
UPDATE public.notificacoes SET link = '/dashboard/clientes' WHERE tipo = 'novo_cadastro' AND link = '/dashboard';
