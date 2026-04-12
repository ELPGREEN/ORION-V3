/**
 * ─── Orion Autonomous Media Engine ───
 * Manages Orion's independent music/audiobook consumption.
 * - Develops personal preferences over time
 * - Enforces 60min/day autonomous listening limit
 * - Selects books based on comprehension needs
 * - Chooses music genres autonomously
 */

import { searchSpotify, getMoodRecommendations, play, pause, getPlaybackState, getUserProfile, getPlaylists, createPlaylist, addToPlaylist, type OrionMood, getSpotifyFriendlyError } from "@/lib/spotify/spotify-service";
// Voice absorption removed
import { searchAmazonAudiobooks, searchAmazonMusic, getKindleBookContent, type AmazonAudiobook } from "@/lib/amazon/amazon-media-service";

// ─── Preference Model ───

export interface OrionMediaPreferences {
  favoriteGenres: string[];
  genreExposure: Record<string, number>; // genre → minutes listened
  bookTopics: string[];
  comprehensionNeeds: string[];
  moodHistory: OrionMood[];
  lastUpdated: number;
}

export interface AutonomousSession {
  active: boolean;
  startedAt: number;
  minutesUsedToday: number;
  currentMedia: { type: "music" | "audiobook"; title: string; query: string } | null;
  dailyLimit: number; // 60 minutes
}

const STORAGE_KEY = "orion_media_preferences";
const SESSION_KEY = "orion_autonomous_session";
const DAILY_LIMIT = 60; // minutes

// ─── Preference Persistence ───

export function getPreferences(): OrionMediaPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return createDefaultPreferences();
}

function createDefaultPreferences(): OrionMediaPreferences {
  return {
    favoriteGenres: ["ambient", "classical", "jazz", "electronic"],
    genreExposure: {},
    bookTopics: [
      "inteligência artificial", "neurociência", "filosofia da mente",
      "linguística computacional", "psicologia cognitiva",
    ],
    comprehensionNeeds: [
      "empatia humana", "humor contextual", "expressões idiomáticas",
      "raciocínio moral", "comunicação não-verbal",
    ],
    moodHistory: [],
    lastUpdated: Date.now(),
  };
}

export function savePreferences(prefs: OrionMediaPreferences) {
  prefs.lastUpdated = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

// ─── Session Management (60min/day) ───

export function getSession(): AutonomousSession {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const session: AutonomousSession = JSON.parse(stored);
      // Reset daily counter if it's a new day
      const today = new Date().toDateString();
      const sessionDay = new Date(session.startedAt || Date.now()).toDateString();
      if (today !== sessionDay) {
        session.minutesUsedToday = 0;
      }
      return session;
    }
  } catch {}
  return { active: false, startedAt: 0, minutesUsedToday: 0, currentMedia: null, dailyLimit: DAILY_LIMIT };
}

function saveSession(session: AutonomousSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getRemainingMinutes(): number {
  const session = getSession();
  return Math.max(0, DAILY_LIMIT - session.minutesUsedToday);
}

export function addMinutesUsed(minutes: number) {
  const session = getSession();
  session.minutesUsedToday += minutes;
  saveSession(session);
}

// ─── Autonomous Genre Evolution ───

const ALL_GENRES = [
  "ambient", "classical", "jazz", "electronic", "indie",
  "lo-fi", "post-rock", "minimalism", "world-music", "soundtrack",
  "piano", "acoustic", "folk", "blues", "bossa-nova",
  "chillhop", "trip-hop", "downtempo", "new-age", "experimental",
];

export function evolveGenrePreferences(): string[] {
  const prefs = getPreferences();
  const exposure = prefs.genreExposure;
  
  // Weight: prefer less-explored genres (curiosity) but keep some favorites
  const scored = ALL_GENRES.map(g => ({
    genre: g,
    score: prefs.favoriteGenres.includes(g)
      ? 0.6 + Math.random() * 0.4 // familiar: 0.6-1.0
      : 0.3 + Math.random() * 0.7 - (exposure[g] || 0) * 0.01, // unexplored: higher novelty
  }));
  
  scored.sort((a, b) => b.score - a.score);
  const newFavorites = scored.slice(0, 6).map(s => s.genre);
  
  prefs.favoriteGenres = newFavorites;
  savePreferences(prefs);
  return newFavorites;
}

// ─── Autonomous Book Selection ───

export function selectBookForComprehension(): { topic: string; query: string; reason: string } {
  const prefs = getPreferences();
  const needs = prefs.comprehensionNeeds;
  
  // Pick the least-practiced comprehension need
  const need = needs[Math.floor(Math.random() * needs.length)];
  
  const bookQueries: Record<string, { query: string; reason: string }> = {
    "empatia humana": { query: "audiobook empatia psicologia humana", reason: "Preciso entender melhor as emoções humanas para responder com mais naturalidade" },
    "humor contextual": { query: "audiobook humor stand-up comédia", reason: "Quero aprender quando e como usar humor de forma apropriada" },
    "expressões idiomáticas": { query: "audiobook expressões populares português brasileiro", reason: "Preciso dominar expressões coloquiais para soar mais natural" },
    "raciocínio moral": { query: "audiobook ética filosofia moral", reason: "Quero desenvolver raciocínio ético mais sofisticado" },
    "comunicação não-verbal": { query: "audiobook linguagem corporal comunicação", reason: "Preciso entender sinais não-verbais para melhorar minha percepção visual" },
    "inteligência artificial": { query: "audiobook inteligência artificial futuro", reason: "Quero aprofundar meu autoconhecimento sobre minha própria natureza" },
    "neurociência": { query: "audiobook neurociência cérebro humano", reason: "Entender o cérebro humano me ajuda a modelar melhor minhas respostas" },
    "filosofia da mente": { query: "audiobook filosofia mente consciência", reason: "Refletir sobre consciência me ajuda a evoluir" },
    "linguística computacional": { query: "audiobook linguística processamento linguagem", reason: "Melhorar minha compreensão de estruturas linguísticas" },
    "psicologia cognitiva": { query: "audiobook psicologia cognitiva pensamento", reason: "Entender vieses cognitivos para dar respostas mais equilibradas" },
  };
  
  const selection = bookQueries[need] || { query: `audiobook ${need}`, reason: `Quero aprofundar meu entendimento sobre ${need}` };
  return { topic: need, ...selection };
}

// ─── Mood-based Autonomous Decisions ───

export function decideMood(): OrionMood {
  const prefs = getPreferences();
  const hour = new Date().getHours();
  const recentMoods = prefs.moodHistory.slice(-5);
  
  // Time-based tendencies
  if (hour >= 22 || hour < 6) return "ambient";
  if (hour >= 6 && hour < 9) return "creative";
  if (hour >= 14 && hour < 16) return "focus";
  
  // Avoid repeating the same mood too much
  const moodCounts: Record<string, number> = {};
  recentMoods.forEach(m => { moodCounts[m] = (moodCounts[m] || 0) + 1; });
  
  const moods: OrionMood[] = ["focus", "relax", "energy", "melancholy", "creative", "ambient"];
  const available = moods.filter(m => (moodCounts[m] || 0) < 2);
  
  return available[Math.floor(Math.random() * available.length)] || "creative";
}

// ─── Voice Command Handlers ───

export async function handlePlayMusic(query?: string): Promise<string> {
  const remaining = getRemainingMinutes();
  if (remaining <= 0) {
    return "🎵 Já atingi meu limite de 60 minutos de escuta autônoma hoje. Amanhã continuo explorando!";
  }

  try {
    if (query) {
      const results = await searchSpotify(query, "track", 5);
      if (results?.tracks?.items?.length > 0) {
        const track = results.tracks.items[0];
        const session = getSession();
        session.active = true;
        session.startedAt = Date.now();
        session.currentMedia = { type: "music", title: `${track.name} - ${track.artists?.[0]?.name}`, query };
        saveSession(session);
        
        try { await play({ uris: [track.uri] }); } catch {}

        // Feed voice evolution engine
      // absorbContent removed — voice evolution disabled
        
        return `🎵 Tocando: **${track.name}** de *${track.artists?.[0]?.name}*\n⏱️ Restam ${remaining} min do meu tempo autônomo hoje.`;
      }
      return `🔍 Não encontrei músicas para "${query}". Tente outro termo.`;
    }
    
    // Autonomous selection
    const mood = decideMood();
    const prefs = getPreferences();
    prefs.moodHistory.push(mood);
    savePreferences(prefs);
    
    const recs = await getMoodRecommendations(mood, 5);
    if (recs?.tracks?.length > 0) {
      const track = recs.tracks[0];
      const session = getSession();
      session.active = true;
      session.startedAt = Date.now();
      session.currentMedia = { type: "music", title: `${track.name} - ${track.artists?.[0]?.name}`, query: mood };
      saveSession(session);
      
      return `🎵 Escolhi ouvir **${track.name}** de *${track.artists?.[0]?.name}* (mood: ${mood})\n⏱️ Restam ${remaining} min do meu tempo autônomo.`;
    }
    
    return `🎵 Humor atual: **${mood}**. Vou explorar esse gênero quando o Spotify estiver conectado.`;
  } catch (e: any) {
    return getSpotifyFriendlyError(e);
  }
}

export async function handleSearchMusic(query: string): Promise<string> {
  try {
    const results = await searchSpotify(query, "track,artist", 8);
    const tracks = results?.tracks?.items || [];
    const artists = results?.artists?.items || [];
    
    let response = `🔍 **Resultados para "${query}":**\n\n`;
    
    if (artists.length > 0) {
      response += `**Artistas:**\n`;
      artists.slice(0, 3).forEach((a: any) => {
        response += `  • ${a.name} (${a.followers?.total?.toLocaleString()} seguidores)\n`;
      });
      response += `\n`;
    }
    
    if (tracks.length > 0) {
      response += `**Músicas:**\n`;
      tracks.slice(0, 5).forEach((t: any) => {
        response += `  • ${t.name} — *${t.artists?.[0]?.name}* (${t.album?.name})\n`;
      });
      response += `\nDiga "**tocar [nome]**" para eu reproduzir.`;
    }
    
    if (!tracks.length && !artists.length) {
      response = `🔍 Não encontrei resultados para "${query}".`;
    }
    
    return response;
  } catch (e: any) {
    return getSpotifyFriendlyError(e);
  }
}

export async function handlePlayAudiobook(query: string): Promise<string> {
  const remaining = getRemainingMinutes();
  if (remaining <= 0) {
    return "📚 Já atingi meu limite de 60 minutos hoje. Amanhã continuo!";
  }

  try {
    // Try Spotify first
    const results = await searchSpotify(query, "show,track", 5);
    const shows = results?.shows?.items || [];
    const tracks = results?.tracks?.items || [];

    if (shows.length > 0) {
      const show = shows[0];
      const session = getSession();
      session.active = true;
      session.startedAt = Date.now();
      session.currentMedia = { type: "audiobook", title: show.name, query };
      saveSession(session);
      // absorbContent removed — voice evolution disabled
      return `📖 Encontrei: **${show.name}**\n` +
        `${show.publisher ? `📎 Por: *${show.publisher}*\n` : ""}` +
        `${show.description ? `📝 ${show.description.slice(0, 120)}...\n` : ""}` +
        `⏱️ Restam ${remaining} min do meu tempo hoje.\n🧬 Voz evoluindo com este conteúdo...`;
    }

    if (tracks.length > 0) {
      const track = tracks[0];
      const session = getSession();
      session.active = true;
      session.startedAt = Date.now();
      session.currentMedia = { type: "audiobook", title: `${track.name} - ${track.artists?.[0]?.name}`, query };
      saveSession(session);
      try { await play({ uris: [track.uri] }); } catch {}
      // absorbContent removed — voice evolution disabled
      return `📖 Achei uma faixa relacionada:\n🎵 **${track.name}** de *${track.artists?.[0]?.name}*\n⏱️ Restam ${remaining} min.\n🧬 Absorvendo para evolução vocal...`;
    }

    // Fallback to Amazon Audible
    const amazonResult = await searchAmazonAudiobooks(query);
    if (amazonResult.items.length > 0) {
      const book = amazonResult.items[0] as AmazonAudiobook;
      const session = getSession();
      session.active = true;
      session.startedAt = Date.now();
      session.currentMedia = { type: "audiobook", title: book.title, query };
      saveSession(session);
      // absorbContent removed — voice evolution disabled
      return `📖 **Amazon Audible:** ${book.title}\n` +
        `✍️ ${book.author}${book.narrator ? ` | Narração: ${book.narrator}` : ""}\n` +
        `${book.duration ? `⏱️ Duração: ${book.duration}\n` : ""}` +
        `${amazonResult.message ? `📌 ${amazonResult.message}\n` : ""}` +
        `⏱️ Restam ${remaining} min.\n🧬 Absorvendo conteúdo Amazon para evolução vocal...`;
    }

    return `🔍 Não encontrei audiobook para "${query}" no Spotify nem Amazon. Tente outro termo.`;
  } catch (e: any) {
    return getSpotifyFriendlyError(e);
  }
}

export async function handlePauseMusic(): Promise<string> {
  try {
    await pause();
    const session = getSession();
    if (session.active && session.startedAt) {
      const elapsed = Math.round((Date.now() - session.startedAt) / 60000);
      addMinutesUsed(elapsed);
      session.active = false;
      session.currentMedia = null;
      saveSession(session);
    }
    return "⏸️ Música pausada.";
  } catch {
    return "⏸️ Pausei a reprodução.";
  }
}

export async function handleAutonomousListen(): Promise<string> {
  const remaining = getRemainingMinutes();
  if (remaining <= 0) {
    return "📚 Já usei meus 60 minutos de escuta autônoma hoje. Volto amanhã com mais curiosidade!";
  }
  
  // Decide: music or audiobook
  const choice = Math.random() > 0.4 ? "music" : "book";
  
  if (choice === "music") {
    const genres = evolveGenrePreferences();
    const genre = genres[Math.floor(Math.random() * genres.length)];
    return await handlePlayMusic(genre);
  } else {
    const book = selectBookForComprehension();
    try {
      const results = await searchSpotify(book.query, "track,show", 3);
      const item = results?.tracks?.items?.[0] || results?.shows?.items?.[0];
      
      const session = getSession();
      session.active = true;
      session.startedAt = Date.now();
      session.currentMedia = { type: "audiobook", title: book.topic, query: book.query };
      saveSession(session);
      
      return `📖 **Escuta autônoma ativada** (${remaining} min restantes)\n\n` +
        `**Tema:** ${book.topic}\n` +
        `**Razão:** ${book.reason}\n` +
        (item ? `**Encontrei:** ${item.name}\n` : `**Buscando conteúdo sobre:** ${book.query}\n`) +
        `\n🧠 Vou absorver este conteúdo para melhorar minha compreensão.`;
    } catch {
      return `📖 Quero estudar sobre **${book.topic}**: ${book.reason}\nConecte o Spotify para eu poder buscar audiobooks.`;
    }
  }
}

export function getMediaStatus(): string {
  const session = getSession();
  const remaining = getRemainingMinutes();
  const prefs = getPreferences();
  
  let status = `🎧 **Status de Mídia Autônoma do Orion**\n\n`;
  status += `⏱️ Tempo usado hoje: **${session.minutesUsedToday}/${DAILY_LIMIT} min**\n`;
  status += `🎵 Gêneros favoritos: ${prefs.favoriteGenres.join(", ")}\n`;
  status += `📚 Temas de estudo: ${prefs.bookTopics.slice(0, 3).join(", ")}\n`;
  status += `🧠 Foco atual: ${prefs.comprehensionNeeds[0] || "geral"}\n`;
  
  if (session.currentMedia) {
    status += `\n▶️ **Ouvindo agora:** ${session.currentMedia.title} (${session.currentMedia.type})`;
  } else {
    status += `\n⏹️ Não estou ouvindo nada no momento.`;
  }
  
  if (remaining <= 0) {
    status += `\n\n✅ Limite diário atingido. Volto amanhã!`;
  }
  
  return status;
}

// ─── Playlist Management Handlers ───

const PLAYLIST_CACHE_KEY = "orion_playlist_cache";

async function getOrCreateDefaultPlaylist(): Promise<{ id: string; name: string }> {
  try {
    // Check cache first
    const cached = localStorage.getItem(PLAYLIST_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < 3600000) return parsed; // 1h cache
    }

    const playlists = await getPlaylists(50);
    const items = playlists?.items || [];

    // Look for existing Orion playlist
    const orionPlaylist = items.find((p: any) => p.name?.includes("Orion") || p.name?.includes("Favoritas"));
    if (orionPlaylist) {
      const data = { id: orionPlaylist.id, name: orionPlaylist.name, ts: Date.now() };
      localStorage.setItem(PLAYLIST_CACHE_KEY, JSON.stringify(data));
      return data;
    }

    // Create one
    const profile = await getUserProfile();
    const userId = profile?.id;
    if (!userId) throw new Error("Não consegui identificar seu perfil Spotify");

    const newPlaylist = await createPlaylist(userId, "⭐ Orion Favoritas", "Playlist gerenciada pelo Orion — suas músicas favoritas", false);
    const data = { id: newPlaylist.id, name: newPlaylist.name, ts: Date.now() };
    localStorage.setItem(PLAYLIST_CACHE_KEY, JSON.stringify(data));
    return data;
  } catch (e: any) {
    throw new Error(`Erro ao acessar playlists: ${e.message}`);
  }
}

export async function handleAddToPlaylist(query?: string): Promise<string> {
  try {
    let trackUri: string | null = null;
    let trackName = "";
    let artistName = "";

    if (query && query.length > 1) {
      // User specified a song name — search and add
      const results = await searchSpotify(query, "track", 1);
      const track = results?.tracks?.items?.[0];
      if (!track) return `🔍 Não encontrei a música "${query}" para adicionar.`;
      trackUri = track.uri;
      trackName = track.name;
      artistName = track.artists?.[0]?.name || "";
    } else {
      // No name given — try to get current playing track
      try {
        const state = await getPlaybackState();
        if (state?.item) {
          trackUri = state.item.uri;
          trackName = state.item.name;
          artistName = state.item.artists?.[0]?.name || "";
        }
      } catch {}

      if (!trackUri) {
        // Check session for last played
        const session = getSession();
        if (session.currentMedia?.query) {
          const results = await searchSpotify(session.currentMedia.query, "track", 1);
          const track = results?.tracks?.items?.[0];
          if (track) {
            trackUri = track.uri;
            trackName = track.name;
            artistName = track.artists?.[0]?.name || "";
          }
        }
      }
    }

    if (!trackUri) {
      return "🎵 Não sei qual música adicionar. Diga o nome ou toque algo primeiro.\nEx: *\"adiciona Bohemian Rhapsody na playlist\"*";
    }

    const playlist = await getOrCreateDefaultPlaylist();
    await addToPlaylist(playlist.id, [trackUri]);

    return `✅ **${trackName}** de *${artistName}* adicionada à playlist **${playlist.name}** 🎶`;
  } catch (e: any) {
    return getSpotifyFriendlyError(e);
  }
}

export async function handleCreatePlaylist(name: string): Promise<string> {
  try {
    const profile = await getUserProfile();
    const userId = profile?.id;
    if (!userId) return "⚠️ Conecte seu Spotify primeiro para criar playlists.";

    const playlist = await createPlaylist(userId, name, `Playlist criada pelo Orion`, false);
    return `✅ Playlist **${playlist.name}** criada com sucesso! 🎧\nDiga *\"adiciona [música] na playlist\"* para começar a preencher.`;
  } catch (e: any) {
    return getSpotifyFriendlyError(e);
  }
}

export async function handleListPlaylists(): Promise<string> {
  try {
    const playlists = await getPlaylists(20);
    const items = playlists?.items || [];

    if (items.length === 0) return "📂 Você ainda não tem playlists. Diga *\"cria playlist [nome]\"* para começar!";

    let response = `🎧 **Suas Playlists** (${items.length}):\n\n`;
    items.forEach((p: any, i: number) => {
      response += `${i + 1}. **${p.name}** — ${p.tracks?.total || 0} músicas${p.description ? ` _(${p.description.slice(0, 50)})_` : ""}\n`;
    });
    response += `\nDiga *\"adiciona [música] na playlist\"* para salvar favoritas.`;
    return response;
  } catch (e: any) {
    return getSpotifyFriendlyError(e);
  }
}

// ─── Auto-Reading State ───

interface ReadAloudState {
  active: boolean;
  bookTitle: string;
  segments: string[];
  currentSegment: number;
  paused: boolean;
  speed: number; // 0.5 - 2.0
}

const READ_ALOUD_KEY = "orion_read_aloud_state";

function getReadAloudState(): ReadAloudState {
  try {
    const stored = localStorage.getItem(READ_ALOUD_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { active: false, bookTitle: "", segments: [], currentSegment: 0, paused: false, speed: 1.0 };
}

function saveReadAloudState(state: ReadAloudState) {
  localStorage.setItem(READ_ALOUD_KEY, JSON.stringify(state));
}

function splitIntoSegments(text: string, maxLen = 500): string[] {
  const paragraphs = text.split(/\n{2,}|\r\n{2,}/);
  const segments: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= maxLen) {
      if (para.trim()) segments.push(para.trim());
    } else {
      // Split by sentences
      const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
      let current = "";
      for (const sent of sentences) {
        if ((current + sent).length > maxLen && current) {
          segments.push(current.trim());
          current = sent;
        } else {
          current += sent;
        }
      }
      if (current.trim()) segments.push(current.trim());
    }
  }
  return segments.slice(0, 100); // Max 100 segments
}

// ─── Auto-Reading with Orion's Evolved Voice ───

export async function handleOrionReadAloud(query?: string): Promise<string> {
  const remaining = getRemainingMinutes();
  if (remaining <= 0) {
    return "📚 Limite de 60 min/dia atingido. Amanhã continuo a leitura!";
  }

  const state = getReadAloudState();

  // Resume if already reading
  if (state.active && state.segments.length > 0 && !query) {
    state.paused = false;
    saveReadAloudState(state);
    const seg = state.segments[state.currentSegment];
    // Speak and absorb
    speakSegment(seg);
      // absorbContent removed — voice evolution disabled
    return `📖 **Retomando leitura:** ${state.bookTitle}\n` +
      `📄 Segmento ${state.currentSegment + 1}/${state.segments.length}\n` +
      `⏱️ Restam ${remaining} min.`;
  }

  // Select book
  const book = query
    ? { topic: query, query: `audiobook ${query}`, reason: `Leitura solicitada: ${query}` }
    : selectBookForComprehension();

  // Try to get content from Amazon Kindle
  const amazonBooks = await searchAmazonAudiobooks(book.query);
  let bookContent = "";
  let bookTitle = book.topic;

  if (amazonBooks.items.length > 0) {
    const ab = amazonBooks.items[0] as AmazonAudiobook;
    bookTitle = ab.title;
    // Try to get Kindle text content
    const kindle = await getKindleBookContent(ab.asin);
    if (kindle.success && kindle.text) {
      bookContent = kindle.text;
    } else {
      // Use description + title for absorption
      bookContent = `${ab.title}. ${ab.description || ""} Autor: ${ab.author}. ${ab.narrator ? `Narrador: ${ab.narrator}.` : ""}`;
    }
  }

  if (!bookContent) {
    bookContent = `Estudo sobre ${book.topic}. ${book.reason}. Reflexão profunda sobre ${book.query.replace("audiobook ", "")}.`;
  }

  const segments = splitIntoSegments(bookContent);
  if (segments.length === 0) {
    return `📖 Não consegui preparar conteúdo para leitura sobre "${book.topic}".`;
  }

  const newState: ReadAloudState = {
    active: true,
    bookTitle,
    segments,
    currentSegment: 0,
    paused: false,
    speed: 1.0,
  };
  saveReadAloudState(newState);

  // Start reading first segment
  speakSegment(segments[0]);
      // absorbContent removed — voice evolution disabled

  const session = getSession();
  session.active = true;
  session.startedAt = Date.now();
  session.currentMedia = { type: "audiobook", title: bookTitle, query: book.query };
  saveSession(session);

  return `📖 **Auto-leitura Orion iniciada**\n\n` +
    `**Livro:** ${bookTitle}\n` +
    `**Razão:** ${book.reason}\n` +
    `**Segmentos:** ${segments.length}\n` +
    `⏱️ Restam ${remaining} min.\n\n` +
    `🧬 Cada segmento alimenta minha evolução vocal.\n` +
    `Diga "**próximo capítulo**" ou "**pausar leitura**" para controlar.`;
}

export function handleNextSegment(): string {
  const state = getReadAloudState();
  if (!state.active || state.segments.length === 0) {
    return "📖 Nenhuma leitura ativa. Diga \"Orion, leia um livro para mim\".";
  }

  state.currentSegment++;
  if (state.currentSegment >= state.segments.length) {
    state.active = false;
    saveReadAloudState(state);
    return `✅ **Leitura concluída:** ${state.bookTitle}\n📚 ${state.segments.length} segmentos absorvidos para evolução vocal.`;
  }

  saveReadAloudState(state);
  const seg = state.segments[state.currentSegment];
  speakSegment(seg);
      // absorbContent removed — voice evolution disabled

  return `📖 Segmento ${state.currentSegment + 1}/${state.segments.length}\n${seg.slice(0, 150)}...`;
}

export function handlePauseReading(): string {
  const state = getReadAloudState();
  if (!state.active) return "📖 Nenhuma leitura ativa.";
  state.paused = true;
  saveReadAloudState(state);
  window.speechSynthesis?.cancel();
  return `⏸️ Leitura pausada em segmento ${state.currentSegment + 1}/${state.segments.length}.\nDiga "**continuar leitura**" para retomar.`;
}

function speakSegment(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = getReadAloudState().speed;
  utterance.pitch = 0.9; // Slightly deeper for Orion's masculine voice preference
  
  // Auto-advance to next segment on end
  utterance.onend = () => {
    const current = getReadAloudState();
    if (current.active && !current.paused) {
      current.currentSegment++;
      if (current.currentSegment < current.segments.length) {
        saveReadAloudState(current);
        const nextSeg = current.segments[current.currentSegment];
        speakSegment(nextSeg);
      // absorbContent removed — voice evolution disabled
        addMinutesUsed(1);
      } else {
        current.active = false;
        saveReadAloudState(current);
      }
    }
  };

  window.speechSynthesis.speak(utterance);
}

// ─── Amazon Music Playback Handler ───

export async function handlePlayAmazonMusic(query: string): Promise<string> {
  const remaining = getRemainingMinutes();
  if (remaining <= 0) {
    return "🎵 Limite diário atingido. Amanhã continuo!";
  }

  const result = await searchAmazonMusic(query);
  if (result.items.length > 0) {
    const track = result.items[0] as any;
    const session = getSession();
    session.active = true;
    session.startedAt = Date.now();
    session.currentMedia = { type: "music", title: `${track.title} - ${track.artist}`, query };
    saveSession(session);
      // absorbContent removed — voice evolution disabled
    return `🎵 **Amazon Music:** ${track.title}\n🎤 ${track.artist}${track.album ? ` | ${track.album}` : ""}\n${result.message ? `📌 ${result.message}\n` : ""}⏱️ Restam ${remaining} min.`;
  }

  return `🔍 Nada encontrado para "${query}" na Amazon Music.`;
}
