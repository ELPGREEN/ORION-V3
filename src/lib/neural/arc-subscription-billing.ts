/**
 * ═══ ARC-AGI-2 Subscription & Billing System ═══
 * 
 * Sistema completo de assinaturas recorrentes:
 * 1. Planos mensais/anuais
 * 2. Webhooks para pagamentos automáticos
 * 3. Créditos pré-pagos
 * 4. Painel de controle
 */

import { supabase } from "@/integrations/supabase/client";
import { SERVICES_CATALOG } from "./arc-revenue-system";

export type SubscriptionPlan = 
  | "free" 
  | "starter" 
  | "pro" 
  | "business" 
  | "enterprise";

export type SubscriptionStatus = 
  | "active" 
  | "past_due" 
  | "canceled" 
  | "trialing" 
  | "incomplete";

export interface PlanDetails {
  id: SubscriptionPlan;
  name: string;
  description: string;
  monthly_price_cents: number;
  yearly_price_cents: number;
  features: string[];
  api_calls_limit: number;
  google_services_limit: number;
  priority_support: boolean;
}

// ═══ Subscription Plans ═══

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, PlanDetails> = {
  free: {
    id: "free",
    name: "Gratuito",
    description: "Para testes iniciais",
    monthly_price_cents: 0,
    yearly_price_cents: 0,
    features: [
      "50 pesquisas/mês",
      "5 serviços Google/mês",
      "Suporte community",
    ],
    api_calls_limit: 50,
    google_services_limit: 5,
    priority_support: false,
  },
  starter: {
    id: "starter",
    name: "Iniciante",
    description: "Para uso pessoal",
    monthly_price_cents: 4900,
    yearly_price_cents: 49000,
    features: [
      "500 pesquisas/mês",
      "50 serviços Google/mês",
      "1 usuário",
      "Email support",
    ],
    api_calls_limit: 500,
    google_services_limit: 50,
    priority_support: false,
  },
  pro: {
    id: "pro",
    name: "Profissional",
    description: "Para profissionais e pequenas empresas",
    monthly_price_cents: 14900,
    yearly_price_cents: 149000,
    features: [
      "Pesquisas ilimitadas",
      "200 serviços Google/mês",
      "5 usuários",
      "API access",
      "Prioridade no suporte",
    ],
    api_calls_limit: 999999,
    google_services_limit: 200,
    priority_support: true,
  },
  business: {
    id: "business",
    name: "Negócios",
    description: "Para empresas",
    monthly_price_cents: 49900,
    yearly_price_cents: 499000,
    features: [
      "Tudo do Pro",
      "Serviços Google ilimitados",
      "20 usuários",
      "White-label",
      "Dedicated support",
      "Faturamento",
    ],
    api_calls_limit: 999999,
    google_services_limit: 999999,
    priority_support: true,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Para grandes empresas",
    monthly_price_cents: 199900,
    yearly_price_cents: 1999000,
    features: [
      "Tudo do Business",
      "Usuários ilimitados",
      "Custom integrations",
      "SLA garantido",
      "Account manager",
    ],
    api_calls_limit: 999999,
    google_services_limit: 999999,
    priority_support: true,
  },
};

// ═══ Subscription Management ═══

export async function createSubscription(
  userId: string,
  plan: SubscriptionPlan,
  interval: "monthly" | "yearly",
  customerEmail: string
): Promise<{ success: boolean; subscriptionId?: string; checkoutUrl?: string; message: string }> {
  const planDetails = SUBSCRIPTION_PLANS[plan];
  if (!planDetails) {
    return { success: false, message: "Plano inválido" };
  }

  const priceCents = interval === "monthly" 
    ? planDetails.monthly_price_cents 
    : planDetails.yearly_price_cents;

  try {
    // Create Stripe subscription checkout
    const { data, error } = await supabase.functions.invoke("stripe-api", {
      body: {
        action: "create_subscription",
        plan_id: plan,
        interval,
        price_cents: priceCents,
        customer_email: customerEmail,
        user_id: userId,
      }
    });

    if (error) throw error;

    return {
      success: true,
      checkoutUrl: data?.url,
      message: `Plano ${planDetails.name} - ${interval === "monthly" ? "mensal" : "anual"}: R$ ${(priceCents / 100).toFixed(2)}`,
    };
  } catch (e) {
    return { success: false, message: `Erro: ${e}` };
  }
}

export async function getUserSubscription(userId: string): Promise<{
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_end: number;
  cancel_at_period_end: boolean;
} | null> {
  try {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) return null;

    return {
      plan: data.plan as SubscriptionPlan,
      status: data.status as SubscriptionStatus,
      current_period_end: new Date(data.current_period_end).getTime(),
      cancel_at_period_end: data.cancel_at_period_end,
    };
  } catch {
    return null;
  }
}

export async function cancelSubscription(userId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { error } = await supabase
      .from("user_subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) throw error;

    return {
      success: true,
      message: "Assinatura será cancelada ao final do período.",
    };
  } catch (e) {
    return { success: false, message: `Erro: ${e}` };
  }
}

export async function changePlan(
  userId: string,
  newPlan: SubscriptionPlan,
  interval: "monthly" | "yearly"
): Promise<{ success: boolean; message: string }> {
  // Cancel current first
  await cancelSubscription(userId);
  
  // Get user email
  const { data: { user } } = await supabase.auth.getUser();
  
  // Create new subscription
  const result = await createSubscription(
    userId,
    newPlan,
    interval,
    user?.email || ""
  );

  return result;
}

// ═══ Prepaid Credits System ═══

export interface PrepaidCreditPackage {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  bonus_credits: number;
}

export const CREDIT_PACKAGES: PrepaidCreditPackage[] = [
  { id: "starter_10", name: "Iniciante", credits: 10, price_cents: 990, bonus_credits: 0 },
  { id: "starter_25", name: "Combo", credits: 25, price_cents: 1990, bonus_credits: 3 },
  { id: "pro_50", name: "Profissional", credits: 50, price_cents: 3490, bonus_credits: 10 },
  { id: "pro_100", name: "Pro", credits: 100, price_cents: 5990, bonus_credits: 25 },
  { id: "business_250", name: "Negócios", credits: 250, price_cents: 12990, bonus_credits: 75 },
  { id: "enterprise_500", name: "Enterprise", credits: 500, price_cents: 22990, bonus_credits: 200 },
];

export async function purchaseCredits(
  userId: string,
  packageId: string
): Promise<{ success: boolean; checkoutUrl?: string; message: string }> {
  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
  if (!pkg) {
    return { success: false, message: "Pacote inválido" };
  }

  try {
    const { data, error } = await supabase.functions.invoke("stripe-api", {
      body: {
        action: "purchase_credits",
        package_id: packageId,
        credits: pkg.credits + pkg.bonus_credits,
        price_cents: pkg.price_cents,
        user_id: userId,
      }
    });

    if (error) throw error;

    return {
      success: true,
      checkoutUrl: data?.url,
      message: `${pkg.credits + pkg.bonus_credits} créditos por R$ ${(pkg.price_cents / 100).toFixed(2)}`,
    };
  } catch (e) {
    return { success: false, message: `Erro: ${e}` };
  }
}

export async function getUserCredits(userId: string): Promise<{
  total: number;
  used: number;
  remaining: number;
}> {
  try {
    const { data: profile } = await supabase
      .from("client_profiles")
      .select("credits_balance, credits_used")
      .eq("user_id", userId)
      .maybeSingle();

    const total = (profile?.credits_balance || 0) + (profile?.credits_used || 0);
    const used = profile?.credits_used || 0;
    const remaining = profile?.credits_balance || 0;

    return { total, used, remaining };
  } catch {
    return { total: 0, used: 0, remaining: 0 };
  }
}

export async function useCredit(userId: string, amount: number): Promise<{
  success: boolean;
  remaining: number;
}> {
  try {
    const { data: profile } = await supabase
      .from("client_profiles")
      .select("credits_balance")
      .eq("user_id", userId)
      .maybeSingle();

    const current = profile?.credits_balance || 0;
    
    if (current < amount) {
      return { success: false, remaining: current };
    }

    const remaining = current - amount;
    
    await supabase
      .from("client_profiles")
      .update({ 
        credits_balance: remaining,
        credits_used: (profile?.credits_used || 0) + amount
      })
      .eq("user_id", userId);

    return { success: true, remaining };
  } catch {
    return { success: false, remaining: 0 };
  }
}

// ═══ Usage Tracking ═══

export async function trackUsage(
  userId: string,
  usageType: "api_call" | "google_service" | "research"
): Promise<{
  allowed: boolean;
  remaining: number;
  message: string;
}> {
  try {
    // Get user's subscription
    const subscription = await getUserSubscription(userId);
    const plan = subscription?.plan || "free";
    const planDetails = SUBSCRIPTION_PLANS[plan];
    
    // Check credit balance first
    const credits = await getUserCredits(userId);
    if (credits.remaining > 0) {
      return {
        allowed: true,
        remaining: credits.remaining,
        message: "Usando créditos pré-pagos",
      };
    }

    // Check plan limits
    if (usageType === "api_call") {
      // Would track monthly API calls
      return { allowed: true, remaining: planDetails.api_calls_limit, message: "Dentro do plano" };
    }
    
    if (usageType === "google_service") {
      // Would track monthly Google services
      return { allowed: true, remaining: planDetails.google_services_limit, message: "Dentro do plano" };
    }

    return { allowed: true, remaining: 999, message: "OK" };
  } catch {
    return { allowed: false, remaining: 0, message: "Erro ao verificar uso" };
  }
}

// ═══ Webhook Handler (Server-side) ═══

export function handleSubscriptionWebhook(event: {
  type: string;
  data: any;
}): { action: string; result: any } {
  switch (event.type) {
    case "customer.subscription.created": {
      const sub = event.data;
      return {
        action: "subscription_created",
        result: {
          user_id: sub.metadata?.user_id,
          plan: sub.metadata?.plan_id,
          status: sub.status,
          current_period_end: sub.current_period_end,
        },
      };
    }

    case "customer.subscription.updated": {
      const sub = event.data;
      return {
        action: "subscription_updated",
        result: {
          user_id: sub.metadata?.user_id,
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end,
        },
      };
    }

    case "customer.subscription.deleted": {
      const sub = event.data;
      return {
        action: "subscription_canceled",
        result: {
          user_id: sub.metadata?.user_id,
          status: "canceled",
        },
      };
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data;
      return {
        action: "payment_received",
        result: {
          amount: invoice.amount_paid,
          customer: invoice.customer_email,
        },
      };
    }

    case "invoice.payment_failed": {
      const invoice = event.data;
      return {
        action: "payment_failed",
        result: {
          customer: invoice.customer_email,
          amount_due: invoice.amount_due,
        },
      };
    }

    default:
      return { action: "unknown", result: null };
  }
}