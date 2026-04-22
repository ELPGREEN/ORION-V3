import { OrionEvents, dispatchOrionEvent, type OrionVolumeAction, type ResolvedMusicPlatform } from "@/lib/events/orion-events";

const NORMALIZE_DIACRITICS_REGEX = /[\u0300-\u036f]/g;

function normalizeCommand(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(NORMALIZE_DIACRITICS_REGEX, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSearchQuery(command: string): string {
  return command
    .replace(/^(?:youtube\s+)?(?:pesquisar|procure|procurar|buscar|busca|tocar|toque|abrir|abra|reproduzir|reproduza|colocar|coloque|ouvir|assistir|ver)\s+/i, "")
    .replace(/^(?:uma?\s+)?(?:musica|video|som|playlist|podcast|filme)\s+/i, "")
    .trim();
}

function extractVolumeValue(command: string): number | undefined {
  const percentMatch = command.match(/(\d{1,3})\s*(?:%|por cento)?/);
  if (!percentMatch) return undefined;
  const parsed = Number.parseInt(percentMatch[1], 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.min(100, parsed));
}

function dispatchResolved(query: string) {
  dispatchOrionEvent(OrionEvents.MusicResolved, {
    query,
    requested: "youtube" satisfies ResolvedMusicPlatform,
    resolved: "youtube",
    fallback: false,
    description: `🎵 Tocando "${query}" no YouTube`,
    ts: Date.now(),
  });
}

export interface LocalYouTubeVoiceResult {
  handled: boolean;
  feedback?: string;
}

export function handleLocalYouTubeVoiceCommand(rawCommand: string): LocalYouTubeVoiceResult {
  const command = normalizeCommand(rawCommand);
  if (!command) return { handled: false };

  const hasMusicContext = /\b(youtube|musica|video|player|toca|tocar|toque|reproduz|reproduzir|som|playlist|podcast|filme|assistir|ver)\b/.test(command);
  const searchQuery = extractSearchQuery(command);
  const wantsSpecificMedia = !!searchQuery && searchQuery !== command;

  switch (true) {
    case /\b(proxima|proximo|avancar|avanca|seguir faixa|next)\b/.test(command):
      dispatchOrionEvent(OrionEvents.MusicCommand, { action: "next", fullCommand: rawCommand });
      return { handled: true, feedback: "Próxima faixa." };

    case /\b(anterior|voltar faixa|faixa anterior|previa|previous|prev)\b/.test(command):
      dispatchOrionEvent(OrionEvents.MusicCommand, { action: "previous", fullCommand: rawCommand });
      return { handled: true, feedback: "Faixa anterior." };

    case /\b(pause|pausar|pausa|parar|pare|stop)\b/.test(command) && hasMusicContext:
      dispatchOrionEvent(OrionEvents.MusicCommand, { action: "pause", fullCommand: rawCommand });
      return { handled: true, feedback: "Pausando YouTube." };

    case /\b(continuar|continua|continue|retomar|resume)\b/.test(command) && !wantsSpecificMedia:
      dispatchOrionEvent(OrionEvents.MusicCommand, { action: "resume", fullCommand: rawCommand });
      return { handled: true, feedback: "Retomando YouTube." };

    case /\b(play)\b/.test(command) && !wantsSpecificMedia:
      dispatchOrionEvent(OrionEvents.MusicCommand, { action: "resume", fullCommand: rawCommand });
      return { handled: true, feedback: "Retomando YouTube." };

    case /\b(minimizar|minimize|fechar player|ocultar player)\b/.test(command):
      dispatchOrionEvent(OrionEvents.MusicWidgetCommand, { action: "minimize" });
      return { handled: true, feedback: "Minimizando player." };

    case /\b(maximizar|maximize|expandir|abrir player|mostrar player)\b/.test(command):
      dispatchOrionEvent(OrionEvents.MusicWidgetCommand, { action: "maximize" });
      return { handled: true, feedback: "Expandindo player." };

    case /\b(volume|som|audio)\b/.test(command): {
      const explicitValue = extractVolumeValue(command);
      const action: OrionVolumeAction =
        explicitValue !== undefined
          ? "set"
          : /\b(aumentar|aumenta|mais|subir|sobe)\b/.test(command)
            ? "up"
            : /\b(diminuir|diminui|menos|baixar|baixa)\b/.test(command)
              ? "down"
              : /\b(mudo|mutar|silenciar|silencio)\b/.test(command)
                ? "mute"
                : /\b(ativar som|com som|tirar mudo|desmutar)\b/.test(command)
                  ? "unmute"
                  : "set";

      dispatchOrionEvent(OrionEvents.VolumeCommand, {
        action,
        value: explicitValue,
      });
      return { handled: true, feedback: explicitValue !== undefined ? `Volume em ${explicitValue}%.` : "Ajustando volume." };
    }

    case /\b(youtube\s+)?(?:pesquisar|procure|procurar|buscar|busca|tocar|toque|abrir|abra|reproduzir|reproduza|colocar|coloque|ouvir|assistir|ver)\b/.test(command): {
      const query = extractSearchQuery(command);
      if (!query) return { handled: false };
      dispatchResolved(query);
      dispatchOrionEvent(OrionEvents.MusicCommand, {
        action: "search_and_play",
        query,
        fullCommand: rawCommand,
      });
      return { handled: true, feedback: `Tocando ${query} no YouTube.` };
    }

    default:
      return { handled: false };
  }
}
