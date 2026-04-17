INSERT INTO public.arc_evolution_proposals (title, rationale, proposed_changes, target_files, status)
VALUES (
  'Orion: acesso autorizado a src/App.tsx',
  'O usuário (proprietário) autorizou explicitamente o Orion a ler e propor alterações no arquivo src/App.tsx via Jules API. Esse arquivo controla bootstrap, providers, rotas e error boundaries da aplicação.',
  'Orion fica autorizado a: (1) ler src/App.tsx via jules-proxy list_sources; (2) abrir PRs via jules-proxy create_session sempre que detectar oportunidades de otimização de roteamento, ordem de providers, lazy loading, error boundaries ou rotas faltantes; (3) o PR sempre passa por revisão humana antes de merge.',
  ARRAY['src/App.tsx'],
  'approved'
);