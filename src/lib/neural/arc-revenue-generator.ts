/**
 * ═══ ARC-AGI-3 Revenue Generator ═══
 * 
 * Sistema para Orion gerar seu próprio dinheiro para compras reais:
 * 1. Prestação de serviços (pesquisa, código, análise)
 * 2. Comissões de afiliados
 * 3. Venda de API capabilities
 * 4. Conteúdo gerado por IA
 * 
 * O dinheiro vai para a Stripe Wallet do proprietário (owner)
 */

import { supabase } from "@/integrations/supabase/client";

export type RevenueType = 
  | "service"           // Serviço prestado (pesquisa, código)
  | "affiliate"         // Comissão de afiliado
  | "api_sale"          // Venda de API
  | "content"           // Conteúdo gerado
  | "subscription"      // Assinatura de serviços
  | "referral";         // Indicações

export interface RevenueEntry {
  id?: string;
  type: RevenueType;
  amount: number;       // Em centavos
  currency: string;
  description: string;
  source?: string;      // De onde veio (cliente, produto, etc.)
  status: "pending" | "earned" | "paid" | "cancelled";
  created_at: number;
  paid_at?: number;
  stripe_payment_id?: string;
}

export interface RevenueSummary {
  totalEarned: number;
  totalPending: number;
  totalPaid: number;
  byType: Record<RevenueType, number>;
  lastUpdated: number;
}

// ═══ Revenue Generation Services ═══

export const SERVICE_PRICES = {
  // Serviços de pesquisa
  legal_research: 500,      // R$ 5,00 por pesquisa
  web_research: 300,        // R$ 3,00 por pesquisa
  code_analysis: 800,       // R$ 8,00 por análise
  document_generation: 600, // R$ 6,00 por documento
  translation: 400,         // R$ 4,00 por tradução
  
  // API Usage (por request)
  vision_api: 50,           // R$ 0,50 por detecção
  reasoning_api: 30,        // R$ 0,30 por reasoning
  api_call: 20,             // R$ 0,20 por chamada
  
  // Conteúdo
  article_generation: 1000, // R$ 10,00 por artigo
  summary: 200,             // R$ 2,00 por resumo
  
  // Affiliate commissions (percentuais)
  affiliate_referral: 0.10, // 10% de comissão
};

// ═══ Generate Revenue Functions ═══

export async function generateServiceRevenue(
  serviceType: keyof typeof SERVICE_PRICES,
  description: string,
  customerId: string
): Promise<RevenueEntry> {
  const amount = SERVICE_PRICES[serviceType];
  if (!amount) throw new Error(`Serviço desconhecido: ${serviceType}`);
  
  const entry: RevenueEntry = {
    type: "service",
    amount: typeof amount === "number" ? amount : 0,
    currency: "brl",
    description: `${serviceType}: ${description}`,
    source: customerId,
    status: "pending",
    created_at: Date.now(),
  };
  
  // Save to database
  const { data, error } = await supabase
    .from("orion_revenues")
    .insert({
      type: entry.type,
      amount: entry.amount,
      currency: entry.currency,
      description: entry.description,
      source: entry.source,
      status: entry.status,
      created_at: new Date(entry.created_at).toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return { ...entry, id: data.id };
}

export async function generateAffiliateRevenue(
  productId: string,
  saleAmount: number,
  customerId: string
): Promise<RevenueEntry> {
  const commission = Math.round(saleAmount * SERVICE_PRICES.affiliate_referral);
  
  const entry: RevenueEntry = {
    type: "affiliate",
    amount: commission,
    currency: "brl",
    description: `Comissão de afiliado - Produto: ${productId}`,
    source: customerId,
    status: "pending",
    created_at: Date.now(),
  };
  
  const { data, error } = await supabase
    .from("orion_revenues")
    .insert({
      type: entry.type,
      amount: entry.amount,
      currency: entry.currency,
      description: entry.description,
      source: entry.source,
      status: entry.status,
      created_at: new Date(entry.created_at).toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return { ...entry, id: data.id };
}

export async function generateAPIUsageRevenue(
  apiName: string,
  callCount: number,
  customerId: string
): Promise<RevenueEntry> {
  const pricePerCall = SERVICE_PRICES[apiName as keyof typeof SERVICE_PRICES] || 20;
  const totalAmount = pricePerCall * callCount;
  
  const entry: RevenueEntry = {
    type: "api_sale",
    amount: totalAmount,
    currency: "brl",
    description: `API Usage: ${apiName} - ${callCount} chamadas`,
    source: customerId,
    status: "pending",
    created_at: Date.now(),
  };
  
  const { data, error } = await supabase
    .from("orion_revenues")
    .insert({
      type: entry.type,
      amount: entry.amount,
      currency: entry.currency,
      description: entry.description,
      source: entry.source,
      status: entry.status,
      created_at: new Date(entry.created_at).toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return { ...entry, id: data.id };
}

// ═══ Revenue Summary & Payout ═══

export async function getRevenueSummary(ownerId: string): Promise<RevenueSummary> {
  const { data, error } = await supabase
    .from("orion_revenues")
    .select("type, amount, status")
    .eq("source", ownerId); // Could be multiple sources
  
  if (error || !data) {
    return {
      totalEarned: 0,
      totalPending: 0,
      totalPaid: 0,
      byType: {} as Record<RevenueType, number>,
      lastUpdated: Date.now(),
    };
  }
  
  const byType: Record<RevenueType, number> = {} as Record<RevenueType, number>;
  let totalEarned = 0;
  let totalPending = 0;
  let totalPaid = 0;
  
  for (const rev of data) {
    const amount = rev.amount || 0;
    byType[rev.type as RevenueType] = (byType[rev.type as RevenueType] || 0) + amount;
    
    if (rev.status === "earned" || rev.status === "paid") {
      totalEarned += amount;
    }
    if (rev.status === "pending") {
      totalPending += amount;
    }
    if (rev.status === "paid") {
      totalPaid += amount;
    }
  }
  
  return {
    totalEarned,
    totalPending,
    totalPaid,
    byType,
    lastUpdated: Date.now(),
  };
}

// ═══ Pay Revenue to Stripe Wallet ═══

export async function payoutToOwnerStripe(
  ownerId: string,
  amount: number
): Promise<{ success: boolean; message: string; paymentId?: string }> {
  try {
    // Get owner's Stripe customer ID
    const { data: profile } = await supabase
      .from("client_profiles")
      .select("stripe_customer_id")
      .eq("user_id", ownerId)
      .maybeSingle();
    
    if (!profile?.stripe_customer_id) {
      return { success: false, message: "Proprietário não possui conta Stripe configurada" };
    }
    
    // Create payout via Stripe API
    const { data, error } = await supabase.functions.invoke("stripe-api", {
      body: {
        action: "add_customer_credit",
        target_customer_id: profile.stripe_customer_id,
        amount: amount / 100, // Convert from cents
        description: "Revenue gerado pelo Orion AI",
      },
    });
    
    if (error) throw error;
    
    // Update revenue status to paid
    await supabase
      .from("orion_revenues")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("source", ownerId)
      .eq("status", "earned");
    
    return {
      success: true,
      message: `R$ ${(amount / 100).toFixed(2)} adicionado à carteira Stripe`,
      paymentId: data?.paymentId,
    };
  } catch (e) {
    return { success: false, message: `Erro ao processar payout: ${e}` };
  }
}

// ═══ Auto-Generate Revenue Triggers ═══

export function shouldChargeForService(serviceType: string): boolean {
  const billableServices = [
    "legal_research",
    "code_analysis", 
    "document_generation",
    "web_research",
    "translation",
    "article_generation",
    "vision_api",
    "reasoning_api",
  ];
  return billableServices.includes(serviceType);
}

export async function recordBillableAction(
  actionType: string,
  metadata: Record<string, any>,
  userId: string
): Promise<void> {
  if (!shouldChargeForAction(actionType)) return;
  
  // Real billing logic
  await generateServiceRevenue(
    actionType as keyof typeof SERVICE_PRICES,
    `Auto-billable action: ${actionType}`,
    userId
  );

  console.log(`[Revenue] Action billed: ${actionType}, User: ${userId}`);
}

function shouldChargeForAction(actionType: string): boolean {
  // Enabled by default for known billable services
  return shouldChargeForService(actionType);
}

// ═══ Revenue Dashboard Data ═══

async function getDailyRevenue(dateStr: string): Promise<number> {
  const { data, error } = await supabase
    .from("orion_revenues")
    .select("amount")
    .gte("created_at", `${dateStr}T00:00:00Z`)
    .lte("created_at", `${dateStr}T23:59:59Z`);

  if (error || !data) return 0;
  return data.reduce((sum, rev) => sum + (rev.amount || 0), 0);
}

export async function getRevenueDashboard(): Promise<{
  summary: RevenueSummary;
  recentTransactions: RevenueEntry[];
  earningsChart: { date: string; amount: number }[];
}> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || "unknown";

  const summary = await getRevenueSummary(userId);
  
  const { data: recent } = await supabase
    .from("orion_revenues")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  
  // Generate real chart data (last 7 days)
  const earningsChart = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const amount = await getDailyRevenue(dateStr);

    earningsChart.push({
      date: dateStr,
      amount,
    });
  }
  
  return {
    summary,
    recentTransactions: (recent || []) as unknown as RevenueEntry[],
    earningsChart,
  };
}
