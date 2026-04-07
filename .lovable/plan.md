

# Plano: Redesign Visual dos Painéis por Role + Loja Orion Industrial + Mini-Lojas

## Problema Atual

Todos os dashboards (Cliente, Advogado, Produtor, Afiliado, Nômade, Proprietário) usam o MESMO estilo visual genérico: cards brancos com bordas finas, ícones Lucide monocromáticos, gradientes sutis de `primary/10`. Não há identidade visual por role. As lojas (`Loja.tsx`, `ExplorarLojas.tsx`) também são genéricas — sem diferenciação entre uma loja de cursos e uma loja de serviços industriais.

**Falta completamente**: Uma "Loja Orion" dedicada a serviços industriais (robótica, automação, segurança, visão computacional).

---

## Identidade Visual por Painel

Cada role terá um "tema" com cores de accent, ícones hero, e gradientes distintos:

```text
ROLE              COR ACCENT        ESTILO HEADER              IDENTIDADE
─────────────────────────────────────────────────────────────────────────
Proprietário      Gold/Amber         Gradient dark + glow       Comando Total, militar/industrial
Advogado          Emerald/Teal       Border sóbria + serif      Jurídico, formal, confiável
Cliente           Blue/Primary       Limpo, amigável            Simples, acessível, cards suaves
Produtor          Violet/Purple      Bold, vendas, vibrante     Empreendedor, energia, crescimento
Afiliado          Cyan/Sky           Analytics-driven           Performance, dados, conversão
Nômade Digital    Amber/Orange       Globe accent, moderno      Liberdade, mobilidade, global
```

### 1. ProprietarioDashboard — "Centro de Comando"

**Estilo atual**: Gradientes sutis, botões outline genéricos.
**Novo estilo**:
- Header com fundo escuro `bg-gradient-to-br from-slate-900 via-slate-800 to-primary/20` com linhas de grid animadas (estilo HUD militar)
- Stats com bordas `border-amber-500/30` e ícones amber/gold
- Seções com headers que parecem painéis de controle industrial (linhas finas, badges "ONLINE/OFFLINE")
- OrionComandoTotal com visual de painel de controle de fábrica: LEDs de status, tipografia monospace para dados
- Animação sutil de "scanning" nos cards de subsistemas

### 2. AdvogadoDashboard — "Escritório Digital"

**Novo estilo**:
- Header com tipografia serif elegante, cores emerald/teal
- Cards de prazo com borda lateral colorida (vermelho/amarelo/verde) tipo "case folder tabs"
- Seção de clientes com avatares em círculos com ring de status
- Timeline de atividades com linha vertical conectando pontos (estilo timeline jurídica)
- Palette: `emerald-600`, `teal-500`, backgrounds `slate-50/slate-900`

### 3. ClienteDashboard — "Portal Pessoal"

**Novo estilo**:
- Header acolhedor com onda suave de background
- Cards arredondados (`rounded-xl`) com sombras suaves
- Seção "Meus Serviços" (jurídico) com ícone de balança e border-left emerald
- Seção "Meus Conteúdos" (produtos) com ícone de livro e border-left violet
- Cores quentes e acessíveis, maior espaçamento

### 4. ProdutorDashboard — "Painel de Vendas"

**Novo estilo**:
- Header com gradient vibrante violet-to-purple
- Stats com números grandes e indicadores de tendência (setas up/down)
- Card "Link da Loja" mais proeminente com visual de banner
- Grid de ferramentas com hover effects mais expressivos (scale + glow)

### 5. AfiliadoDashboard — "Painel de Performance"

**Novo estilo**:
- Estilo analytics/data-driven com fundo grid
- Charts com cores cyan/sky/teal
- Cards de stats com micro-sparklines
- Tab ativa com underline animada

### 6. NomadeDigitalDashboard — "Hub Global"

**Novo estilo**:
- Header com ícone de globo animado (rotate sutil)
- Palette amber/orange/warm
- Cards com aspecto de "boarding pass" / cartão de viagem

---

## Mini-Lojas: Estilo Visual

### Loja do Produtor (`/loja/:creatorId`)
**Atual**: Layout genérico com cards de produto.
**Melhorias**:
- Banner hero do produtor com foto de capa, avatar, bio curta
- Grid de produtos com hover 3D sutil (perspective transform)
- Badges de "Bestseller", "Novo", "Desconto"
- Sidebar com categorias e filtros visuais
- Footer com selo "Powered by Orion Platform"

### Vitrine do Afiliado (`/vitrine/:affiliateId`)
- Header com nome do afiliado + badge "Curadoria"
- Layout mais editorial (cards maiores, destaque visual nos top picks)
- Selo "Recomendado por [nome]" nos produtos

---

## LOJA ORION — Serviços Industriais (NOVA)

Página dedicada `/loja-orion` para o catálogo de serviços do proprietário:

### Categorias de Produto/Serviço:
1. **Robótica Industrial** — AGVs, braços robóticos, integração ROS2
2. **Automação de Processos** — PLCs, SCADA, linhas de produção
3. **Visão Computacional** — Inspeção de qualidade, OCR industrial, detecção de defeitos
4. **Segurança & Vigilância** — Câmeras com IA, detecção de intrusão, analytics de vídeo
5. **Ferramentas IA** — Orion IA, RAG, análise preditiva, manutenção preventiva
6. **IoT Industrial** — Sensores MQTT, monitoramento de ativos, telemetria

### Estilo Visual:
- **Dark theme** predominante (slate-900/950) com accents em cyan/electric-blue
- Header hero com vídeo/animação de fábrica ou robô (pode ser imagem hero estática)
- Cards de serviço com ícones técnicos detalhados e descrições curtas
- Seção "Stack Tecnológico" mostrando ROS2, Docker, MQTT, Gemini, WebRTC como badges tech
- Seção "Casos de Uso" com cards visuais (pneu, logística, automotive)
- Botão "Falar com Orion" para consulta IA sobre necessidades industriais
- Botão "Solicitar Orçamento" que abre formulário de contato

### Integração com Sistemas:
- Card interativo "Visão Computacional" que mostra preview do feed de câmera (WebRTC)
- Card "Controle Robótico" com link direto para `/dashboard/controle-robotico`
- Card "IoT Dashboard" com mini-visualização de dispositivos conectados
- Cada serviço pode ter "Demo Interativa" linkando às páginas internas do dashboard

---

## Implementação

### Arquivos a criar:
1. `src/pages/LojaOrion.tsx` — Loja Orion de serviços industriais (dark, tech, cyberpunk-industrial)
2. `src/components/dashboard/DashboardTheme.tsx` — Componentes de UI temáticos reutilizáveis (ThemedHeader, ThemedStatCard, ThemedSection)

### Arquivos a modificar:
1. `src/pages/dashboard/ProprietarioDashboard.tsx` — Estilo HUD/comando industrial
2. `src/pages/dashboard/AdvogadoDashboard.tsx` — Estilo escritório jurídico formal
3. `src/pages/dashboard/ClienteDashboard.tsx` — Estilo portal acolhedor
4. `src/pages/dashboard/ProdutorDashboard.tsx` — Estilo vendas vibrante
5. `src/pages/dashboard/AfiliadoDashboard.tsx` — Estilo analytics/performance
6. `src/pages/dashboard/NomadeDigitalDashboard.tsx` — Estilo hub global
7. `src/pages/Loja.tsx` — Banner hero do produtor, badges, hover effects
8. `src/pages/dashboard/ExplorarLojas.tsx` — Cards de loja mais visuais
9. `src/App.tsx` — Rota `/loja-orion`
10. `src/components/dashboard/OrionComandoTotal.tsx` — Visual de painel de controle industrial

### Componentes temáticos compartilhados (`DashboardTheme.tsx`):
- `ThemedHeader`: Header com gradient, glow, tipografia por role
- `ThemedStatCard`: Card de stat com cor accent do role
- `ThemedSection`: Wrapper de seção com título estilizado por role
- `StatusLED`: Indicador ON/OFF estilo industrial

### Nenhuma migration necessária.

