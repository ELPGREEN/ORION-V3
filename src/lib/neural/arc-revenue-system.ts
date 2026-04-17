/**
 * ═══ ARC-AGI-2 Revenue & Payout System ═══
 * 
 * Solução completa para Orion gerar e receber dinheiro real:
 * 1. Stripe Connect - recebe na conta bancária do owner
 * 2. Billing automático - cobra por serviços prestados
 * 3. Payout automático - transfere para conta bancária
 */

import { supabase } from "@/integrations/supabase/client";

export interface PayoutStatus {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "paid" | "failed";
  created_at: number;
  paid_at?: number;
  failure_reason?: string;
  stripe_transfer_id?: string;
}

export interface ServicePricing {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  price_display: string;
  category: "research" | "code" | "content" | "api" | "subscription";
}

// ═══ Stripe Connect Integration ═══

const STRIPE_CONNECT_KEY = "orion_stripe_connect_id";

export async function initStripeConnect(ownerId: string): Promise<{
  success: boolean;
  onboardingUrl?: string;
  accountId?: string;
  message: string;
}> {
  try {
    // 1. Check if owner already has Stripe Connect account
    const { data: existing } = await supabase
      .from("stripe_connect_accounts")
      .select("*")
      .eq("user_id", ownerId)
      .maybeSingle();

    if (existing?.stripe_account_id) {
      // Check if charges are enabled
      if (existing.charges_enabled) {
        return {
          success: true,
          accountId: existing.stripe_account_id,
          message: "Stripe Connect já está configurado e ativo!",
        };
      }
      
      // Return to onboarding
      return {
        success: true,
        onboardingUrl: `${window.location.origin}/settings/stripe-connect`,
        accountId: existing.stripe_account_id,
        message: "Precisa completar verificação de identidade",
      };
    }

    // 2. Create Stripe Connect account via Edge Function
    const { data, error } = await supabase.functions.invoke("stripe-connect", {
      body: { action: "create_connect_account", user_id: ownerId }
    });

    if (error) throw error;

    return {
      success: true,
      onboardingUrl: data?.onboarding_url,
      accountId: data?.account_id,
      message: "Conta Stripe Connect criada! Complete a verificação.",
    };
  } catch (e) {
    return { success: false, message: `Erro: ${e}` };
  }
}

export async function getStripeConnectStatus(ownerId: string): Promise<{
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  accountId?: string;
  balance?: number;
}> {
  try {
    const { data: account } = await supabase
      .from("stripe_connect_accounts")
      .select("*")
      .eq("user_id", ownerId)
      .maybeSingle();

    if (!account) {
      return { connected: false, chargesEnabled: false, payoutsEnabled: false };
    }

    // Get balance from Stripe
    const { data: balanceData } = await supabase.functions.invoke("stripe-connect", {
      body: { action: "get_balance", account_id: account.stripe_account_id }
    });

    return {
      connected: true,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      accountId: account.stripe_account_id,
      balance: balanceData?.available || 0,
    };
  } catch (e) {
    return { connected: false, chargesEnabled: false, payoutsEnabled: false };
  }
}

// ═══ Billing Services (O que Orion pode cobrar) ═══

export const SERVICES_CATALOG: ServicePricing[] = [
  // Research Services
  { id: "legal_research_basic", name: "Pesquisa Jurídica Básica", description: "Pesquisa em jurisprudência e legislação", price_cents: 500, price_display: "R$ 5,00", category: "research" },
  { id: "legal_research_advanced", name: "Pesquisa Jurídica Avançada", description: "Pesquisa completa com análise de precedentes", price_cents: 1500, price_display: "R$ 15,00", category: "research" },
  { id: "web_research", name: "Pesquisa Web Profunda", description: "Pesquisa abrangente na internet", price_cents: 300, price_display: "R$ 3,00", category: "research" },
  
  // Code Services
  { id: "code_analysis", name: "Análise de Código", description: "Revisão e análise de código-fonte", price_cents: 800, price_display: "R$ 8,00", category: "code" },
  { id: "code_review", name: "Code Review Completo", description: "Revisão detalhada com sugestões", price_cents: 2000, price_display: "R$ 20,00", category: "code" },
  { id: "bug_detection", name: "Detecção de Bugs", description: "Identificação de problemas no código", price_cents: 1000, price_display: "R$ 10,00", category: "code" },
  
  // Content Services
  { id: "document_generation", name: "Geração de Documento", description: "Criação de documentos jurídicos/presentes", price_cents: 600, price_display: "R$ 6,00", category: "content" },
  { id: "article_summary", name: "Resumo de Artigo", description: "Resumir artigos ou documentos longos", price_cents: 200, price_display: "R$ 2,00", category: "content" },
  { id: "translation_service", name: "Tradução", description: "Tradução de documentos", price_cents: 400, price_display: "R$ 4,00", category: "content" },
  
  // API Services (usage-based)
  { id: "vision_api_calls", name: "Chamadas API Vision", description: "Por detecção de objetos", price_cents: 50, price_display: "R$ 0,50", category: "api" },
  { id: "reasoning_api_calls", name: "Chamadas API Reasoning", description: "Por推理 request", price_cents: 30, price_display: "R$ 0,30", category: "api" },
  { id: "arc_api_calls", name: "Chamadas ARC-AGI-2", description: "Por puzzle resolvido", price_cents: 100, price_display: "R$ 1,00", category: "api" },
  
  // Subscriptions
  { id: "pro_monthly", name: "Plano Pro Mensal", description: "Acesso completo ao Orion", price_cents: 9700, price_display: "R$ 97,00/mês", category: "subscription" },
  { id: "business_monthly", name: "Plano Business Mensal", description: "Uso comercial + APIs ilimitadas", price_cents: 29700, price_display: "R$ 297,00/mês", category: "subscription" },
];

// ═══ Charge for Service ═══

export async function chargeForService(
  serviceId: string,
  customerEmail: string,
  customerName: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; paymentUrl?: string; message: string }> {
  const service = SERVICES_CATALOG.find(s => s.id === serviceId);
  if (!service) {
    return { success: false, message: "Serviço não encontrado" };
  }

  try {
    // Create Stripe Checkout session
    const { data, error } = await supabase.functions.invoke("stripe-api", {
      body: {
        action: "service_checkout",
        service_id: serviceId,
        service_name: service.name,
        service_description: service.description,
        amount_cents: service.price_cents,
        customer_email: customerEmail,
        customer_name: customerName,
        metadata,
      }
    });

    if (error) throw error;

    return {
      success: true,
      paymentUrl: data?.url,
      message: `Checkout criado para ${service.price_display}`,
    };
  } catch (e) {
    return { success: false, message: `Erro ao criar pagamento: ${e}` };
  }
}

// ═══ Payout to Bank Account (REAL MONEY) ═══

export async function requestPayout(
  ownerId: string,
  amountCents: number
): Promise<{ success: boolean; payoutId?: string; message: string }> {
  try {
    // Get owner's Stripe Connect account
    const { data: account } = await supabase
      .from("stripe_connect_accounts")
      .select("stripe_account_id, payouts_enabled")
      .eq("user_id", ownerId)
      .eq("payouts_enabled", true)
      .maybeSingle();

    if (!account) {
      return { 
        success: false, 
        message: "Stripe Connect não está configurado ou payouts não estão habilitados. Configure em Configurações > Stripe Connect." 
      };
    }

    // Create payout via Edge Function
    const { data, error } = await supabase.functions.invoke("stripe-connect", {
      body: {
        action: "create_payout",
        account_id: account.stripe_account_id,
        amount_cents: amountCents,
      }
    });

    if (error) throw error;

    // Record payout request
    await supabase.from("orion_payouts").insert({
      user_id: ownerId,
      amount: amountCents,
      currency: "brl",
      status: "processing",
      stripe_transfer_id: data?.transfer_id,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      payoutId: data?.transfer_id,
      message: `Saque de R$ ${(amountCents / 100).toFixed(2)} solicitado! Vai para sua conta bancária em 2-7 dias úteis.`,
    };
  } catch (e) {
    return { success: false, message: `Erro ao solicitar saque: ${e}` };
  }
}

// ═══ Auto-Charge & Auto-Payout ═══

export async function autoChargeAndPayout(
  serviceId: string,
  customerEmail: string,
  customerName: string,
  ownerId: string,
  payoutPercentage: number = 80 // % do valor vai para o owner
): Promise<{ success: boolean; message: string }> {
  const service = SERVICES_CATALOG.find(s => s.id === serviceId);
  if (!service) return { success: false, message: "Serviço inválido" };

  // Step 1: Charge customer
  const chargeResult = await chargeForService(serviceId, customerEmail, customerName);
  if (!chargeResult.success) {
    return chargeResult;
  }

  // If it's a direct payment (not checkout URL), try to payout immediately
  if (!chargeResult.paymentUrl?.includes("checkout")) {
    const payoutAmount = Math.round(service.price_cents * (payoutPercentage / 100));
    await requestPayout(ownerId, payoutAmount);
  }

  return {
    success: true,
    message: `Serviço cobrado (${service.price_display}). Payment: ${chargeResult.paymentUrl || "processed"}`,
  };
}

// ═══ Revenue & Payout Dashboard ═══

export async function getRevenueDashboard(): Promise<{
  totalEarned: number;
  totalPayout: number;
  pending: number;
  servicesSold: number;
  recentCharges: any[];
  recentPayouts: PayoutStatus[];
}> {
  // Get all revenues
  const { data: revenues } = await supabase
    .from("orion_revenues")
    .select("amount, status")
    .order("created_at", { ascending: false })
    .limit(100);

  // Get all payouts
  const { data: payouts } = await supabase
    .from("orion_payouts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  // Calculate totals
  let totalEarned = 0;
  let totalPayout = 0;
  let pending = 0;
  const servicesSold = revenues?.length || 0;

  revenues?.forEach(r => {
    if (r.status === "paid" || r.status === "earned") totalEarned += r.amount;
    if (r.status === "pending") pending += r.amount;
  });

  payouts?.forEach(p => {
    if (p.status === "paid") totalPayout += p.amount;
  });

  return {
    totalEarned,
    totalPayout,
    pending,
    servicesSold,
    recentCharges: revenues?.slice(0, 5) || [],
    recentPayouts: (payouts || []) as unknown as PayoutStatus[],
  };
}

// ═══ Check Owner Can Receive Money ═══

export async function checkOwnerPaymentSetup(ownerId: string): Promise<{
  canCharge: boolean;
  canReceivePayout: boolean;
  issues: string[];
  setupUrl?: string;
}> {
  const issues: string[] = [];
  
  // Check 1: Can charge customers (Stripe account exists)
  const { data: stripeAccount } = await supabase
    .from("stripe_connect_accounts")
    .select("charges_enabled, payouts_enabled, stripe_account_id")
    .eq("user_id", ownerId)
    .maybeSingle();

  if (!stripeAccount) {
    issues.push("Conta Stripe não configurada");
  } else if (!stripeAccount.charges_enabled) {
    issues.push("Conta Stripe não verificada");
  }

  // Check 2: Can receive payouts
  if (!stripeAccount?.payouts_enabled) {
    issues.push("Payouts não habilitados - complete verificação bancária");
  }

  return {
    canCharge: stripeAccount?.charges_enabled || false,
    canReceivePayout: stripeAccount?.payouts_enabled || false,
    issues,
    setupUrl: issues.length > 0 ? `${window.location.origin}/settings/payments` : undefined,
  };
}