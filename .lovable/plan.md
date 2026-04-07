

# Auditoria Completa do Site Orion IA — Reorganização Total

## Diagnóstico: O que esta errado

### PROBLEMA 1: Paginas que nao pertencem ao site
O Orion e uma **plataforma SaaS de IA empresarial**. Porem, existem 3 paginas publicas que sao de um **escritorio de advocacia pessoal**, completamente fora de contexto:

| Pagina | Conteudo atual | Problema |
|--------|---------------|----------|
| `/escritorio` | Direito Penal, Internacional, Trabalhista, Direitos Humanos, Civil, Empresarial. CTA "AGENDAR CONSULTA" via WhatsApp pessoal | 100% escritorio de advocacia, nada a ver com SaaS |
| `/pro-bono` | Formulario para pedir assistencia juridica gratuita, criterios de vulnerabilidade social | Servico de escritorio de advocacia, nao da plataforma |
| `/depoimentos` | Avaliacoes de clientes (pode ser de qualquer coisa) | Desconectado — nao referenciado no menu |

### PROBLEMA 2: Duplicacao de conteudo
- `/servicos` e `/clientes` cobrem o MESMO tema (perfis de usuario e beneficios por perfil) com layouts diferentes
- `/plataforma` repete capacidades que ja estao em `/servicos`

### PROBLEMA 3: Navegacao incoerente

**Header (menu atual):**
```text
Home | Solucoes (dropdown) | Plataforma | Precos | Blog
```
- "Solucoes" dropdown tem 4 itens que linkam para anchors em `/servicos` — OK
- Faltam links para paginas que existem: `/clientes`, `/investidor`, `/escritorio`, `/pro-bono`, `/depoimentos`
- `/contato` se chama "Precos" no menu mas a pagina mistura pricing + formulario de contato

**Footer:**
```text
Home | Publicacoes | Plataforma | Investidores | Contato
```
- Diferente do Header — confuso
- Nao tem Servicos, Clientes, Pro Bono, Depoimentos, Escritorio

### PROBLEMA 4: Paginas orfas (sem link de nenhum menu)
- `/escritorio` — nenhum link no Header ou Footer
- `/pro-bono` — nenhum link
- `/depoimentos` — nenhum link
- `/clientes` — nenhum link no Header
- `/investidor` — so no Footer

### PROBLEMA 5: Links quebrados
- `/escritorio` CTA "CONHECER O ESCRITÓRIO" linka para `/sobre` que e um redirect para `/plataforma` — incoerente
- Footer CTA "Criar Conta Grátis" linka para `/cadastro` — OK

---

## Plano de Correcao

### Fase 1 — Eliminar paginas incoerentes

1. **Remover `/escritorio`** da rota publica — esse conteudo (areas juridicas de um escritorio pessoal) ja existe em `/advogado/:advogadoId` que e a pagina personalizada de cada advogado cadastrado. Redirect `/escritorio` para `/servicos#advogados`

2. **Remover `/pro-bono`** da rota publica — nao faz sentido para uma plataforma SaaS. Redirect `/pro-bono` para `/contato`

3. **Manter `/depoimentos`** mas integrar no menu como "Casos de Sucesso" — util para credibilidade

### Fase 2 — Consolidar paginas duplicadas

4. **Absorver `/clientes` em `/servicos`** — ambas mostram perfis (Advogados, Produtores, Afiliados, Industria). Manter `/servicos` como pagina principal de solucoes. Redirect `/clientes` para `/servicos`

5. **Separar `/contato` em duas secoes claras**: Pricing (topo) + Formulario de contato (abaixo). Renomear no menu para "Planos & Contato"

### Fase 3 — Reorganizar navegacao

6. **Novo Header:**
```text
Home | Solucoes (dropdown) | Plataforma | Planos | Blog | Investidores
```
Dropdown "Solucoes":
- Para Advogados → /servicos#advogados
- Para Produtores → /servicos#produtores
- Para Afiliados → /servicos#afiliados
- Para Industria → /servicos#industria
- Casos de Sucesso → /depoimentos

7. **Novo Footer — alinhar com Header:**
```text
Navegacao: Home | Solucoes | Plataforma | Planos | Blog
Empresa: ELP info (manter)
Recursos: Investidores | Casos de Sucesso | Instalar App
Legal: Privacidade | Termos | LGPD
```

### Fase 4 — Atualizar rotas e redirects

8. **Novos redirects em App.tsx:**
- `/escritorio` → `/servicos#advogados`
- `/pro-bono` → `/contato`
- `/clientes` → `/servicos`

9. **Limpar imports** — remover lazy imports de paginas eliminadas (Escritorio, ProBono)

### Fase 5 — Atualizar traducoes (i18n)

10. **Remover secao `escritorio`** do pt.json e todos os outros idiomas (13 arquivos)
11. **Atualizar nav labels** para refletir nova estrutura

---

## Resumo de arquivos a modificar

| Arquivo | Acao |
|---------|------|
| `src/App.tsx` | Remover rotas /escritorio e /pro-bono, adicionar redirects, remover imports |
| `src/components/layout/Header.tsx` | Reorganizar navLinks com nova estrutura + Investidores + Depoimentos |
| `src/components/layout/Footer.tsx` | Alinhar links com Header, adicionar secao Recursos |
| `src/i18n/pt.json` + 12 idiomas | Remover secao `escritorio`, atualizar nav labels |
| `src/lib/neural/orion-nav-map.ts` | Atualizar mapa de navegacao por voz (remover escritorio/pro-bono, ajustar labels) |

Paginas que **NAO serao tocadas** (estao corretas):
- `/` (Home), `/servicos`, `/plataforma`, `/contato`, `/publicacoes`, `/investidor`, `/advogado/:id`, `/vitrine/:id`

