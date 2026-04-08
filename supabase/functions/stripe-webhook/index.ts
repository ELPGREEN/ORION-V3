/**
 * ─── Stripe Webhook ───
 * Handles Stripe events for plan activation after payment confirmation.
 * Events: checkout.session.completed, customer.subscription.deleted, invoice.payment_failed
 */

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_TOKENS: Record<string, number> = {
  professional: 100,
  business: 500,
  enterprise: 9999,
};

const PLAN_FEATURES: Record<string, Record<string, boolean>> = {
  professional: {
    orion_voice: true,
    orion_vision: false,
    crm: false,
    loja: true,
    assinatura_digital: false,
  },
  business: {
    orion_voice: true,
    orion_vision: true,
    crm: true,
    loja: true,
    assinatura_digital: true,
  },
  enterprise: {
    orion_voice: true,
    orion_vision: true,
    crm: true,
    loja: true,
    assinatura_digital: true,
    api_webhooks: true,
    rede_neural: true,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature || !webhookSecret) {
      console.error("Missing signature or webhook secret");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Stripe webhook received: ${event.type}`);

    // ═══════════════════════════════════════
    // checkout.session.completed — Plan subscription confirmed
    // ═══════════════════════════════════════
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const planType = session.metadata?.plan_type;

      if (!userId || !planType || !PLAN_TOKENS[planType]) {
        console.log("Not a plan checkout or missing metadata, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as any)?.id || null;

      const tokens = PLAN_TOKENS[planType];
      const features = PLAN_FEATURES[planType] || {};

      // Calculate expiration (30 days from now for monthly)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Upsert user_plans — activate the plan
      const { error: upsertError } = await supabaseAdmin
        .from("user_plans")
        .upsert(
          {
            user_id: userId,
            plan_type: planType,
            stripe_subscription_id: subscriptionId,
            ai_tokens_remaining: tokens,
            features_enabled: features,
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error("Error activating plan:", upsertError);
        return new Response(JSON.stringify({ error: "Failed to activate plan" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`✅ Plan ${planType} activated for user ${userId} (sub: ${subscriptionId})`);

      // Send notification
      await supabaseAdmin
        .from("notificacoes")
        .insert({
          user_id: userId,
          tipo: "plano",
          titulo: `🚀 Plano ${planType.charAt(0).toUpperCase() + planType.slice(1)} ativado!`,
          descricao: `Seu plano foi ativado com sucesso. Orion e todos os recursos premium já estão disponíveis.`,
          link: "/dashboard/plano",
        })
        .catch(() => {});
    }

    // ═══════════════════════════════════════
    // customer.subscription.deleted — Subscription canceled
    // ═══════════════════════════════════════
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;

      // Find user plan by subscription ID and downgrade
      const { data: plan } = await supabaseAdmin
        .from("user_plans")
        .select("user_id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();

      if (plan) {
        await supabaseAdmin
          .from("user_plans")
          .update({
            plan_type: "starter",
            stripe_subscription_id: null,
            ai_tokens_remaining: 1000, // Back to free trial
            features_enabled: {},
            expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", plan.user_id);

        console.log(`⚠️ Subscription ${subscriptionId} canceled, user ${plan.user_id} downgraded`);

        await supabaseAdmin
          .from("notificacoes")
          .insert({
            user_id: plan.user_id,
            tipo: "plano",
            titulo: "⚠️ Plano cancelado",
            descricao: "Sua assinatura foi cancelada. Você voltou ao plano gratuito com 1000 tokens de teste.",
            link: "/dashboard/plano",
          })
          .catch(() => {});
      }
    }

    // ═══════════════════════════════════════
    // invoice.payment_failed — Payment failed
    // ═══════════════════════════════════════
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : (invoice.subscription as any)?.id || null;

      if (subscriptionId) {
        const { data: plan } = await supabaseAdmin
          .from("user_plans")
          .select("user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (plan) {
          await supabaseAdmin
            .from("notificacoes")
            .insert({
              user_id: plan.user_id,
              tipo: "plano",
              titulo: "❌ Falha no pagamento",
              descricao: "Houve um problema com seu pagamento. Atualize seus dados de pagamento para manter o plano ativo.",
              link: "/dashboard/plano",
            })
            .catch(() => {});

          console.log(`❌ Payment failed for subscription ${subscriptionId}, user ${plan.user_id}`);
        }
      }
    }

    // ═══════════════════════════════════════
    // invoice.payment_succeeded — Renewal confirmed
    // ═══════════════════════════════════════
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : (invoice.subscription as any)?.id || null;

      // Only process renewal invoices (not the first one)
      if (subscriptionId && (invoice as any).billing_reason === "subscription_cycle") {
        const { data: plan } = await supabaseAdmin
          .from("user_plans")
          .select("user_id, plan_type")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (plan && PLAN_TOKENS[plan.plan_type]) {
          const newExpiry = new Date();
          newExpiry.setDate(newExpiry.getDate() + 30);

          await supabaseAdmin
            .from("user_plans")
            .update({
              ai_tokens_remaining: PLAN_TOKENS[plan.plan_type],
              expires_at: newExpiry.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", plan.user_id);

          console.log(`🔄 Tokens renewed for user ${plan.user_id} (${plan.plan_type})`);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
