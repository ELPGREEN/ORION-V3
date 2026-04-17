/**
 * ═══ ARC-AGI-2 Google API Revenue System ═══
 * 
 * Sistema para Orion gerar renda usando APIs do Google:
 * 1. Google Workspace (Gmail, Calendar, Drive, Docs)
 * 2. Google Cloud AI APIs (Vision, NL, Translation)
 * 3. Google Maps/Places API
 * 4. YouTube API
 * 5. Google Ads API
 */

import { supabase } from "@/integrations/supabase/client";

export type GoogleServiceType = 
  | "gmail_send"
  | "gmail_read"
  | "calendar_event"
  | "calendar_list"
  | "drive_upload"
  | "docs_create"
  | "sheets_create"
  | "slides_create"
  | "vision_analyze"
  | "nl_analyze"
  | "translation_api"
  | "maps_geocoding"
  | "places_search"
  | "directions_route"
  | "youtube_search"
  | "youtube_analyze"
  | "youtube_transcript"
  | "ads_campaign"
  | "ads_report"
  | "analytics_report"

export interface GoogleServicePricing {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  price_display: string;
  api_endpoint: string;
  free_quota: number; // calls per month
  category: string;
}

// ═══ Google Services Catalog ═══

export const GOOGLE_SERVICES: GoogleServicePricing[] = [
  // Gmail Services
  { id: "gmail_send", name: "Enviar Email", description: "Enviar email via Gmail API", price_cents: 50, price_display: "R$ 0,50", api_endpoint: "gmail.send", free_quota: 100, category: "gmail" },
  { id: "gmail_read", name: "Ler Emails", description: "Ler e buscar emails", price_cents: 80, price_display: "R$ 0,80", api_endpoint: "gmail.read", free_quota: 50, category: "gmail" },
  { id: "gmail_label", name: "Gerenciar Labels", description: "Criar/buscar labels", price_cents: 30, price_display: "R$ 0,30", api_endpoint: "gmail.labels", free_quota: 100, category: "gmail" },
  
  // Calendar Services
  { id: "calendar_event", name: "Criar Evento", description: "Criar evento no calendário", price_cents: 60, price_display: "R$ 0,60", api_endpoint: "calendar.events", free_quota: 50, category: "calendar" },
  { id: "calendar_list", name: "Listar Eventos", description: "Listar eventos do calendário", price_cents: 40, price_display: "R$ 0,40", api_endpoint: "calendar.list", free_quota: 100, category: "calendar" },
  
  // Drive/Docs Services
  { id: "drive_upload", name: "Upload Arquivo", description: "Upload de arquivo para Drive", price_cents: 150, price_display: "R$ 1,50", api_endpoint: "drive.files", free_quota: 20, category: "drive" },
  { id: "docs_create", name: "Criar Documento", description: "Criar novo Google Docs", price_cents: 100, price_display: "R$ 1,00", api_endpoint: "docs.create", free_quota: 30, category: "docs" },
  { id: "sheets_create", name: "Criar Planilha", description: "Criar nova Google Sheets", price_cents: 100, price_display: "R$ 1,00", api_endpoint: "sheets.create", free_quota: 30, category: "sheets" },
  { id: "slides_create", name: "Criar Apresentação", description: "Criar nova Google Slides", price_cents: 150, price_display: "R$ 1,50", api_endpoint: "slides.create", free_quota: 20, category: "slides" },
  
  // Cloud AI Services
  { id: "vision_analyze", name: "Análise de Imagem", description: "Detecção de objetos, faces, texto", price_cents: 200, price_display: "R$ 2,00", api_endpoint: "vision.annotation", free_quota: 20, category: "ai" },
  { id: "nl_analyze", name: "Análise de Texto", description: "Sentiment analysis, entity extraction", price_cents: 150, price_display: "R$ 1,50", api_endpoint: "nl.language", free_quota: 30, category: "ai" },
  { id: "translation_api", name: "Tradução API", description: "Tradução via Google Translate", price_cents: 100, price_display: "R$ 1,00", api_endpoint: "translate", free_quota: 50, category: "ai" },
  
  // Maps Services
  { id: "maps_geocoding", name: "Geocodificação", description: "Converter endereço em coordenadas", price_cents: 80, price_display: "R$ 0,80", api_endpoint: "maps.geocoding", free_quota: 100, category: "maps" },
  { id: "places_search", name: "Busca de Lugares", description: "Buscar lugares próximos", price_cents: 100, price_display: "R$ 1,00", api_endpoint: "maps.places", free_quota: 50, category: "maps" },
  { id: "directions_route", name: "Rotas e Direções", description: "Calcular rotas", price_cents: 120, price_display: "R$ 1,20", api_endpoint: "maps.directions", free_quota: 30, category: "maps" },
  
  // YouTube Services
  { id: "youtube_search", name: "Buscar Vídeos", description: "Buscar vídeos no YouTube", price_cents: 60, price_display: "R$ 0,60", api_endpoint: "youtube.search", free_quota: 100, category: "youtube" },
  { id: "youtube_stats", name: "Estatísticas Canal", description: "Estatísticas de canal", price_cents: 150, price_display: "R$ 1,50", api_endpoint: "youtube.channel", free_quota: 20, category: "youtube" },
  { id: "youtube_transcript", name: "Transcrição Vídeo", description: "Obter transcrição de vídeo", price_cents: 200, price_display: "R$ 2,00", api_endpoint: "youtube.captions", free_quota: 10, category: "youtube" },
  
  // Ads Services
  { id: "ads_campaign_create", name: "Criar Campanha", description: "Criar campanha Google Ads", price_cents: 500, price_display: "R$ 5,00", api_endpoint: "ads.campaigns", free_quota: 5, category: "ads" },
  { id: "ads_report", name: "Relatório Ads", description: "Gerar relatório de campanhas", price_cents: 300, price_display: "R$ 3,00", api_endpoint: "ads.reports", free_quota: 10, category: "ads" },
  
  // Analytics
  { id: "analytics_report", name: "Relatório Analytics", description: "Gerar relatório GA4", price_cents: 250, price_display: "R$ 2,50", api_endpoint: "analytics.reports", free_quota: 20, category: "analytics" },
];

// ═══ Detect Google Service from Query ═══

export function detectGoogleService(query: string): GoogleServiceType | null {
  const lower = query.toLowerCase();
  
  // Gmail
  if (/\b(enviar|mandar)\s+(email|e-mail|correspondência)\b/i.test(lower)) return "gmail_send";
  if (/\b(ler|buscar|procurar)\s+(email|e-mail|caixa)\b/i.test(lower)) return "gmail_read";
  
  // Calendar
  if (/\b(criar|agendar|marcar)\s+(evento|reunião|consulta|compromisso)\b/i.test(lower)) return "calendar_event";
  if (/\b(listar|ver|mostrar)\s+(eventos|agenda|calendário)\b/i.test(lower)) return "calendar_list";
  
  // Drive/Docs
  if (/\b(upload|subir|enviar)\s+(arquivo|arquivo)\b/i.test(lower)) return "drive_upload";
  if (/\b(criar|novo)\s+(documento|doc|texto)\b/i.test(lower)) return "docs_create";
  if (/\b(criar|novo)\s+(planilha|excel|tabela)\b/i.test(lower)) return "sheets_create";
  if (/\b(criar|novo)\s+(apresentação|slides|powerpoint)\b/i.test(lower)) return "slides_create";
  
  // AI/Vision
  if (/\b(analisar|detectar|reconhecer)\s+(imagem|foto|imagem)\b/i.test(lower)) return "vision_analyze";
  if (/\b(analisar|extrair)\s+(texto|sentimento|entidade)\b/i.test(lower)) return "nl_analyze";
  if (/\b(traduzir|tradução)\b/i.test(lower)) return "translation_api";
  
  // Maps
  if (/\b(coord|geocod|gps|endereço.*lat|lati|long)\b/i.test(lower)) return "maps_geocoding";
  if (/\b(buscar|procurar)\s+(lugar|restaurante|loja|endereço)\b/i.test(lower)) return "places_search";
  if (/\b(rota|direção|como\s+chegar|trajeto)\b/i.test(lower)) return "directions_route";
  
  // YouTube
  if (/\b(buscar|procurar)\s+(vídeo|video|youtube)\b/i.test(lower)) return "youtube_search";
  if (/\b(estatística|stats|analisar)\s+(canal|youtube)\b/i.test(lower)) return "youtube_analyze";
  if (/\b(transcrever|transcrição)\s+(vídeo|video)\b/i.test(lower)) return "youtube_transcript";
  
  // Ads
  if (/\b(criar|nova)\s+(campanha|anúncio)\b/i.test(lower)) return "ads_campaign";
  if (/\b(relatório|relato)\s+(ads|publicidade|campanha)\b/i.test(lower)) return "ads_report";
  
  // Analytics
  if (/\b(relatório|estatística)\s+(analytics|site|tráfego)\b/i.test(lower)) return "analytics_report";
  
  return null;
}

// ═══ Get Service Pricing ═══

export function getGoogleServicePricing(serviceType: GoogleServiceType): GoogleServicePricing | null {
  const idMap: Record<GoogleServiceType, string> = {
    gmail_send: "gmail_send",
    gmail_read: "gmail_read",
    calendar_event: "calendar_event",
    calendar_list: "calendar_list",
    drive_upload: "drive_upload",
    docs_create: "docs_create",
    sheets_create: "sheets_create",
    slides_create: "slides_create",
    vision_analyze: "vision_analyze",
    nl_analyze: "nl_analyze",
    translation_api: "translation_api",
    maps_geocoding: "maps_geocoding",
    places_search: "places_search",
    directions_route: "directions_route",
    youtube_search: "youtube_search",
    youtube_analyze: "youtube_stats",
    youtube_transcript: "youtube_transcript",
    ads_campaign: "ads_campaign_create",
    ads_report: "ads_report",
    analytics_report: "analytics_report",
  };
  
  return GOOGLE_SERVICES.find(s => s.id === idMap[serviceType]) || null;
}

// ═══ Execute Google API Service ═══

export async function executeGoogleService(
  serviceType: GoogleServiceType,
  params: Record<string, any>,
  userId: string
): Promise<{ success: boolean; result?: any; message: string }> {
  const pricing = getGoogleServicePricing(serviceType);
  if (!pricing) {
    return { success: false, message: "Serviço não encontrado" };
  }
  
  try {
    // Call via Edge Function
    const { data, error } = await supabase.functions.invoke("google-api-bridge", {
      body: {
        action: serviceType,
        params,
        user_id: userId,
      }
    });
    
    if (error) throw error;
    
    // Record usage for billing
    await recordGoogleServiceUsage(userId, serviceType, pricing.price_cents);
    
    return {
      success: true,
      result: data,
      message: `${pricing.name} executado com sucesso`,
    };
  } catch (e) {
    return {
      success: false,
      message: `Erro ao executar ${pricing.name}: ${e}`,
    };
  }
}

// ═══ Record Service Usage ═══

async function recordGoogleServiceUsage(
  userId: string,
  serviceType: GoogleServiceType,
  priceCents: number
): Promise<void> {
  try {
    await supabase.from("google_service_usage").insert({
      user_id: userId,
      service_type: serviceType,
      price_cents: priceCents,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[GoogleService] Record error:", e);
  }
}

// ═══ Check User Quota ═══

export async function checkUserQuota(userId: string, serviceType: GoogleServiceType): Promise<{
  canUse: boolean;
  remaining: number;
  message: string;
}> {
  const pricing = getGoogleServicePricing(serviceType);
  if (!pricing) {
    return { canUse: true, remaining: 999, message: "Serviço não encontrado" };
  }
  
  // Get usage this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  
  const { data: usage } = await supabase
    .from("google_service_usage")
    .select("id")
    .eq("user_id", userId)
    .eq("service_type", serviceType)
    .gte("created_at", startOfMonth.toISOString());
  
  const used = (usage || []).length;
  const remaining = Math.max(0, pricing.free_quota - used);
  
  if (remaining > 0) {
    return {
      canUse: true,
      remaining,
      message: `Grátis! ${remaining} chamadas restantes este mês`,
    };
  }
  
  return {
    canUse: false,
    remaining: 0,
    message: `Limite gratuito esgotado. Custo: ${pricing.price_display}`,
  };
}

// ═══ Get User Google Services Stats ═══

export async function getGoogleServicesStats(userId: string): Promise<{
  totalUsed: number;
  totalSpent: number;
  byService: Record<string, number>;
  byCategory: Record<string, number>;
}> {
  const { data: usage } = await supabase
    .from("google_service_usage")
    .select("service_type, price_cents")
    .eq("user_id", userId);
  
  let totalSpent = 0;
  const byService: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  
  (usage || []).forEach(u => {
    totalSpent += u.price_cents || 0;
    byService[u.service_type] = (byService[u.service_type] || 0) + 1;
    
    const pricing = getGoogleServicePricing(u.service_type as GoogleServiceType);
    if (pricing) {
      byCategory[pricing.category] = (byCategory[pricing.category] || 0) + (u.price_cents || 0);
    }
  });
  
  return {
    totalUsed: (usage || []).length,
    totalSpent: totalSpent / 100,
    byService,
    byCategory,
  };
}

// ═══ Auto-Charge for Google Services ═══

export async function handleGoogleServiceRequest(
  query: string,
  userId: string,
  userEmail: string
): Promise<{
  handled: boolean;
  needsPayment: boolean;
  result?: any;
  message: string;
}> {
  const serviceType = detectGoogleService(query);
  
  if (!serviceType) {
    return { handled: false, needsPayment: false, message: "" };
  }
  
  const pricing = getGoogleServicePricing(serviceType);
  if (!pricing) {
    return { handled: false, needsPayment: false, message: "" };
  }
  
  // Check quota
  const quota = await checkUserQuota(userId, serviceType);
  
  if (!quota.canUse) {
    // Need to charge
    const { chargeForService } = await import("./arc-revenue-system");
    
    const chargeResult = await chargeForService(
      pricing.id,
      userEmail,
      userEmail.split("@")[0],
      { service_type: serviceType, query: query.slice(0, 100) }
    );
    
    if (!chargeResult.success) {
      return {
        handled: true,
        needsPayment: true,
        message: chargeResult.message,
      };
    }
    
    return {
      handled: true,
      needsPayment: true,
      message: `Este serviço custa ${pricing.price_display}. ${chargeResult.paymentUrl ? `[Pagar agora](${chargeResult.paymentUrl})` : ""}`,
    };
  }
  
  // Execute service (free within quota)
  const result = await executeGoogleService(serviceType, { query }, userId);
  
  return {
    handled: true,
    needsPayment: false,
    result: result.result,
    message: result.message,
  };
}