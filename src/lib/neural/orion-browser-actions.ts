/**
 * ─── Orion Browser Actions ───
 * Enables Orion to open real browser tabs for actionable commands.
 * Inspired by JARVIS-style assistants that actually DO things.
 * 
 * When the user says "play walk video rainy night in Tokyo",
 * Orion opens YouTube with that search. Same for flights, maps, etc.
 */

export interface BrowserAction {
  type: "youtube" | "google" | "google_flights" | "google_maps" | "spotify" | "wikipedia" | "generic_url";
  url: string;
  description: string;
  query: string;
}

// ─── URL Builders ───

function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function googleFlightsUrl(from?: string, to?: string): string {
  if (from && to) {
    return `https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(from)}+to+${encodeURIComponent(to)}`;
  }
  return `https://www.google.com/travel/flights`;
}

function googleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function wikipediaUrl(query: string, lang = "pt"): string {
  return `https://${lang}.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;
}

function spotifySearchUrl(query: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

// ─── Pattern Detection ───

interface ActionPattern {
  regex: RegExp;
  builder: (match: RegExpMatchArray, fullQuery: string) => BrowserAction;
}

function extractCleanQuery(query: string, patternsToRemove: RegExp): string {
  return query
    .replace(patternsToRemove, "")
    .replace(/\b(no|na|do|da|de|dos|das|o|a|os|as|um|uma|uns|umas|pra|para|por|favor|me|mim|eu|aí|ai|aqui)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

const ACTION_PATTERNS: ActionPattern[] = [
  // ─── YouTube / Videos ───
  {
    regex: /\b(?:(?:abre?|abrir?|open)\s+(?:o\s+)?youtube|(?:tocar?|play|reproduz(?:ir)?|assistir?|ver?)\s+(?:um?\s+)?(?:v[ií]deo|video)|(?:buscar?|pesquisar?|procurar?)\s+(?:no\s+)?youtube|(?:v[ií]deo|video)\s+(?:de|do|da|sobre))\b/i,
    builder: (_m, q) => {
      const clean = extractCleanQuery(q, /\b(?:abre?|abrir?|open|tocar?|play|reproduz(?:ir)?|assistir?|ver?|buscar?|pesquisar?|procurar?)\s+(?:o\s+)?(?:um?\s+)?(?:no\s+)?(?:youtube|v[ií]deo|video)\b/gi);
      return {
        type: "youtube",
        url: youtubeSearchUrl(clean || q),
        description: `🎬 Abrindo YouTube: "${clean || q}"`,
        query: clean || q,
      };
    },
  },

  // ─── Google Flights ───
  {
    regex: /\b(?:(?:buscar?|pesquisar?|procurar?|encontrar?|achar?)\s+(?:um?\s+)?(?:v[oo]o|voo|passagem|passagens|flight|flights)|(?:v[oo]o|voo|passagem|passagens|flight)\s+(?:de|do|da|para|pra)|(?:quanto\s+custa|pre[çc]o\s+d[eao])\s+(?:v[oo]o|voo|passagem))\b/i,
    builder: (_m, q) => {
      const fromMatch = q.match(/(?:de|from|saindo\s+de)\s+(\w[\w\s]{1,30}?)(?:\s+(?:para|pra|to|at[eé])|$)/i);
      const toMatch = q.match(/(?:para|pra|to|at[eé])\s+(\w[\w\s]{1,30}?)(?:\s|$|,|\.|!|\?)/i);
      const from = fromMatch?.[1]?.trim();
      const to = toMatch?.[1]?.trim();
      return {
        type: "google_flights",
        url: googleFlightsUrl(from, to),
        description: `✈️ Abrindo Google Flights${from && to ? `: ${from} → ${to}` : ""}`,
        query: q,
      };
    },
  },

  // ─── Google Maps / Directions ───
  {
    regex: /\b(?:(?:como\s+chegar?|rota\s+(?:para|pra|at[eé])|direções\s+(?:para|pra)|navegar?\s+(?:para|pra|at[eé]))|(?:(?:abrir?|abre?|mostrar?|mostra)\s+(?:o\s+)?(?:google\s+)?maps?)|(?:(?:onde\s+fica|localizar?|mapa\s+d[eoa])\s+))\b/i,
    builder: (_m, q) => {
      const clean = extractCleanQuery(q, /\b(?:como\s+chegar?|rota\s+(?:para|pra)|direções|navegar?|abrir?|abre?|mostrar?|mostra|onde\s+fica|localizar?|mapa)\s*(?:o\s+)?(?:google\s+)?(?:maps?)?\b/gi);
      return {
        type: "google_maps",
        url: googleMapsUrl(clean || q),
        description: `🗺️ Abrindo Google Maps: "${clean || q}"`,
        query: clean || q,
      };
    },
  },

  // ─── Wikipedia ───
  {
    regex: /\b(?:(?:pesquisar?|buscar?|procurar?)\s+(?:na?\s+)?wikip[eé]dia|(?:o\s+que\s+[eé]|quem\s+[eé]|quem\s+foi)\s+)/i,
    builder: (_m, q) => {
      const clean = extractCleanQuery(q, /\b(?:pesquisar?|buscar?|procurar?)\s+(?:na?\s+)?wikip[eé]dia|(?:o\s+que\s+[eé]|quem\s+[eé]|quem\s+foi)\b/gi);
      return {
        type: "wikipedia",
        url: wikipediaUrl(clean || q),
        description: `📚 Abrindo Wikipedia: "${clean || q}"`,
        query: clean || q,
      };
    },
  },

  // ─── Google Search (generic) ───
  {
    regex: /\b(?:(?:pesquisar?|buscar?|googlar?|procurar?)\s+(?:no\s+)?(?:google))\b/i,
    builder: (_m, q) => {
      const clean = extractCleanQuery(q, /\b(?:pesquisar?|buscar?|googlar?|procurar?)\s+(?:no\s+)?google\b/gi);
      return {
        type: "google",
        url: googleSearchUrl(clean || q),
        description: `🔍 Abrindo Google: "${clean || q}"`,
        query: clean || q,
      };
    },
  },

  // ─── Open URL directly ───
  {
    regex: /\b(?:abrir?|abre?|open|acessar?|ir\s+(?:para|pra))\s+(https?:\/\/\S+)/i,
    builder: (m, _q) => {
      const url = m[1];
      return {
        type: "generic_url",
        url,
        description: `🌐 Abrindo: ${url}`,
        query: url,
      };
    },
  },

  // ─── Spotify ───
  {
    regex: /\b(?:(?:abrir?|abre?)\s+(?:o\s+)?spotify|(?:buscar?|pesquisar?|procurar?)\s+(?:no\s+)?spotify)\b/i,
    builder: (_m, q) => {
      const clean = extractCleanQuery(q, /\b(?:abrir?|abre?|buscar?|pesquisar?|procurar?)\s+(?:o\s+)?(?:no\s+)?spotify\b/gi);
      return {
        type: "spotify",
        url: spotifySearchUrl(clean || ""),
        description: `🎵 Abrindo Spotify${clean ? `: "${clean}"` : ""}`,
        query: clean || "",
      };
    },
  },
];

// ─── Public API ───

/**
 * Detect if a user query is an actionable browser command.
 * Returns the action to execute, or null if not a browser action.
 */
export function detectBrowserAction(query: string): BrowserAction | null {
  const trimmed = query.trim();
  if (trimmed.length < 5) return null;

  for (const pattern of ACTION_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      return pattern.builder(match, trimmed);
    }
  }
  return null;
}

/**
 * Execute a browser action — opens the URL in a new tab.
 * Also dispatches an event for the floating player if it's a video/music action.
 */
export function executeBrowserAction(action: BrowserAction): string {
  // If it's a YouTube video, dispatch to VideoOverlay instead of opening a new tab
  if (action.type === "youtube") {
    window.dispatchEvent(new CustomEvent("orion-video-command", {
      detail: {
        action: action.url.includes("youtube.com/watch") ? "play_video" : "search_video",
        url: action.url,
        query: action.query,
        title: action.query,
      }
    }));
    return action.description;
  }

  // If it's a Spotify action, dispatch to OrionPlaylistBar
  if (action.type === "spotify") {
    window.dispatchEvent(new CustomEvent("orion-music-command", {
      detail: {
        action: "search_and_play",
        query: action.query,
        fullCommand: action.query,
      }
    }));
    return action.description;
  }

  // All other actions: open real browser tab
  window.open(action.url, "_blank", "noopener,noreferrer");
  return action.description;
}
