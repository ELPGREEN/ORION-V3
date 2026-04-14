

# Diagnóstico: O que Orion REALMENTE faz vs. o que PARECE fazer

## Status Atual

### FUNCIONA DE VERDADE:
1. **Música — buscar e tocar**: O comando "tocar música X" dispara `orion-music-command` → `OrionPlaylistBar` busca no Spotify/YouTube e toca (preview 30s Spotify ou embed YouTube). **Funciona.**
2. **Pausar/Retomar música**: Comandos "pausar música" / "parar reprodução" enviam `action: "pause"` ao player. **Funciona.**
3. **Próxima/Anterior faixa**: `next`/`prev` são tratados no `OrionPlaylistBar`. **Funciona.**
4. **Abrir vídeo**: `orion-browser-actions.ts` detecta URLs do YouTube e dispara `orion-video-command` → embed no painel. **Funciona.**
5. **Pesquisa web**: Padrões "pesquisar na web sobre X" são interceptados e roteados ao LLM com prompt de pesquisa. **Funciona** (mas é LLM, não busca real na web).
6. **Mute/Unmute do player**: Botão visual funciona. **Funciona.**

### NÃO FUNCIONA (apenas registrado, sem execução real):
1. **Controle de volume por voz** ("aumentar volume", "diminuir volume"): Registrado em `orion-command-registry.ts` como `cfg_volume_up` com modelo `SLM`, mas o `executeAction` no LAM é **simulado** (`simulated: true`). Não há código que realmente altere o `volume` do `<audio>` ou do SDK Spotify.
2. **Volume slider visual**: O `OrionPlaylistBar` tem apenas mute/unmute (toggle). Não tem slider de volume. O `OrionAudiobookListener` tem slider, mas é componente separado.
3. **Comandos "silenciar"/"mudo"** por voz: Registrados como `cfg_mute`/`cfg_unmute` mas **não conectados** a nenhum dispatch real.

### PARCIALMENTE FUNCIONA:
1. **Pesquisa**: Rota para LLM com prompt de pesquisa — não faz scraping web real, usa conhecimento do modelo.

## Plano de Correção

### 1. Adicionar slider de volume ao OrionPlaylistBar
- Substituir o botão mute/unmute por um grupo: botão mute + slider de volume (0-100)
- Controlar `audioRef.current.volume` e `sdk.changeVolume()`

### 2. Conectar comandos de voz de volume ao player real
- No `useOrionReasoning.ts`, interceptar padrões de volume ("aumentar volume", "diminuir volume", "volume no máximo", "silenciar") ANTES do LLM
- Disparar novo evento `orion-volume-command` com action: `up`/`down`/`set`/`mute`/`unmute`
- No `OrionPlaylistBar`, escutar esse evento e ajustar o volume real

### 3. Garantir que comandos de voz passam pela verificação de identidade
- Os comandos de mídia já funcionam sem verificação de identidade (são comandos utilitários, não admin)
- Verificar que o STT está capturando e o pipeline está processando os comandos

### Arquivos a modificar:
- `src/components/orion/OrionPlaylistBar.tsx` — adicionar slider de volume + listener de volume por voz
- `src/components/dashboard/neural/useOrionReasoning.ts` — interceptar comandos de volume e disparar eventos
- `src/components/orion/FloatingMusicPlayer.tsx` — adicionar controle de volume (consistência)

### Resultado esperado:
- Volume controlável visualmente (slider) e por voz ("Orion, aumentar volume", "volume 50%")
- Todos os comandos de mídia (play, pause, next, prev, volume) funcionam de verdade
- Feedback visual e por voz quando comando é executado

