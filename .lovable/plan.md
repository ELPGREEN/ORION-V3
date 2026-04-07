

# Auditoria de Responsividade e Correções — Todas as Páginas Públicas

## Problemas Encontrados

### 1. Footer: Grid com 5 colunas em layout de 4
O Footer tem 5 blocos (Brand, Navegação, Recursos, Empresa, Contato) mas usa `grid-cols-2 lg:grid-cols-4`. No desktop, a 5ª coluna (Contato) cai para uma nova linha sozinha. No mobile (2 colunas), o Brand ocupa `col-span-2` mas sobram 4 itens em grid de 2 — funciona, porém "Empresa" e "Contato" ficam apertados em telas 320px.

**Fix**: Mudar para `lg:grid-cols-5` ou consolidar Empresa + Contato numa única coluna. Recomendo consolidar (manter 4 colunas) para evitar texto muito estreito.

### 2. Header: Desktop nav usa `xl:` (1280px) — gap entre 768-1279px
O menu desktop só aparece a partir de `xl:` (1280px). Entre 768px e 1279px (tablets), o usuário vê apenas o menu hambúrguer mobile. Isso é funcional mas não ideal para tablets landscape.

**Fix**: Mudar breakpoint de `xl:` para `lg:` (1024px) e reduzir padding/tracking dos links para caber. Ou manter `xl:` se o menu for complexo demais (6 items + dropdown) — aceitável.

### 3. Hero: `min-h-[85svh]` sem fallback para navegadores antigos
`svh` não é suportado em Safari < 15.4 e Chrome < 108.

**Fix**: Adicionar `min-h-[85vh]` como fallback antes de `min-h-[85svh]` → `min-h-[85vh] min-h-[85svh]`.

### 4. ComparisonSection: Colunas de 70px muito apertadas em 320px
A tabela comparativa usa `grid-cols-[1fr,70px,70px]` no mobile. Com padding, sobram ~180px para o texto da feature — apertado em 320px.

**Fix**: Reduzir para `grid-cols-[1fr,56px,56px]` no mobile e manter `sm:grid-cols-[1fr,120px,120px]`.

### 5. Solução pages: Hero `min-h-[45vh]` pode ser excessivo em landscape mobile
Em phones landscape (altura ~320px), 45vh = 144px — na verdade é OK. Sem fix necessário.

### 6. Footer bottom bar: Texto longo demais em mobile 320px
A linha `© 2023-2026 ELP® Green Technology • CNPJ ... • VAT ... • ELP® PROPERTY` é muito longa e quebra de forma deselegante em 320px.

**Fix**: Esconder CNPJ/VAT em mobile, mostrar apenas no `sm:`.

### 7. SecurityShieldSection: `grid-cols-4` com 8 items — 2 rows perfeitas em desktop, mas `md:grid-cols-3` cria 3 rows com 2 items na última (desalinhado).

**Fix**: Mudar para `sm:grid-cols-2 lg:grid-cols-4` (remover `md:grid-cols-3`) para ter 2→4 colunas diretamente.

### 8. SystemArchitectureSection: 9 items em `lg:grid-cols-4` — última row tem 1 item sozinho

**Fix**: Mudar para `lg:grid-cols-3` (9 items = 3 rows perfeitas de 3).

### 9. Touch targets no mobile menu
Os links do dropdown mobile (`py-2.5`) têm ~32px de altura. O mínimo recomendado para mobile é 44px.

**Fix**: Aumentar para `py-3` nos sub-items do dropdown mobile.

### 10. Falta `<meta name="viewport">` check
Preciso confirmar que o viewport meta tag está correto no `index.html`.

## Plano de Implementação

### Passo 1 — Footer: Consolidar Empresa + Contato
Mesclar os blocos "Empresa" e "Contato" em uma única coluna. Footer fica com 4 colunas limpas: Brand | Navegação | Recursos | Empresa & Contato.

### Passo 2 — Footer bottom bar: Responsive text
Esconder detalhes CNPJ/VAT em mobile, manter no `sm:inline`.

### Passo 3 — ComparisonSection: Colunas menores no mobile
Mudar `grid-cols-[1fr,70px,70px]` → `grid-cols-[1fr,56px,56px]`.

### Passo 4 — SecurityShieldSection: Grid fix
Remover `md:grid-cols-3`, usar `sm:grid-cols-2 lg:grid-cols-4`.

### Passo 5 — SystemArchitectureSection: Grid fix
Mudar `lg:grid-cols-4` → `lg:grid-cols-3` (9 items, 3 rows perfeitas).

### Passo 6 — Hero: svh fallback
Adicionar `min-h-[85vh]` como fallback.

### Passo 7 — Mobile menu touch targets
Aumentar padding dos sub-items do dropdown mobile de `py-2.5` para `py-3`.

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/components/layout/Footer.tsx` | Consolidar colunas + responsive bottom text |
| `src/components/home/ComparisonSection.tsx` | Grid columns mobile |
| `src/components/home/SecurityShieldSection.tsx` | Grid breakpoints |
| `src/components/home/SystemArchitectureSection.tsx` | Grid 3 cols |
| `src/components/home/HeroSection.tsx` | svh fallback |
| `src/components/layout/Header.tsx` | Touch targets dropdown mobile |

