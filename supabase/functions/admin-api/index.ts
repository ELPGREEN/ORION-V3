import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_SELF_ROLES = ["cliente", "produtor", "afiliado", "advogado"] as const;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const caller = userData.user;
    if (!caller) throw new Error("Usuário não autenticado");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { action, user_id, data, role } = body;

    // ═══════════════════════════════════════
    // ACTION: assign_role (self-service, safe roles only)
    // ═══════════════════════════════════════
    if (action === "assign_role") {
      if (!user_id || !role) return json({ error: "Missing user_id or role" }, 400);
      if (!ALLOWED_SELF_ROLES.includes(role)) {
        return json({ error: `Role '${role}' não permitida via API` }, 403);
      }
      const { data: userCheck, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (userError || !userCheck?.user) return json({ error: "Usuário não encontrado" }, 404);

      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id, role }, { onConflict: "user_id,role" });
      if (insertError) throw insertError;

      console.log(`Role '${role}' assigned to user ${user_id}`);
      return json({ ok: true, user_id, role });
    }

    // ═══════════════════════════════════════
    // ACTION: notify_advogados (any authenticated user)
    // ═══════════════════════════════════════
    if (action === "notify_advogados") {
      const { data: advogados } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "advogado");

      if (advogados && advogados.length > 0 && data?.titulo) {
        const safeTitulo = String(data.titulo || "").slice(0, 200);
        const safeDescricao = data.descricao ? String(data.descricao).slice(0, 500) : null;
        const safeLink = data.link && String(data.link).startsWith("/")
          ? String(data.link).slice(0, 200) : "/dashboard/clientes";
        const allowedTipos = ["documento", "consulta", "mensagem", "upload"];
        const safeTipo = allowedTipos.includes(data.tipo) ? data.tipo : "documento";
        const safeRefTipo = data.referencia_tipo ? String(data.referencia_tipo).slice(0, 50) : null;

        const notificacoes = advogados.map((adv: any) => ({
          user_id: adv.user_id, tipo: safeTipo, titulo: safeTitulo,
          descricao: safeDescricao, link: safeLink, referencia_tipo: safeRefTipo,
        }));
        await supabaseAdmin.from("notificacoes").insert(notificacoes);
      }
      return json({ ok: true });
    }

    // ═══════════════════════════════════════
    // All remaining actions require advogado role
    // ═══════════════════════════════════════
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["advogado", "admin"]);

    if (!callerRoles || callerRoles.length === 0) return json({ error: "Acesso restrito a advogados" }, 403);

    switch (action) {
      // ═══════════════════════════════════════
      // ACTION: list_users
      // ═══════════════════════════════════════
      case "list_users": {
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (authError) throw authError;

        const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
        const { data: profiles } = await supabaseAdmin
          .from("client_profiles")
          .select("user_id, nome, telefone, tipo_caso, status");

        const userList = authUsers.users.map((authUser) => {
          const userRoles = roles?.filter((r) => r.user_id === authUser.id) || [];
          const profile = profiles?.find((p) => p.user_id === authUser.id);
          const highestRole = userRoles.some((r) => r.role === "admin") ? "admin" : userRoles.some((r) => r.role === "advogado") ? "advogado" : userRoles.length > 0 ? userRoles[0].role : "cliente";
          return {
            user_id: authUser.id, email: authUser.email || "",
            nome: profile?.nome || authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
            role: highestRole, telefone: profile?.telefone || null,
            tipo_caso: profile?.tipo_caso || null, status_cliente: profile?.status || null,
            created_at: authUser.created_at, last_sign_in: authUser.last_sign_in_at || null,
            provider: authUser.app_metadata?.provider || "email",
          };
        });
        const rolePriority: Record<string, number> = { admin: 0, advogado: 1, produtor: 2, afiliado: 3, cliente: 4 };
        userList.sort((a, b) => {
          const pa = rolePriority[a.role] ?? 99;
          const pb = rolePriority[b.role] ?? 99;
          if (pa !== pb) return pa - pb;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        return json({ users: userList, total: userList.length });
      }

      // ═══════════════════════════════════════
      // ACTION: delete_user
      // ═══════════════════════════════════════
      case "delete_user": {
        if (user_id === caller.id) return json({ error: "Não é possível excluir a si mesmo" }, 400);
        const { data: targetRole } = await supabaseAdmin
          .from("user_roles").select("role").eq("user_id", user_id).eq("role", "advogado").maybeSingle();
        if (targetRole) return json({ error: "Não é possível excluir outro advogado" }, 403);

        await supabaseAdmin.from("notificacoes").delete().eq("user_id", user_id);
        const convIds = (await supabaseAdmin.from("chat_ia_conversations").select("id").eq("user_id", user_id)).data?.map((c: any) => c.id) || [];
        if (convIds.length) await supabaseAdmin.from("chat_ia_messages").delete().in("conversation_id", convIds);
        await supabaseAdmin.from("chat_ia_conversations").delete().eq("user_id", user_id);
        await supabaseAdmin.from("document_drafts").delete().eq("user_id", user_id);
        await supabaseAdmin.from("shared_documents").delete().or(`shared_by.eq.${user_id},shared_with.eq.${user_id}`);
        await supabaseAdmin.from("documents").delete().eq("user_id", user_id);
        await supabaseAdmin.from("document_folders").delete().eq("user_id", user_id);
        await supabaseAdmin.from("client_documents").delete().eq("user_id", user_id);
        await supabaseAdmin.from("client_profiles").delete().eq("user_id", user_id);
        await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (deleteError) throw deleteError;
        return json({ ok: true });
      }

      // ═══════════════════════════════════════
      // ACTION: update_user
      // ═══════════════════════════════════════
      case "update_user": {
        if (data.nome || data.telefone || data.tipo_caso) {
          const { data: existingProfile } = await supabaseAdmin
            .from("client_profiles").select("id").eq("user_id", user_id).maybeSingle();
          if (existingProfile) {
            const updateData: any = {};
            if (data.nome !== undefined) updateData.nome = data.nome;
            if (data.telefone !== undefined) updateData.telefone = data.telefone;
            if (data.tipo_caso !== undefined) updateData.tipo_caso = data.tipo_caso;
            await supabaseAdmin.from("client_profiles").update(updateData).eq("user_id", user_id);
          }
        }
        if (data.email) {
          await supabaseAdmin.auth.admin.updateUserById(user_id, { email: data.email });
        }
        if (data.password) {
          await supabaseAdmin.auth.admin.updateUserById(user_id, { password: data.password });
        }
        return json({ ok: true });
      }

      // ═══════════════════════════════════════
      // ACTION: get_user_details
      // ═══════════════════════════════════════
      case "get_user_details": {
        const [docsRes, foldersRes, clientDocsRes, profileRes] = await Promise.all([
          supabaseAdmin.from("documents").select("id, title, document_type, created_at, status, folder_id")
            .eq("user_id", user_id).order("created_at", { ascending: false }).limit(50),
          supabaseAdmin.from("document_folders").select("id, name, color, parent_id, client_profile_id, created_at")
            .eq("user_id", user_id).order("name"),
          supabaseAdmin.from("client_documents").select("id, file_name, file_type, file_size, categoria, created_at, storage_path")
            .eq("user_id", user_id).order("created_at", { ascending: false }).limit(50),
          supabaseAdmin.from("client_profiles").select("*").eq("user_id", user_id).maybeSingle()
        ]);
        const { data: sharedDocs } = await supabaseAdmin
          .from("shared_documents").select("id, document_id, created_at").eq("shared_with", user_id);
        const { data: notifs } = await supabaseAdmin
          .from("notificacoes").select("id, titulo, descricao, tipo, created_at, lida")
          .eq("user_id", user_id).order("created_at", { ascending: false }).limit(30);

        return json({
          documents: docsRes.data || [], folders: foldersRes.data || [],
          client_documents: clientDocsRes.data || [], shared_documents: sharedDocs || [],
          notifications: notifs || [], profile: profileRes.data || null,
        });
      }

      default:
        return json({ error: "Ação inválida" }, 400);
    }
  } catch (error: any) {
    console.error("Admin API error:", error);
    return json({ error: "Erro ao processar solicitação" }, 500);
  }
});
