

# Plano: Tela de Entrada com Vídeo + Welcome Three.js + Onboarding Pós-Login

## Visão Geral

Criar um fluxo de entrada imersivo na página Index: vídeo de 5s → tela Three.js "Bem-vindo" com opções Login/Cadastro → redirecionamento por perfil → onboarding guiado no primeiro acesso.

---

## Etapa 1 — Splash Screen com Vídeo (5s) + Welcome Three.js

**Arquivo:** `src/components/home/WelcomeSplash.tsx` (novo)

- Componente fullscreen que exibe o vídeo `orion-tron-video.mp4` por 5 segundos (autoplay, muted)
- Após 5s, transição fade para a tela Three.js (reutilizando `HeroThreeBackground` como fundo)
- Tela Three.js mostra:
  - Logo ORION animada (usar a imagem `orion-logo-2.jpg` enviada)
  - Texto "BEM-VINDO AO ORION" com fonte Orbitron, efeito glow dourado
  - Dois botões estilizados: **"Fazer Login"** e **"Criar Conta"**
  - Botão "Entrar como Visitante" secundário para ver páginas públicas
- Estado salvo em `sessionStorage` para não repetir na mesma sessão
- Usuários já logados pulam direto para o conteúdo

**Arquivo:** `src/pages/Index.tsx` (modificar)

- Verificar `sessionStorage` e `useAuth().user`
- Se não viu splash e não está logado → mostrar `WelcomeSplash`
- Ao clicar Login/Cadastro → navegar para `/auth?tab=login` ou `/auth?tab=cadastro`
- Ao clicar Visitante → fechar splash e mostrar Home normal

---

## Etapa 2 — Redirecionamento Pós-Login por Perfil

**Arquivo:** `src/contexts/AuthContext.tsx` (modificar)

- Após login, ler `user_metadata.account_type` (já existe: cliente, advogado, produtor, afiliado)
- Redirecionar para a rota adequada:
  - `advogado` → `/dashboard` (painel jurídico)
  - `cliente` → `/dashboard` (painel cliente)
  - `produtor` → `/dashboard` (painel produtor)
  - `afiliado` → `/dashboard` (painel afiliado)
- Se `onboarding_completed === false` → redirecionar para `/dashboard/configurar-ia`

---

## Etapa 3 — Onboarding Guiado no Primeiro Login

**Arquivo:** `src/pages/dashboard/ConfigurarIA.tsx` (já existe com 7 steps)

- Adicionar steps extras no início do onboarding existente:
  1. **Cadastro de Voz** — gravação de amostra de voz do usuário
  2. **Cadastro Facial** — `FaceAuthEnroll` (já existe em `src/components/auth/FaceAuthEnroll.tsx`)
  3. **Informações Complementares** — campos faltantes baseados no perfil (OAB para advogados, CNPJ para empresas, etc.)
- Orion guia por voz cada etapa (já tem sistema de `voicePrompt`)
- Ao concluir → `onboarding_completed = true` no `neural_config`
- Redirecionar para dashboard principal

---

## Etapa 4 — Copiar Logo para Assets

- Copiar `user-uploads://orion-logo-2.jpg` → `src/assets/orion-logo-2.jpg`
- Usar no `WelcomeSplash` como logo animada

---

## Detalhes Técnicos

| Item | Tecnologia |
|------|-----------|
| Vídeo intro | HTML5 `<video>` com evento `onEnded` |
| Background animado | `HeroThreeBackground` (WebGL shader existente) |
| Animações texto | Framer Motion (já no projeto) |
| Estado splash | `sessionStorage.setItem('orion_splash_seen', '1')` |
| Onboarding flag | `neural_config.onboarding_completed` (Supabase) |
| Face enrollment | `FaceAuthEnroll` componente existente |

---

## Ordem de Implementação

1. Copiar logo + criar `WelcomeSplash`
2. Integrar no `Index.tsx`
3. Ajustar redirecionamento pós-login no `AuthContext`
4. Expandir onboarding no `ConfigurarIA.tsx`

