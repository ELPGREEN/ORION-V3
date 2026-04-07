import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id, affiliate_ref } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Grant customer_access (idempotent via upsert-like check)
    const { data: existingAccess } = await supabaseAdmin
      .from("customer_access")
      .select("id")
      .eq("user_id", order.user_id)
      .eq("product_id", order.product_id)
      .maybeSingle();

    if (!existingAccess) {
      await supabaseAdmin.from("customer_access").insert({
        user_id: order.user_id,
        product_id: order.product_id,
        order_id: order.id,
        is_active: true,
      });
    }

    // 3. Process affiliate tracking
    let affiliateResult = null;
    const ref = affiliate_ref;

    if (ref) {
      // Find the affiliate link by hash
      const { data: affLink } = await supabaseAdmin
        .from("affiliate_links")
        .select("*, products(*)")
        .eq("hash", ref)
        .eq("product_id", order.product_id)
        .maybeSingle();

      if (affLink) {
        // Get the affiliate program for commission rate
        const { data: program } = await supabaseAdmin
          .from("affiliate_programs")
          .select("*")
          .eq("product_id", order.product_id)
          .eq("is_active", true)
          .maybeSingle();

        if (program) {
          const commissionPercent = program.commission_percent || 10;
          const amountCents = order.total_cents || order.amount_cents || 0;
          const commissionCents = Math.floor(amountCents * commissionPercent / 100);

          // Insert affiliate sale
          await supabaseAdmin.from("affiliate_sales").insert({
            affiliate_user_id: affLink.affiliate_user_id,
            product_id: order.product_id,
            order_id: order.id,
            amount_cents: amountCents,
            commission_cents: commissionCents,
            tracking_type: "link",
            tracking_ref: ref,
            status: "pending",
          });

          // Increment conversions on the link
          await supabaseAdmin
            .from("affiliate_links")
            .update({ conversions: (affLink.conversions || 0) + 1 })
            .eq("id", affLink.id);

          affiliateResult = {
            affiliate_user_id: affLink.affiliate_user_id,
            commission_cents: commissionCents,
            tracking_type: "link",
          };
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      customer_access: true,
      affiliate: affiliateResult,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-sale error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
