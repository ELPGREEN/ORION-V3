import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PLAN_PRICE_MAP: Record<string, string> = {
  professional: Deno.env.get("STRIPE_PRICE_PROFESSIONAL") || "",
  business: Deno.env.get("STRIPE_PRICE_BUSINESS") || "",
  enterprise: Deno.env.get("STRIPE_PRICE_ENTERPRISE") || "",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) throw new Error("Usuário não autenticado");

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");
    const body = await req.json();
    const { action } = body;
    const origin = req.headers.get("origin") || "https://www.iasofthub.com";

    // ═══════════════════════════════════════
    // ACTION: checkout (from create-checkout)
    // ═══════════════════════════════════════
    if (action === "checkout") {
      const { tipo_servico, data_hora, embedded, payment_method, currency = "brl" } = body;
      if (!tipo_servico) throw new Error("Tipo de serviço não informado");

      const allowedCurrencies = ["brl", "usd", "eur"];
      const selectedCurrency = allowedCurrencies.includes(currency) ? currency : "brl";

      const { data: honorarios, error: honorarioError } = await supabaseAdmin
        .from("honorarios_config").select("*").eq("tipo_servico", tipo_servico).eq("ativo", true).limit(1).single();
      if (honorarioError || !honorarios) throw new Error("Serviço não encontrado ou inativo");

      const conversionRates: Record<string, number> = { brl: 1, usd: 1 / 5.8, eur: 1 / 6.3 };
      const valorNaMoeda = honorarios.valor * (conversionRates[selectedCurrency] || 1);
      const valorCentavos = Math.round(valorNaMoeda * 100);

      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

      const getPaymentMethodTypes = () => {
        if (payment_method === "card") return ["card"];
        return undefined;
      };
      const paymentMethods = getPaymentMethodTypes();

      let advogadoId: string | null = null;
      const { data: clientProfile } = await supabaseAdmin
        .from("client_profiles").select("advogado_id").eq("user_id", user.id).not("advogado_id", "is", null).limit(1).maybeSingle();
      if (clientProfile?.advogado_id) {
        advogadoId = clientProfile.advogado_id;
      } else {
        const { data: advogados } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "advogado").limit(1);
        if (advogados?.length) advogadoId = advogados[0].user_id;
      }

      let stripeConnectAccountId: string | null = null;
      if (advogadoId) {
        const { data: connectAccount } = await supabaseAdmin
          .from("stripe_connect_accounts").select("stripe_account_id, charges_enabled")
          .eq("user_id", advogadoId).eq("charges_enabled", true).maybeSingle();
        if (connectAccount) stripeConnectAccountId = connectAccount.stripe_account_id;
      }

      const platformFee = Math.round(valorCentavos * 0.10);
      const sessionParams: any = {
        customer: customerId, customer_email: customerId ? undefined : user.email,
        line_items: [{ price_data: { currency: selectedCurrency, product_data: { name: honorarios.descricao || tipo_servico, description: "Consulta jurídica" }, unit_amount: valorCentavos }, quantity: 1 }],
        mode: "payment",
        metadata: { user_id: user.id, advogado_id: advogadoId || "", tipo_servico, data_hora: data_hora || "", valor: honorarios.valor.toString(), currency: selectedCurrency },
      };

      if (stripeConnectAccountId) {
        sessionParams.payment_intent_data = { application_fee_amount: platformFee, transfer_data: { destination: stripeConnectAccountId } };
      }
      if (paymentMethods) { sessionParams.payment_method_types = paymentMethods; } else { sessionParams.payment_method_options = {}; }
      if (embedded) {
        sessionParams.ui_mode = "embedded";
        sessionParams.return_url = `${origin}/dashboard/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`;
      } else {
        sessionParams.success_url = `${origin}/dashboard/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`;
        sessionParams.cancel_url = `${origin}/dashboard/consultas`;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      await supabaseAdmin.from("consultas").insert({ cliente_id: user.id, advogado_id: advogadoId, tipo: tipo_servico, data_hora: data_hora || null, valor: honorarios.valor, status: "pendente", payment_status: "pendente", payment_id: session.id });

      return json(embedded
        ? { clientSecret: session.client_secret, publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY"), amount: honorarios.valor, description: honorarios.descricao || tipo_servico }
        : { url: session.url });
    }

    // ═══════════════════════════════════════
    // ACTION: plan_checkout (from create-plan-checkout)
    // ═══════════════════════════════════════
    if (action === "plan_checkout") {
      const { plan_type } = body;
      if (!plan_type || !PLAN_PRICE_MAP[plan_type]) return json({ error: "Invalid plan type" }, 400);
      const priceId = PLAN_PRICE_MAP[plan_type];
      if (!priceId) return json({ error: `Stripe price not configured for plan: ${plan_type}` }, 400);

      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      let customerId: string;
      if (customers.data.length > 0) { customerId = customers.data[0].id; }
      else { const customer = await stripe.customers.create({ email: user.email!, metadata: { supabase_user_id: user.id } }); customerId = customer.id; }

      const session = await stripe.checkout.sessions.create({
        customer: customerId, mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/dashboard/plano?success=true&plan=${plan_type}`,
        cancel_url: `${origin}/dashboard/plano?canceled=true`,
        metadata: { supabase_user_id: user.id, plan_type },
      });
      return json({ url: session.url });
    }

    // ═══════════════════════════════════════
    // ACTION: verify_payment (from verify-payment)
    // ═══════════════════════════════════════
    if (action === "verify_payment") {
      const { session_id } = body;
      if (!session_id) throw new Error("Session ID não informado");

      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status === "paid") {
        await supabaseAdmin.from("consultas").update({ payment_status: "pago", status: "confirmada" }).eq("payment_id", session_id);
        await supabaseAdmin.from("notificacoes").insert({
          user_id: user.id, tipo: "consulta", titulo: "✅ Consulta confirmada",
          descricao: `Sua ${session.metadata?.tipo_servico || "consulta"} foi confirmada com pagamento aprovado.${session.metadata?.data_hora ? ` Agendada para ${new Date(session.metadata.data_hora).toLocaleString("pt-BR")}.` : ""}`,
          link: "/dashboard/consultas",
        });

        // Send email via notifications function
        try {
          const userEmail = user.email || session.customer_details?.email;
          if (userEmail) {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notifications`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({
                type: "consulta_confirmada", to: userEmail,
                data: { consultaTipo: session.metadata?.tipo_servico || "Consulta", consultaDate: session.metadata?.data_hora ? new Date(session.metadata.data_hora).toLocaleString("pt-BR") : undefined, valor: session.amount_total ? session.amount_total / 100 : undefined },
              }),
            });
          }
        } catch (emailErr) { console.error("Email error:", emailErr); }

        return json({ status: "paid", amount: session.amount_total ? session.amount_total / 100 : 0, currency: session.currency, customer_email: session.customer_details?.email, tipo_servico: session.metadata?.tipo_servico, data_hora: session.metadata?.data_hora });
      }

      return new Response(JSON.stringify({ status: session.payment_status, message: "Pagamento ainda não confirmado", paid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202,
      });
    }

    // ═══════════════════════════════════════
    // ACTION: create_invoice (from create-invoice)
    // ═══════════════════════════════════════
    if (action === "create_invoice") {
      const { client_profile_id, client_email, client_name, tipo_servico, description, amount, due_date } = body;
      if (!amount || amount <= 0) throw new Error("Valor inválido");
      if (!description) throw new Error("Descrição é obrigatória");

      let clientEmail = client_email;
      let clientName = client_name;
      if (client_profile_id) {
        const { data: cp } = await supabaseAdmin.from("client_profiles").select("email, nome").eq("id", client_profile_id).single();
        if (cp) { clientEmail = cp.email; clientName = cp.nome; }
      }
      if (!clientEmail) throw new Error("Email do cliente é obrigatório");

      const customers = await stripe.customers.list({ email: clientEmail, limit: 1 });
      let customerId: string;
      if (customers.data.length > 0) { customerId = customers.data[0].id; }
      else { const c = await stripe.customers.create({ email: clientEmail, name: clientName || undefined, metadata: { client_profile_id: client_profile_id || "", created_by: user.id } }); customerId = c.id; }

      const amountCents = Math.round(amount * 100);
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price_data: { currency: "brl", product_data: { name: description, description: "Serviço profissional — ELP Green Technology" }, unit_amount: amountCents }, quantity: 1 }],
        mode: "payment", payment_method_types: ["card", "boleto"],
        success_url: `${origin}/dashboard/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard/pagamentos`,
        metadata: { user_id: user.id, client_profile_id: client_profile_id || "", tipo_servico, description },
      });

      const { data: invoice, error: invoiceError } = await supabaseAdmin.from("invoices").insert({
        user_id: user.id, client_profile_id: client_profile_id || null,
        stripe_checkout_session_id: session.id, stripe_payment_link: session.url,
        description, amount, currency: "brl", status: "pending", due_date: due_date || null,
        metadata: { tipo_servico, client_email: clientEmail, client_name: clientName },
      }).select().single();

      if (invoiceError) throw new Error("Erro ao salvar cobrança");

      // Send email
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ type: "invoice_created", to: clientEmail, data: { client_name: clientName, description, amount, payment_link: session.url, due_date } }),
        });
      } catch (e) { console.error("Invoice email error:", e); }

      await supabaseAdmin.from("notificacoes").insert({ user_id: user.id, tipo: "pagamento", titulo: "💳 Cobrança criada", descricao: `Cobrança de R$ ${amount.toFixed(2)} enviada para ${clientName || clientEmail}.`, link: "/dashboard/pagamentos" });

      return json({ success: true, invoice, payment_url: session.url, session_id: session.id });
    }

    // ═══════════════════════════════════════
    // ACTION: refund (from create-refund)
    // ═══════════════════════════════════════
    if (action === "refund") {
      const { data: roleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).single();
      if (roleData?.role !== "advogado") throw new Error("Apenas advogados podem processar reembolsos");

      const { invoice_id, payment_intent_id, amount, reason } = body;
      let paymentIntentId = payment_intent_id;

      if (invoice_id && !paymentIntentId) {
        const { data: invoice } = await supabaseAdmin.from("invoices").select("stripe_checkout_session_id").eq("id", invoice_id).single();
        if (!invoice?.stripe_checkout_session_id) throw new Error("Cobrança não encontrada");
        const session = await stripe.checkout.sessions.retrieve(invoice.stripe_checkout_session_id);
        paymentIntentId = session.payment_intent;
        if (!paymentIntentId) throw new Error("Cobrança ainda não foi paga");
      }
      if (!paymentIntentId) throw new Error("ID do pagamento é obrigatório");

      const refundParams: any = { payment_intent: paymentIntentId, reason: reason || "requested_by_customer" };
      if (amount) refundParams.amount = Math.round(amount * 100);

      const refund = await stripe.refunds.create(refundParams);
      if (invoice_id) await supabaseAdmin.from("invoices").update({ status: "refunded", metadata: { refund_id: refund.id } }).eq("id", invoice_id);
      await supabaseAdmin.from("consultas").update({ payment_status: "reembolsado", status: "cancelada" }).eq("payment_id", paymentIntentId);
      await supabaseAdmin.from("notificacoes").insert({ user_id: user.id, tipo: "pagamento", titulo: "💸 Estorno processado", descricao: `Estorno de R$ ${(refund.amount / 100).toFixed(2)} processado com sucesso.`, link: "/dashboard/pagamentos" });

      return json({ success: true, refund: { id: refund.id, amount: refund.amount / 100, status: refund.status } });
    }

    // ═══════════════════════════════════════
    // ACTION: connect_* (from stripe-connect-onboarding)
    // ═══════════════════════════════════════
    if (action === "connect_create_account") {
      const { data: existing } = await supabaseAdmin.from("stripe_connect_accounts").select("stripe_account_id, onboarding_complete, charges_enabled").eq("user_id", user.id).maybeSingle();

      if (existing?.stripe_account_id) {
        if (!existing.onboarding_complete || !existing.charges_enabled) {
          const accountLink = await stripe.accountLinks.create({ account: existing.stripe_account_id, refresh_url: `${origin}/dashboard/configuracoes?stripe=refresh`, return_url: `${origin}/dashboard/configuracoes?stripe=success`, type: "account_onboarding" });
          return json({ url: accountLink.url, account_id: existing.stripe_account_id });
        }
        return json({ already_complete: true, account_id: existing.stripe_account_id });
      }

      const { data: escritorio } = await supabaseAdmin.from("escritorio_config").select("nome_escritorio, email_contato").eq("user_id", user.id).maybeSingle();
      const account = await stripe.accounts.create({ type: "standard", country: "BR", email: user.email, business_type: "individual", metadata: { user_id: user.id, platform: "advocacia_legal" } });
      await supabaseAdmin.from("stripe_connect_accounts").insert({ user_id: user.id, stripe_account_id: account.id, display_name: escritorio?.nome_escritorio || user.email });
      const accountLink = await stripe.accountLinks.create({ account: account.id, refresh_url: `${origin}/dashboard/configuracoes?stripe=refresh`, return_url: `${origin}/dashboard/configuracoes?stripe=success`, type: "account_onboarding" });
      return json({ url: accountLink.url, account_id: account.id });
    }

    if (action === "connect_check_status") {
      const { data: connectAccount } = await supabaseAdmin.from("stripe_connect_accounts").select("*").eq("user_id", user.id).maybeSingle();
      if (!connectAccount) return json({ connected: false });
      const account = await stripe.accounts.retrieve(connectAccount.stripe_account_id);
      await supabaseAdmin.from("stripe_connect_accounts").update({ onboarding_complete: account.details_submitted ?? false, charges_enabled: account.charges_enabled ?? false, payouts_enabled: account.payouts_enabled ?? false }).eq("user_id", user.id);
      return json({ connected: true, account_id: connectAccount.stripe_account_id, onboarding_complete: account.details_submitted, charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled, display_name: connectAccount.display_name });
    }

    if (action === "connect_dashboard_link") {
      const { data: connectAccount } = await supabaseAdmin.from("stripe_connect_accounts").select("stripe_account_id").eq("user_id", user.id).maybeSingle();
      if (!connectAccount) throw new Error("Conta Stripe Connect não encontrada");
      const loginLink = await stripe.accounts.createLoginLink(connectAccount.stripe_account_id);
      return json({ url: loginLink.url });
    }

    // ═══════════════════════════════════════
    // ACTION: admin_list_payments (consolidated from admin-list-payments)
    // ═══════════════════════════════════════
    if (action === "admin_list_payments") {
      const { data: roleData2 } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id).single();
      if (roleData2?.role !== "advogado") throw new Error("Acesso não autorizado");
      const { limit: pLimit = 50, starting_after: pStarting } = body;
      const paymentIntents = await stripe.paymentIntents.list({ limit: pLimit, starting_after: pStarting });
      const balance = await stripe.balance.retrieve();
      const payments = await Promise.all(paymentIntents.data.map(async (pi: any) => {
        let customerEmail = null, customerName = null;
        if (pi.customer) { try { const c = await stripe.customers.retrieve(pi.customer as string); if (typeof c !== "string" && !c.deleted) { customerEmail = c.email; customerName = c.name; } } catch {} }
        return { id: pi.id, amount: pi.amount / 100, currency: pi.currency, status: pi.status, description: pi.description || pi.metadata?.tipo_servico || "Pagamento", created: new Date(pi.created * 1000).toISOString(), metadata: pi.metadata, customer_email: customerEmail, customer_name: customerName };
      }));
      const availableBalance = balance.available.reduce((acc: number, b: any) => b.currency === "brl" ? acc + b.amount : acc, 0) / 100;
      const pendingBalance = balance.pending.reduce((acc: number, b: any) => b.currency === "brl" ? acc + b.amount : acc, 0) / 100;
      return json({ payments, balance: { available: availableBalance, pending: pendingBalance }, has_more: paymentIntents.has_more });
    }

    // ═══════════════════════════════════════
    // ACTION: list_payments (consolidated from list-payments)
    // ═══════════════════════════════════════
    if (action === "list_payments") {
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (customers.data.length === 0) return json({ payments: [], invoices: [], balance: null });
      const customerId = customers.data[0].id;
      const paymentIntents = await stripe.paymentIntents.list({ customer: customerId, limit: 50 });
      const invoices = await stripe.invoices.list({ customer: customerId, limit: 50 });
      const customerObj = await stripe.customers.retrieve(customerId);
      const payments = paymentIntents.data.map((pi: any) => ({ id: pi.id, amount: pi.amount / 100, currency: pi.currency, status: pi.status, description: pi.description || "Pagamento", created: new Date(pi.created * 1000).toISOString(), metadata: pi.metadata }));
      const formattedInvoices = invoices.data.map((inv: any) => ({ id: inv.id, number: inv.number, amount: (inv.amount_due || 0) / 100, currency: inv.currency, status: inv.status, created: new Date(inv.created * 1000).toISOString(), hosted_invoice_url: inv.hosted_invoice_url, pdf: inv.invoice_pdf }));
      return json({ payments, invoices: formattedInvoices, balance: typeof customerObj === "object" && "balance" in customerObj ? (customerObj as any).balance / 100 : 0, customer: { id: customerId, email: customers.data[0].email, name: customers.data[0].name } });
    }

    // ═══════════════════════════════════════
    // ACTION: report_to_mother (consolidated from report-payment-to-mother)
    // ═══════════════════════════════════════
    if (action === "report_to_mother") {
      const MOTHER_URL = "https://dlwafedtlvbvuoaopvsl.supabase.co/functions/v1/stripe-commission-webhook";
      const MOTHER_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk";
      const MOTHER_COMMISSION = 3, PLATFORM_FEE = 7;
      const { stripe_payment_id, customer_email: ce, customer_name: cn, amount_cents, currency: cur = "brl", metadata: meta } = body;
      if (!stripe_payment_id || !amount_cents) throw new Error("stripe_payment_id and amount_cents required");
      const motherCents = Math.round(amount_cents * (MOTHER_COMMISSION / 100));
      const platformCents = Math.round(amount_cents * (PLATFORM_FEE / 100));
      const advogadoCents = amount_cents - motherCents - platformCents;
      const response = await fetch(MOTHER_URL, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${MOTHER_ANON_KEY}`, "apikey": MOTHER_ANON_KEY }, body: JSON.stringify({ action: "report_payment", data: { stripe_payment_id, customer_email: ce, customer_name: cn, amount_cents, currency: cur, mother_commission_cents: motherCents, platform_fee_cents: motherCents + platformCents, platform_net_cents: platformCents, commission_split: { total_fee_percent: 10, mother_percent: MOTHER_COMMISSION, platform_percent: PLATFORM_FEE, mother_cents: motherCents, platform_cents: platformCents, advogado_cents: advogadoCents }, metadata: { ...meta, child_project: "juridico", reported_at: new Date().toISOString() } } }) });
      const result = await response.json();
      return json({ success: true, mother_response: result });
    }

    // ═══════════════════════════════════════
    // ACTION: product_checkout (loja digital)
    // ═══════════════════════════════════════
    if (action === "product_checkout") {
      const { items: cartItems, creator_id, affiliate_ref } = body;
      if (!cartItems?.length) throw new Error("Carrinho vazio");

      // Validate products exist and are active
      const productIds = cartItems.map((i: any) => i.id);
      const { data: products, error: prodErr } = await supabaseAdmin
        .from("products").select("id, title, price_cents, creator_id, commission_percent, image_url")
        .in("id", productIds).eq("status", "active");
      if (prodErr || !products?.length) throw new Error("Produtos não encontrados");

      const productMap = new Map(products.map((p: any) => [p.id, p]));

      // Build line items and calculate totals
      const lineItems: any[] = [];
      let totalCents = 0;
      const orderMeta: any[] = [];

      for (const item of cartItems) {
        const product = productMap.get(item.id);
        if (!product) continue;
        const qty = Math.max(1, item.quantity || 1);
        lineItems.push({
          price_data: {
            currency: "brl",
            product_data: { name: product.title, ...(product.image_url ? { images: [product.image_url] } : {}) },
            unit_amount: product.price_cents,
          },
          quantity: qty,
        });
        totalCents += product.price_cents * qty;
        orderMeta.push({ product_id: product.id, price_cents: product.price_cents, quantity: qty, commission_percent: product.commission_percent });
      }

      // Resolve affiliate link if provided
      let affiliateLinkId: string | null = null;
      let affiliateUserId: string | null = null;
      if (affiliate_ref) {
        const { data: affLink } = await supabaseAdmin
          .from("affiliate_links").select("id, affiliate_user_id, product_id")
          .eq("hash", affiliate_ref).maybeSingle();
        if (affLink) {
          affiliateLinkId = affLink.id;
          affiliateUserId = affLink.affiliate_user_id;
          // Increment clicks
          await supabaseAdmin.rpc("increment_affiliate_clicks" as any, { link_hash: affiliate_ref }).catch(() => {});
        }
      }

      // Resolve creator's Stripe Connect account
      const actualCreatorId = creator_id || products[0]?.creator_id;
      let stripeConnectAccountId: string | null = null;
      if (actualCreatorId) {
        const { data: connectAccount } = await supabaseAdmin
          .from("stripe_connect_accounts").select("stripe_account_id, charges_enabled")
          .eq("user_id", actualCreatorId).eq("charges_enabled", true).maybeSingle();
        if (connectAccount) stripeConnectAccountId = connectAccount.stripe_account_id;
      }

      const platformFee = Math.round(totalCents * 0.10);

      // Get or create Stripe customer
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

      const sessionParams: any = {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: lineItems,
        mode: "payment",
        success_url: `${origin}/loja/${actualCreatorId}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/loja/${actualCreatorId}`,
        metadata: {
          user_id: user.id,
          creator_id: actualCreatorId || "",
          affiliate_ref: affiliate_ref || "",
          affiliate_link_id: affiliateLinkId || "",
          affiliate_user_id: affiliateUserId || "",
          order_items: JSON.stringify(orderMeta),
          type: "product_checkout",
        },
      };

      if (stripeConnectAccountId) {
        sessionParams.payment_intent_data = {
          application_fee_amount: platformFee,
          transfer_data: { destination: stripeConnectAccountId },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      // Create orders for each product
      for (const item of orderMeta) {
        const itemTotal = item.price_cents * item.quantity;
        const commissionPercent = item.commission_percent || 0;
        const affiliateFeeCents = affiliateUserId ? Math.round(itemTotal * commissionPercent / 100) : 0;
        const platformFeeCents = Math.round(itemTotal * 0.10);
        const creatorFeeCents = itemTotal - platformFeeCents - affiliateFeeCents;

        await supabaseAdmin.from("orders").insert({
          buyer_user_id: user.id,
          product_id: item.product_id,
          affiliate_link_id: affiliateLinkId,
          stripe_session_id: session.id,
          amount_cents: itemTotal,
          platform_fee_cents: platformFeeCents,
          affiliate_fee_cents: affiliateFeeCents,
          creator_fee_cents: creatorFeeCents,
          status: "pending",
        });

        // Create affiliate commission record
        if (affiliateUserId && affiliateFeeCents > 0) {
          await supabaseAdmin.from("affiliate_commissions").insert({
            affiliate_user_id: affiliateUserId,
            product_id: item.product_id,
            order_id: session.id, // will be updated with real order id
            amount_cents: affiliateFeeCents,
            status: "pending",
          });
        }
      }

      return json({ url: session.url, session_id: session.id });
    }

    return json({ error: "Ação não reconhecida" }, 400);
  } catch (error: any) {
    console.error("Stripe API error:", error);
    return json({ error: error.message || "Erro ao processar solicitação" }, 500);
  }
});
