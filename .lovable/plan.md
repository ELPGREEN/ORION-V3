

# Auditoria & Atualização do Painel Rede Neural — Audiobook, Música & YouTube

## Diagnóstico Atual

A aba "Audiobook" na RedeNeuralPage contém 4 componentes empilhados verticalmente:
1. **OrionAudiobookListener** — STT local com Speech Recognition API, visualizador de áudio, detecção de padrões linguísticos
2. **SpotifyPlayer** — Login OAuth, busca por mood, top tracks, recentes (367 linhas)
3. **AmazonMusicPlayer** — Music, Audible, Kindle, Alexa, Shopping (com absorção neural)
4. **YouTubeMusicPlayer** — Login Google, busca, playlists, trending, player iframe (310 linhas)

### Problemas Identificados

1. **Audiobook Learner**: Usa `webkitSpeechRecognition` (browser API) — funciona mas é instável, sem integração com Groq Whisper STT (que já existe como edge function)
2. **Spotify**: Login OAuth implementado mas sem feedback visual de estado real da conexão; sem playback real (preview_url apenas)
3. **YouTube Music**: Player usa iframe embed básico; busca/trending dependem de service functions que podem não estar conectadas
4. **Amazon Music**: Funções `searchAmazonMusic`/`searchAmazonAudiobooks` provavelmente retornam dados mock
5. **Layout**: 4 cards grandes empilhados = scroll excessivo, sem organização visual clara
6. **Sem integração cruzada**: Audiobook Learner não absorve de Spotify/YouTube/Amazon

## Plano de Implementação

### 1. Reorganizar Layout da Aba Audiobook/Música
- Dividir em **2 seções visuais**: "🧠 Aprendizado" (Audiobook Learner no topo) e "🎵 Música & Mídia" (Spotify + Amazon + YouTube em grid 2-col ou tabs internos)
- Adicionar sub-tabs dentro da seção música: Spotify | Amazon | YouTube (em vez de empilhar tudo)

### 2. Melhorar Audiobook Learner
- Integrar com **Groq Whisper STT** (edge function `groq-whisper-stt`) como alternativa ao Speech Recognition nativo — melhor precisão
- Adicionar botão "Absorver para Rede Neural" que salva insights/padrões na base neural via `addNeuralKnowledge`
- Suporte a drag-and-drop de arquivo de áudio
- Mostrar progresso real de processamento com barra de progresso

### 3. Melhorar Spotify Player
- Corrigir estado de conexão com indicador visual claro (online/offline badge)
- Adicionar integração "Absorver Letra" — quando ouvindo, Orion aprende vocabulário da música
- Melhorar UI do playback com album art maior e controles mais intuitivos

### 4. Melhorar YouTube Music
- Usar `FloatingMusicPlayer` existente para reprodução (já implementado com YouTube embed)
- Ao clicar em "Tocar", abrir no FloatingMusicPlayer flutuante em vez de player inline
- Adicionar busca com sugestões baseadas em mood (reuso dos moods do Spotify)

### 5. Melhorar Amazon Music
- Manter tabs existentes (Music, Audible, Kindle, Alexa, Shopping)
- Melhorar visual da função "Absorver" com feedback mais claro (progresso + resultado)

### 6. Auditoria Geral — Limpeza
- Remover estados mortos e console.warns desnecessários
- Garantir que todos os toasts usam `sonner` consistentemente (YouTube usa `useToast`, resto usa `toast` direto)
- Unificar padrão de loading/error/empty states

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/dashboard/RedeNeuralPage.tsx` | Reorganizar layout da aba audiobook com sub-seções |
| `src/components/orion/OrionAudiobookListener.tsx` | Integrar Groq Whisper, drag-drop, absorção neural |
| `src/components/spotify/SpotifyPlayer.tsx` | UI polish, connection badge, absorver letra |
| `src/components/youtube-music/YouTubeMusicPlayer.tsx` | Migrar para sonner, integrar FloatingMusicPlayer |
| `src/components/amazon/AmazonMusicPlayer.tsx` | Melhorar feedback de absorção |

