import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

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

// ═══════════════════════════════════════
// Escritório config loader
// ═══════════════════════════════════════
interface EscritorioConfig {
  nome_escritorio: string; oab: string; logo_url: string;
  email_remetente_nome: string; email_cor_primaria: string;
  email_cor_fundo: string; email_rodape_texto: string; email_assinatura_texto: string;
}

const DEFAULT_CONFIG: EscritorioConfig = {
  nome_escritorio: "ORION IA by ELP", oab: "[OAB]", logo_url: "",
  email_remetente_nome: "ORION IA by ELP", email_cor_primaria: "#d4a418",
  email_cor_fundo: "#0a0a0a", email_rodape_texto: "Provimento 205/2021 e LGPD aplicáveis.",
  email_assinatura_texto: "",
};

async function loadConfig(supabase: any, userId?: string): Promise<EscritorioConfig> {
  if (!userId) return DEFAULT_CONFIG;
  try {
    const { data } = await supabase.from("escritorio_config").select("*").eq("user_id", userId).maybeSingle();
    if (data) {
      return {
        nome_escritorio: data.nome_escritorio || DEFAULT_CONFIG.nome_escritorio,
        oab: data.oab || DEFAULT_CONFIG.oab, logo_url: data.logo_url || "",
        email_remetente_nome: data.email_remetente_nome || DEFAULT_CONFIG.email_remetente_nome,
        email_cor_primaria: data.email_cor_primaria || DEFAULT_CONFIG.email_cor_primaria,
        email_cor_fundo: data.email_cor_fundo || DEFAULT_CONFIG.email_cor_fundo,
        email_rodape_texto: data.email_rodape_texto || DEFAULT_CONFIG.email_rodape_texto,
        email_assinatura_texto: data.email_assinatura_texto || "",
      };
    }
  } catch (err) { console.error("Failed to load config:", err); }
  return DEFAULT_CONFIG;
}

// ═══════════════════════════════════════
// Email builder
// ═══════════════════════════════════════
function buildEmailContent(type: string, data: any, cfg: EscritorioConfig): { subject: string; html: string } {
  const gold = cfg.email_cor_primaria || "#b8962e";
  const baseUrl = "https://www.iasofthub.com";
  const logoUrl = cfg.logo_url || `${baseUrl}/images/logo-email.jpg`;

  const wrapHtml = (title: string, body: string, ctaUrl?: string, ctaLabel?: string) => `
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;max-width:600px;width:100%;border-radius:4px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:24px 40px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;padding-right:16px;"><img src="${logoUrl}" alt="${cfg.nome_escritorio}" width="52" height="52" style="display:block;width:52px;height:52px;border-radius:50%;object-fit:cover;" /></td>
            <td style="vertical-align:middle;"><p style="margin:0;font-size:16px;font-weight:700;color:#222;">${cfg.nome_escritorio}</p><p style="margin:2px 0 0;font-size:12px;color:${gold};">${cfg.oab}</p></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:0 40px;"><div style="border-top:2px solid ${gold};"></div></td></tr>
        <tr><td style="padding:0 40px 16px;"><h1 style="margin:0;font-size:18px;color:#222;font-weight:600;">${title}</h1></td></tr>
        <tr><td style="padding:0 40px 24px;font-size:14px;line-height:1.7;color:#444;">${body}</td></tr>
        ${ctaUrl && ctaLabel ? `<tr><td style="padding:0 40px 28px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color:${gold};border-radius:4px;"><a href="${ctaUrl}" style="display:inline-block;padding:11px 28px;color:#ffffff;font-size:13px;font-weight:bold;text-decoration:none;letter-spacing:0.3px;">${ctaLabel}</a></td></tr></table></td></tr>` : ""}
        <tr><td style="padding:20px 40px;border-top:1px solid #eee;background-color:#fafafa;">
          ${cfg.email_assinatura_texto ? `<p style="margin:0 0 8px;font-size:12px;color:#666;">${cfg.email_assinatura_texto}</p>` : ""}
          <p style="margin:0;font-size:12px;color:#888;">${cfg.nome_escritorio} · ${cfg.oab}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888;"><a href="mailto:info@elpgreen.com" style="color:${gold};text-decoration:none;">info@elpgreen.com</a></p>
          <p style="margin:8px 0 0;font-size:11px;color:#aaa;">${cfg.email_rodape_texto}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#bbb;">© ${new Date().getFullYear()} ${cfg.nome_escritorio}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const infoRow = (label: string, value: string) =>
    `<tr><td style="padding:6px 16px;font-size:13px;color:#888;border-bottom:1px solid #f0f0f0;width:120px;vertical-align:top;">${label}</td><td style="padding:6px 16px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #f0f0f0;">${value}</td></tr>`;
  const infoTable = (rows: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;border:1px solid #eee;border-radius:4px;margin:16px 0 8px;">${rows}</table>`;

  switch (type) {
    case "assinatura_concluida":
      return { subject: `Documento "${data.documentTitle}" — Assinatura Concluída`, html: wrapHtml("Documento Assinado com Sucesso", `<p>O documento <strong>"${data.documentTitle}"</strong> foi assinado por todas as partes.</p>${infoTable(infoRow("Documento", data.documentTitle || "") + infoRow("Status", '<span style="color:#16a34a;font-weight:600;">Concluído</span>'))}`, `${baseUrl}/dashboard/assinatura-digital`, "Ver no Painel") };
    case "consulta_confirmada":
      return { subject: `Consulta ${data.consultaTipo || ""} — Confirmada`, html: wrapHtml("Consulta Confirmada", `<p>Sua consulta foi confirmada.</p>${infoTable(infoRow("Tipo", data.consultaTipo || "Consulta") + (data.consultaDate ? infoRow("Data/Hora", data.consultaDate) : "") + (data.valor ? infoRow("Valor", `R$ ${data.valor.toFixed(2)}`) : ""))}`, `${baseUrl}/dashboard/consultas`, "Ver Consultas") };
    case "documento_gerado":
      return { subject: `Documento "${data.documentTitle}" Gerado`, html: wrapHtml("Novo Documento Gerado", `<p>O documento <strong>"${data.documentTitle}"</strong> foi gerado.</p>`, `${baseUrl}/dashboard/meus-documentos`, "Ver Documentos") };
    case "nova_mensagem_chat":
      return { subject: `Nova mensagem de ${data.senderName || "participante"}`, html: wrapHtml("Nova Mensagem no Chat", `<p>Mensagem de <strong>${data.senderName || "participante"}</strong>:</p><blockquote style="margin:16px 0;padding:12px 20px;border-left:3px solid ${gold};background:#fafafa;color:#333;font-style:italic;">"${data.messagePreview || "..."}"</blockquote>`, `${baseUrl}/dashboard/chat-ao-vivo`, "Ir para o Chat") };
    case "pro_bono_request":
      return { subject: `Solicitação Pro Bono — ${data.nome || "Cliente"}`, html: wrapHtml("Nova Solicitação Pro Bono", `<p>Nova solicitação pro bono recebida.</p>${infoTable(infoRow("Nome", data.nome || "N/A") + infoRow("E-mail", data.email || "N/A") + (data.telefone ? infoRow("Telefone", data.telefone) : ""))}<p style="font-weight:600;font-size:13px;margin:16px 0 4px;">Situação</p><div style="background:#fafafa;border:1px solid #eee;padding:12px 16px;font-size:13px;">${data.situacao || "N/A"}</div><p style="font-weight:600;font-size:13px;margin:16px 0 4px;">Descrição</p><div style="background:#fafafa;border:1px solid #eee;padding:12px 16px;font-size:13px;">${data.descricao || "N/A"}</div>`) };
    case "contato_site":
      return { subject: `Mensagem do Site — ${data.assunto || "Contato"}`, html: wrapHtml("Nova Mensagem via Site", `<p>Mensagem do formulário de contato.</p>${infoTable(infoRow("Nome", data.nome || "N/A") + infoRow("E-mail", data.email || "N/A") + (data.telefone ? infoRow("Telefone", data.telefone) : "") + infoRow("Assunto", data.assunto || "N/A"))}<p style="font-weight:600;font-size:13px;margin:16px 0 4px;">Mensagem</p><div style="background:#fafafa;border:1px solid #eee;padding:12px 16px;font-size:13px;">${data.mensagem || "N/A"}</div>`) };
    case "novo_cadastro":
      return { subject: `Novo Cliente — ${data.nome || "Cliente"}`, html: wrapHtml("Novo Cliente Cadastrado", `<p>Novo cliente cadastrado.</p>${infoTable(infoRow("Nome", data.nome || "N/A") + infoRow("E-mail", data.email || "N/A") + (data.telefone ? infoRow("Telefone", data.telefone) : ""))}`, `${baseUrl}/dashboard/clientes`, "Ver Clientes") };
    case "cadastro_confirmacao":
      return { subject: `Bem-vindo(a) — ${cfg.nome_escritorio}`, html: wrapHtml(`Bem-vindo(a), ${data.nome || "Cliente"}!`, `<p>Seu cadastro no escritório <strong>${cfg.nome_escritorio}</strong> foi realizado com sucesso.</p>`, `${baseUrl}/dashboard`, "Acessar Painel") };
    case "contact_otr":
      return { subject: data.subject || `Novo contato: ${data.name}`, html: wrapHtml("Nova Indicação OTR Source", `${infoTable(infoRow("Nome", data.name || "N/A") + infoRow("Email", data.email || "N/A") + infoRow("Empresa", data.company || "N/A") + infoRow("Canal", data.channel || "web"))}${data.fromPdfQrCode ? '<p><strong>📄 Via QR Code PDF</strong></p>' : ''}<p>${data.message || "Sem mensagem"}</p>`) };
    default:
      return { subject: `Notificação — ${cfg.nome_escritorio}`, html: wrapHtml("Nova Notificação", `<p>Você tem uma nova notificação.</p>`, `${baseUrl}/dashboard`, "Acessar Painel") };
  }
}

// ═══════════════════════════════════════
// Chat notification handler
// ═══════════════════════════════════════
async function handleChatNotification(supabase: any, resend: Resend, record: any, cfg: EscritorioConfig) {
  if (!record?.id || !record?.conversation_id) return json({ success: true, skipped: true, reason: "Missing record" });

  const { data: conversation, error: convError } = await supabase
    .from("chat_conversations").select("cliente_id, advogado_id").eq("id", record.conversation_id).single();
  if (convError || !conversation) throw new Error("Conversation not found");

  let recipientId: string;
  let senderName: string;

  if (record.sender_role === "advogado") {
    recipientId = conversation.cliente_id;
    senderName = "[Nome do Advogado]";
  } else {
    if (conversation.advogado_id) {
      recipientId = conversation.advogado_id;
    } else {
      const { data: primaryAdvogado } = await supabase.auth.admin.getUserByEmail("info@elpgreen.com");
      if (!primaryAdvogado?.user) return json({ success: true, skipped: true, reason: "Primary advogado not found" });
      recipientId = primaryAdvogado.user.id;
      await supabase.from("chat_conversations").update({ advogado_id: recipientId }).eq("id", record.conversation_id);
    }
    const { data: profile } = await supabase.from("client_profiles").select("nome").eq("user_id", record.sender_id).single();
    senderName = profile?.nome || "Cliente";
  }

  const { data: userData } = await supabase.auth.admin.getUserById(recipientId);
  if (!userData?.user?.email) return json({ success: true, skipped: true, reason: "No recipient email" });

  const messagePreview = record.content.length > 100 ? record.content.substring(0, 100) + "..." : record.content;
  const { subject, html } = buildEmailContent("nova_mensagem_chat", { senderName, messagePreview }, cfg);

  const emailResponse = await resend.emails.send({
    from: `${cfg.email_remetente_nome} <info@elpgreen.com>`,
    to: [userData.user.email], subject, html,
  });

  await supabase.from("notificacoes").insert({
    user_id: recipientId, tipo: "chat", titulo: `Nova mensagem de ${senderName}`,
    descricao: messagePreview, link: "/dashboard/chat-ao-vivo",
    referencia_tipo: "chat_message", referencia_id: record.id,
  });

  return json({ success: true, emailId: emailResponse.data?.id });
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let body: any;
    try { body = await req.json(); } catch {
      return json({ success: true, skipped: true, reason: "No valid JSON body" });
    }

    const { action, type, to, user_id, data, record,
            name, email, company, subject, message, channel, fromPdfQrCode,
            documentId, documentName, nextSignerEmail, nextSignerName, signatureLink, previousSignerName, currentSignatureNumber, totalSignatures, language,
            templateName, templateType, fieldValues, isSigned, signatureHash, signedAt, signerName, signerEmail,
            recipientEmail, recipientName, companyName, isFirstSigner, requiresMultipleSignatures, firstSignerName,
            contactName, phone, country, companyType, productsInterest, estimatedVolume, registrationId,
            signatureType } = body;

    // Route by action
    const effectiveAction = action || type || (record ? "notify_chat" : (name ? "contact_otr" : null));

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, skipping");
      return json({ success: true, skipped: true, reason: "No RESEND_API_KEY" });
    }

    const resend = new Resend(RESEND_API_KEY);
    const cfg = await loadConfig(supabase, user_id);

    // ── Chat notification (from notify-chat-message)
    if (effectiveAction === "notify_chat") {
      return await handleChatNotification(supabase, resend, record, cfg);
    }

    // ── OTR Contact email (from send-contact-email)
    if (effectiveAction === "contact_otr") {
      const emailData = { name, email, company, subject, message, channel, fromPdfQrCode };
      const { subject: subj, html } = buildEmailContent("contact_otr", emailData, cfg);
      const resp = await resend.emails.send({
        from: `ORION <noreply@resend.dev>`, to: ["info@elpgreen.com"],
        subject: subj, html, reply_to: email,
      });
      return json({ success: true, ...resp });
    }

    // ── Notify next signer (consolidated from notify-next-signer)
    if (effectiveAction === "notify_next_signer") {
      const lang = language || "pt";
      const subjects: Record<string, string> = { pt: `📝 Sua assinatura é necessária — ${documentName}`, en: `📝 Your signature is required — ${documentName}`, es: `📝 Se requiere su firma — ${documentName}` };
      const signerHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:#0ea5e9;">${lang === "pt" ? "Assinatura Pendente" : "Signature Required"}</h2><p>${lang === "pt" ? `Olá ${nextSignerName}, ${previousSignerName} já assinou o documento "<strong>${documentName}</strong>". Agora é sua vez (${currentSignatureNumber}/${totalSignatures}).` : `Hello ${nextSignerName}, ${previousSignerName} has signed "${documentName}". It's your turn (${currentSignatureNumber}/${totalSignatures}).`}</p><p style="margin:24px 0;"><a href="${signatureLink}" style="background:#0ea5e9;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">${lang === "pt" ? "Assinar Documento" : "Sign Document"}</a></p><hr/><p style="color:#666;font-size:12px;">ORION by ELP Green Technology</p></div>`;
      await resend.emails.send({ from: "ORION Signatures <noreply@resend.dev>", to: [nextSignerEmail], subject: subjects[lang] || subjects.en, html: signerHtml });
      return json({ success: true });
    }

    // ── Notify template submission (consolidated from notify-template-submission)
    if (effectiveAction === "notify_template_submission") {
      const fieldsSummary = Object.entries(fieldValues || {}).map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join("");
      const tmplHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;"><h2 style="color:#0ea5e9;">Nova Submissão de Template</h2><p><strong>Template:</strong> ${templateName} (${templateType})</p><p><strong>ID Documento:</strong> ${documentId || "N/A"}</p>${isSigned ? `<p><strong>✅ Assinado por:</strong> ${signerName} (${signerEmail})</p><p><strong>Hash:</strong> <code>${signatureHash}</code></p><p><strong>Data:</strong> ${signedAt}</p>` : '<p><strong>⏳ Aguardando assinatura</strong></p>'}<h3>Campos Preenchidos:</h3><ul>${fieldsSummary || "<li>Nenhum campo</li>"}</ul><hr/><p style="color:#666;font-size:12px;">ORION by ELP Green Technology</p></div>`;
      await resend.emails.send({ from: "ORION <noreply@resend.dev>", to: ["info@elpgreen.com"], subject: `[Template] ${templateName} — ${isSigned ? "Assinado" : "Pendente"}`, html: tmplHtml });
      return json({ success: true });
    }

    // ── Send signature link (consolidated from send-document-signature-link)
    if (effectiveAction === "send_signature_link") {
      const lang = language || "en";
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const origin = supabaseUrl ? supabaseUrl.replace("supabase.co", "lovable.app").replace("/rest/v1", "") : "";
      const signLink = `${origin}/sign/${documentId}?lang=${lang}`;
      const subjects: Record<string, string> = { pt: `📝 Documento para assinatura — ${documentName}`, en: `📝 Document for signature — ${documentName}`, es: `📝 Documento para firma — ${documentName}` };
      let introText = (!isFirstSigner && firstSignerName) ? (lang === "pt" ? `${firstSignerName} já assinou este documento. Agora é sua vez.` : `${firstSignerName} has already signed this document. It's your turn.`) : (lang === "pt" ? `Você tem um documento "${documentName}" aguardando sua assinatura.` : `You have a document "${documentName}" awaiting your signature.`);
      const linkHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:#0ea5e9;">${lang === "pt" ? "Assinatura Digital" : "Digital Signature"}</h2><p>${lang === "pt" ? "Olá" : "Hello"} ${recipientName},</p><p>${introText}</p>${companyName ? `<p><strong>${lang === "pt" ? "Empresa" : "Company"}:</strong> ${companyName}</p>` : ""}<p style="margin:24px 0;"><a href="${signLink}" style="background:#0ea5e9;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">${lang === "pt" ? "Assinar Documento" : "Sign Document"}</a></p>${requiresMultipleSignatures ? `<p style="color:#666;font-size:13px;">${lang === "pt" ? "Este documento requer múltiplas assinaturas." : "This document requires multiple signatures."}</p>` : ""}<hr/><p style="color:#666;font-size:12px;">ORION by ELP Green Technology</p></div>`;
      await resend.emails.send({ from: "ORION Signatures <noreply@resend.dev>", to: [recipientEmail], subject: subjects[lang] || subjects.en, html: linkHtml });
      return json({ success: true });
    }

    // ── Send marketplace email (consolidated from send-marketplace-email)
    if (effectiveAction === "send_marketplace_email") {
      const lang = language || "en";
      const products = Array.isArray(productsInterest) ? productsInterest.join(", ") : productsInterest || "N/A";
      const subjects: Record<string, string> = { pt: `Marketplace ORION — Registro: ${companyName}`, en: `ORION Marketplace — Registration: ${companyName}`, es: `Marketplace ORION — Registro: ${companyName}` };
      await resend.emails.send({ from: "ORION Marketplace <noreply@resend.dev>", to: ["info@elpgreen.com"], subject: `[Marketplace] Novo registro: ${companyName} (${country})`, html: `<h2>Novo Registro Marketplace</h2><p><strong>Empresa:</strong> ${companyName}</p><p><strong>Contato:</strong> ${contactName} (${email})</p><p><strong>Telefone:</strong> ${phone || "N/A"}</p><p><strong>País:</strong> ${country}</p><p><strong>Tipo:</strong> ${companyType}</p><p><strong>Produtos:</strong> ${products}</p><p><strong>Volume:</strong> ${estimatedVolume || "N/A"}</p><p><strong>Mensagem:</strong> ${message || "N/A"}</p><p><strong>ID:</strong> ${registrationId || "N/A"}</p>` });
      await resend.emails.send({ from: "ORION <noreply@resend.dev>", to: [email], subject: subjects[lang] || subjects.en, html: `<h2>${lang === "pt" ? "Registro Confirmado" : "Registration Confirmed"}</h2><p>${lang === "pt" ? `Olá ${contactName}, recebemos seu registro no Marketplace ORION.` : `Hello ${contactName}, we received your ORION Marketplace registration.`}</p><p>${lang === "pt" ? "Nossa equipe entrará em contato em breve." : "Our team will contact you shortly."}</p><br/><p>ORION by ELP Green Technology</p>` });
      return json({ success: true });
    }

    // ── Send signature confirmation (consolidated from send-signature-confirmation)
    if (effectiveAction === "send_signature_confirmation") {
      const lang = language || "pt";
      const subjects: Record<string, string> = { pt: `✅ Assinatura Confirmada — ${documentName}`, en: `✅ Signature Confirmed — ${documentName}`, es: `✅ Firma Confirmada — ${documentName}` };
      const confHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:#0ea5e9;">${lang === "pt" ? "Assinatura Digital Confirmada" : "Digital Signature Confirmed"}</h2><p><strong>${lang === "pt" ? "Documento" : "Document"}:</strong> ${documentName}</p><p><strong>${lang === "pt" ? "Assinante" : "Signer"}:</strong> ${signerName}</p><p><strong>${lang === "pt" ? "Data" : "Date"}:</strong> ${signedAt}</p><p><strong>${lang === "pt" ? "Tipo" : "Type"}:</strong> ${signatureType}</p><p><strong>Hash:</strong> <code style="font-size:12px">${signatureHash}</code></p><hr/><p style="color:#666;font-size:12px;">ORION by ELP Green Technology — ${lang === "pt" ? "Este documento foi assinado digitalmente" : "This document was digitally signed"}.</p></div>`;
      await resend.emails.send({ from: "ORION Signatures <noreply@resend.dev>", to: [signerEmail], subject: subjects[lang] || subjects.en, html: confHtml });
      await resend.emails.send({ from: "ORION <noreply@resend.dev>", to: ["info@elpgreen.com"], subject: `[Assinatura] ${signerName} assinou: ${documentName}`, html: `<p>${signerName} (${signerEmail}) assinou o documento "${documentName}" em ${signedAt}.</p><p>Hash: ${signatureHash}</p>` });
      return json({ success: true });
    }

    // ── Standard email notification (from send-email-notification)
    if (!to) return json({ success: false, error: "Missing 'to' field" }, 400);

    const { subject: emailSubject, html } = buildEmailContent(effectiveAction || type, data, cfg);

    const emailResponse = await resend.emails.send({
      from: `${cfg.email_remetente_nome} <info@elpgreen.com>`,
      to: [to], subject: emailSubject, html,
    });

    // Create dashboard notifications for advogados
    const notifTypes: Record<string, any> = {
      pro_bono_request: { tipo: "pro_bono", titulo: "Nova solicitação Pro Bono", descricao: `${data?.nome || "Alguém"} enviou uma solicitação.`, link: `/dashboard/clientes` },
      contato_site: { tipo: "contato", titulo: "Nova mensagem do site", descricao: `${data?.nome || "Alguém"} enviou: "${data?.assunto || "Contato"}"`, link: "/dashboard/contatos" },
      novo_cadastro: { tipo: "novo_cadastro", titulo: `Novo cliente: ${data?.nome || "Cliente"}`, descricao: `${data?.nome || "Cliente"} se cadastrou.`, link: "/dashboard/clientes" },
    };

    if (notifTypes[effectiveAction]) {
      try {
        const { data: advogados } = await supabase.from("user_roles").select("user_id").eq("role", "advogado");
        if (advogados?.length) {
          const notif = notifTypes[effectiveAction];
          await supabase.from("notificacoes").insert(
            advogados.map((adv: any) => ({ user_id: adv.user_id, ...notif }))
          );
        }
      } catch (e) { console.warn("Dashboard notification failed:", e); }
    }

    return json({ success: true, emailId: emailResponse.data?.id });
  } catch (error: any) {
    console.error("Notifications error:", error);
    return json({ success: false, error: "Erro ao processar solicitação" }, 500);
  }
});
