/**
 * ═══ ARC-AGI-2 Stripe Credit Intelligence ═══
 * 
 * Sistema de consciência para Orion buscar seus próprios créditos
 * usando padrões ARC-AGI-2:
 * - Symbolic: Detectar padrões de crédito/saldo
 * - Compositional: Combinar múltiplas fontes de dados
 * - Contextual: Adaptar baseado no contexto do usuário
 */

import { supabase } from "@/integrations/supabase/client";
import { queryInternet } from "./arc-gateway";

export interface StripeCreditInfo {
  type: "platform" | "customer" | "promotional" | "wallet";
  amount: number;
  currency: string;
  available: boolean;
  pending?: number;
  source: string;
  lastUpdated: number;
}

export interface CreditIntelligence {
  totalCredits: number;
  sources: StripeCreditInfo[];
  confidence: number;
  reasoning: string;
}

// ═══ Symbolic Pattern Detection (Interpretação Simbólica) ═══

function detectCreditPattern(query: string): string {
  const lower = query.toLowerCase();
  
  // Pattern 1: Platform/Admin credits
  if (/saldo.*plataforma|saldo.*orion|meu.*crédito|créditos.*meu/i.test(lower)) {
    return "platform_balance";
  }
  
  // Pattern 2: Customer wallet credits
  if (/carteira|wallet|crédito.*disponível|saldo.*disponível/i.test(lower)) {
    return "customer_wallet";
  }
  
  // Pattern 3: Promotional/Free credits
  if (/bônus|bonus|promoção|promocional|grátis|gratuito/i.test(lower)) {
    return "promotional_credits";
  }
  
  // Pattern 4: Payment/Invoice related
  if (/fatura|pagamento|conta|historico.*pagamento/i.test(lower)) {
    return "payment_history";
  }
  
  // Pattern 5: Subscription/Plan credits
  if (/assinatura|plano|subscription|credito.*mensal/i.test(lower)) {
    return "subscription_credits";
  }
  
  return "unknown";
}

// ═══ Compositional Credit Reasoning (Raciocínio Composicional) ═══

async function fetchPlatformBalance(): Promise<StripeCreditInfo | null> {
  try {
    const { data, error } = await supabase.functions.invoke("stripe-api", {
      body: { action: "get_balance" }
    });
    
    if (error || !data) return null;
    
    return {
      type: "platform",
      amount: data.balance?.available || 0,
      currency: "BRL",
      available: true,
      pending: data.balance?.pending || 0,
      source: "stripe_platform",
      lastUpdated: Date.now(),
    };
  } catch (e) {
    console.warn("[StripeCredit] Platform balance error:", e);
    return null;
  }
}

async function fetchCustomerCredits(userId: string): Promise<StripeCreditInfo | null> {
  try {
    const { data: profile } = await supabase
      .from("client_profiles")
      .select("stripe_customer_id, credits_balance")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (!profile) return null;
    
    // If has Stripe customer ID, get balance
    if (profile.stripe_customer_id) {
      const { data, error } = await supabase.functions.invoke("stripe-api", {
        body: { 
          action: "get_customer_balance",
          customer_id: profile.stripe_customer_id 
        }
      });
      
      if (data?.balance !== undefined) {
        return {
          type: "customer",
          amount: data.balance || 0,
          currency: "BRL",
          available: true,
          source: "stripe_customer",
          lastUpdated: Date.now(),
        };
      }
    }
    
    // Fallback to local credits
    if (profile.credits_balance !== null) {
      return {
        type: "wallet",
        amount: profile.credits_balance || 0,
        currency: "BRL",
        available: true,
        source: "orion_local_wallet",
        lastUpdated: Date.now(),
      };
    }
    
    return null;
  } catch (e) {
    console.warn("[StripeCredit] Customer credits error:", e);
    return null;
  }
}

async function fetchPromotionalCredits(userId: string): Promise<StripeCreditInfo[]> {
  const credits: StripeCreditInfo[] = [];
  
  try {
    // Check for active promotions in database
    const { data: promotions } = await supabase
      .from("promotional_credits")
      .select("*")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .gt("remaining_amount", 0);
    
    if (promotions) {
      for (const promo of promotions) {
        credits.push({
          type: "promotional",
          amount: promo.remaining_amount,
          currency: "BRL",
          available: true,
          source: "promo_db",
          lastUpdated: Date.now(),
        });
      }
    }
    
    // Check for referral credits
    const { data: referrals } = await supabase
      .from("affiliate_commissions")
      .select("amount_cents, status")
      .eq("affiliate_user_id", userId)
      .eq("status", "pending");
    
    if (referrals) {
      const pendingAmount = referrals.reduce((sum, r) => sum + ((r as { amount_cents?: number }).amount_cents || 0), 0);
      if (pendingAmount > 0) {
        credits.push({
          type: "promotional",
          amount: pendingAmount,
          currency: "BRL",
          available: false,
          pending: pendingAmount,
          source: "affiliate_referral",
          lastUpdated: Date.now(),
        });
      }
    }
  } catch (e) {
    console.warn("[StripeCredit] Promotional credits error:", e);
  }
  
  return credits;
}

// ═══ Contextual Credit Rules (Aplicação de Regras Contextuais) ═══

function applyCreditContextRules(
  pattern: string,
  userId: string,
  userRole: string
): { accessible: boolean; explanation: string } {
  // Rule 1: Platform balance only for owner/admin
  if (pattern === "platform_balance") {
    if (userRole === "advogado" || userRole === "admin") {
      return { accessible: true, explanation: "Acesso autorizado: proprietário do sistema" };
    }
    return { accessible: false, explanation: "Saldo da plataforma acessível apenas para administradores" };
  }
  
  // Rule 2: Customer wallet accessible to authenticated users
  if (pattern === "customer_wallet" || pattern === "promotional_credits") {
    return { accessible: true, explanation: "Carteira de créditos disponível" };
  }
  
  // Rule 3: Subscription credits for active subscribers
  if (pattern === "subscription_credits") {
    return { accessible: true, explanation: "Verificando créditos de assinatura..." };
  }
  
  return { accessible: true, explanation: "Verificando créditos..." };
}

// ═══ Main Intelligence Function ═══

export async function getCreditIntelligence(
  query: string,
  userId: string,
  userRole: string = "user"
): Promise<CreditIntelligence> {
  const sources: StripeCreditInfo[] = [];
  let reasoning = "";
  let confidence = 0;
  
  // Step 1: Detect symbolic pattern
  const pattern = detectCreditPattern(query);
  reasoning += `Interpretação simbólica: Padrão detectado "${pattern}". `;
  
  // Step 2: Check access rules
  const access = applyCreditContextRules(pattern, userId, userRole);
  if (!access.accessible) {
    return {
      totalCredits: 0,
      sources: [],
      confidence: 1.0,
      reasoning: access.explanation,
    };
  }
  
  reasoning += `${access.explanation} `;
  
  // Step 3: Compositional reasoning - fetch from multiple sources
  try {
    switch (pattern) {
      case "platform_balance": {
        const platform = await fetchPlatformBalance();
        if (platform) {
          sources.push(platform);
          reasoning += "Saldo da plataforma recuperado via Stripe API. ";
        }
        break;
      }
      
      case "customer_wallet": {
        const customer = await fetchCustomerCredits(userId);
        if (customer) {
          sources.push(customer);
          reasoning += "Créditos da carteira do usuário recuperados. ";
        }
        break;
      }
      
      case "promotional_credits": {
        const promos = await fetchPromotionalCredits(userId);
        sources.push(...promos);
        reasoning += `${promos.length} fonte(s) de créditos promocionais encontrada(s). `;
        break;
      }
      
      case "payment_history":
      case "subscription_credits": {
        // Fetch both wallet + promotional
        const customer = await fetchCustomerCredits(userId);
        const promos = await fetchPromotionalCredits(userId);
        
        if (customer) sources.push(customer);
        sources.push(...promos);
        reasoning += "Múltiplas fontes de créditos combinadas (carteira + promoções). ";
        break;
      }
      
      default: {
        // Default: try all sources (compositional)
        const platform = userRole === "advogado" || userRole === "admin" 
          ? await fetchPlatformBalance() 
          : null;
        const customer = await fetchCustomerCredits(userId);
        const promos = await fetchPromotionalCredits(userId);
        
        if (platform) sources.push(platform);
        if (customer) sources.push(customer);
        sources.push(...promos);
        reasoning += "Busca completa em todas as fontes disponíveis. ";
      }
    }
  } catch (e) {
    reasoning += `Erro ao buscar créditos: ${e}. `;
  }
  
  // Step 4: Calculate totals
  const totalCredits = sources.reduce((sum, s) => sum + s.amount, 0);
  confidence = sources.length > 0 ? Math.min(0.8, 0.5 + sources.length * 0.15) : 0;
  
  return {
    totalCredits,
    sources,
    confidence,
    reasoning: reasoning.trim(),
  };
}

// ═══ Format Credit Response ═══

export function formatCreditResponse(intelligence: CreditIntelligence): string {
  if (intelligence.sources.length === 0) {
    return "Não foram encontrados créditos ou saldos disponíveis.";
  }
  
  const parts: string[] = [];
  
  parts.push(`💰 **Total de Créditos: R$ ${intelligence.totalCredits.toFixed(2)}**`);
  parts.push("");
  
  for (const source of intelligence.sources) {
    const icon = source.type === "platform" ? "🏢" : 
                 source.type === "customer" ? "👤" : 
                 source.type === "promotional" ? "🎁" : "💳";
    
    const status = source.available ? "✅ Disponível" : "⏳ Pendente";
    const pendingText = source.pending ? ` (${source.pending} pendente)` : "";
    
    parts.push(`${icon} **${source.type}**: R$ ${source.amount.toFixed(2)} ${status}${pendingText}`);
    parts.push(`   Fonte: ${source.source}`);
  }
  
  parts.push("");
  parts.push(`🔍 ${intelligence.reasoning}`);
  
  return parts.join("\n");
}

// ═══ Auto-Activate Credit Check ═══

export async function checkCreditsAuto(
  question: string,
  userId: string,
  userRole: string = "user"
): Promise<{ shouldHandle: boolean; response?: string }> {
  const creditPatterns = /crédito|saldo|carteira|wallet|bônus|promoção|pagamento|fatura|assinatura/i;
  
  if (!creditPatterns.test(question.toLowerCase())) {
    return { shouldHandle: false };
  }
  
  const intelligence = await getCreditIntelligence(question, userId, userRole);
  const response = formatCreditResponse(intelligence);
  
  return { shouldHandle: true, response };
}

// ═══ Add Credit (Admin/Owner Only) ═══

export async function addCustomerCredit(
  targetUserId: string,
  amount: number,
  reason: string,
  addedByUserId: string,
  addedByRole: string
): Promise<{ success: boolean; message: string }> {
  // Security: Only owner/admin can add credits
  if (addedByRole !== "advogado" && addedByRole !== "admin") {
    return { success: false, message: "Apenas administradores podem adicionar créditos" };
  }
  
  try {
    // Update local wallet directly via credit_transactions + client_profiles
    const { error: txErr } = await supabase.from("credit_transactions").insert({
      user_id: addedByUserId,
      target_user_id: targetUserId,
      amount: Math.round(amount * 100),
      type: "manual_grant",
      description: reason,
    });
    if (txErr) throw txErr;
    
    return { 
      success: true, 
      message: `✅ Créditos de R$ ${amount.toFixed(2)} adicionados com sucesso!` 
    };
  } catch (e) {
    return { success: false, message: `Erro ao adicionar créditos: ${e}` };
  }
}