import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, acesso-signature, acesso-delivery-id",
};

// ═══════════════════════════════════════════════════════════════
// OAB CNA (Public SOAP - NO KEY REQUIRED)
// ═══════════════════════════════════════════════════════════════

const OAB_CNA_ENDPOINT = "https://www5.oab.org.br/cnaws/service.asmx";

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function buildSoapEnvelope(method: string, params: Record<string, string>): string {
  const paramXml = Object.entries(params).map(([k, v]) => `<${k}>${escapeXml(v)}</${k}>`).join("");
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method} xmlns="http://tempuri.org/">${paramXml}</${method}>
  </soap:Body>
</soap:Envelope>`;
}

function parseXmlValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function parseAdvogadoXml(xmlResult: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const fieldNames = ["Nome", "Inscricao", "UF", "Situacao", "TipoInscricao", "DataInscricao", "SubSecional", "Sociedade", "Email", "Endereco", "Telefone", "CPF", "DataNascimento", "Naturalidade", "NumeroSeguranca"];
  for (const field of fieldNames) {
    const value = parseXmlValue(xmlResult, field);
    if (value && value !== "string" && !value.includes("xmlns")) {
      fields[field.toLowerCase()] = value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/<[^>]*>/g, "").trim();
    }
  }
  return fields;
}

async function consultaAdvogadoOAB(params: { inscricao?: string; uf?: string; nome?: string; cpf?: string }) {
  try {
    let soapAction: string, soapBody: string;
    if (params.cpf) {
      soapAction = "http://tempuri.org/ConsultaAdvogadoPorCpf";
      soapBody = buildSoapEnvelope("ConsultaAdvogadoPorCpf", { cpf: params.cpf });
    } else {
      soapAction = "http://tempuri.org/ConsultaAdvogado";
      soapBody = buildSoapEnvelope("ConsultaAdvogado", { inscricao: params.inscricao || "", uf: params.uf || "", nome: params.nome || "" });
    }

    const response = await fetch(OAB_CNA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: soapAction },
      body: soapBody,
      signal: AbortSignal.timeout(15000),
    });

    const text = await response.text();
    if (!response.ok) return { success: false, error: `CNA HTTP ${response.status}: ${text.substring(0, 300)}` };

    const resultTag = params.cpf ? "ConsultaAdvogadoPorCpfResult" : "ConsultaAdvogadoResult";
    const xmlResult = parseXmlValue(text, resultTag);
    if (!xmlResult || xmlResult.includes("Nenhum registro")) return { success: false, error: "Nenhum advogado encontrado." };

    const decoded = xmlResult.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    return { success: true, data: parseAdvogadoXml(decoded), rawXml: decoded.substring(0, 2000) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro CNA" };
  }
}

async function indexOabResult(supabase: ReturnType<typeof createClient>, advogado: Record<string, string>, userId: string) {
  try {
    const content = Object.entries(advogado).map(([k, v]) => `${k}: ${v}`).join("\n");
    await supabase.from("neural_knowledge_base").upsert({
      title: `OAB ${advogado.uf || ""} ${advogado.inscricao || ""} - ${advogado.nome || "Advogado"}`,
      content: `Cadastro Nacional dos Advogados (CNA/OAB)\n${content}`,
      source_type: "oab_cna",
      source_reference: `OAB/${advogado.uf || ""}/${advogado.inscricao || ""}`,
      tags: ["oab", "advogado", "cna", (advogado.uf || "").toLowerCase(), (advogado.situacao || "").toLowerCase()].filter(Boolean),
      user_id: userId,
      is_processed: false,
    }, { onConflict: "source_reference,user_id" });
    return true;
  } catch { return false; }
}

// ═══════════════════════════════════════════════════════════════
// AcessoRH MOCK DATA (Open Source JSON - sem chave necessária)
// ═══════════════════════════════════════════════════════════════

const MOCK_ORGANIZATION = [
  {
    name: "ORION IA by ELP",
    accounts: [
      { uid: "acc-001", name: "Escritório Principal", customFields: { cnpj: "12.345.678/0001-90", responsavel: "[Nome do Advogado]" } },
      { uid: "acc-002", name: "Filial São Paulo", customFields: { cnpj: "12.345.678/0002-71", responsavel: "Associado SP" } }
    ],
  }
];

const MOCK_ROLES = [
  { acc: "acc-001", code: "ADV-SR", id: "role-001", name: "Advogado Sênior", context: { brazil: { cbo: "2411-05", escolaridadeMinima: "superior_completo" } } },
  { acc: "acc-001", code: "ADV-JR", id: "role-002", name: "Advogado Júnior", context: { brazil: { cbo: "2411-05", escolaridadeMinima: "superior_completo" } } },
  { acc: "acc-001", code: "EST", id: "role-003", name: "Estagiário de Direito", context: { brazil: { cbo: "3519-05", escolaridadeMinima: "superior_incompleto" } } },
  { acc: "acc-001", code: "SEC", id: "role-004", name: "Secretária Jurídica", context: { brazil: { cbo: "4110-10", escolaridadeMinima: "medio_completo" } } },
  { acc: "acc-001", code: "PARA", id: "role-005", name: "Paralegal", context: { brazil: { cbo: "3519-05", escolaridadeMinima: "superior_incompleto" } } },
  { acc: "acc-002", code: "ADV-PL", id: "role-006", name: "Advogado Pleno", context: { brazil: { cbo: "2411-05", escolaridadeMinima: "superior_completo" } } }
];

const MOCK_DEPARTMENTS = [
  { acc: "acc-001", code: "JUR-CIV", id: "dept-001", name: "Direito Civil" },
  { acc: "acc-001", code: "JUR-TRAB", id: "dept-002", name: "Direito Trabalhista" },
  { acc: "acc-001", code: "JUR-TRIB", id: "dept-003", name: "Direito Tributário" },
  { acc: "acc-001", code: "JUR-PEN", id: "dept-004", name: "Direito Penal" },
  { acc: "acc-001", code: "JUR-ADM", id: "dept-005", name: "Direito Administrativo" },
  { acc: "acc-001", code: "ADM", id: "dept-006", name: "Administrativo" },
  { acc: "acc-002", code: "JUR-EMP", id: "dept-007", name: "Direito Empresarial" },
  { acc: "acc-002", code: "JUR-CONS", id: "dept-008", name: "Direito do Consumidor" }
];

const MOCK_BENEFITS = [
  { id: "ben-001", category: "saude", name: "Plano de Saúde Unimed", description: "Plano empresarial Unimed Nacional", valor: 850.00, ativo: true },
  { id: "ben-002", category: "saude", name: "Plano Odontológico", description: "Odontoprev Empresarial", valor: 120.00, ativo: true },
  { id: "ben-003", category: "alimentacao", name: "Vale Refeição", description: "Sodexo - R$45/dia útil", valor: 990.00, ativo: true },
  { id: "ben-004", category: "alimentacao", name: "Vale Alimentação", description: "Alelo Alimentação", valor: 600.00, ativo: true },
  { id: "ben-005", category: "transporte", name: "Vale Transporte", description: "6% desconto legal", valor: 440.00, ativo: true },
  { id: "ben-006", category: "educacao", name: "Auxílio Educação", description: "Cursos de pós-graduação e especializações jurídicas", valor: 1500.00, ativo: true },
  { id: "ben-007", category: "seguro", name: "Seguro de Vida", description: "Seguro de vida em grupo - 24x salário", valor: 85.00, ativo: true }
];

const MOCK_POSITIONS = [
  {
    id: "pos-001", status: "pending", created: "2026-01-15T10:00:00Z",
    cargo: "Advogado Pleno - Direito Civil", departamento: "Direito Civil",
    salario: { valor: 12000, recorrencia: "mensalista" }, vinculo: "clt",
    requisitos: "OAB ativa, 3+ anos de experiência em contencioso cível",
  },
  {
    id: "pos-002", status: "review", created: "2026-01-20T14:30:00Z",
    cargo: "Estagiário de Direito", departamento: "Direito Trabalhista",
    salario: { valor: 1800, recorrencia: "mensalista" }, vinculo: "estagio",
    requisitos: "Cursando a partir do 5º período de Direito",
  },
  {
    id: "pos-003", status: "completed", created: "2025-12-01T09:00:00Z",
    cargo: "Paralegal", departamento: "Administrativo",
    salario: { valor: 5500, recorrencia: "mensalista" }, vinculo: "clt",
    requisitos: "Experiência em rotina jurídica, organização de processos",
  }
];

const MOCK_ATTACHMENTS = [
  { id: "att-001", name: "Contrato Social.pdf", type: "application/pdf", size: 245000, created: "2026-01-10T08:00:00Z" },
  { id: "att-002", name: "Procuração.pdf", type: "application/pdf", size: 120000, created: "2026-01-12T10:30:00Z" },
  { id: "att-003", name: "CNPJ Comprovante.pdf", type: "application/pdf", size: 98000, created: "2026-01-05T14:00:00Z" }
];

const MOCK_MODELS = [
  { id: "mod-001", type: "admissao", name: "Carta de Admissão Padrão", account: "acc-001" },
  { id: "mod-002", type: "demissao", name: "Carta de Demissão", account: "acc-001" },
  { id: "mod-003", type: "advertencia", name: "Carta de Advertência", account: "acc-001" },
  { id: "mod-004", type: "ferias", name: "Aviso de Férias", account: "acc-001" }
];

const MOCK_IBGE: Record<string, Record<string, string>> = {
  RJ: { "Rio de Janeiro": "3304557", "Niterói": "3303302", "Petrópolis": "3303906", "Nova Iguaçu": "3303500", "Duque de Caxias": "3301702" },
  SP: { "São Paulo": "3550308", "Campinas": "3509502", "Santos": "3548500", "Guarulhos": "3518800", "Osasco": "3534401" },
  MG: { "Belo Horizonte": "3106200", "Uberlândia": "3170206", "Juiz de Fora": "3136702", "Contagem": "3118601" },
  DF: { "Brasília": "5300108" },
  BA: { "Salvador": "2927408", "Feira de Santana": "2910800" },
  RS: { "Porto Alegre": "4314902", "Caxias do Sul": "4305108" },
  PR: { "Curitiba": "4106902", "Londrina": "4113700", "Maringá": "4115200" },
  SC: { "Florianópolis": "4205407", "Joinville": "4209102" },
  PE: { "Recife": "2611606" },
  CE: { "Fortaleza": "2304400" },
  GO: { "Goiânia": "5208707" },
  PA: { "Belém": "1501402" },
  AM: { "Manaus": "1302603" },
  ES: { "Vitória": "3205309" },
  MA: { "São Luís": "2111300" },
};

// ─── Webhook signature verification ───

async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
    return computed === signature;
  } catch { return false; }
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const url = new URL(req.url);

    // ─── Webhook callback receiver (no auth required) ───
    if (url.searchParams.get("webhook") === "acessorh") {
      const rawBody = await req.text();
      console.log("[AcessoRH Webhook] Received");

      const webhookSecret = Deno.env.get("ACESSORH_WEBHOOK_SECRET");
      const signature = req.headers.get("acesso-signature");
      if (webhookSecret && signature) {
        const valid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
        if (!valid) return json({ error: "Invalid signature" }, 401);
      }

      let webhookBody;
      try { webhookBody = JSON.parse(rawBody); } catch { webhookBody = { raw: rawBody.substring(0, 5000) }; }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      await supabase.from("neural_learning_data").insert({
        input_text: JSON.stringify(webhookBody).substring(0, 5000),
        interaction_type: "acessorh_webhook",
        output_text: webhookBody.event || webhookBody.type || "unknown",
        metadata: { source: "acessorh", event: webhookBody.event, deliveryId: req.headers.get("acesso-delivery-id") },
      });

      return json({ received: true });
    }

    // ─── Auth check ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
    if (authError || !user) return json({ error: "Sessão inválida" }, 401);

    const body = await req.json();
    const { action } = body;

    // ═══════════════════════════════════════
    // OAB CNA (PUBLIC SOAP - SEM CHAVE)
    // ═══════════════════════════════════════

    if (action === "consulta_oab") {
      const { inscricao, uf, nome, cpf } = body;
      const result = await consultaAdvogadoOAB({ inscricao, uf, nome, cpf });
      if (result.success && result.data) await indexOabResult(supabase, result.data, user.id);
      return json(result);
    }

    // ═══════════════════════════════════════
    // ORGANIZAÇÃO (mock JSON)
    // ═══════════════════════════════════════

    if (action === "acessorh_organization") {
      return json({ success: true, data: MOCK_ORGANIZATION });
    }

    // ═══════════════════════════════════════
    // CARGOS / ROLES (mock JSON)
    // ═══════════════════════════════════════

    if (action === "acessorh_create_role") {
      const { accountUid, roleData } = body;
      const newRole = { acc: accountUid, code: roleData.code, id: `role-${Date.now()}`, name: roleData.name, context: roleData.context || {} };
      return json({ success: true, data: newRole });
    }

    if (action === "acessorh_list_roles") {
      const { accountUid, limit, skip, code } = body;
      let roles = MOCK_ROLES.filter((r) => r.acc === (accountUid || "acc-001"));
      if (code) roles = roles.filter((r) => r.code === code);
      const s = skip || 0;
      const l = limit || 50;
      return json({ success: true, data: roles.slice(s, s + l) });
    }

    if (action === "acessorh_delete_role") {
      return json({ success: true, data: { deleted: true, roleUid: body.roleUid } });
    }

    // ═══════════════════════════════════════
    // DEPARTAMENTOS (mock JSON)
    // ═══════════════════════════════════════

    if (action === "acessorh_create_department") {
      const { accountUid, departmentData } = body;
      const newDept = { acc: accountUid, code: departmentData.code, id: `dept-${Date.now()}`, name: departmentData.name };
      return json({ success: true, data: newDept });
    }

    if (action === "acessorh_list_departments") {
      const { accountUid, limit, skip, code } = body;
      let depts = MOCK_DEPARTMENTS.filter((d) => d.acc === (accountUid || "acc-001"));
      if (code) depts = depts.filter((d) => d.code === code);
      const s = skip || 0;
      const l = limit || 50;
      return json({ success: true, data: depts.slice(s, s + l) });
    }

    if (action === "acessorh_delete_department") {
      return json({ success: true, data: { deleted: true, departmentUid: body.departmentUid } });
    }

    // ═══════════════════════════════════════
    // POSIÇÕES (mock JSON)
    // ═══════════════════════════════════════

    if (action === "acessorh_create_position") {
      const newPos = { id: `pos-${Date.now()}`, status: "pending", created: new Date().toISOString(), ...body.positionData };
      return json({ success: true, data: newPos });
    }

    if (action === "acessorh_export_positions") {
      return json({ success: true, data: MOCK_POSITIONS });
    }

    if (action === "acessorh_get_position") {
      const pos = MOCK_POSITIONS.find((p) => p.id === body.positionId) || MOCK_POSITIONS[0];
      return json({ success: true, data: pos });
    }

    // ═══════════════════════════════════════
    // BENEFÍCIOS (mock JSON)
    // ═══════════════════════════════════════

    if (action === "acessorh_list_benefits") {
      const { category, limit, skip } = body;
      let benefits = [...MOCK_BENEFITS];
      if (category) benefits = benefits.filter((b) => b.category === category);
      const s = skip || 0;
      const l = limit || 50;
      return json({ success: true, data: benefits.slice(s, s + l) });
    }

    // ═══════════════════════════════════════
    // ARQUIVOS (mock JSON)
    // ═══════════════════════════════════════

    if (action === "acessorh_upload_file") {
      return json({ success: true, data: { path: `/uploads/${body.fileName || "file.pdf"}`, size: body.fileBase64?.length || 0, uploaded: new Date().toISOString() } });
    }

    if (action === "acessorh_download_file") {
      return json({ success: true, data: { path: body.filePath, content: "Mock file content (base64 simulado)", mimeType: "application/pdf" } });
    }

    // ═══════════════════════════════════════
    // ANEXOS (mock JSON)
    // ═══════════════════════════════════════

    if (action === "acessorh_list_attachments") {
      const { limit, skip } = body;
      const s = skip || 0;
      const l = limit || 50;
      return json({ success: true, data: MOCK_ATTACHMENTS.slice(s, s + l) });
    }

    // ═══════════════════════════════════════
    // MODELOS DE CARTA (mock JSON)
    // ═══════════════════════════════════════

    if (action === "acessorh_list_models") {
      const { type, limit, skip } = body;
      let models = [...MOCK_MODELS];
      if (type) models = models.filter((m) => m.type === type);
      const s = skip || 0;
      const l = limit || 50;
      return json({ success: true, data: models.slice(s, s + l) });
    }

    // ═══════════════════════════════════════
    // IBGE (mock JSON open source)
    // ═══════════════════════════════════════

    if (action === "acessorh_ibge_code") {
      const { uf, city } = body;
      const ufData = MOCK_IBGE[uf?.toUpperCase()] || {};
      const code = city ? ufData[city] || null : null;
      if (code) return json({ success: true, data: { uf, city, ibgeCode: code } });
      // If not in mock, return all cities for that UF
      return json({ success: true, data: { uf, cities: Object.entries(ufData).map(([c, code]) => ({ city: c, ibgeCode: code })) } });
    }

    // ═══════════════════════════════════════
    // WEBHOOKS (mock)
    // ═══════════════════════════════════════

    if (action === "acessorh_create_webhook") {
      const supabaseUrl2 = Deno.env.get("SUPABASE_URL")!;
      const callbackUrl = `${supabaseUrl2}/functions/v1/oab-acessorh?webhook=acessorh`;
      return json({
        success: true,
        data: {
          id: `wh-${Date.now()}`,
          url: callbackUrl,
          events: body.events || ["position-created", "position-applied", "position-completed"],
          authKind: body.authKind || "secret",
          created: new Date().toISOString(),
        },
        callbackUrl,
      });
    }

    if (action === "acessorh_update_webhook") {
      return json({ success: true, data: { updated: true, ...body.webhookData } });
    }

    // ═══════════════════════════════════════
    // DOCUMENTOS ADICIONAIS - Referência
    // ═══════════════════════════════════════

    if (action === "acessorh_oab_doc_info") {
      return json({
        success: true,
        documents: {
          oab: {
            id: "c9e26093-5e0c-4bd2-bea3-ac5182a6179f", slug: "oab", description: "Ordem dos Advogados do Brasil",
            fields: { numero: { type: "string", required: true }, uf: { type: "string", required: true }, dataEmissao: { type: "string", required: true, format: "YYYY-mm-dd" } },
          },
          antecedentes_estadual: { id: "d015d73e-8884-4212-9bcf-72ad95203961", slug: "antecedentes_estadual", description: "Antecedentes criminal estadual" },
          antecedentes_federal: { id: "f815dbd8-a5cc-4845-98c4-a160e2989b98", slug: "antecedentes_federal", description: "Antecedentes criminal federal" },
          carteira_trabalho: { id: "0f98ddee-7bb0-4b32-a849-99d297202a81", slug: "carteira_trabalho", description: "Carteira de Trabalho (CTPS)" },
          receita_federal: { id: "33eebebc-55d5-4c07-8faf-b7f28992930c", slug: "receita_federal", description: "Cadastro na Receita Federal" },
          carta_referencia: { id: "35f15759-737a-4915-a438-c2cebdf7c57a", slug: "carta_referencia", description: "Carta de Referência" },
        },
        enums: {
          vinculo: ["clt", "estagio", "aprendiz", "autonomo", "temporario", "verde-amarelo", "intermitente", "estatuario"],
          recorrencia: ["horista", "mensalista", "aulista", "comissionista", "diarista"],
          banco: ["001", "033", "041", "047", "104", "151", "237", "341", "399", "735", "745", "748", "755"],
          positionStatus: ["pending", "review", "validation", "completed", "archived"],
          escolaridadeMinima: ["analfabeto", "5_ano_fundamental_incompleto", "5_ano_fundamental_completo", "fundamental_completo", "medio_incompleto", "medio_completo", "superior_incompleto", "superior_completo", "pos_graduacao", "mestrado", "doutorado"],
          webhookEvents: ["position-created", "position-applied", "position-completed", "position-archived", "position-declined"],
        },
      });
    }

    // ═══════════════════════════════════════
    // ACTION NOT FOUND
    // ═══════════════════════════════════════

    return json({
      error: "Ação não reconhecida",
      available_actions: {
        oab: ["consulta_oab"],
        organizacao: ["acessorh_organization"],
        cargos: ["acessorh_create_role", "acessorh_list_roles", "acessorh_delete_role"],
        departamentos: ["acessorh_create_department", "acessorh_list_departments", "acessorh_delete_department"],
        posicoes: ["acessorh_create_position", "acessorh_export_positions", "acessorh_get_position"],
        beneficios: ["acessorh_list_benefits"],
        arquivos: ["acessorh_upload_file", "acessorh_download_file"],
        anexos: ["acessorh_list_attachments"],
        modelos: ["acessorh_list_models"],
        ibge: ["acessorh_ibge_code"],
        webhooks: ["acessorh_create_webhook", "acessorh_update_webhook"],
        referencia: ["acessorh_oab_doc_info"],
      },
    }, 400);
  } catch (error) {
    console.error("[OAB/AcessoRH] Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao processar solicitação" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
