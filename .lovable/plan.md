

# Reorganização Completa das Páginas Públicas, Menu e Rotas

## Diagnóstico

O dropdown "Soluções" no Header tem 4 itens (Advogados, Produtores, Afiliados, Indústria) que **todos apontam para `/servicos#ancora`**. O problema: a navegação hash no React Router não faz scroll automático confiável, e o usuário sente que "todas direcionam para a mesma página". Além disso, existem páginas órfãs (`Clientes.tsx`, `Escritorio.tsx`, `ProBono.tsx`) com conteúdo duplicado ou incoerente.

## Modelo Híbrido Aprovado

```text
Menu Principal:
├─ Home (/)
├─ Soluções (dropdown)
│   ├─ Para Advogados → /solucoes/advogados (página própria)
│   ├─ Para Produtores → /solucoes/produtores (página própria)
│   ├─ Para Afiliados → /solucoes/afiliados (página própria)
│   ├─ Para Indústria → /solucoes/industria (página própria)
│   └─ Visão Geral → /servicos (página existente, overview)
├─ Plataforma (/plataforma)
├─ Planos (/contato)
├─ Blog (/publicacoes)
├─ Investidores (/investidor)
└─ [Auth buttons]
```

## Plano de Implementação

### 1. Criar 4 páginas de perfil dedicadas (NOVAS)
Criar em `src/pages/solucoes/`:
- `Advogados.tsx` — IA jurídica, petições, pesquisa STF/STJ, gestão processos, assinatura digital
- `Produtores.tsx` — Loja própria, checkout Stripe, editor de vendas, programa afiliados
- `Afiliados.tsx` — Links rastreáveis, 0% taxa plataforma, vitrine personalizada, comissões auto
- `Industria.tsx` — Smart OTR, ROS2, visão computacional, SCADA/IoT, robótica autônoma

Cada página: Hero + features grid + diferenciais + CTA. Estilo Orion (tron-grid, scanlines, GatewayBackground). Conteúdo vem dos dados já definidos em `Servicos.tsx` (profiles array) expandidos com mais detalhes.

### 2. Atualizar rotas no `App.tsx`
- Adicionar 4 rotas: `/solucoes/advogados`, `/solucoes/produtores`, `/solucoes/afiliados`, `/solucoes/industria`
- Manter `/servicos` como overview geral (já existe e funciona)
- Redirect `/clientes` → `/servicos`, `/escritorio` → `/solucoes/advogados`

### 3. Atualizar o Header (`Header.tsx`)
Mudar o dropdown "Soluções" para apontar às novas páginas dedicadas:
```
/servicos#advogados  →  /solucoes/advogados
/servicos#produtores →  /solucoes/produtores
/servicos#afiliados  →  /solucoes/afiliados
/servicos#industria  →  /solucoes/industria
```
Adicionar item "Visão Geral" → `/servicos`

### 4. Atualizar links em outros componentes
- `WhoIsItForSection.tsx` — mesmas correções de href
- `SmartOtrSection.tsx` — CTA → `/solucoes/industria`
- `Footer.tsx` — atualizar links de navegação
- `Servicos.tsx` — CTA de cada perfil linka para a página dedicada

### 5. Limpar páginas órfãs
- `Clientes.tsx` — remover importação e redirect `/clientes` → `/servicos`
- `Escritorio.tsx` — remover importação e redirect `/escritorio` → `/solucoes/advogados`
- Manter `ProBono.tsx` (funcional, formulário de acesso social)

### 6. Padronizar estilo visual
Todas as 4 novas páginas seguem o padrão Orion:
- `MainLayout` wrapper
- Hero com `HeroThreeBackground` + overlay gradiente
- Sections com `tron-grid-bg`, `tron-scanline`, `GatewayBackground`
- Botões `btn-gold`, `btn-outline-gold`
- Typography: `font-serif` para títulos, `tracking-[0.3em]` para labels
- Espaçamento: `py-12 sm:py-16` (compacto, sem excesso)

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/solucoes/Advogados.tsx` | CRIAR |
| `src/pages/solucoes/Produtores.tsx` | CRIAR |
| `src/pages/solucoes/Afiliados.tsx` | CRIAR |
| `src/pages/solucoes/Industria.tsx` | CRIAR |
| `src/App.tsx` | Adicionar 4 rotas + limpar imports órfãos |
| `src/components/layout/Header.tsx` | Atualizar dropdown links |
| `src/components/layout/Footer.tsx` | Atualizar links navegação |
| `src/components/home/WhoIsItForSection.tsx` | Atualizar hrefs |
| `src/components/home/SmartOtrSection.tsx` | Atualizar CTA link |
| `src/pages/Servicos.tsx` | Adicionar links para páginas dedicadas |

