# Plano: Melhorias na Extensão Orion — Video Overlay, Controle por Voz e Pesquisa Profissional

## Resumo

Aprimorar a extensão Chrome do Orion com: (1) player de vídeo flutuante holográfico com controles, (2) pausa automática do vídeo ao detectar "Orion", (3) modo pesquisa profissional JARVIS-style, e (4) navegação por voz ao painel. Sem alterar STT/TTS/microfone.

&nbsp;

Implemente as melhorias descritas no plano abaixo na extensão Chrome da assistente Orion. Não modifique, não altere e não toque em nenhuma parte relacionada a STT, TTS, reconhecimento de voz, wake word ou processamento de áudio/microfone. Mantenha esses blocos exatamente como estão.

&nbsp;

**Plano de Melhorias:**

&nbsp;

1. **Video Overlay Flutuante Holográfico**

   - Adicione um player de vídeo flutuante (estilo holográfico) no canto do navegador, com controles: minimizar, mute e fechar.

   - Comandos de voz como "abre vídeo de..." devem reproduzir o vídeo diretamente nesse overlay.

   - A Orion (widget/chat) deve continuar ativa e responsiva enquanto o vídeo toca.

   - Ao detectar a palavra "Orion" (no bloco existente de recognition.onresult), pause automaticamente o vídeo usando postMessage para o iframe YouTube, antes de processar o novo comando.

   - Use YouTube iframe com parâmetros: ?enablejsapi=1&autoplay=1&origin=...

   - Controle do player via postMessage (pauseVideo, playVideo, mute, etc.) — não recarregue o src do iframe.

   - Adicione drag-to-resize no overlay (baixa prioridade).

&nbsp;

2. **Pesquisa Profissional (estilo JARVIS)**

   - Melhore o auto-context enrichment em sendAIQuery() para incluir meta tags, structured data (JSON-LD) e headers da página.

   - Adicione quick action buttons no painel: "🔬 Comparar Fontes", "💡 Sugestões de Busca".

   - Implemente detecção automática de tipo de página (artigo/paper acadêmico) por domínio ou presença de <article>, citações, DOI. Mostre badge "📚 Paper Detectado" e ofereça outline/resumo proativamente.

   - Mantenha resposta rápida após o comando finalizar.

&nbsp;

3. **Navegação por Voz ao Painel**

   - Melhore o regex existente para "ir/voltar para o painel".

   - Adicione confirmação visual: addChatMessage("assistant", "Indo para o painel de controle...") antes de navegar.

   - Suporte variantes como "abrir side panel" enviando { type: "OPEN_SIDE_PANEL" }.

&nbsp;

4. **Estilo Holográfico**

   - Melhore o CSS do video overlay com glassmorphism forte, gradient animado nas bordas, backdrop-filter e transições suaves para minimize/expand.

   - Adicione barra de progresso visual simples via CSS.

&nbsp;

5. **Background**

   - Adicione handler ORION_VIDEO_CONTROL no background.js para pausar/resumir/mutar vídeo em qualquer aba.

&nbsp;

**Restrições rigorosas:**

- Não toque no bloco STT/reconhecimento de voz (linhas ~330-357) — apenas adicione o pause do vídeo dentro do callback onresult existente.

- Não altere o bloco TTS.

- Não mexa em lógica de auth, vision capture ou wake word.

- Permissões do manifest.json já estão suficientes — não altere.

&nbsp;

Arquivos a modificar:

- extension/content.js (principal)

- extension/content.css

- extension/background.js

&nbsp;

Gere o código completo e organizado em blocos separados, bem comentado, seguindo exatamente o plano acima. Use YouTube Player API via postMessage para controle do vídeo.

&nbsp;

Comece agora implementando essas melhorias na extensão Orion.

## Mudanças

### 1. `extension/content.js` — Video Overlay Melhorado

- **Controles aprimorados**: Mute funcional via `postMessage` para o iframe YouTube (API do YouTube Player), não via reload de src (que causa re-buffer)
- **Pausa por wake word**: No `recognition.onresult` (bloco existente, sem alterar lógica STT), adicionar check — se `videoOverlay` está ativo e detecta "orion", pausar o vídeo via `postMessage({ event: 'command', func: 'pauseVideo' })` antes de processar o comando
- **Embed URL com enablejsapi=1**: Adicionar `?enablejsapi=1&autoplay=1&origin=...` no embed para habilitar controle via postMessage
- **Drag-to-resize**: Permitir arrastar para redimensionar o overlay (opcional, baixa prioridade)

### 2. `extension/content.js` — Pesquisa Profissional (JARVIS-style)

- **Auto-context enrichment** já existe em `sendAIQuery()` (extrai seleção ou conteúdo principal). Melhorar para incluir meta tags, structured data (JSON-LD), e headers da página
- **Quick action buttons** adicionais no painel: "🔬 Comparar Fontes", "💡 Sugestões de Busca" 
- **Detecção automática de tipo de página**: Se artigo/paper acadêmico (heurística por domínio ou presença de `<article>`, citações, DOI), mostrar badge "📚 Paper Detectado" e oferecer outline/resumo proativamente
- **Resposta rápida**: Já envia contexto ao backend; sem mudanças de latência necessárias no frontend

### 3. `extension/content.js` — Navegação ao Painel

- Já existe regex para "ir/voltar para o painel" (linhas 397-401). Adicionar `addChatMessage("assistant", "Indo para o painel de controle...")` como confirmação visual antes de navegar
- Adicionar variantes: "abrir side panel" → `chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" })`

### 4. `extension/content.css` — Estilo Holográfico do Video Overlay

- Melhorar o overlay com efeito glassmorphism mais pronunciado, gradient animado nas bordas, backdrop-filter
- Adicionar transições suaves para minimize/expand
- Barra de progresso visual (via CSS, sem JS adicional complexo)

### 5. `extension/background.js` — Suporte a Vídeo

- Adicionar handler `ORION_VIDEO_CONTROL` para pausar/resumir/mutar vídeo em qualquer aba
- Manter lógica existente de `OPEN_EXTERNAL_LINK` para navegação ao dashboard

### 6. `extension/manifest.json` — Sem alterações

- Permissões já incluem tudo necessário (tabs, activeTab, scripting, sidePanel)

## O que NÃO será alterado

- Bloco STT/reconhecimento de voz (linhas 330-357) — apenas adição de pause do vídeo no callback existente
- Bloco TTS (linhas 748-764) — intocado
- Lógica de auth, wake word, vision capture

## Arquivos modificados

1. `extension/content.js` — Video overlay com YouTube API, pausa por wake word, pesquisa aprimorada, confirmação de navegação
2. `extension/content.css` — Estilo holográfico melhorado do overlay
3. `extension/background.js` — Handler de controle de vídeo
4. Repack `public/orion-extension.zip`

## Detalhes Técnicos

- YouTube iframe API: `postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')` controla o player sem recarregar o iframe