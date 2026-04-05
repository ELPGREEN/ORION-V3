
/**
 * Orion Real-Time Intelligence SDK
 * Client-side functions for accessing live data sources
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ──

export interface NewsResult {
  title: string;
  link: string;
  source: string;
  published: string;
}

export interface NewsResponse {
  success: boolean;
  query: string;
  results: NewsResult[];
  fetched_at: string;
}

export interface MarketData {
  success: boolean;
  market: {
    usd_brl?: { cotacaoCompra: number; cotacaoVenda: number; dataHoraCotacao: string };
    selic?: { data: string; valor: string };
    ipca?: { data: string; valor: string };
    crypto?: Record<string, { usd: number; brl: number; usd_24h_change?: number }>;
    exchange_rates?: { base: string; usd: number; eur: number; gbp: number; updated: string };
  };
  fetched_at: string;
}

export interface WeatherResponse {
  success: boolean;
  location: string;
  coordinates: { lat: number; lon: number };
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    uv_index: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
    sunrise: string[];
    sunset: string[];
  };
  fetched_at: string;
}

export interface LegalResponse {
  success: boolean;
  legal: {
    proposicoes_camara?: Array<Record<string, unknown>>;
    votacoes_recentes?: Array<Record<string, unknown>>;
    datajud?: Array<Record<string, unknown>>;
  };
  fetched_at: string;
}

export interface FullBriefing {
  success: boolean;
  briefing: {
    timestamp: string;
    news: NewsResult[];
    market: MarketData["market"];
    weather: { location: string; current: WeatherResponse["current"] };
    legal: LegalResponse["legal"];
  };
}

export interface RealtimeMonitor {
  id: string;
  user_id: string;
  monitor_type: "news" | "market" | "legal" | "weather" | "custom";
  title: string;
  filters: Record<string, unknown>;
  check_interval_minutes: number;
  alert_channel: "toast" | "push" | "email" | "all";
  is_active: boolean;
  last_checked_at: string | null;
  last_result: unknown;
  created_at: string;
  updated_at: string;
}

export interface RealtimeAlert {
  id: string;
  user_id: string;
  monitor_id: string | null;
  alert_type: string;
  title: string;
  content: string | null;
  data: unknown;
  is_read: boolean;
  created_at: string;
}

// ── API Calls ──

async function callIntel<T>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("orion-realtime-intel", {
    body: { action, ...extra },
  });
  if (error) throw new Error(error.message || `Intel call failed: ${action}`);
  return data as T;
}

/** Busca notícias em tempo real */
export async function searchNews(query: string, lang = "pt-BR", limit = 10): Promise<NewsResponse> {
  return callIntel<NewsResponse>("news_search", { query, lang, limit });
}

/** Dados de mercado financeiro (câmbio, SELIC, IPCA, cripto) */
export async function getMarketData(tickers?: string[]): Promise<MarketData> {
  return callIntel<MarketData>("market_data", { tickers });
}

/** Previsão do tempo por coordenadas ou cidade */
export async function getWeather(options: { lat?: number; lon?: number; city?: string } = {}): Promise<WeatherResponse> {
  return callIntel<WeatherResponse>("weather", options);
}

/** Dados jurídicos ao vivo (Câmara, DataJud) */
export async function getLegalLive(options: { query?: string; processo_numero?: string } = {}): Promise<LegalResponse> {
  return callIntel<LegalResponse>("legal_live", options);
}

/** Briefing completo consolidando todas as fontes */
export async function getFullBriefing(options: { query?: string; lat?: number; lon?: number; city?: string } = {}): Promise<FullBriefing> {
  return callIntel<FullBriefing>("full_briefing", options);
}

// ── Monitor Management ──

/** Lista monitores do usuário */
export async function listMonitors(): Promise<RealtimeMonitor[]> {
  const { data, error } = await supabase
    .from("orion_realtime_monitors")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as RealtimeMonitor[];
}

/** Cria um novo monitor */
export async function createMonitor(monitor: {
  monitor_type: RealtimeMonitor["monitor_type"];
  title: string;
  filters: Record<string, unknown>;
  check_interval_minutes?: number;
  alert_channel?: RealtimeMonitor["alert_channel"];
}): Promise<RealtimeMonitor> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("orion_realtime_monitors")
    .insert({
      monitor_type: monitor.monitor_type,
      title: monitor.title,
      filters: monitor.filters as any,
      check_interval_minutes: monitor.check_interval_minutes,
      alert_channel: monitor.alert_channel,
      user_id: user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as RealtimeMonitor;
}

/** Atualiza um monitor */
export async function updateMonitor(id: string, updates: Partial<RealtimeMonitor>): Promise<RealtimeMonitor> {
  const { data, error } = await supabase
    .from("orion_realtime_monitors")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as RealtimeMonitor;
}

/** Remove um monitor */
export async function deleteMonitor(id: string): Promise<void> {
  const { error } = await supabase.from("orion_realtime_monitors").delete().eq("id", id);
  if (error) throw error;
}

// ── Alert Management ──

/** Lista alertas recentes */
export async function listAlerts(limit = 50, unreadOnly = false): Promise<RealtimeAlert[]> {
  let query = supabase
    .from("orion_realtime_alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) query = query.eq("is_read", false);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as RealtimeAlert[];
}

/** Marca alertas como lidos */
export async function markAlertsRead(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from("orion_realtime_alerts")
    .update({ is_read: true })
    .in("id", ids);
  if (error) throw error;
}

/** Conta alertas não lidos */
export async function countUnreadAlerts(): Promise<number> {
  const { count, error } = await supabase
    .from("orion_realtime_alerts")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) throw error;
  return count || 0;
}
