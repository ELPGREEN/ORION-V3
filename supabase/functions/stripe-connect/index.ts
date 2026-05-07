/**
 * ═══ Stripe Connect Edge Function ═══
 * 
 * Handles:
 * 1. Create Stripe Connect account for owner
 * 2. Get account balance
 * 3. Create payouts (transfer to bank account)
 * 4. Webhook handling
 */

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const body = await req.json();
    const { action } = body;

    // ═══ Create Connect Account ═══
    if (action === "create_connect_account") {
      // Check if already exists
      const { data: existing } = await supabaseAdmin
        .from("stripe_connect_accounts")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing?.stripe_account_id) {
        // Create account link for onboarding
        const accountLink = await stripe.accountLinks.create({
          account: existing.stripe_account_id,
          refresh_url: `${req.headers.get("origin")}/settings/stripe-connect`,
          return_url: `${req.headers.get("origin")}/settings/stripe-connect?success=true`,
          type: "account_onboarding",
        });

        return json({
          account_id: existing.stripe_account_id,
          onboarding_url: accountLink.url,
        });
      }

      // Create new Connect account
      const account = await stripe.accounts.create({
        type: "express",
        country: "BR",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
      });

      // Save to database
      await supabaseAdmin.from("stripe_connect_accounts").insert({
        user_id: user.id,
        stripe_account_id: account.id,
        charges_enabled: false,
        payouts_enabled: false,
        created_at: new Date().toISOString(),
      });

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${req.headers.get("origin")}/settings/stripe-connect`,
        return_url: `${req.headers.get("origin")}/settings/stripe-connect?success=true`,
        type: "account_onboarding",
      });

      return json({
        account_id: account.id,
        onboarding_url: accountLink.url,
      });
    }

    // ═══ Get Account Balance ═══
    if (action === "get_balance") {
      const { account_id } = body;
      if (!account_id) return json({ error: "account_id required" }, 400);

      const balance = await stripe.balance.retrieve({
        stripeAccount: account_id,
      });

      const brlBalance = balance.available.find(b => b.currency === "brl");
      const brlPending = balance.pending.find(b => b.currency === "brl");

      return json({
        available: (brlBalance?.amount || 0) / 100,
        pending: (brlPending?.amount || 0) / 100,
        currency: "brl",
      });
    }

    // ═══ Create Payout (Transfer to Bank) ═══
    if (action === "create_payout") {
      const { account_id, amount_cents } = body;
      if (!account_id || !amount_cents) {
        return json({ error: "account_id and amount_cents required" }, 400);
      }

      // Verify account can receive payouts
      const account = await stripe.accounts.retrieve(account_id);
      if (!account.payouts_enabled) {
        return json({ error: "Payouts not enabled for this account" }, 400);
      }

      // Create transfer/payout
      const transfer = await stripe.transfers.create({
        amount: amount_cents,
        currency: "brl",
        destination: account_id,
        description: "Revenue from Orion AI Services",
      });

      return json({
        success: true,
        transfer_id: transfer.id,
        amount: amount_cents / 100,
      });
    }

    // ═══ Check Account Status ═══
    if (action === "check_account") {
      const { account_id } = body;
      if (!account_id) return json({ error: "account_id required" }, 400);

      const account = await stripe.accounts.retrieve(account_id);

      // Update database
      await supabaseAdmin
        .from("stripe_connect_accounts")
        .update({
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        })
        .eq("stripe_account_id", account_id);

      return json({
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
      });
    }

    // ═══ Webhook Handler ═══
    if (action === "webhook") {
      const sig = req.headers.get("stripe-signature");
      const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

      if (!sig || !webhookSecret) {
        return json({ error: "Missing signature" }, 400);
      }

      const payload = await req.text();
      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
      } catch (e) {
        return json({ error: `Webhook error: ${e}` }, 400);
      }

      // Handle events
      switch (event.type) {
        case "account.updated": {
          const account = event.data.object as Stripe.Account;
          await supabaseAdmin
            .from("stripe_connect_accounts")
            .update({
              charges_enabled: account.charges_enabled,
              payouts_enabled: account.payouts_enabled,
              details_submitted: account.details_submitted,
            })
            .eq("stripe_account_id", account.id);
          break;
        }

        case "transfer.paid": {
          const transfer = event.data.object as Stripe.Transfer;
          await supabaseAdmin
            .from("orion_payouts")
            .update({ status: "paid", paid_at: Date.now() })
            .eq("stripe_transfer_id", transfer.id);
          break;
        }

        case "transfer.failed": {
          const transfer = event.data.object as Stripe.Transfer;
          await supabaseAdmin
            .from("orion_payouts")
            .update({ status: "failed", failure_reason: "Transfer failed" })
            .eq("stripe_transfer_id", transfer.id);
          break;
        }
      }

      return json({ received: true });
    }

    return json({ error: "Unknown action" }, 400);

  } catch (e) {
    console.error("[StripeConnect] Error:", e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});