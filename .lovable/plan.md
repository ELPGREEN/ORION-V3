

# Plano: Corrigir OAuth + Player Integrado + Projetor de Vídeo + Comandos de Voz

## Problemas Identificados

1. **Google OAuth 400 (YouTube Music)**: O `redirect_uri` configurado no código é `{origin}/callback/youtube-music`, mas esse URI precisa estar cadastrado no Google Cloud Console. Além disso, no ambiente de preview do Lovable, o origin muda — causando mismatch.

2. **Spotify redirect_uri_mismatch**: Mesmo problema — o URI `{origin}/spotify-callback` precisa estar no Spotify Developer Dashboard.

3. **Busca de música sem redirecionar**: O `OrionPlaylistBar` já busca via Spotify client credentials (sem login), mas só toca previews de 30s. Para YouTube Music, a busca precisa de OAuth.

4. **Comandos de voz do Orion**: Falta integração para que comandos como "toca música X", "pausa", "próxima", "volta" sejam interceptados e executados no player in-app.

5. **Projetor de vídeo**: O `VideoOverlay` já existe mas precisa de melhorias visuais (efeito 3D holográfico) e integração com comandos de voz.

## Plano de Implementação

### 1. Corrigir OAuth redirect URIs
- **YouTube Music**: Atualizar o código para usar um redirect_uri fixo baseado no domínio de produção `https://www.iasofthub.com/callback/youtube-music`
- **Spotify**: Idem — fixar `https://www.iasofthub.com/spotify-callback`
- **Documentar** os URIs exatos que você precisa cadastrar nos consoles do Google e Spotify

### 2. Busca de música sem login (YouTube)
- Adicionar ação `search_public` no edge function `youtube-music-api` que usa apenas a `YOUTUBE_API_KEY` (sem OAuth) para buscar vídeos musicais
- Reproduzir via iframe embed do YouTube no player in-app (sem precisar de conta conectada)
- Manter OAuth como opcional para playlists pessoais

### 3. Player unificado com comandos de voz
- Expandir `OrionPlaylistBar` para aceitar eventos de voz: `play`, `pause`, `next`, `prev`, `search`
- Interceptar no processamento de linguagem natural do Orion frases como:
  - "toca [música]" → busca + auto-play
  - "pausa" / "para" → pause
  - "próxima" / "pula" → next
  - "volta" / "anterior" → prev
  - "busca [termo]" → search
- Usar YouTube embed como fallback quando Spotify preview não disponível

### 4. Projetor de vídeo holográfico 3D
- Melhorar `VideoOverlay` com efeito de projeção 3D:
  - Cone de luz saindo do avatar do Orion
  - Bordas holográficas animadas (shimmer)
  - Perspectiva CSS 3D (transform: perspective + rotateY sutil)
- Comando "mostra vídeo de X" → busca YouTube → abre no projetor

### 5. Painel IoT (MQTT + Bluetooth + WiFi)
- Criar seção no painel da Rede Neural para dispositivos conectados
- Listar dispositivos via MQTT topics (câmeras, lâmpadas, TV, etc.)
- Interface de controle: on/off, status, stream de câmera
- Integração com o broker HiveMQ já configurado

## Ações Manuais Necessárias (Google Cloud Console)

Você precisa adicionar estes URIs no console correspondente:

**Google Cloud Console** (YouTube Music):
- `https://www.iasofthub.com/callback/youtube-music`

**Spotify Developer Dashboard**:
- `https://www.iasofthub.com/spotify-callback`

## Arquivos a Modificar/Criar

| Arquivo | Ação |
|---------|------|
| `src/lib/youtube-music/youtube-music-service.ts` | Fixar redirect_uri para produção, adicionar busca pública |
| `src/lib/spotify/spotify-service.ts` | Fixar redirect_uri para produção |
| `supabase/functions/youtube-music-api/index.ts` | Adicionar action `search_public` sem OAuth |
| `src/components/orion/OrionPlaylistBar.tsx` | Adicionar YouTube embed fallback, mais eventos de voz |
| `src/components/orion/VideoOverlay.tsx` | Efeitos 3D holográficos, cone de projeção |
| `src/lib/neural/orion-browser-actions.ts` | Rotear comandos de música/vídeo para componentes in-app |
| `src/components/orion/OrionIoTPanel.tsx` | Novo — painel de dispositivos IoT |

