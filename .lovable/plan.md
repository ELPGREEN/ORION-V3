

# Plano: Atualizar Spotify Web Playback SDK + Plugin Nativo Capacitor

## Análise — O que falta comparando com a documentação oficial

### `useSpotifyPlayback.ts` — Gaps encontrados

| Feature SDK | Status | Impacto |
|---|---|---|
| `enableMediaSession: true` | Ausente no construtor | Sem controles de mídia no lockscreen/notificação |
| `activateElement()` | Não implementado | Autoplay falha em browsers móveis — crítico |
| `autoplay_failed` event | Não escutado | Usuário não sabe que precisa clicar para ativar |
| `playback_error` event | Não escutado | Erros de playback silenciosos |
| `getCurrentState()` | Não exposto | Não consegue sincronizar estado real |
| `setName()` | Não exposto | Menor prioridade |
| `getVolume()` | Não usado | Menor prioridade |
| `pause()` / `resume()` separados | Só `togglePlay` | Comandos de voz precisam ações explícitas |
| `disallows` (restrictions) | Não rastreado | Botões ficam ativos quando ação é proibida (ads) |
| `repeat_mode` / `shuffle` | Não rastreados | Sem controle de repetição/shuffle |
| `context` (playlist/album URI) | Não rastreado | Sem info de contexto |
| `track_window.next_tracks` / `previous_tracks` | Não expostos | Sem preview da fila |

### `OrionPlaylistBar` — Problema arquitetural

O `OrionPlaylistBar` **não usa** o `useSpotifyPlayback` hook. Ele toca apenas previews de 30s via `<audio>` tag e YouTube embeds. O SDK de playback real (que toca faixas completas com Premium) está no `SpotifyPlayer.tsx` mas não integrado à barra principal.

### Plugin Nativo Capacitor — Situação

Não existe `capacitor.config.ts` no projeto. O Spotify Web Playback SDK roda diretamente em WebViews (Capacitor usa WebView), mas EME (Encrypted Media Extensions) pode não funcionar em todos os dispositivos Android. Um plugin nativo que usa o Spotify Android SDK seria o fallback correto.

## Plano de Implementação

### 1. Atualizar `useSpotifyPlayback.ts` — Compliance total com SDK

- Adicionar `enableMediaSession: true` ao construtor (controles lockscreen)
- Implementar `activateElement()` e expô-lo
- Escutar `autoplay_failed` → setar flag `needsActivation`
- Escutar `playback_error` → setar erro no state
- Expor `pause()` e `resume()` separados (além de `togglePlay`)
- Rastrear `disallows`, `repeat_mode`, `shuffle`, `context`
- Expor `getCurrentState()` para sync manual
- Expor `next_tracks` / `previous_tracks` do `track_window`
- Tipar tudo com interfaces oficiais (`WebPlaybackState`, `WebPlaybackTrack`, etc.)

### 2. Integrar SDK real no `OrionPlaylistBar`

- Quando usuário tem Spotify conectado (Premium), usar `useSpotifyPlayback` para tocar faixas completas via `playTrack(uri)`
- Manter preview de 30s + YouTube embed como fallback para quem não tem Premium
- Adicionar botão `activateElement` quando `needsActivation` for true
- Mostrar `next_tracks` na fila de reprodução

### 3. Criar plugin nativo Capacitor para Spotify

- Criar `src/lib/spotify/capacitor-spotify-plugin.ts` — bridge TypeScript
- Criar `android/.../SpotifyPlaybackPlugin.java` — plugin nativo usando Spotify Android SDK
- Métodos: `connect`, `play`, `pause`, `resume`, `seek`, `nextTrack`, `previousTrack`, `setVolume`, `getPlayerState`
- Auto-detect: se Capacitor nativo disponível → usar SDK nativo; senão → Web Playback SDK
- Documentar setup: Spotify Android SDK dependency, `AndroidManifest.xml`, app fingerprint

### 4. Documentação de setup

- Criar `docs/spotify-playback-setup.md`
- Spotify Dashboard: redirect URIs, scopes necessários (`streaming`, `user-read-playback-state`, `user-modify-playback-state`)
- Android: Spotify App Remote SDK dependency, fingerprint SHA-256
- Capacitor config necessário

## Arquivos a Modificar/Criar

| Arquivo | Ação |
|---|---|
| `src/hooks/useSpotifyPlayback.ts` | Compliance total: MediaSession, activateElement, autoplay_failed, playback_error, disallows, repeat/shuffle, typed interfaces |
| `src/components/orion/OrionPlaylistBar.tsx` | Integrar useSpotifyPlayback para faixas completas com Premium, fallback preview |
| `src/lib/spotify/capacitor-spotify-plugin.ts` | Criar — bridge TS para plugin nativo Capacitor |
| `android/.../SpotifyPlaybackPlugin.java` | Criar — plugin nativo Android com Spotify App Remote SDK |
| `docs/spotify-playback-setup.md` | Criar — guia completo de setup |

