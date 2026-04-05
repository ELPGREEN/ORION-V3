import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CreateClientProfileBody = {
  user_id: string;
  profile: {
    nome: string;
    email: string;
    telefone?: string | null;
    cpf?: string | null;
    tipo_caso?: string | null;
    descricao_problema?: string | null;
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("KEY-SUPABASE_SERVICE_ROLE") ||
      Deno.env.get("KEY_SUPABASE_SERVICE_ROLE");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secret");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = (await req.json()) as CreateClientProfileBody;

    if (!body?.user_id || !body?.profile?.nome || !body?.profile?.email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const email = body.profile.email.toLowerCase().trim();

    // Check if a client_profile already exists with this email
    // This handles the case where the advogado created the profile first
    const { data: existingProfile } = await admin
      .from("client_profiles")
      .select("id, user_id, telefone, cpf, tipo_caso, descricao_problema")
      .eq("email", email)
      .maybeSingle();

    let profileId: string;

    if (existingProfile) {
      // Update existing profile with the new user_id (linking client auth to their profile)
      console.log(`Linking existing profile ${existingProfile.id} to user ${body.user_id}`);
      
      const { error: updateError } = await admin
        .from("client_profiles")
        .update({
          user_id: body.user_id,
          nome: body.profile.nome,
          telefone: body.profile.telefone ?? existingProfile.telefone,
          cpf: body.profile.cpf ?? existingProfile.cpf,
          tipo_caso: body.profile.tipo_caso ?? existingProfile.tipo_caso,
          descricao_problema: body.profile.descricao_problema ?? existingProfile.descricao_problema,
        })
        .eq("id", existingProfile.id);

      if (updateError) {
        console.error("Error updating existing profile:", updateError);
        throw updateError;
      }

      // Also update shared_documents to use the correct user_id
      // This ensures any documents shared before the client registered will be accessible
      const { error: sharedDocsError } = await admin
        .from("shared_documents")
        .update({ shared_with: body.user_id })
        .eq("shared_with", existingProfile.user_id);

      if (sharedDocsError) {
        console.warn("Error updating shared documents (non-critical):", sharedDocsError);
      }

      profileId = existingProfile.id;
    } else {
      // Create new profile
      const { data, error } = await admin
        .from("client_profiles")
        .insert({
          user_id: body.user_id,
          nome: body.profile.nome,
          email: email,
          telefone: body.profile.telefone ?? null,
          cpf: body.profile.cpf ?? null,
          tipo_caso: body.profile.tipo_caso ?? null,
          descricao_problema: body.profile.descricao_problema ?? null,
          status: "novo",
        })
        .select("id")
        .single();

      if (error) {
        console.error("create-client-profile insert error:", error);
        return new Response(JSON.stringify({ error: "Erro ao criar perfil" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      profileId = data.id;

      // Create folder marker in storage for this client
      try {
        const folderContent = new TextEncoder().encode(
          `Pasta do cliente: ${body.profile.nome}\nE-mail: ${email}\nCriado em: ${new Date().toISOString()}`
        );
        
        await admin.storage
          .from("documents")
          .upload(`clients/${profileId}/.folder`, folderContent, { 
            contentType: "text/plain",
            upsert: true 
          });
        
        console.log(`Created folder for client ${profileId}`);
      } catch (folderErr) {
        console.warn("Non-critical: Could not create folder marker:", folderErr);
      }
    }

    // --- ROLE ASSIGNMENT ---
    // Ensure user has 'cliente' role in user_roles
    try {
      await admin
        .from("user_roles")
        .upsert({ user_id: body.user_id, role: "cliente" }, { onConflict: "user_id,role" });
      console.log(`Role 'cliente' assigned to user ${body.user_id}`);
    } catch (roleErr) {
      console.warn("Role assignment warning (non-blocking):", roleErr);
    }

    // --- NOTIFICATIONS ---
    // 1. Create dashboard notification for all advogados
    try {
      const { data: advogados } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "advogado");

      if (advogados && advogados.length > 0) {
        const notificacoes = advogados.map((adv: any) => ({
          user_id: adv.user_id,
          tipo: "novo_cadastro",
          titulo: `Novo cliente: ${body.profile.nome}`,
          descricao: `${body.profile.nome} (${email}) se cadastrou. Tipo: ${body.profile.tipo_caso || "Não informado"}.`,
          link: "/dashboard/clientes",
          referencia_id: profileId,
          referencia_tipo: "client_profile",
        }));
        await admin.from("notificacoes").insert(notificacoes);
        console.log(`Created ${notificacoes.length} dashboard notifications for advogados`);

        // 2. Send email notification to first advogado (main lawyer)
        // Get advogado email from auth
        const { data: advUser } = await admin.auth.admin.getUserById(advogados[0].user_id);
        const advEmail = advUser?.user?.email;
        if (!advEmail) {
          console.warn("Could not resolve advogado email for notification");
        }

        if (advEmail) {
          await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              type: "novo_cadastro",
              to: advEmail,
              data: {
                nome: body.profile.nome,
                email: email,
                telefone: body.profile.telefone || "",
                assunto: body.profile.tipo_caso || "",
                descricao: body.profile.descricao_problema || "",
              },
            }),
          });
          console.log("Sent email notification to advogado:", advEmail);
        }
      }
    } catch (notifErr) {
      console.error("Notification error (non-blocking):", notifErr);
    }

    // 3. Send confirmation email to the client
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          type: "cadastro_confirmacao",
          to: email,
          data: {
            nome: body.profile.nome,
            email: email,
          },
        }),
      });
      console.log("Sent confirmation email to client:", email);
    } catch (emailErr) {
      console.error("Client email error (non-blocking):", emailErr);
    }

    // ── Neural: silently initialize neural profile ──
    try {
      await fetch(`${supabaseUrl}/functions/v1/neural-ops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ user_id: body.user_id, role: "cliente" }),
      });
    } catch (_) {
      // Non-blocking
    }

    // ── Orion Feed: dados anonimizados para inteligência de mercado ──
    try {
      // Extract region from phone (DDD) if available
      const telefone = body.profile.telefone || "";
      let region = "unknown";
      const dddMatch = telefone.replace(/\D/g, "").match(/^(?:55)?(\d{2})/);
      if (dddMatch) {
        const ddd = dddMatch[1];
        const dddRegionMap: Record<string, string> = {
          "11": "SP", "12": "SP", "13": "SP", "14": "SP", "15": "SP", "16": "SP", "17": "SP", "18": "SP", "19": "SP",
          "21": "RJ", "22": "RJ", "24": "RJ",
          "27": "ES", "28": "ES",
          "31": "MG", "32": "MG", "33": "MG", "34": "MG", "35": "MG", "37": "MG", "38": "MG",
          "41": "PR", "42": "PR", "43": "PR", "44": "PR", "45": "PR", "46": "PR",
          "47": "SC", "48": "SC", "49": "SC",
          "51": "RS", "53": "RS", "54": "RS", "55": "RS",
          "61": "DF", "62": "GO", "63": "TO", "64": "GO", "65": "MT", "66": "MT", "67": "MS", "68": "AC", "69": "RO",
          "71": "BA", "73": "BA", "74": "BA", "75": "BA", "77": "BA",
          "79": "SE", "81": "PE", "82": "AL", "83": "PB", "84": "RN", "85": "CE", "86": "PI", "87": "PE", "88": "CE", "89": "PI",
          "91": "PA", "92": "AM", "93": "PA", "94": "PA", "95": "RR", "96": "AP", "97": "AM", "98": "MA", "99": "MA",
        };
        region = dddRegionMap[ddd] || "BR-other";
      }

      // 1. Insert anonymized registration feed
      await admin.from("client_registrations_feed").insert({
        registration_type: "public",
        tipo_caso: body.profile.tipo_caso || null,
        region,
        source_channel: "website",
      });

      // 2. Insert neural learning data
      await admin.from("neural_learning_data").insert({
        interaction_type: "client_registration",
        input_text: `New client registration: tipo_caso=${body.profile.tipo_caso || "unknown"}, region=${region}`,
        output_text: JSON.stringify({ tipo_caso: body.profile.tipo_caso, region, channel: "website", timestamp: new Date().toISOString() }),
        quality_score: 1.0,
        learned: false,
        metadata: { source: "create-client-profile", event: "registration", region, tipo_caso: body.profile.tipo_caso },
      });

      // 3. Report to neural-child-bridge
      await fetch(`${supabaseUrl}/functions/v1/neural-child-bridge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          action: "report_registration",
          data: { tipo_caso: body.profile.tipo_caso, region, channel: "website" },
        }),
      });

      console.log("Orion feed: registration data sent successfully");
    } catch (orionErr) {
      console.warn("Orion feed error (non-blocking):", orionErr);
    }

    return new Response(JSON.stringify({ ok: true, id: profileId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("create-client-profile error:", err);
    return new Response(JSON.stringify({ error: "Erro ao processar solicitação" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
