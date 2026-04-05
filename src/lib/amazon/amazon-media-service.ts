/**
 * ─── Amazon Media Service v2 ───
 * Honest interface — Amazon Music, Audible, and Kindle do NOT have
 * public REST APIs for content playback/search. This module provides:
 * 1. Connection status check (real, via amazon-auth edge function)
 * 2. Alexa device discovery (real, via Alexa Smart Home API)
 * 3. Fallback/offline content suggestions (local data, no fake API calls)
 */

import { supabase } from "@/integrations/supabase/client";
import { circuitBreaker } from "./circuit-breaker";

// ─── Types ───

export interface AmazonAudiobook {
  asin: string;
  title: string;
  author: string;
  narrator?: string;
  duration?: string;
  coverUrl?: string;
  description?: string;
}

export interface AmazonMusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  artworkUrl?: string;
}

export interface AmazonMediaResult {
  success: boolean;
  items: (AmazonAudiobook | AmazonMusicTrack)[];
  source: "audible" | "kindle" | "amazon_music";
  message?: string;
}

export interface AlexaDevice {
  applianceId: string;
  friendlyName: string;
  friendlyDescription?: string;
  modelName?: string;
  isReachable: boolean;
  actions: string[];
}

// ─── Amazon API Caller (via amazon-auth edge function) ───

async function callAmazonEdge(
  action: string,
  body?: unknown
): Promise<any> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Não autenticado — faça login primeiro");

  const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (!BASE_URL) throw new Error("VITE_SUPABASE_URL não configurado");

  const res = await circuitBreaker.execute(
    "amazon_api",
    () => fetch(`${BASE_URL}/functions/v1/amazon-auth?action=${action}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: API_KEY,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
    () => { throw new Error("Amazon API temporariamente indisponível (circuit breaker ativo)"); }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Amazon API error: ${res.status}`);
  }
  return res.json();
}

// ─── Audiobook Suggestions (offline — Audible has no public API) ───

export async function searchAmazonAudiobooks(query: string): Promise<AmazonMediaResult> {
  // Audible does NOT have a public search API.
  // Return curated offline suggestions based on query keywords.
  return {
    success: false,
    items: generateFallbackAudiobooks(query),
    source: "audible",
    message: `Audible não possui API pública de busca. Mostrando sugestões offline para "${query}". Use o app Audible para buscar e ouvir audiobooks.`,
  };
}

// ─── Amazon Music (curated suggestions + deep links) ───

export async function searchAmazonMusic(query: string): Promise<AmazonMediaResult> {
  const suggestions = generateMusicSuggestions(query);
  return {
    success: true,
    items: suggestions,
    source: "amazon_music",
    message: suggestions.length > 0
      ? `Sugestões para "${query}". Clique para abrir no Amazon Music.`
      : `Busque "${query}" no Amazon Music.`,
  };
}

export async function getAmazonMusicRecommendations(mood: string): Promise<AmazonMediaResult> {
  const suggestions = generateMusicSuggestions(mood);
  return {
    success: true,
    items: suggestions,
    source: "amazon_music",
    message: `Recomendações ${mood} — abra no Amazon Music para ouvir.`,
  };
}

export function getAmazonMusicUrl(query?: string): string {
  if (query?.trim()) {
    return `https://music.amazon.com.br/search/${encodeURIComponent(query)}`;
  }
  return "https://music.amazon.com.br";
}

export async function playAmazonMusic(trackId: string): Promise<{ success: boolean; message: string; url: string }> {
  const url = `https://music.amazon.com.br/search/${encodeURIComponent(trackId)}`;
  return {
    success: true,
    message: `Abrindo "${trackId}" no Amazon Music...`,
    url,
  };
}

function generateMusicSuggestions(query: string): AmazonMusicTrack[] {
  const qLower = (query || "").toLowerCase();

  const catalog: Record<string, AmazonMusicTrack[]> = {
    relaxar: [
      { id: "AM001", title: "Weightless", artist: "Marconi Union", album: "Weightless", duration: 480 },
      { id: "AM002", title: "Clair de Lune", artist: "Claude Debussy", album: "Suite bergamasque", duration: 300 },
      { id: "AM003", title: "River Flows in You", artist: "Yiruma", album: "First Love", duration: 210 },
    ],
    foco: [
      { id: "AM010", title: "Experience", artist: "Ludovico Einaudi", album: "In a Time Lapse", duration: 310 },
      { id: "AM011", title: "Time", artist: "Hans Zimmer", album: "Inception OST", duration: 278 },
      { id: "AM012", title: "Nuvole Bianche", artist: "Ludovico Einaudi", album: "Una Mattina", duration: 357 },
    ],
    energia: [
      { id: "AM020", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", duration: 200 },
      { id: "AM021", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", duration: 203 },
      { id: "AM022", title: "Uptown Funk", artist: "Bruno Mars", album: "Uptown Special", duration: 270 },
    ],
    brasil: [
      { id: "AM030", title: "Garota de Ipanema", artist: "Tom Jobim & Vinícius", album: "Bossa Nova", duration: 210 },
      { id: "AM031", title: "Aquarela do Brasil", artist: "Ary Barroso", album: "Clássicos", duration: 195 },
      { id: "AM032", title: "Evidências", artist: "Chitãozinho & Xororó", album: "Grandes Sucessos", duration: 245 },
    ],
    pop: [
      { id: "AM040", title: "Shape of You", artist: "Ed Sheeran", album: "÷", duration: 234 },
      { id: "AM041", title: "Bad Guy", artist: "Billie Eilish", album: "When We All Fall Asleep", duration: 194 },
      { id: "AM042", title: "As It Was", artist: "Harry Styles", album: "Harry's House", duration: 167 },
    ],
    default: [
      { id: "AM050", title: "Bohemian Rhapsody", artist: "Queen", album: "A Night at the Opera", duration: 355 },
      { id: "AM051", title: "Imagine", artist: "John Lennon", album: "Imagine", duration: 183 },
      { id: "AM052", title: "Stairway to Heaven", artist: "Led Zeppelin", album: "Led Zeppelin IV", duration: 482 },
      { id: "AM053", title: "Hotel California", artist: "Eagles", album: "Hotel California", duration: 391 },
    ],
  };

  if (qLower.includes("relax") || qLower.includes("calma") || qLower.includes("dormir") || qLower.includes("medita")) return catalog.relaxar;
  if (qLower.includes("foco") || qLower.includes("estud") || qLower.includes("trabalh") || qLower.includes("concentr")) return catalog.foco;
  if (qLower.includes("energia") || qLower.includes("anima") || qLower.includes("treino") || qLower.includes("academia") || qLower.includes("gym")) return catalog.energia;
  if (qLower.includes("brasil") || qLower.includes("mpb") || qLower.includes("sertanejo") || qLower.includes("bossa")) return catalog.brasil;
  if (qLower.includes("pop") || qLower.includes("hit")) return catalog.pop;
  return catalog.default;
}

// ─── Kindle (curated book suggestions for Orion's learning) ───

export interface KindleBook {
  asin: string;
  title: string;
  author: string;
  category: string;
  pages?: number;
}

export async function getKindleBookContent(_asin: string): Promise<{ success: boolean; text: string; title: string }> {
  return { success: false, text: "", title: "" };
}

export function getKindleSuggestions(query: string): KindleBook[] {
  const qLower = (query || "").toLowerCase();

  const allBooks: Record<string, KindleBook[]> = {
    direito: [
      { asin: "K001", title: "Curso de Direito Constitucional", author: "Gilmar Mendes", category: "Direito", pages: 1500 },
      { asin: "K002", title: "Manual de Direito Penal", author: "Rogério Greco", category: "Direito", pages: 890 },
      { asin: "K003", title: "Direito Civil Brasileiro Vol.1", author: "Carlos Roberto Gonçalves", category: "Direito", pages: 650 },
    ],
    ia: [
      { asin: "K010", title: "Inteligência Artificial: Uma Abordagem Moderna", author: "Stuart Russell & Peter Norvig", category: "IA & Computação", pages: 1152 },
      { asin: "K011", title: "Deep Learning", author: "Ian Goodfellow", category: "IA & Computação", pages: 800 },
      { asin: "K012", title: "Redes Neurais Artificiais", author: "Simon Haykin", category: "IA & Computação", pages: 900 },
    ],
    filosofia: [
      { asin: "K020", title: "Meditações", author: "Marco Aurélio", category: "Filosofia", pages: 256 },
      { asin: "K021", title: "A República", author: "Platão", category: "Filosofia", pages: 420 },
      { asin: "K022", title: "Além do Bem e do Mal", author: "Friedrich Nietzsche", category: "Filosofia", pages: 320 },
    ],
    psicologia: [
      { asin: "K030", title: "O Homem em Busca de Sentido", author: "Viktor Frankl", category: "Psicologia", pages: 184 },
      { asin: "K031", title: "Rápido e Devagar", author: "Daniel Kahneman", category: "Psicologia", pages: 608 },
      { asin: "K032", title: "Inteligência Emocional", author: "Daniel Goleman", category: "Psicologia", pages: 384 },
    ],
    default: [
      { asin: "K040", title: "Sapiens: Uma Breve História da Humanidade", author: "Yuval Harari", category: "História", pages: 464 },
      { asin: "K041", title: "O Gene Egoísta", author: "Richard Dawkins", category: "Ciência", pages: 544 },
      { asin: "K042", title: "A Arte da Guerra", author: "Sun Tzu", category: "Estratégia", pages: 112 },
      { asin: "K043", title: "21 Lições para o Século 21", author: "Yuval Harari", category: "Sociedade", pages: 432 },
    ],
  };

  if (qLower.includes("direito") || qLower.includes("lei") || qLower.includes("jurídic")) return allBooks.direito;
  if (qLower.includes("inteligência artificial") || qLower.includes("machine") || qLower.includes("neural") || qLower.includes("ia")) return allBooks.ia;
  if (qLower.includes("filosofia") || qLower.includes("ética")) return allBooks.filosofia;
  if (qLower.includes("psicologia") || qLower.includes("empatia") || qLower.includes("emocion")) return allBooks.psicologia;
  return allBooks.default;
}

// ─── Alexa Device Discovery (REAL — via Alexa Smart Home API) ───

export async function getAlexaDevices(): Promise<{ success: boolean; devices: AlexaDevice[]; message?: string }> {
  try {
    const data = await callAmazonEdge("alexa_devices");
    const devices: AlexaDevice[] = (data?.appliances || []).map((d: any) => ({
      applianceId: d.applianceId || d.endpointId || "",
      friendlyName: d.friendlyName || d.friendlyDescription || "Dispositivo",
      friendlyDescription: d.friendlyDescription,
      modelName: d.modelName,
      isReachable: d.isReachable ?? true,
      actions: d.actions || d.capabilities?.map((c: any) => c.interfaceName) || [],
    }));
    return { success: true, devices };
  } catch (e: any) {
    return {
      success: false,
      devices: [],
      message: `Alexa indisponível: ${e.message}. Verifique se os scopes alexa::all estão autorizados.`,
    };
  }
}

// ─── Amazon Connection Status (REAL) ───

export async function getAmazonConnectionStatus(): Promise<{
  connected: boolean;
  hasAudible: boolean;
  hasMusic: boolean;
  hasAlexa: boolean;
  userName?: string;
}> {
  try {
    const data = await callAmazonEdge("status");
    const scopes: string[] = data.scopes || [];
    return {
      connected: data.connected || false,
      hasAudible: false,
      hasMusic: scopes.some((s: string) => s.includes("music")),
      hasAlexa: scopes.some((s: string) => s.includes("alexa")),
      userName: data.profile?.name,
    };
  } catch {
    return { connected: false, hasAudible: false, hasMusic: false, hasAlexa: false };
  }
}

// ─── Fallback Data ───

function generateFallbackAudiobooks(query: string): AmazonAudiobook[] {
  const qLower = (query || "").toLowerCase();

  if (qLower.includes("empatia") || qLower.includes("psicologia")) {
    return [
      { asin: "F001", title: "Inteligência Emocional", author: "Daniel Goleman", duration: "11h 30m" },
      { asin: "F002", title: "Comunicação Não-Violenta", author: "Marshall Rosenberg", duration: "8h 15m" },
    ];
  }
  if (qLower.includes("filosofia") || qLower.includes("ética") || qLower.includes("moral")) {
    return [
      { asin: "F003", title: "Ética a Nicômaco", author: "Aristóteles", duration: "12h 10m" },
      { asin: "F004", title: "O Existencialismo é um Humanismo", author: "Jean-Paul Sartre", duration: "3h 45m" },
    ];
  }
  if (qLower.includes("inteligência artificial") || qLower.includes("neurociência")) {
    return [
      { asin: "F005", title: "A Singularidade Está Próxima", author: "Ray Kurzweil", duration: "14h 20m" },
      { asin: "F006", title: "O Cérebro que se Transforma", author: "Norman Doidge", duration: "10h 50m" },
    ];
  }

  return [
    { asin: "B0001", title: "O Poder do Hábito", author: "Charles Duhigg", narrator: "Narração profissional", duration: "10h 53m" },
    { asin: "B0002", title: "Sapiens: Uma Breve História da Humanidade", author: "Yuval Harari", narrator: "Narração profissional", duration: "15h 18m" },
    { asin: "B0003", title: "Mindset: A Nova Psicologia do Sucesso", author: "Carol S. Dweck", narrator: "Narração profissional", duration: "9h 27m" },
  ];
}
