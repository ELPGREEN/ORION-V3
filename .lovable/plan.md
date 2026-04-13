

# Plano: Integrar Pesquisa e Vídeo do Orion Dentro do Painel

## Situação Atual
- O `VideoOverlay` é um componente **flutuante** que aparece sobre o conteúdo (fixed, z-9999)
- A pesquisa do Orion no painel usa `useOrionReasoning` com regex para detectar comandos de pesquisa
- Os botões de pesquisa (🔍 Pesquisar, 🔬 Fontes, 💡 Sugestões) apenas preenchem o input do chat
- Vídeos do YouTube abrem no overlay flutuante via `orion-video-command` event
- A aba "Pesquisa" (`/dashboard/pesquisa-unificada`) já existe mas é separada do Orion

## O Que Vai Mudar

### 1. Criar aba "Pesquisa" integrada no painel do Orion (NeuralVision)
- Adicionar uma nova tab/seção no painel Orion que funciona como **navegador integrado**
- Essa aba terá um iframe que simula navegação web (Google, resultados, artigos)
- O Orion controla o que aparece nesse iframe com base nos comandos de pesquisa
- Botões de pesquisa rápida ficam integrados nessa aba

### 2. Vídeo embutido no painel (não flutuante)
- Quando o Orion receber comando de vídeo, em vez de abrir o `VideoOverlay` flutuante, **embutir o vídeo dentro do próprio painel** numa seção dedicada
- O vídeo aparece na área principal do painel com controles (play, mute, fechar)
- O chat do Orion continua ativo abaixo/ao lado do vídeo
- Manter o `VideoOverlay` flutuante apenas para quando o usuário NÃO estiver no painel

### 3. Pesquisa integrada como navegador interno
- Criar componente `OrionResearchBrowser` — um mini-navegador dentro do painel
- Usa iframe para exibir resultados do Google, artigos, papers
- O Orion analisa o conteúdo da página pesquisada e mostra resumos/insights no chat ao lado
- Controles: barra de URL, voltar, avançar, refresh

## Arquivos a Modificar

1. **`src/components/orion/OrionResearchBrowser.tsx`** (NOVO) — Componente de navegador integrado com iframe, barra de pesquisa, e controles de navegação
2. **`src/components/orion/OrionEmbeddedVideo.tsx`** (NOVO) — Player de vídeo embutido no painel (não flutuante), com controles mute/fechar/minimize
3. **`src/components/dashboard/neural/NeuralVision.tsx`** — Adicionar tabs para alternar entre "Chat", "Pesquisa" e "Vídeo"; integrar os novos componentes
4. **`src/components/dashboard/neural/useOrionReasoning.ts`** — Ao detectar comando de pesquisa web, enviar resultado para o browser integrado; ao detectar comando de vídeo no painel, embutir em vez de overlay flutuante
5. **`src/components/orion/VideoOverlay.tsx`** — Condicionar: só abre overlay flutuante se o usuário NÃO estiver na página do painel neural

## Detalhes Técnicos

- O iframe do navegador de pesquisa usará Google Search via URL (`https://www.google.com/search?igu=1&q=...`) com `sandbox` attributes para segurança
- O vídeo embutido usa YouTube embed com `enablejsapi=1` e controle via `postMessage`
- A decisão flutuante vs embutido depende da rota atual: se `/dashboard/rede-neural` → embutido; senão → flutuante
- Os botões de pesquisa rápida serão movidos para a aba de pesquisa integrada
- STT/TTS/wake word: **intocados**

