/**
 * ═══ ARC-AGI-2 Auto-Charge System ═══
 * 
 * Sistema para Orion automaticamente cobrar por serviços prestados
 * Integração com conversations para charge automático
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  SERVICES_CATALOG, 
  checkOwnerPaymentSetup, 
  chargeForService,
  type ServicePricing 
} from "./arc-revenue-system";

export type ServiceContext = 
  | "legal_research"
  | "web_research" 
  | "code_analysis"
  | "document_generation"
  | "translation"
  | "vision_api"
  | "reasoning_api"
  | "general";

// ═══ Detect Service Type from Query ═══

export function detectServiceFromQuery(query: string): ServiceContext | null {
  const lower = query.toLowerCase();
  
  // Legal Research
  if (/\b(pesquis|busc|jurisprud|súmula|lei|artigo|precedent|tribunal|processo)\b/i.test(lower)) {
    return "legal_research";
  }
  
  // Web Research
  if (/\b(pesquis.*internet|busc.*web|pesquis.*online|notícia|atual|norma|regulamento)\b/i.test(lower)) {
    return "web_research";
  }
  
  // Code Analysis
  if (/\b(código|code|programa|debug|bug|erro|função|class|api|endpoint)\b/i.test(lower)) {
    return "code_analysis";
  }
  
  // Document Generation
  if (/\b(gerar|redigir|criar|contrato|petição|procuração|laudo)\b/i.test(lower)) {
    return "document_generation";
  }
  
  // Translation
  if (/\b(traduzir|tradução|inglês|espanhol|traduzir.*para)\b/i.test(lower)) {
    return "translation";
  }
  
  // Vision API
  if (/\b(detectar|reconhecer|imagem|foto|objeto|face|visão)\b/i.test(lower)) {
    return "vision_api";
  }
  
  // Reasoning API (ARC-AGI-2)
  if (/\b(puzzle|raciocínio|abstrato|resolver|ARC|logic|pattern)\b/i.test(lower)) {
    return "reasoning_api";
  }
  
  return null;
}

// ═══ Get Service Pricing ═══

export function getServicePricing(context: ServiceContext): ServicePricing | null {
  const serviceIdMap: Record<ServiceContext, string> = {
    legal_research: "legal_research_basic",
    web_research: "web_research",
    code_analysis: "code_analysis",
    document_generation: "document_generation",
    translation: "translation_service",
    vision_api: "vision_api_calls",
    reasoning_api: "arc_api_calls",
    general: "legal_research_basic",
  };
  
  return SERVICES_CATALOG.find(s => s.id === serviceIdMap[context]) || null;
}

// ═══ Check if Service Should Be Free (for testing/owner) ═══

export async function shouldServiceBeFree(
  userId: string,
  serviceContext: ServiceContext
): Promise<{ free: boolean; reason: string }> {
  try {
    // Check user role
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    
    // Owner/Admin gets free services
    if (userRole?.role === "advogado" || userRole?.role === "admin") {
      return { free: true, reason: "Proprietário - serviço gratuito" };
    }
    
    // Check if user has credits
    const { data: profile } = await supabase
      .from("client_profiles")
      .select("credits_balance")
      .eq("user_id", userId)
      .maybeSingle();
    
    const price = getServicePricing(serviceContext);
    if (price && profile?.credits_balance && profile.credits_balance >= price.price_cents / 100) {
      return { free: true, reason: "Usuário tem créditos suficientes" };
    }
    
    // Check for free trial
    const { data: trial } = await supabase
      .from("user_trials")
      .select("remaining_free_services")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (trial?.remaining_free_services > 0) {
      return { free: true, reason: "Usuário tem serviços gratuitos restantes" };
    }
    
    return { free: false, reason: "Serviço é pago" };
  } catch (e) {
    return { free: false, reason: "Erro ao verificar" };
  }
}

// ═══ Auto-Charge Before Service ═══

export async function autoChargeBeforeService(
  userId: string,
  userEmail: string,
  userName: string,
  serviceContext: ServiceContext,
  query: string
): Promise<{
  shouldProceed: boolean;
  needsPayment: boolean;
  paymentUrl?: string;
  message: string;
  price?: number;
}> {
  // Check if owner can receive payments
  const setup = await checkOwnerPaymentSetup(userId);
  
  if (!setup.canCharge) {
    return {
      shouldProceed: false,
      needsPayment: false,
      message: "Sistema de pagamentos não configurado. Configure em Configurações > Pagamentos.",
    };
  }
  
  // Get pricing
  const pricing = getServicePricing(serviceContext);
  if (!pricing) {
    return {
      shouldProceed: true, // Unknown service - free for now
      needsPayment: false,
      message: "Serviço não catalogado - gratuito",
    };
  }
  
  // Check if should be free
  const freeCheck = await shouldServiceBeFree(userId, serviceContext);
  if (freeCheck.free) {
    return {
      shouldProceed: true,
      needsPayment: false,
      message: `${freeCheck.reason} - executando serviço`,
      price: pricing.price_cents / 100,
    };
  }
  
  // Try to charge
  const chargeResult = await chargeForService(
    pricing.id,
    userEmail,
    userName,
    {
      service_context: serviceContext,
      query_preview: query.slice(0, 100),
      timestamp: Date.now(),
    }
  );
  
  if (!chargeResult.success || !chargeResult.paymentUrl) {
    return {
      shouldProceed: false,
      needsPayment: true,
      message: chargeResult.message,
      price: pricing.price_cents / 100,
    };
  }
  
  // Return payment URL for user to complete
  return {
    shouldProceed: false,
    needsPayment: true,
    paymentUrl: chargeResult.paymentUrl,
    message: `Este serviço custa ${pricing.price_display}. Para continuar, complete o pagamento:`,
    price: pricing.price_cents / 100,
  };
}

// ═══ Record Service Usage (After Service) ═══

export async function recordServiceUsage(
  userId: string,
  serviceContext: ServiceContext,
  query: string,
  wasFree: boolean,
  amount: number
): Promise<void> {
  try {
    await supabase.from("service_transactions").insert({
      service_id: serviceContext,
      customer_email: "", // Would need to fetch
      customer_name: "",
      amount_cents: Math.round(amount * 100),
      status: wasFree ? "pending" : "paid",
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[AutoCharge] Record error:", e);
  }
}

// ═══ Check & Deduct Credits ═══

export async function deductUserCredits(
  userId: string,
  amount: number
): Promise<{ success: boolean; remaining: number }> {
  try {
    // Get current balance
    const { data: profile } = await supabase
      .from("client_profiles")
      .select("credits_balance")
      .eq("user_id", userId)
      .maybeSingle();
    
    const current = profile?.credits_balance || 0;
    
    if (current < amount) {
      return { success: false, remaining: current };
    }
    
    // Deduct
    const remaining = current - amount;
    await supabase
      .from("client_profiles")
      .update({ credits_balance: remaining })
      .eq("user_id", userId);
    
    // Record transaction
    await supabase.from("credit_transactions").insert({
      user_id: userId,
      amount: -Math.round(amount * 100),
      type: "credit_used",
      description: `Serviço utilizado: ${amount}`,
    });
    
    return { success: true, remaining };
  } catch (e) {
    return { success: false, remaining: 0 };
  }
}

// ═══ Add Free Credits (Trial) ═══

export async function addTrialCredits(userId: string): Promise<number> {
  const TRIAL_CREDITS = 10; // R$ 10,00 in credits
  
  try {
    // Check if already has trial
    const { data: existing } = await supabase
      .from("user_trials")
      .select("remaining_free_services")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (existing) {
      return existing.remaining_free_services;
    }
    
    // Add trial
    await supabase.from("user_trials").insert({
      user_id: userId,
      remaining_free_services: TRIAL_CREDITS,
    });
    
    // Also add to credits_balance
    await supabase
      .from("client_profiles")
      .update({ credits_balance: TRIAL_CREDITS })
      .eq("user_id", userId);
    
    return TRIAL_CREDITS;
  } catch (e) {
    return 0;
  }
}

// ═══ Get User Service Stats ═══

export async function getUserServiceStats(userId: string): Promise<{
  totalServices: number;
  totalSpent: number;
  creditsRemaining: number;
  trialRemaining: number;
}> {
  try {
    const [profileRes, trialRes] = await Promise.all([
      supabase.from("client_profiles").select("credits_balance").eq("user_id", userId).maybeSingle(),
      supabase.from("user_trials").select("remaining_free_services").eq("user_id", userId).maybeSingle(),
    ]);
    
    const { data: services } = await supabase
      .from("service_transactions")
      .select("amount_cents")
      .eq("user_id", userId);
    
    const totalSpent = (services || []).reduce((sum, s) => sum + (s.amount_cents || 0), 0);
    const profile = profileRes.data as { credits_balance?: number } | null;
    const trial = trialRes.data as { remaining_free_services?: number } | null;
    
    return {
      totalServices: (services || []).length,
      totalSpent: totalSpent / 100,
      creditsRemaining: profile?.credits_balance || 0,
      trialRemaining: trial?.remaining_free_services || 0,
    };
  } catch (e) {
    return { totalServices: 0, totalSpent: 0, creditsRemaining: 0, trialRemaining: 0 };
  }
}