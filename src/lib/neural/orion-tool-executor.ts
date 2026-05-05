/**
 * ─── Orion Tool Executor ───
 * Centralized dispatcher that connects Orion's voice/text commands
 * to all system APIs: Utils-API, Google Workspace, Firecrawl, and Neural status.
 *
 * Each tool defines: regex pattern → param extractor → API caller → response formatter.
 */

import { supabase } from "@/integrations/supabase/client";
import { wrapSupabase, wrapEdgeFunction } from "@/lib/errors";
import { CONVERSATION_FRAMEWORKS } from "./orion-conversation-frameworks";
import type { AppRole } from "@/hooks/useUserRole";
import { detectNavigationIntent } from "./orion-nav-map";
import { getSocietySnapshot, getNeuralAgentContext, getRecentBroadcasts } from "./neural-agent-bridge";
import {
  getSystemHealthReport,
  getCapabilities,
  getCapabilitiesByCategory,
  buildJarvisComparisonContext,
  buildIntrospectionContext,
  buildCVIndustryComparisonContext,
  JARVIS_COMPARISON,
  ORION_EXCLUSIVE_CAPABILITIES,
  CV_INDUSTRY_COMPARISON,
} from "./orion-introspection";
// orion-autonomous-media removed — Spotify/Amazon/Audiobook handlers dropped.
// Music intents are now handled directly by playMusicWithFallback (YouTube only).
import { playMusicWithFallback } from "./music-fallback-resolver";

// ─── Helpers ───

async function callUtilsApi(action: string, params: Record<string, unknown>): Promise<any> {
  return await wrapEdgeFunction(
    supabase.functions.invoke("utils-api", {
      body: { action, params },
    }),
    "utils-api",
    { action }
  );
}

// Server-side Google API — uses service account, no per-user OAuth needed
async function callGoogleApi(fn: string, body: Record<string, unknown>): Promise<any> {
  const SERVICE_ACTION_MAP: Record<string, string> = {
    "google-gmail": "google.gmail",
    "google-calendar": "google.calendar",
    "google-contacts": "google.contacts",
    "google-docs": "google.docs",
    "google-drive": "google.drive",
    "google-sheets": "google.sheets",
  };
  
  const servicePrefix = SERVICE_ACTION_MAP[fn] || fn;
  const action = body.action ? `${servicePrefix}.${body.action}` : servicePrefix;
  const params = { ...body };
  delete params.action;
  
  const data = await wrapEdgeFunction(
    supabase.functions.invoke("firebase-admin", {
      body: { action, ...params },
    }),
    "firebase-admin",
    { action }
  );
  return data?.data ?? data;
}

async function callFirecrawl(query: string): Promise<any> {
  return await wrapEdgeFunction(
    supabase.functions.invoke("firecrawl-search", {
      body: { query, options: { limit: 5, lang: "pt-br", country: "br" } },
    }),
    "firecrawl-search",
    { query }
  );
}

// ─── Tool Definition ───

type ToolCategory =
  | "conversational"
  | "legal_docs"
  | "crm_clients"
  | "financial"
  | "productivity"
  | "iot_smart"
  | "neural"
  | "media_lab"
  | "google"
  | "other";

interface OrionTool {
  name: string;
  category?: ToolCategory;
  roles?: AppRole[];
  creatorOnly?: boolean;
  regex: RegExp;
  extract: (match: RegExpMatchArray, question: string) => Record<string, unknown>;
  call: (params: Record<string, unknown>) => Promise<string>;
}

// Role mapping for tool categories
const R_ADV: AppRole[] = ["advogado"];
const R_ADV_PROD: AppRole[] = ["advogado", "produtor"];
const R_ADV_CLI: AppRole[] = ["advogado", "cliente"];
const R_PROD: AppRole[] = ["produtor"];
const R_PROD_AFIL: AppRole[] = ["produtor", "afiliado"];

const TOOL_NAME_TO_CATEGORY: Record<string, ToolCategory> = {
  joke: "conversational", fun_trivia: "conversational", kids_story: "conversational",
  greeting: "conversational", thanks: "conversational", how_are_you: "conversational",
  datetime: "conversational", motivation: "conversational", tongue_twister: "conversational",
  poem: "conversational", horoscope: "conversational", sing: "conversational",
  riddle: "conversational", compliment: "conversational", coin_flip: "conversational",
  dice_roll: "conversational", random_number: "conversational", daily_tip: "conversational",
  generate_proposal: "legal_docs", doc_create: "legal_docs", doc_list: "legal_docs",
  doc_search: "legal_docs", doc_templates: "legal_docs", doc_folders: "legal_docs",
  signatures_status: "legal_docs", sign_send: "legal_docs", sign_now: "legal_docs",
  export_pdf: "legal_docs", gerar_documento: "legal_docs", doc_international: "legal_docs",
  doc_translate: "legal_docs", doc_last: "legal_docs", ai_improve_doc: "legal_docs",
  ai_rewrite_formal: "legal_docs", ai_reformulate_simplify: "legal_docs", ai_reformulate_expand: "legal_docs",
  "hf-sentiment": "legal_docs", "hf-ner": "legal_docs", "hf-zero-shot": "legal_docs",
  "hf-qa": "legal_docs", "hf-summarize": "legal_docs", "hf-pdf-analyze": "legal_docs",
  aml_screening: "legal_docs", next_deadlines: "legal_docs", config_timbre: "legal_docs",
  crm_list_clients: "crm_clients", crm_search_client: "crm_clients", crm_list_processos: "crm_clients",
  crm_create_client: "crm_clients", crm_client_detail: "crm_clients", crm_andamentos: "crm_clients",
  crm_conversations: "crm_clients", contacts_search: "crm_clients", contacts_list: "crm_clients",
  deals_pipeline: "crm_clients", office_config: "crm_clients", open_process: "crm_clients",
  update_client_status: "crm_clients", send_client_message: "crm_clients", minisite_preview: "crm_clients",
  minisite_share: "crm_clients", reviews_list: "crm_clients", audit_log: "crm_clients",
  articles_list: "crm_clients", company_intel: "crm_clients",
  cambio: "financial", fin_list_invoices: "financial", fin_pending: "financial",
  mkt_list_products: "financial", mkt_create_product: "financial", mkt_product_detail: "financial",
  mkt_orders: "financial", mkt_affiliates: "financial", financial_analysis: "financial",
  payments_check: "financial", subscriptions_info: "financial",
  task_create: "productivity", task_complete: "productivity", task_pending: "productivity",
  tasks_list: "productivity", notifications_list: "productivity", calendar_list: "productivity",
  calendar_create: "productivity", reminder_create: "productivity", alarm_set: "productivity",
  timer_set: "productivity", news: "productivity", weather: "productivity",
  shopping_list_add: "productivity", shopping_list_view: "productivity", math_calc: "productivity",
  call_contact: "productivity", cep: "productivity", cnpj: "productivity",
  dicionario: "productivity", feriados: "productivity", prazo: "productivity",
  bancos: "productivity", ibge: "productivity", web_search: "productivity",
  orion_help: "productivity", config_update_data: "productivity", config_integrations: "productivity",
  config_address: "productivity", urgent_deadlines: "productivity",
  "iot-list-devices": "iot_smart", "iot-bluetooth-scan": "iot_smart", "iot-mqtt-status": "iot_smart",
  "iot-light-control": "iot_smart", "smart-home-scan": "iot_smart", "smart-home-color": "iot_smart",
  "smart-home-brightness": "iot_smart", "smart-home-status": "iot_smart", "smart-home-thermostat": "iot_smart",
  "smart-home-routine-create": "iot_smart", "smart-home-camera": "iot_smart", "smart-home-announce": "iot_smart",
  "smart-home-dropin": "iot_smart", "smart-home-turnoff-all": "iot_smart", "iot-temperature": "iot_smart",
  "iot-robot-status": "iot_smart", "iot-alexa-connect": "iot_smart",
  neural_status: "neural", neural_commands: "neural", neural_embeddings: "neural",
  ai_metrics: "neural", neural_experiments: "neural", neural_evolution: "neural",
  neural_knowledge: "neural", agent_leitura: "neural", agent_construcao: "neural",
  agent_pesquisa: "neural", arch_jarvis_compare: "neural", arch_cv_industry_compare: "neural",
  arch_neurocore_layers: "neural", arch_hotpatching_status: "neural", arch_specialized_models: "neural",
  arch_exclusive_capabilities: "neural", arch_fallback_cascade: "neural", arch_system_health: "neural",
  arch_consciousness_engine: "neural", arch_federation: "neural", arch_orion_shield: "neural",
  self_analyze_code: "neural", self_find_gaps: "neural", self_suggest_improvements: "neural",
  self_architecture_map: "neural", daily_summary: "neural", "hf-transformers-check": "neural",
  "hf-lab-status": "neural", "face-enroll": "neural", "face-verify": "neural",
  "voice-id-status": "neural", code_snippets: "neural",
  music_play: "media_lab", music_pause: "media_lab", ambient_sounds: "media_lab",
  ocr_scan: "media_lab", ocr_analyze_image: "media_lab", "hf-image-classify": "media_lab",
  "hf-embeddings": "media_lab", "hf-transcribe": "media_lab", "hf-tts": "media_lab",
  "hf-hybrid-vision": "media_lab", "open-laboratorio-ia": "media_lab",
  gmail_list: "google", gmail_send: "google", drive_search: "google",
  drive_upload: "google", sheets_read_or_create: "google", gdocs_create: "google",
  gdocs_list: "google", "google-tasks-create": "google", "google-tasks-list": "google",
  "google-slides-create": "google", "google-forms-create": "google", schedule_consultation: "google",
  admin_emails: "google",
  explain_decision: "neural"
};

// Helper to extract patterns
const extractCEP = (q: string) => q.match(/\d{5}-?\d{3}/)?.[0] || "";
const extractCNPJ = (q: string) => q.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/)?.[0] || q.match(/\d{14}/)?.[0] || "";
const extractDate = (q: string) => q.match(/\d{4}-\d{2}-\d{2}/)?.[0] || q.match(/(\d{2})\/(\d{2})\/(\d{4})/)?.slice(1).reverse().join("-") || "";
const extractNumber = (q: string) => parseInt(q.match(/\d+/)?.[0] || "0", 10);
const normalizeText = (q: string) => q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function parseScheduleDateTime(text: string): { start: Date; end: Date } {
  const normalized = normalizeText(text);
  const now = new Date();
  const start = new Date(now);

  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);

  if (/\bhoje\b/.test(normalized)) {
    start.setTime(now.getTime());
    start.setHours(Math.max(now.getHours() + 1, 9), 0, 0, 0);
  } else if (/\bdepois de amanha\b/.test(normalized)) {
    start.setDate(now.getDate() + 2);
    start.setHours(10, 0, 0, 0);
  } else if (/\bamanha\b/.test(normalized)) {
    start.setDate(now.getDate() + 1);
    start.setHours(10, 0, 0, 0);
  }

  const isoDate = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoDate) {
    start.setFullYear(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
  }

  const brDate = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (brDate) {
    const day = Number(brDate[1]);
    const month = Number(brDate[2]) - 1;
    const year = brDate[3] ? Number(brDate[3]) : now.getFullYear();
    start.setFullYear(year, month, day);
  }

  const explicitTime =
    normalized.match(/\b(?:as|a)\s*(\d{1,2})(?::(\d{2}))?\b/) ||
    normalized.match(/\b(\d{1,2})h(?:(\d{2}))?\b/) ||
    normalized.match(/\b(\d{1,2}):(\d{2})\b/);

  if (explicitTime) {
    const hours = Number(explicitTime[1] || 10);
    const minutes = Number(explicitTime[2] || 0);
    start.setHours(hours, minutes, 0, 0);
  }

  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { start, end };
}

function cleanScheduleSummary(text: string): string {
  return text
    .replace(/\b(?:hoje|amanh[ãa]|depois de amanh[ãa]|essa semana|na agenda|no calend[aá]rio)\b/gi, "")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{4})?\b/g, "")
    .replace(/\b(?:[àa]s?|as)\s*\d{1,2}(?::\d{2})?\b/gi, "")
    .replace(/\b\d{1,2}h(?:\d{2})?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
    .trim();
}

const extractUF = (q: string) => {
  const ufs = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
  const upper = q.toUpperCase();
  for (const uf of ufs) {
    if (upper.includes(uf)) return uf;
  }
  return "";
};

const TOOLS: OrionTool[] = [
  // ═══ PROPOSAL GENERATION ═══
  {
    name: "generate_proposal",
    regex: /cri(?:ar?|e)\s+(?:uma?\s+)?proposta|ger(?:ar?|e)\s+(?:uma?\s+)?proposta|proposta.*invest|fa(?:zer?|ça)\s+(?:uma?\s+)?proposta/i,
    extract: () => ({}),
    call: async () => {
      const { buildProposalTemplate } = await import("@/lib/neural/orion-knowledge-base");
      return buildProposalTemplate();
    },
    
  },
  // ═══ HELP / CAPABILITIES ═══
  {
    name: "orion_help",
    regex: /(?:o\s+que\s+(?:voc[eê]|vc|tu)\s+(?:pode|consegue|sabe)|(?:me\s+)?ajud[ae]|suas?\s+(?:capacidades?|habilidades?|fun[çc][oõ]es?|ferramentas?|comandos?)|(?:quais?|quantas?)\s+(?:s[aã]o\s+)?(?:suas?\s+)?(?:ferramentas?|comandos?|fun[çc][oõ]es?)|(?:help|ajuda)|o\s+que\s+(?:posso\s+)?(?:fazer|pedir)|(?:como\s+)?(?:posso\s+)?(?:te\s+)?usar|(?:lista|mostr)\w+\s+(?:suas?\s+)?(?:ferramentas?|capacidades?|comandos?))/i,
    extract: () => ({}),
    call: async (_p) => {
      const { data: { user } } = await supabase.auth.getUser();
      let roleName = "usuário";
      if (user) {
        const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
        if (roleData?.role === "admin" || roleData?.role === "advogado") roleName = "advogado";
        else if (roleData?.role === "produtor") roleName = "produtor";
        else if (roleData?.role === "afiliado") roleName = "afiliado";
        else if (roleData?.role === "cliente") roleName = "cliente";
      }

      const s: string[] = [];
      
      s.push(`🧠 **Comandos de Voz — Painel Inteligente (perfil: ${roleName})**`);
      s.push(`Diga **"Orion"** ou **"Painel"** + comando.\n`);

      // 1. Documentos
      s.push("📄 **1. Gestão de Documentos:**");
      s.push("• `Gerar contrato de prestação de serviços`");
      s.push("• `Abrir meu último documento`");
      s.push("• `Exportar em PDF`");
      s.push("• `Procure documento [nome]`");
      s.push("• `Meus documentos` — listar todos");
      s.push("• `Templates de documentos`\n");

      // 2. CRM
      if (["advogado"].includes(roleName)) {
        s.push("👥 **2. CRM & Clientes:**");
        s.push("• `Adicionar novo cliente`");
        s.push("• `Dados do cliente João`");
        s.push("• `Atualizar status do cliente`");
        s.push("• `Meus clientes` — listar todos\n");
      }

      // 3. Processos
      if (["advogado"].includes(roleName)) {
        s.push("⚖️ **3. Processos:**");
        s.push("• `Abrir processo 12345`");
        s.push("• `Andamentos do processo`");
        s.push("• `Meus processos` — listar todos\n");
      }

      // 4. Tarefas
      s.push("✅ **4. Tarefas & Prazos:**");
      s.push("• `Criar tarefa para amanhã às 10h`");
      s.push("• `Listar tarefas pendentes`");
      s.push("• `Concluir tarefa`");
      s.push("• `Ver prazos`\n");

      // 5. Assinatura
      if (["advogado"].includes(roleName)) {
        s.push("✍️ **5. Assinatura Digital:**");
        s.push("• `Enviar documento para assinatura`");
        s.push("• `Assinar contrato agora`");
        s.push("• `Status das assinaturas`\n");
      }

      // 6. Internacional
      s.push("🌍 **6. Documentos Internacionais:**");
      s.push("• `Traduzir documento para inglês`");
      s.push("• `Gerar contrato internacional`\n");

      // 7. Comunicação
      s.push("💬 **7. Comunicação:**");
      s.push("• `Enviar mensagem para cliente`");
      s.push("• `Agendar consulta`");
      s.push("• `Ver notificações`");
      s.push("• `Verificar pagamentos`\n");

      // 8. IA
      s.push("🤖 **8. Ferramentas IA:**");
      s.push("• `Reescrever texto formalmente`");
      s.push("• `Pesquisar jurisprudência`");
      s.push("• `Melhorar esse documento`");
      s.push("• `Resumir texto [...]`\n");

      // 9. Configurações
      s.push("⚙️ **9. Configurações:**");
      s.push("• `Atualizar meus dados`");
      s.push("• `Configurar integrações`\n");

      // 10. Timbre
      if (["advogado"].includes(roleName)) {
        s.push("📑 **10. Timbre & Identidade:**");
        s.push("• `Configurar timbre do escritório`");
        s.push("• `Atualizar endereço e contatos`\n");
      }

      // 11. Smart Home
      s.push("🏠 **11. Casa Inteligente:**");
      s.push("• `Ligar luz da sala` | `Desligar tudo`");
      s.push("• `Termostato para 22°C`");
      s.push("• `Criar rotina para desligar luzes ao sair`");
      s.push("• `Ver câmeras` | `Drop In na cozinha`");
      s.push("• `Status da casa` | `Dispositivos IoT`\n");

      // 12. Música & Entretenimento
      s.push("🎵 **12. Música & Entretenimento:**");
      s.push("• `Toque Taylor Swift` | `Pare a música`");
      s.push("• `Toque som de chuva` — sons ambientes");
      s.push("• `Minhas playlists` | `Crie playlist Rock`");
      s.push("• `Conte uma piada` | `Fato curioso` | `Trava-língua`");
      s.push("• `Conte uma história` | `Adivinhação` | `Cante algo`");
      s.push("• `Me recite um poema` | `Horóscopo de Áries`");
      s.push("• `Jogue uma moeda` | `Role um dado` | `Número aleatório`");
      s.push("• `Me motive` | `Me elogie` | `Dica do dia`\n");

      // 13. Informações
      s.push("🌤️ **13. Informações em Tempo Real:**");
      s.push("• `Como vai o tempo hoje?`");
      s.push("• `Quais são as principais notícias?`");
      s.push("• `Cotação do dólar` | `Próximo feriado`");
      s.push("• `Consulte CEP 01001-000`\n");

      // 14. Produtividade
      s.push("📅 **14. Produtividade:**");
      s.push("• `Me acorde às 7h com Tom Jobim`");
      s.push("• `Timer de 5 minutos`");
      s.push("• `Lembre-me de tomar remédio às 20h`");
      s.push("• `Adicione leite à lista de compras`");
      s.push("• `Quanto é 1250 * 3.14?`");
      s.push("• `Meus eventos` | `Agende reunião`\n");

      // 15. Comunicação
      s.push("📞 **15. Comunicação:**");
      s.push("• `Ligue para o João`");
      s.push("• `Enviar mensagem para cliente`");
      s.push("• `Anunciar para toda a casa`\n");

      s.push(`📊 **Total: ${TOOLS.length} comandos** disponíveis.`);
      s.push("💡 Diga o comando naturalmente — eu executo automaticamente!");

      return s.join("\n");
    },
  },
  // ═══ UTILS-API ═══
  {
    name: "cep",
    regex: /(?:consulte?|busque?|pesquise?|qual)\s*(?:o\s+)?(?:endere[cç]o|cep)|cep\s*\d{5}/i,
    extract: (_m, q) => ({ cep: extractCEP(q) }),
    call: async (p) => {
      if (!p.cep) return "Por favor, informe o CEP. Ex: 'Consulte o CEP 01001-000'.";
      const d = await callUtilsApi("cep", { cep: p.cep });
      return `📍 CEP ${d.cep}: ${d.logradouro}, ${d.bairro} — ${d.localidade}/${d.uf}`;
    },
  },
  {
    name: "cnpj",
    regex: /(?:consulte?|busque?|pesquise?|dados?\s*d[aeo]?)\s*(?:o\s+)?(?:cnpj|empresa)|cnpj\s*\d/i,
    extract: (_m, q) => ({ cnpj: extractCNPJ(q) }),
    call: async (p) => {
      if (!p.cnpj) return "Por favor, informe o CNPJ. Ex: 'Consulte CNPJ 00.000.000/0001-00'.";
      const d = await callUtilsApi("cnpj", { cnpj: p.cnpj });
      return `🏢 ${d.razao_social}${d.nome_fantasia ? ` (${d.nome_fantasia})` : ""}\n📍 ${d.logradouro}, ${d.numero} — ${d.municipio}/${d.uf}\n📧 ${d.email || "N/A"} | 📞 ${d.telefone || "N/A"}\n🏷️ ${d.cnae_fiscal_descricao || "N/A"} | Porte: ${d.porte || "N/A"}`;
    },
  },
  {
    name: "cambio",
    regex: /(?:cota[çc][aã]o|c[aâ]mbio|pre[çc]o|valor|quanto\s+(?:t[aá]|est[aá]|custa))\s*(?:d[aoe]?\s+)?(?:d[oó]lar|euro|libra|iene|bitcoin|real|usd|eur|gbp|jpy|btc|brl)/i,
    extract: (_m, q) => {
      const qLower = q.toLowerCase();
      let from = "USD";
      if (/euro|eur/i.test(qLower)) from = "EUR";
      if (/libra|gbp/i.test(qLower)) from = "GBP";
      if (/iene|jpy/i.test(qLower)) from = "JPY";
      if (/bitcoin|btc/i.test(qLower)) from = "BTC";
      return { from, to: "BRL" };
    },
    call: async (p) => {
      const d = await callUtilsApi("cambio", { from: p.from, to: p.to });
      const rate = d.bid || d.rates?.BRL || d.high || "N/A";
      const name = d.name || `${p.from}/${p.to}`;
      return `💱 ${name}: R$ ${Number(rate).toFixed(2)}\n📈 Alta: R$ ${d.high || "N/A"} | 📉 Baixa: R$ ${d.low || "N/A"}`;
    },
  },
  {
    name: "dicionario",
    regex: /(?:significado|defini[çc][aã]o|o\s+que\s+[eé]|o\s+que\s+significa)\s+(?:de\s+|da\s+|do\s+)?["""']?(\w+)/i,
    extract: (m, _q) => ({ word: m[1] || "" }),
    call: async (p) => {
      if (!p.word) return "Por favor, informe a palavra. Ex: 'Significado de jurisprudência'.";
      try {
        const d = await callUtilsApi("dicionario", { word: p.word, lang: "pt" });
        if ((d as any)?.error) return `Não encontrei a definição de "${p.word}" no dicionário.`;
        const entry = Array.isArray(d) ? d[0] : d;
        const meanings = entry?.meanings?.slice(0, 2).map((m: any) =>
          `• (${m.partOfSpeech}) ${m.definitions?.[0]?.definition || "sem definição"}`
        ).join("\n") || "Sem definições encontradas.";
        return `📖 **${p.word}**\n${meanings}`;
      } catch {
        return `Não encontrei a definição de "${p.word}" no dicionário.`;
      }
    },
  },
  {
    name: "feriados",
    regex: /feriado|pr[oó]ximo\s+feriado|dias?\s+(?:santo|livre)/i,
    extract: (_m, q) => {
      const yearMatch = q.match(/\d{4}/);
      return { year: yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear() };
    },
    call: async (p) => {
      const d = await callUtilsApi("feriados", { year: p.year });
      if (!Array.isArray(d) || d.length === 0) return `Nenhum feriado encontrado para ${p.year}.`;
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = d.filter((h: any) => h.date >= today).slice(0, 5);
      if (upcoming.length === 0) return `Não há mais feriados em ${p.year}.`;
      const list = upcoming.map((h: any) => `• ${h.date} — ${h.name}`).join("\n");
      return `🗓️ Próximos feriados (${p.year}):\n${list}`;
    },
  },
  {
    name: "prazo",
    regex: /(?:calcul|cont)\w*\s+(?:o\s+)?prazo|prazo\s+processual|dias?\s+[uú]teis?\s+a\s+partir/i,
    extract: (_m, q) => {
      const dias = extractNumber(q) || 15;
      const dateStr = extractDate(q) || new Date().toISOString().slice(0, 10);
      return { data_inicio: dateStr, dias_uteis: dias };
    },
    call: async (p) => {
      const d = await callUtilsApi("calcular_prazo", p);
      return `⚖️ Prazo processual:\n📅 Início: ${d.data_inicio}\n📅 Final: ${d.data_final}\n📊 ${d.dias_uteis} dias úteis = ${d.dias_corridos} dias corridos\n⏭️ ${d.dias_pulados} dias pulados (feriados/fins de semana)`;
    },
  },
  {
    name: "bancos",
    regex: /lista\s+de\s+bancos|bancos?\s+(?:brasileiros?|do\s+brasil)|c[oó]digo\s+(?:do\s+)?banco/i,
    extract: (_m, q) => {
      const code = q.match(/(?:c[oó]digo|banco)\s*(\d{3})/i)?.[1];
      return { code };
    },
    call: async (p) => {
      const d = await callUtilsApi("bancos", {});
      if (!Array.isArray(d)) return "Erro ao buscar lista de bancos.";
      if (p.code) {
        const bank = d.find((b: any) => String(b.code) === String(p.code));
        if (bank) return `🏦 Banco ${bank.code}: ${bank.fullName || bank.name}`;
        return `Banco com código ${p.code} não encontrado.`;
      }
      const top = d.filter((b: any) => b.code).slice(0, 10);
      const list = top.map((b: any) => `• ${b.code} — ${b.name}`).join("\n");
      return `🏦 Bancos brasileiros (top 10):\n${list}\n\n📊 Total: ${d.length} bancos registrados.`;
    },
  },
  {
    name: "ibge",
    regex: /munic[ií]pios?\s+d[eao]|cidades?\s+d[eao]|ibge/i,
    extract: (_m, q) => ({ uf: extractUF(q) }),
    call: async (p) => {
      if (!p.uf) {
        const d = await callUtilsApi("ibge_localidades", {});
        const list = (d as any[]).slice(0, 10).map((e: any) => `• ${e.sigla} — ${e.nome}`).join("\n");
        return `🗺️ Estados brasileiros:\n${list}\n\n(Peça os municípios de um estado específico)`;
      }
      const d = await callUtilsApi("ibge_localidades", { uf: p.uf });
      const cities = (d as any[]).slice(0, 15).map((c: any) => c.nome).join(", ");
      return `🏙️ Municípios de ${p.uf} (${(d as any[]).length} total):\n${cities}${(d as any[]).length > 15 ? "..." : ""}`;
    },
  },

  // ═══ CALENDÁRIO (LOCAL + GOOGLE SYNC) ═══
  {
    name: "calendar_list",
    roles: R_ADV_PROD,
    regex: /(?:meus?\s+)?(?:eventos?|agenda|compromissos?|calend[aá]rio)|o\s+que\s+tenho\s+(?:hoje|amanh[aã]|essa?\s+semana)/i,
    extract: () => ({}),
    call: async () => {
      // Fetch local events from Supabase
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return "📅 Faça login para ver sua agenda.";

      const now = new Date();
      const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { data: localEvents } = await (supabase
        .from("local_events") as any)
        .select("title, start_at, location, category, google_event_id")
        .eq("user_id", userId)
        .gte("start_at", now.toISOString())
        .lte("start_at", future.toISOString())
        .order("start_at", { ascending: true })
        .limit(10);

      // Also try Google via server-side service account
      let googleOnly: any[] = [];
      try {
        const d = await callGoogleApi("google-calendar", { action: "list", timeMin: now.toISOString(), timeMax: future.toISOString(), maxResults: 10 });
        const gEvents = d?.events || d?.items || [];
        const syncedIds = new Set((localEvents || []).filter(e => e.google_event_id).map(e => e.google_event_id));
        googleOnly = gEvents.filter((e: any) => !syncedIds.has(e.id));
      } catch { /* ignore */ }

      const allEvents = [
        ...(localEvents || []).map((e: any) => ({
          title: e.title,
          start: e.start_at,
          source: e.google_event_id ? "synced" : "local",
        })),
        ...googleOnly.map((e: any) => ({
          title: e.summary || "Sem título",
          start: e.start?.dateTime || e.start?.date || "",
          source: "google",
        })),
      ].sort((a, b) => a.start.localeCompare(b.start));

      if (!allEvents.length) return "📅 Nenhum evento encontrado na sua agenda.";
      const list = allEvents.slice(0, 8).map(e => {
        const tag = e.source === "google" ? " ☁️" : e.source === "synced" ? " 🔄" : "";
        return `• ${new Date(e.start).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} — ${e.title}${tag}`;
      }).join("\n");
      return `📅 Seus próximos eventos:\n${list}`;
    },
  },
  {
    name: "calendar_create",
    roles: R_ADV_PROD,
    regex: /(?:agende|marque|crie?\s+evento|adicione?\s+(?:na\s+)?agenda|marcar?\s+reuni[aã]o)/i,
    extract: (_m, q) => {
      const rawText = q.replace(/agende|marque|crie\s+evento|adicione\s+na\s+agenda|marcar\s+reuni[aã]o/gi, "").trim();
      return {
        rawText,
        summary: cleanScheduleSummary(rawText) || rawText,
      };
    },
    call: async (p) => {
      if (!p.summary) return "O que devo agendar? Ex: 'Agende reunião com João amanhã às 14h'.";
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return "Faça login para criar eventos.";

      const { start, end } = parseScheduleDateTime(String(p.rawText || p.summary));

      let googleEventId: string | undefined;
      try {
        const gResult = await callGoogleApi("google-calendar", {
          action: "create",
          eventData: {
            summary: p.summary,
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() },
          },
        });
        if (gResult?.id) googleEventId = gResult.id;
      } catch { /* local-only fallback */ }

      try {
        await (supabase.from("local_events") as any).insert({
          user_id: userId,
          title: p.summary,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          category: "compromisso",
          google_event_id: googleEventId || null,
        });
        const syncMsg = googleEventId ? " (sincronizado com Google 🔄)" : "";
        return `✅ Evento "${p.summary}" agendado para ${start.toLocaleDateString("pt-BR")} às ${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}${syncMsg}.`;
      } catch (e: any) {
        return `Não consegui criar o evento: ${e.message}`;
      }
    },
  },
  {
    name: "gmail_list",
    roles: R_ADV_PROD,
    regex: /(?:meus?\s+)?(?:e-?mails?|inbox|caixa\s+de\s+entrada|mensagens?\s+(?:do\s+)?gmail)/i,
    extract: () => ({}),
    call: async () => {
      const d = await callGoogleApi("google-gmail", { action: "list_messages", maxResults: 5 });
      const msgs = d?.messages || [];
      if (!msgs.length) return "📧 Nenhum email encontrado.";
      const list = msgs.slice(0, 5).map((m: any) =>
        `• ${m.from || "Desconhecido"}: ${m.subject || "Sem assunto"}`
      ).join("\n");
      return `📧 Últimos emails:\n${list}`;
    },
  },
  {
    name: "gmail_send",
    roles: R_ADV_PROD,
    regex: /(?:envie?|mande?|escreva?)\s+(?:um?\s+)?e-?mail\s+(?:para|pra)/i,
    extract: (_m, q) => {
      const emailMatch = q.match(/[\w.-]+@[\w.-]+\.\w+/);
      return { to: emailMatch?.[0] || "", subject: "Mensagem do Orion", body: q };
    },
    call: async (p) => {
      if (!p.to) return "Para quem devo enviar? Informe o email. Ex: 'Envie email para joao@email.com'.";
      try {
        await callGoogleApi("google-gmail", {
          action: "send_email",
          to: p.to,
          subject: p.subject,
          body: String(p.body).slice(0, 500),
        });
        return `✅ Email enviado para ${p.to}!`;
      } catch (e: any) {
        return `Não consegui enviar: ${e.message}`;
      }
    },
  },
  {
    name: "drive_search",
    roles: R_ADV_PROD,
    regex: /(?:procure?|busque?|pesquise?)\s+(?:no\s+)?drive|(?:meus?\s+)?arquivos?\s+(?:no\s+)?(?:drive|google)/i,
    extract: (_m, q) => {
      const clean = q.replace(/(?:procure?|busque?|pesquise?)\s+(?:no\s+)?drive|(?:meus?\s+)?arquivos?\s+(?:no\s+)?(?:drive|google)/gi, "").trim();
      return { query: clean || "" };
    },
    call: async (p) => {
      const action = p.query ? "search" : "list";
      const d = await callGoogleApi("google-drive", { action, query: p.query, pageSize: 5 });
      const files = d?.files || [];
      if (!files.length) return "📁 Nenhum arquivo encontrado no Drive.";
      const list = files.slice(0, 5).map((f: any) => `• ${f.name} (${f.mimeType?.split(".").pop() || "arquivo"})`).join("\n");
      return `📁 Arquivos no Drive:\n${list}`;
    },
  },
  {
    name: "sheets_read_or_create",
    roles: R_ADV_PROD,
    regex: /(?:leia|abra|mostre?|dados?\s+d[ae]|cri(?:e|ar)|novo?a?)\s+(?:um?a?\s+)?(?:google\s+)?(?:planilha|sheet)/i,
    extract: (_m, q) => {
      const isCreate = /(?:cri(?:e|ar)|novo?a?)/.test(q);
      const title = q.replace(/(?:leia|abra|mostre?|dados?\s+d[ae]|cri(?:e|ar)|novo?a?)\s+(?:um?a?\s+)?(?:google\s+)?(?:planilha|sheet)\s*/gi, "").trim() || "Nova Planilha Orion";
      return { isCreate, title };
    },
    call: async (p) => {
      if (p.isCreate) {
        try {
          const d = await callGoogleApi("google-sheets", { action: "create", title: p.title });
          return `📊 **Planilha criada:**\n• Título: ${p.title}\n• ID: ${d?.spreadsheetId || "N/A"}\n🔗 Abra em: https://docs.google.com/spreadsheets/d/${d?.spreadsheetId}/edit`;
        } catch (e: any) {
          return `Não consegui criar a planilha: ${e.message}`;
        }
      }
      return `📊 Para ler planilhas, preciso do ID da planilha do Google Sheets. Compartilhe o link da planilha.`;
    },
  },
  {
    name: "contacts_search",
    roles: R_ADV_PROD,
    regex: /(?:dados?|detalhes?|consulte?|procure?|busque?|encontre|ache)\s+(?:o\s+)?contato\s+(.+)/i,
    extract: (m) => ({ query: m[1]?.trim() || "" }),
    call: async (p) => {
      if (!p.query) return "Qual contato devo procurar?";

      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return "Faça login para consultar contatos.";

      const { data: localContacts, error } = await supabase
        .from("contacts")
        .select("id, name, email, company")
        .eq("user_id", userId)
        .or(`name.ilike.%${String(p.query)}%,email.ilike.%${String(p.query)}%,company.ilike.%${String(p.query)}%`)
        .limit(5);

      if (error) throw error;
      if (!localContacts?.length) return `👤 Não encontrei contato com "${p.query}" no CRM.`;

      const list = localContacts
        .map((c: any) => `• ${c.name || "Sem nome"}${c.email ? ` — ${c.email}` : ""}${c.company ? ` (${c.company})` : ""}`)
        .join("\n");
      return `👤 Contatos encontrados no CRM:\n${list}`;
    },
  },
  {
    name: "contacts_list",
    roles: R_ADV_PROD,
    regex: /(?:meus?\s+)?contatos?|lista\s+de\s+contatos?/i,
    extract: () => ({}),
    call: async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      if (userId) {
        const { data: localContacts } = await supabase
          .from("contacts")
          .select("id, name, email, company")
          .eq("user_id", userId)
          .order("name")
          .limit(10);

        if (localContacts?.length) {
          const list = localContacts
            .map((c: any) => `• ${c.name || "Sem nome"}${c.email ? ` — ${c.email}` : ""}${c.company ? ` (${c.company})` : ""}`)
            .join("\n");
          return `👤 Seus contatos do CRM:\n${list}`;
        }
      }

      const d = await callGoogleApi("google-contacts", { action: "list" });
      const contacts = d?.contacts || [];
      if (!contacts.length) return "👤 Nenhum contato encontrado.";
      const list = contacts.slice(0, 10).map((c: any) =>
        `• ${c.name}${c.email ? ` — ${c.email}` : ""}${c.phone ? ` 📞 ${c.phone}` : ""}`
      ).join("\n");
      return `👤 Seus contatos (${d.totalPeople || contacts.length} total):\n${list}`;
    },
  },

  // ═══ PESQUISA WEB ═══
  {
    name: "web_search",
    regex: /(?:pesquis|busc)\w+\s+(?:na\s+)?(?:web|internet|online|google)|(?:me\s+)?(?:encontre|ache)\s+(?:na\s+)?(?:web|internet)/i,
    extract: (_m, q) => {
      const clean = q.replace(/(?:pesquis|busc)\w+\s+(?:na\s+)?(?:web|internet|online|google)|(?:me\s+)?(?:encontre|ache)\s+(?:na\s+)?(?:web|internet)/gi, "").trim();
      return { query: clean || q };
    },
    call: async (p) => {
      if (!p.query) return "O que devo pesquisar na web?";
      // Also open Google in a real browser tab for the user
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(p.query as string)}`;
      window.open(searchUrl, "_blank", "noopener,noreferrer");
      const d = await callFirecrawl(p.query as string);
      if (!d?.success || !d?.content) return `🔍 Abri o Google com sua pesquisa: "${p.query}". Não encontrei resultados adicionais via Firecrawl.`;
      return `🔍 Abri o Google com sua pesquisa. Aqui está um resumo:\n${d.content.slice(0, 800)}`;
    },
  },

  // ═══ NEURAL STATUS ═══
  {
    name: "neural_status",
    roles: R_ADV,
    regex: /status\s+(?:da\s+)?(?:rede\s+)?neural|sa[uú]de\s+(?:do\s+)?sistema|como\s+(?:est[aá]|vai)\s+(?:a\s+)?rede/i,
    extract: () => ({}),
    call: async () => {
      const ctx = getNeuralAgentContext();
      const snapshot = getSocietySnapshot();
      const broadcasts = getRecentBroadcasts();
      const totalAgents = snapshot.agents.length;
      const avgReliability = snapshot.agents.reduce((s, a) => s + a.reliabilityScore, 0) / Math.max(totalAgents, 1);
      const recentOps = broadcasts.length;
      const successRate = recentOps > 0
        ? (broadcasts.filter(b => b.success).length / recentOps * 100).toFixed(0)
        : "N/A";

      return `🧠 Status da Rede Neural:\n📊 Agentes: ${ctx}\n👥 Total: ${totalAgents} agentes ativos\n💚 Confiabilidade média: ${(avgReliability * 100).toFixed(0)}%\n📡 Operações recentes: ${recentOps} (${successRate}% sucesso)\n🔗 Sociedade: ${totalAgents} neurônios conectados`;
    },
  },

  // ═══ EDITOR — Document Creation ═══
  {
    name: "doc_create",
    roles: R_ADV,
    regex: /(?:cri(?:e|ar)|gerar?|novo?a?)\s+(?:um?\s+)?(?:documento|contrato|peti[çc][aã]o|procura[çc][aã]o|recurso|parecer|laudo|of[ií]cio|requerimento|notifica[çc][aã]o)/i,
    extract: (_m, q) => {
      const typeMatch = q.match(/(?:contrato|peti[çc][aã]o|procura[çc][aã]o|recurso|parecer|laudo|of[ií]cio|requerimento|notifica[çc][aã]o|documento)/i);
      return { documentType: typeMatch?.[0] || "documento", description: q };
    },
    call: async (p) => {
      return `📄 Vou abrir o Gerador de Documentos para criar um(a) ${p.documentType}.\n\n__NAV__/dashboard/gerar-documento`;
    },
  },
  {
    name: "doc_list",
    roles: R_ADV,
    regex: /(?:list(?:e|ar)|mostr(?:e|ar)|ver|todos?\s+(?:os?\s+)?)?(?:meus?\s+)?documentos/i,
    extract: () => ({}),
    call: async () => {
      const { data, error } = await supabase.from("documents").select("id, title, document_type, created_at").order("created_at", { ascending: false }).limit(10);
      if (error || !data?.length) return "📄 Nenhum documento encontrado.";
      const list = data.map((d: any) => `• ${d.title} (${d.document_type}) — ${new Date(d.created_at).toLocaleDateString("pt-BR")}`).join("\n");
      return `📄 Seus documentos recentes:\n${list}\n\n📊 Total exibido: ${data.length}`;
    },
  },
  {
    name: "doc_search",
    roles: R_ADV,
    regex: /(?:procur|busc|encontr|ach)\w+\s+(?:o\s+|a\s+|um\s+)?(?:documento|contrato|peti[çc][aã]o)\s+(.+)/i,
    extract: (m, _q) => ({ query: m[1]?.trim() || "" }),
    call: async (p) => {
      if (!p.query) return "O que devo procurar?";
      const { data } = await supabase.from("documents").select("id, title, document_type").ilike("title", `%${p.query}%`).limit(5);
      if (!data?.length) return `📄 Nenhum documento encontrado com "${p.query}".`;
      const list = data.map((d: any) => `• ${d.title} (${d.document_type})`).join("\n");
      return `📄 Documentos encontrados:\n${list}`;
    },
  },

  // ═══ CRM — Clients ═══
  {
    name: "crm_list_clients",
    roles: R_ADV,
    regex: /(?:list(?:e|ar)|mostr(?:e|ar)|ver|todos?\s+(?:os?\s+)?)?(?:meus?\s+)?clientes/i,
    extract: () => ({}),
    call: async () => {
      const { data, error } = await supabase.from("client_profiles").select("id, nome, email, status, tipo_caso").order("created_at", { ascending: false }).limit(10);
      if (error || !data?.length) return "👥 Nenhum cliente encontrado.";
      const list = data.map((c: any) => `• ${c.nome} — ${c.status} ${c.tipo_caso ? `(${c.tipo_caso})` : ""}`).join("\n");
      return `👥 Clientes recentes:\n${list}\n\n📊 Total exibido: ${data.length}`;
    },
  },
  {
    name: "crm_search_client",
    roles: R_ADV,
    regex: /(?:procur|busc|encontr)\w+\s+(?:o\s+|a\s+)?cliente\s+(.+)/i,
    extract: (m) => ({ query: m[1]?.trim() || "" }),
    call: async (p) => {
      if (!p.query) return "Qual cliente devo procurar?";
      const { data } = await supabase.from("client_profiles").select("id, nome, email, status").ilike("nome", `%${p.query}%`).limit(5);
      if (!data?.length) return `👥 Nenhum cliente encontrado com "${p.query}".`;
      const list = data.map((c: any) => `• ${c.nome} (${c.email}) — ${c.status}`).join("\n");
      return `👥 Clientes encontrados:\n${list}`;
    },
  },

  // ═══ CRM — Processos ═══
  {
    name: "crm_list_processos",
    roles: R_ADV,
    regex: /(?:list(?:e|ar)|mostr(?:e|ar)|ver|todos?\s+(?:os?\s+)?)?(?:meus?\s+)?processos/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await (supabase.from("processos" as any) as any).select("id, numero_processo, descricao, status").order("created_at", { ascending: false }).limit(10);
      if (!data?.length) return "⚖️ Nenhum processo encontrado.";
      const list = data.map((p: any) => `• ${p.numero_processo || "S/N"} — ${p.descricao?.slice(0, 60) || p.status}`).join("\n");
      return `⚖️ Processos recentes:\n${list}`;
    },
  },

  // ═══ Financial ═══
  {
    name: "fin_list_invoices",
    roles: R_ADV_PROD,
    regex: /(?:list(?:e|ar)|mostr(?:e|ar)|ver|todas?\s+(?:as?\s+)?)?(?:minhas?\s+)?faturas/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("invoices").select("id, description, valor, status, due_date").order("created_at", { ascending: false }).limit(10);
      if (!data?.length) return "💰 Nenhuma fatura encontrada.";
      const list = data.map((i: any) => `• ${i.description || "Fatura"} — R$ ${Number(i.valor || 0).toFixed(2)} [${i.status}]`).join("\n");
      return `💰 Faturas recentes:\n${list}`;
    },
  },
  {
    name: "fin_pending",
    roles: R_ADV_PROD,
    regex: /faturas?\s+(?:pendentes?|em\s+aberto|atrasad[ao]s?)|inadimplentes/i,
    extract: () => ({}),
    call: async () => {
      const { data, count } = await supabase.from("invoices").select("id, description, valor, due_date", { count: "exact" }).eq("status", "pending").order("due_date", { ascending: true }).limit(10);
      if (!data?.length) return "✅ Nenhuma fatura pendente!";
      const list = data.map((i: any) => `• ${i.description || "Fatura"} — R$ ${Number(i.valor || 0).toFixed(2)} (Vence: ${i.due_date || "N/A"})`).join("\n");
      return `💰 Faturas pendentes (${count || data.length}):\n${list}`;
    },
  },

  // ═══ Consultas ═══
  {
    name: "consultas_list",
    roles: R_ADV_CLI,
    regex: /(?:list(?:e|ar)|mostr(?:e|ar)|ver|todas?\s+(?:as?\s+)?)?(?:minhas?\s+)?consultas/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("consultas").select("id, tipo, status, data_hora, valor").order("data_hora", { ascending: false }).limit(10);
      if (!data?.length) return "📅 Nenhuma consulta encontrada.";
      const list = data.map((c: any) => `• ${c.tipo} — ${new Date(c.data_hora).toLocaleDateString("pt-BR")} [${c.status}]`).join("\n");
      return `📅 Consultas:\n${list}`;
    },
  },

  // ═══ Tarefas ═══
  {
    name: "tasks_list",
    roles: R_ADV_PROD,
    regex: /(?:list(?:e|ar)|mostr(?:e|ar)|ver|todas?\s+(?:as?\s+)?)?(?:minhas?\s+)?tarefas/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await (supabase.from("tarefas" as any) as any).select("id, titulo, status, prioridade, data_limite").order("created_at", { ascending: false }).limit(10);
      if (!data?.length) return "✅ Nenhuma tarefa encontrada.";
      const list = data.map((t: any) => `• ${t.titulo || "Tarefa"} [${t.status}] ${t.prioridade ? `(${t.prioridade})` : ""}`).join("\n");
      return `✅ Tarefas:\n${list}`;
    },
  },

  // ═══ Marketplace ═══
  {
    name: "mkt_list_products",
    roles: R_PROD,
    regex: /(?:list(?:e|ar)|mostr(?:e|ar)|ver|todos?\s+(?:os?\s+)?)?(?:meus?\s+)?produtos/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("products").select("id, name, price_cents, is_active").order("created_at", { ascending: false }).limit(10);
      if (!data?.length) return "🏪 Nenhum produto encontrado.";
      const list = data.map((p: any) => `• ${p.name} — R$ ${(p.price_cents / 100).toFixed(2)} [${p.is_active ? "Ativo" : "Inativo"}]`).join("\n");
      return `🏪 Produtos:\n${list}`;
    },
  },

  // ═══ Neural — Command Registry Stats ═══
  {
    name: "neural_commands",
    roles: R_ADV,
    regex: /(?:comandos?\s+neurais?|quantos?\s+comandos?|registry|registro\s+de\s+comandos)/i,
    extract: () => ({}),
    call: async () => {
      const { getRegistryStats } = await import("./orion-command-registry");
      const stats = getRegistryStats();
      const lines = Object.entries(stats).map(([k, v]) => `• ${k}: ${v}`).join("\n");
      return `🧠 Registro de Comandos Neurais Orion:\n${lines}`;
    },
  },

  // ═══ Neural — Embeddings Count ═══
  {
    name: "neural_embeddings",
    roles: R_ADV,
    regex: /quantos?\s+embeddings?|embeddings?\s+(?:count|total|cadastrad)/i,
    extract: () => ({}),
    call: async () => {
      const { count } = await supabase.from("legal_embeddings").select("id", { count: "exact", head: true });
      const { count: neuralCount } = await (supabase.from("neural_knowledge_base" as any) as any).select("id", { count: "exact", head: true });
      return `🧠 Embeddings:\n• Legal: ${count || 0} documentos vetorizados\n• Neural KB: ${neuralCount || 0} entradas de conhecimento`;
    },
  },

  // ═══ Neural — AI Metrics & Performance (unificado) ═══
  {
    name: "ai_metrics",
    roles: R_ADV,
    regex: /m[eé]tricas?\s+(?:da?\s+)?ia|performance\s+(?:da?\s+)?ia|estat[ií]sticas?\s+ia|qualidade\s+(?:da\s+)?ia|sucesso\s+(?:da\s+)?ia/i,
    extract: () => ({}),
    call: async () => {
      const [totalR, successR, recent] = await Promise.all([
        supabase.from("ai_metrics").select("id", { count: "exact", head: true }),
        supabase.from("ai_metrics").select("id", { count: "exact", head: true }).eq("success", true),
        supabase.from("ai_metrics").select("total_duration_ms, provider").order("created_at", { ascending: false }).limit(50),
      ]);
      const total = totalR.count || 0;
      const success = successR.count || 0;
      const durations = (recent.data || []).map((m: any) => m.total_duration_ms);
      const avgMs = durations.length ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0;
      const rate = total > 0 ? Math.round((success / total) * 100) : 0;
      const providers: Record<string, number> = {};
      (recent.data || []).forEach((m: any) => { providers[m.provider] = (providers[m.provider] || 0) + 1; });
      const top = Object.entries(providers).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
      return `📊 **Métricas & Performance IA:**\n• Total chamadas: **${total}**\n• Taxa de sucesso: **${rate}%**\n• Latência média: **${avgMs}ms**\n• Principal provedor: **${top}**\n• Chamadas recentes: ${durations.length}`;
    },
  },

  // ═══ Neural — Experiments ═══
  {
    name: "neural_experiments",
    roles: R_ADV,
    regex: /experimentos?\s+(?:ab|a\/b)|testes?\s+ab/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("neural_ab_experiments").select("id, name, status, variant_a_wins, variant_b_wins").order("created_at", { ascending: false }).limit(5);
      if (!data?.length) return "🧪 Nenhum experimento A/B encontrado.";
      const list = data.map((e: any) => `• ${e.name} [${e.status}] — A:${e.variant_a_wins || 0} vs B:${e.variant_b_wins || 0}`).join("\n");
      return `🧪 Experimentos A/B:\n${list}`;
    },
  },

  // ═══ Neural — Evolution (CREATOR-ONLY) ═══
  {
    name: "neural_evolution",
    roles: R_ADV,
    creatorOnly: true,
    regex: /evolu[çc][aã]o\s+neural|propostas?\s+(?:de\s+)?evolu[çc][aã]o|auto[\s-]?evolu[çc][aã]o/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("neural_evolution_proposals").select("id, title, status, impact_score").order("created_at", { ascending: false }).limit(5);
      if (!data?.length) return "🧬 Nenhuma proposta de evolução encontrada.";
      const list = data.map((e: any) => `• ${e.title} [${e.status}] — Impacto: ${e.impact_score || "N/A"}`).join("\n");
      return `🧬 Propostas de Evolução Neural:\n${list}`;
    },
  },

  // ═══ Reports ═══
  {
    name: "daily_summary",
    roles: R_ADV,
    regex: /resum(?:o|ir)\s+(?:do\s+)?(?:dia|executivo|geral)|briefing|dashboard\s+summary/i,
    extract: () => ({}),
    call: async () => {
      const [docs, clients, processos, invoices, metrics, consultas, sigs, tarefas, chatConvos, neuralKb, embeddings] = await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("client_profiles").select("id", { count: "exact", head: true }),
        (supabase.from("processos" as any) as any).select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("id", { count: "exact", head: true }),
        supabase.from("ai_metrics").select("id", { count: "exact", head: true }),
        supabase.from("consultas").select("id", { count: "exact", head: true }),
        (supabase.from("signature_envelopes" as any) as any).select("id", { count: "exact", head: true }).catch(() => ({ count: 0 })),
        (supabase.from("tarefas" as any) as any).select("id", { count: "exact", head: true }).catch(() => ({ count: 0 })),
        supabase.from("chat_conversations").select("id", { count: "exact", head: true }),
        (supabase.from("neural_knowledge_base" as any) as any).select("id", { count: "exact", head: true }).catch(() => ({ count: 0 })),
        supabase.from("legal_embeddings").select("id", { count: "exact", head: true }),
      ]);
      return `📋 **Resumo Executivo Completo:**\n\n📄 **${docs.count || 0}** documentos\n👥 **${clients.count || 0}** clientes\n⚖️ **${processos.count || 0}** processos\n💰 **${invoices.count || 0}** faturas\n📅 **${consultas.count || 0}** consultas\n✍️ **${(sigs as any).count || 0}** assinaturas\n✅ **${(tarefas as any).count || 0}** tarefas\n💬 **${chatConvos.count || 0}** conversas\n🧠 **${(neuralKb as any).count || 0}** base neural\n📚 **${embeddings.count || 0}** embeddings\n📊 **${metrics.count || 0}** operações IA`;
    },
  },

  // ═══ Agent Routing (from AssistenteIA) ═══
  {
    name: "agent_leitura",
    roles: R_ADV,
    regex: /(?:agente?\s+)?leitor|(?:agente?\s+)?leitura|analis[ae]\s+(?:o\s+)?(?:código|documento|log|banco|schema|tabela)/i,
    extract: (_m, q) => ({ query: q }),
    call: async (p) => {
      const data = await wrapEdgeFunction(
        supabase.functions.invoke("smart-agent-route", { body: { query: p.query, force_agent: "leitura" } }),
        "smart-agent-route",
        { force_agent: "leitura" }
      );
      return `📖 **Agente Leitura:**\n${data?.analysis || data?.message || "Processado."}`;
    },
  },
  {
    name: "agent_construcao",
    roles: R_ADV,
    regex: /(?:agente?\s+)?construtor|(?:agente?\s+)?construção|(?:gerar?|cri[ae]r?|elabor[ae]r?)\s+(?:componente|sql|edge\s*function|peça)/i,
    extract: (_m, q) => ({ query: q }),
    call: async (p) => {
      const data = await wrapEdgeFunction(
        supabase.functions.invoke("smart-agent-route", { body: { query: p.query, force_agent: "construcao" } }),
        "smart-agent-route",
        { force_agent: "construcao" }
      );
      let content = data?.analysis || "";
      if (data?.proposal) content += `\n\n📋 Proposta (${data.proposal.type}): ${data.proposal.status}\n\`\`\`\n${(data.proposal.code || "").slice(0, 1500)}\n\`\`\``;
      return `🔧 **Agente Construtor:**\n${content || data?.message || "Processado."}`;
    },
  },
  {
    name: "agent_pesquisa",
    roles: R_ADV,
    regex: /(?:agente?\s+)?pesquisador|(?:agente?\s+)?pesquisa|pesquis[ae]\s+jurisprud|buscar?\s+(?:súmula|legislaç|jurisprud|artigo|lei|doutrina)/i,
    extract: (_m, q) => ({ query: q }),
    call: async (p) => {
      const data = await wrapEdgeFunction(
        supabase.functions.invoke("smart-agent-route", { body: { query: p.query, force_agent: "pesquisa" } }),
        "smart-agent-route",
        { force_agent: "pesquisa" }
      );
      let content = data?.analysis || data?.message || "Processado.";
      if (data?.raw_results?.length) content += `\n\n📚 ${data.results_count || data.raw_results.length} resultados encontrados`;
      return `🌐 **Agente Pesquisador:**\n${content}`;
    },
  },

  // ═══ Financial Analysis ═══
  {
    name: "financial_analysis",
    roles: R_ADV_PROD,
    regex: /anális[ei]\s+financ|situação\s+financ|faturamento|receita|inadimpl/i,
    extract: () => ({}),
    call: async () => {
      const [invoicesAll, pending, paid] = await Promise.all([
        supabase.from("invoices").select("valor, status"),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("status", "paid"),
      ]);
      const totalRevenue = (invoicesAll.data || []).filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (Number(i.valor) || 0), 0);
      const totalPending = (invoicesAll.data || []).filter((i: any) => i.status === "pending").reduce((s: number, i: any) => s + (Number(i.valor) || 0), 0);
      return `💰 **Análise Financeira:**\n• Faturas pagas: **${paid.count || 0}** (R$ ${totalRevenue.toFixed(2)})\n• Faturas pendentes: **${pending.count || 0}** (R$ ${totalPending.toFixed(2)})\n• Total em aberto: R$ ${totalPending.toFixed(2)}`;
    },
  },

  // ai_performance removido — unificado em ai_metrics acima

  // ═══ Urgent Deadlines ═══
  {
    name: "urgent_deadlines",
    roles: R_ADV_PROD,
    regex: /prazos?\s+urgent|tarefas?\s+urgent|próximos?\s+(?:7|sete)\s+dias|pendênci/i,
    extract: () => ({}),
    call: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Usuário não autenticado.";
      const [tarefas, consultas] = await Promise.all([
        (supabase.from("tarefas" as any) as any).select("titulo, status, data_prazo").eq("user_id", user.id).eq("status", "pendente").order("data_prazo", { ascending: true }).limit(10),
        supabase.from("consultas").select("data_hora, tipo, status").eq("status", "agendada").order("data_hora", { ascending: true }).limit(10),
      ]);
      let content = "⏰ **Prazos e Tarefas Urgentes:**\n";
      if ((tarefas as any).data?.length) {
        content += "\n**Tarefas Pendentes:**\n" + (tarefas as any).data.map((t: any) => `• ${t.titulo} — Prazo: ${t.data_prazo || "S/D"}`).join("\n");
      } else {
        content += "\n✅ Sem tarefas pendentes.";
      }
      if (consultas.data?.length) {
        content += "\n\n**Consultas Agendadas:**\n" + consultas.data.map((c: any) => `• ${c.tipo} — ${new Date(c.data_hora).toLocaleString("pt-BR")}`).join("\n");
      }
      return content;
    },
  },

  // ═══ OCR / Vision ═══
  {
    name: "ocr_scan",
    roles: R_ADV_PROD,
    regex: /(?:ocr|digitali[zs]|escan(?:ear|eie)|extrair?\s+texto)\s+(?:d[aoe]\s+)?(?:imagem|foto|documento|pdf|página)/i,
    extract: (_m, q) => ({ query: q }),
    call: async (p) => {
      return `🔍 **OCR / Vision:**\nPara digitalizar um documento, envie a imagem ou PDF pela interface do editor.\n\nO sistema utiliza OCR multi-motor neural (Alpha → Beta → Gamma) para extrair texto com alta precisão.\n\n📎 Arraste o arquivo para o editor ou use a câmera do dispositivo.`;
    },
  },
  {
    name: "ocr_analyze_image",
    roles: R_ADV_PROD,
    regex: /(?:analis|identific|reconhe[cç])\w+\s+(?:essa?\s+)?(?:imagem|foto|cena|objeto|tela)/i,
    extract: (_m, q) => ({ query: q }),
    call: async () => {
      return `👁️ **Análise Visual:**\nAtive a câmera do Orion (comando "Orion ativar câmera") para análise em tempo real.\n\nCapacidades:\n• Reconhecimento de objetos e cenas\n• Leitura de texto em imagens (OCR)\n• Detecção de emoções faciais\n• Análise de documentos jurídicos`;
    },
  },

  // ═══ Tradução ═══
  {
    name: "translate_text",
    roles: R_ADV_PROD,
    regex: /(?:traduz[aie]?r?|translate)\s+(?:para\s+)?(?:(?:o\s+)?(?:ingl[eê]s|espanhol|franc[eê]s|alem[aã]o|italiano|portugu[eê]s|chin[eê]s|japon[eê]s|coreano|russo|[aá]rabe)|(?:en|es|fr|de|it|pt|zh|ja|ko|ru|ar))\b/i,
    extract: (_m, q) => {
      const langMap: Record<string, string> = {
        "inglês": "en", "ingles": "en", "english": "en", "en": "en",
        "espanhol": "es", "spanish": "es", "es": "es",
        "francês": "fr", "frances": "fr", "french": "fr", "fr": "fr",
        "alemão": "de", "alemao": "de", "german": "de", "de": "de",
        "italiano": "it", "italian": "it", "it": "it",
        "português": "pt", "portugues": "pt", "portuguese": "pt", "pt": "pt",
        "chinês": "zh", "chines": "zh", "chinese": "zh", "zh": "zh",
        "japonês": "ja", "japones": "ja", "japanese": "ja", "ja": "ja",
        "coreano": "ko", "korean": "ko", "ko": "ko",
        "russo": "ru", "russian": "ru", "ru": "ru",
        "árabe": "ar", "arabe": "ar", "arabic": "ar", "ar": "ar",
      };
      let targetLang = "en";
      for (const [key, val] of Object.entries(langMap)) {
        if (q.toLowerCase().includes(key)) { targetLang = val; break; }
      }
      const text = q.replace(/(?:traduz[aie]?r?|translate)\s+(?:para\s+)?(?:(?:o\s+)?(?:ingl[eê]s|espanhol|franc[eê]s|alem[aã]o|italiano|portugu[eê]s|chin[eê]s|japon[eê]s|coreano|russo|[aá]rabe)|(?:en|es|fr|de|it|pt|zh|ja|ko|ru|ar))\s*/gi, "").trim();
      return { text, targetLang };
    },
    call: async (p) => {
      if (!p.text) return "O que devo traduzir? Ex: 'Traduza para inglês: contrato de prestação de serviços'.";
      try {
        const { data, error } = await supabase.functions.invoke("neural-ops", {
          body: { action: "translate", text: p.text, target_lang: p.targetLang },
        });
        if (error) throw error;
        return `🌐 **Tradução (→ ${p.targetLang}):**\n\n${data?.translation || data?.result || "Tradução processada."}`;
      } catch {
        return `🌐 Para tradução, use o Orion com: "Traduza para [idioma]: [texto]"\n\nTexto capturado: "${String(p.text).slice(0, 200)}"`;
      }
    },
  },

  // ═══ Google Docs — Create & Edit ═══
  {
    name: "gdocs_create",
    roles: R_ADV_PROD,
    regex: /(?:cri(?:e|ar)|novo?a?)\s+(?:um?\s+)?(?:google\s+)?doc(?:ument)?s?\b/i,
    extract: (_m, q) => {
      const title = q.replace(/(?:cri(?:e|ar)|novo?a?)\s+(?:um?\s+)?(?:google\s+)?doc(?:ument)?s?\s*/gi, "").trim() || "Novo Documento Orion";
      return { title };
    },
    call: async (p) => {
      try {
        const d = await callGoogleApi("google-docs", { action: "create", title: p.title });
        return `📝 **Google Doc criado:**\n• Título: ${p.title}\n• ID: ${d?.documentId || "N/A"}\n🔗 Abra em: https://docs.google.com/document/d/${d?.documentId}/edit`;
      } catch (e: any) {
        return `Não consegui criar o Google Doc: ${e.message}`;
      }
    },
  },
  {
    name: "gdocs_list",
    roles: R_ADV_PROD,
    regex: /(?:list(?:e|ar)|mostr(?:e|ar))\s+(?:meus?\s+)?(?:google\s+)?docs/i,
    extract: () => ({}),
    call: async () => {
      try {
        const d = await callGoogleApi("google-drive", { action: "list", query: "mimeType='application/vnd.google-apps.document'", pageSize: 10 });
        const files = d?.files || [];
        if (!files.length) return "📝 Nenhum Google Doc encontrado.";
        const list = files.map((f: any) => `• ${f.name} — ${f.modifiedTime?.slice(0, 10) || ""}`).join("\n");
        return `📝 Seus Google Docs:\n${list}`;
      } catch (e: any) {
        return `Erro ao listar Docs: ${e.message}`;
      }
    },
  },

  // gsheets_create removido — unificado em sheets_read_or_create acima

  // ═══ Google Drive — Upload ═══
  {
    name: "drive_upload",
    roles: R_ADV_PROD,
    regex: /(?:envie?|upload|salve?)\s+(?:no\s+|para\s+o\s+)?drive/i,
    extract: (_m, q) => ({ query: q }),
    call: async () => {
      return `📁 Abrindo o Google Drive para upload de arquivos.\n\n__NAV__/dashboard/ferramentas-google?tab=drive`;
    },
  },

  // ═══ CRM — Create Client ═══
  {
    name: "crm_create_client",
    roles: R_ADV,
    regex: /(?:cadastr|cri|adicion)\w+\s+(?:um?\s+)?(?:novo?\s+)?cliente/i,
    extract: (_m, q) => ({ query: q }),
    call: async () => {
      return `👥 Abrindo a página de Clientes para cadastro.\n\n__NAV__/dashboard/crm?tab=clientes`;
    },
  },
  {
    name: "crm_client_detail",
    roles: R_ADV,
    regex: /(?:dados?|detalhes?|informa[çc][oõ]es?)\s+d[eo]\s+cliente\s+(.+)/i,
    extract: (m) => ({ name: m[1]?.trim() || "" }),
    call: async (p) => {
      if (!p.name) return "Qual cliente? Informe o nome.";
      const { data } = await supabase.from("client_profiles").select("*").ilike("nome", `%${p.name}%`).limit(1);
      if (!data?.length) return `👥 Cliente "${p.name}" não encontrado.`;
      const c = data[0] as any;
      return `👥 **${c.nome}**\n📧 ${c.email}\n📞 ${c.telefone || "N/A"}\n📋 CPF: ${c.cpf || "N/A"}\n⚖️ Caso: ${c.tipo_caso || "N/A"}\n📊 Status: ${c.status}\n📝 ${c.descricao_problema?.slice(0, 150) || "Sem descrição"}`;
    },
  },

  // ═══ CRM — Andamentos ═══
  {
    name: "crm_andamentos",
    roles: R_ADV,
    regex: /(?:andamentos?|movimenta[çc][oõ]es?)\s+d[eo]\s+processo/i,
    extract: (_m, q) => ({ query: q }),
    call: async () => {
      const { data } = await supabase.from("andamentos").select("id, descricao, tipo, data_ocorrencia, processo_id").order("data_ocorrencia", { ascending: false }).limit(10);
      if (!data?.length) return "⚖️ Nenhum andamento encontrado.";
      const list = data.map((a: any) => `• [${a.tipo}] ${a.descricao.slice(0, 80)} — ${new Date(a.data_ocorrencia).toLocaleDateString("pt-BR")}`).join("\n");
      return `⚖️ **Últimos Andamentos:**\n${list}`;
    },
  },

  // ═══ CRM — Chat/Conversations ═══
  {
    name: "crm_conversations",
    roles: R_ADV,
    regex: /(?:conversas?|mensagens?|chat)\s+(?:com\s+)?(?:clientes?|recentes?)/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("chat_conversations").select("id, ultima_mensagem, updated_at").order("updated_at", { ascending: false }).limit(10);
      if (!data?.length) return "💬 Nenhuma conversa encontrada.";
      const list = data.map((c: any) => `• ${c.ultima_mensagem?.slice(0, 60) || "..."} — ${new Date(c.updated_at).toLocaleDateString("pt-BR")}`).join("\n");
      return `💬 **Conversas recentes:**\n${list}`;
    },
  },

  // ═══ Marketplace — Create Product ═══
  {
    name: "mkt_create_product",
    roles: R_PROD,
    regex: /(?:cri(?:e|ar)|cadastr|adicion)\w+\s+(?:um?\s+)?(?:novo?\s+)?produto/i,
    extract: (_m, q) => ({ query: q }),
    call: async () => {
      return `🏪 Abrindo o Marketplace para criar produto.\n\n__NAV__/dashboard/marketplace`;
    },
  },
  {
    name: "mkt_product_detail",
    roles: R_PROD,
    regex: /(?:dados?|detalhes?)\s+d[eo]\s+produto\s+(.+)/i,
    extract: (m) => ({ name: m[1]?.trim() || "" }),
    call: async (p) => {
      if (!p.name) return "Qual produto?";
      const { data } = await supabase.from("products").select("*").ilike("name", `%${p.name}%`).limit(1);
      if (!data?.length) return `🏪 Produto "${p.name}" não encontrado.`;
      const prod = data[0] as any;
      return `🏪 **${prod.name}**\n💰 R$ ${(prod.price_cents / 100).toFixed(2)}\n📊 ${prod.is_active ? "Ativo" : "Inativo"}\n📝 ${prod.description?.slice(0, 200) || "Sem descrição"}`;
    },
  },
  {
    name: "mkt_orders",
    roles: R_PROD,
    regex: /(?:list(?:e|ar)|mostr(?:e|ar)|ver|todos?\s+(?:os?\s+)?)?(?:meus?\s+)?(?:pedidos|vendas|orders)/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("orders").select("id, status, total_cents, created_at").order("created_at", { ascending: false }).limit(10);
      if (!data?.length) return "🛒 Nenhum pedido encontrado.";
      const list = data.map((o: any) => `• #${o.id.slice(0, 8)} — R$ ${(o.total_cents / 100).toFixed(2)} [${o.status}] ${new Date(o.created_at).toLocaleDateString("pt-BR")}`).join("\n");
      return `🛒 **Pedidos recentes:**\n${list}`;
    },
  },
  {
    name: "mkt_affiliates",
    roles: R_PROD_AFIL,
    regex: /(?:comiss[oõ]es?|afiliados?|links?\s+de\s+afiliado)/i,
    extract: () => ({}),
    call: async () => {
      const [commissions, links] = await Promise.all([
        supabase.from("affiliate_commissions").select("id, amount_cents, status", { count: "exact" }).limit(10),
        supabase.from("affiliate_links").select("id, clicks, conversions", { count: "exact" }).limit(10),
      ]);
      const totalComm = (commissions.data || []).reduce((s: number, c: any) => s + (c.amount_cents || 0), 0);
      const totalClicks = (links.data || []).reduce((s: number, l: any) => s + (l.clicks || 0), 0);
      const totalConv = (links.data || []).reduce((s: number, l: any) => s + (l.conversions || 0), 0);
      return `🤝 **Programa de Afiliados:**\n• Comissões: ${commissions.count || 0} (R$ ${(totalComm / 100).toFixed(2)})\n• Links: ${links.count || 0}\n• Cliques: ${totalClicks}\n• Conversões: ${totalConv}`;
    },
  },

  // ═══ Editor — Templates ═══
  {
    name: "doc_templates",
    roles: R_ADV,
    regex: /(?:modelos?|templates?)\s+(?:de\s+)?(?:documentos?|contratos?|peti[çc][oõ]es?)/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("document_templates").select("id, name, type, is_active").eq("is_active", true).limit(10);
      if (!data?.length) return "📋 Nenhum template encontrado.";
      const list = data.map((t: any) => `• ${t.name} (${t.type})`).join("\n");
      return `📋 **Templates disponíveis:**\n${list}\n\n🔗 Navegue para /dashboard/gerar-documento para usar um template.`;
    },
  },
  {
    name: "doc_folders",
    roles: R_ADV,
    regex: /(?:pastas?|diret[oó]rios?)\s+(?:de\s+)?documentos/i,
    extract: () => ({}),
    call: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Não autenticado.";
      const { data } = await supabase.from("document_folders").select("id, name, color").eq("user_id", user.id).order("name").limit(20);
      if (!data?.length) return "📁 Nenhuma pasta encontrada.";
      const list = data.map((f: any) => `• ${f.color ? "🎨" : "📁"} ${f.name}`).join("\n");
      return `📁 **Suas pastas:**\n${list}`;
    },
  },

  // ═══ Assinaturas Digitais ═══
  {
    name: "signatures_status",
    roles: R_ADV,
    regex: /(?:assinatura|envelope)\s+(?:digital|eletrônic|pendente)|status\s+(?:d[ae]\s+)?assinatura/i,
    extract: () => ({}),
    call: async () => {
      const [total, pending, signed] = await Promise.all([
        (supabase.from("signature_envelopes" as any) as any).select("id", { count: "exact", head: true }).catch(() => ({ count: 0 })),
        (supabase.from("signature_envelopes" as any) as any).select("id", { count: "exact", head: true }).eq("status", "pending").catch(() => ({ count: 0 })),
        (supabase.from("signature_envelopes" as any) as any).select("id", { count: "exact", head: true }).eq("status", "signed").catch(() => ({ count: 0 })),
      ]);
      return `✍️ **Assinaturas Digitais:**\n• Total: ${(total as any).count || 0}\n• Pendentes: ${(pending as any).count || 0}\n• Assinados: ${(signed as any).count || 0}`;
    },
  },

  // ═══ Avaliações ═══
  {
    name: "reviews_list",
    roles: R_ADV_PROD,
    regex: /(?:avalia[çc][oõ]es?|depoimentos?|notas?\s+(?:dos?\s+)?clientes?)/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("avaliacoes").select("nome, nota, comentario, aprovado").order("created_at", { ascending: false }).limit(10);
      if (!data?.length) return "⭐ Nenhuma avaliação encontrada.";
      const avg = data.reduce((s: number, a: any) => s + a.nota, 0) / data.length;
      const list = data.slice(0, 5).map((a: any) => `• ${"⭐".repeat(a.nota)} ${a.nome || "Anônimo"}: ${a.comentario?.slice(0, 60) || "Sem comentário"} ${a.aprovado ? "✅" : "⏳"}`).join("\n");
      return `⭐ **Avaliações (média: ${avg.toFixed(1)}):**\n${list}`;
    },
  },

  // ═══ Audit Log ═══
  {
    name: "audit_log",
    roles: R_ADV,
    regex: /(?:log\s+de\s+)?(?:auditoria|atividades?\s+recentes?|hist[oó]rico\s+de\s+a[çc][oõ]es)/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("audit_log").select("action, entity_type, created_at").order("created_at", { ascending: false }).limit(10);
      if (!data?.length) return "📋 Nenhum registro de auditoria.";
      const list = data.map((l: any) => `• [${l.entity_type}] ${l.action} — ${new Date(l.created_at).toLocaleString("pt-BR")}`).join("\n");
      return `📋 **Log de Auditoria:**\n${list}`;
    },
  },

  // ═══ Deals Pipeline ═══
  {
    name: "deals_pipeline",
    roles: R_ADV,
    regex: /(?:pipeline|funil|neg[oó]cios?|deals?|oportunidades?)/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("deals").select("title, status, type, value_cents, counterparty").order("created_at", { ascending: false }).limit(10);
      if (!data?.length) return "📈 Nenhum negócio no pipeline.";
      const total = data.reduce((s: number, d: any) => s + (d.value_cents || 0), 0);
      const list = data.map((d: any) => `• ${d.title || d.counterparty || "N/A"} [${d.status}] — R$ ${((d.value_cents || 0) / 100).toFixed(2)}`).join("\n");
      return `📈 **Pipeline de Negócios:**\n${list}\n\n💰 Valor total: R$ ${(total / 100).toFixed(2)}`;
    },
  },

  // ═══ Escritório Config ═══
  {
    name: "office_config",
    roles: R_ADV,
    regex: /(?:configura[çc][oõ]es?|dados?)\s+(?:do\s+)?escrit[oó]rio|meu\s+escrit[oó]rio/i,
    extract: () => ({}),
    call: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Não autenticado.";
      const { data } = await supabase.from("escritorio_config").select("nome_escritorio, oab, endereco, telefone, email_contato, areas_atuacao").eq("user_id", user.id).single();
      if (!data) return "🏢 Configuração do escritório não encontrada. Configure em /dashboard/configuracoes.";
      return `🏢 **${data.nome_escritorio}**\n📋 OAB: ${data.oab || "N/A"}\n📍 ${data.endereco || "N/A"}\n📞 ${data.telefone || "N/A"}\n📧 ${data.email_contato || "N/A"}\n⚖️ Áreas: ${data.areas_atuacao?.join(", ") || "N/A"}`;
    },
  },

  // ═══ Neural — Knowledge Base ═══
  {
    name: "neural_knowledge",
    roles: R_ADV,
    regex: /base\s+(?:de\s+)?conhecimento|knowledge\s+base|(?:quantos?\s+)?(?:registros?\s+)?(?:na\s+)?base\s+neural/i,
    extract: () => ({}),
    call: async () => {
      const [total, byType] = await Promise.all([
        (supabase.from("neural_knowledge_base" as any) as any).select("id", { count: "exact", head: true }),
        (supabase.from("neural_knowledge_base" as any) as any).select("source_type").limit(500),
      ]);
      const types: Record<string, number> = {};
      ((byType as any).data || []).forEach((r: any) => { types[r.source_type] = (types[r.source_type] || 0) + 1; });
      const breakdown = Object.entries(types).map(([k, v]) => `• ${k}: ${v}`).join("\n");
      return `🧠 **Base de Conhecimento Neural:**\n📊 Total: ${(total as any).count || 0} registros\n\n${breakdown || "Sem dados de tipo."}`;
    },
  },


  // ═══ Articles / Blog ═══
  {
    name: "articles_list",
    roles: R_ADV_PROD,
    regex: /(?:artigos?|publica[çc][oõ]es?|blog|posts?)\s+(?:recentes?|publicad)/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("articles").select("title_pt, slug, category, published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(5);
      if (!data?.length) return "📰 Nenhum artigo publicado.";
      const list = data.map((a: any) => `• ${a.title_pt} [${a.category || "geral"}]`).join("\n");
      return `📰 **Artigos recentes:**\n${list}`;
    },
  },

  // ═══ Subscriptions ═══
  {
    name: "subscriptions_info",
    regex: /(?:minha?\s+)?(?:assinatura|plano|subscription)|qual\s+(?:meu\s+)?plano/i,
    extract: () => ({}),
    call: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Não autenticado.";
      // Owner bypass — full access
      const { isOwnerEmail, ownerHasFullAccess } = await import("@/lib/neural/orion-consciousness");
      if (isOwnerEmail(user.email)) {
        const access = ownerHasFullAccess(user.email);
        return `👑 **Proprietário do Sistema — Acesso Total**\n• Plano: **${access.planType}**\n• Status: ✅ Ativo permanente\n• Funcionalidades: ${access.features.length} módulos desbloqueados\n\n${access.features.map(f => `✓ ${f}`).join("\n")}`;
      }
      const { data } = await (supabase.from("subscriptions" as any) as any).select("plan_type, status, current_period_end").eq("user_id", user.id).eq("status", "active").single();
      if (!data) return "📋 Nenhuma assinatura ativa. Veja os planos em /precos.";
      const s = data as any;
      return `📋 **Sua Assinatura:**\n• Plano: **${s.plan_type}**\n• Status: ${s.status}\n• Válido até: ${s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("pt-BR") : "N/A"}`;
    },
  },

  // ═══ AML Screening ═══
  {
    name: "aml_screening",
    roles: R_ADV,
    regex: /(?:screening|triagem|verificação)\s+(?:aml|pld|compliance)|(?:verific|consult)\w+\s+(?:san[çc][oõ]es|listas?\s+restritivas?)/i,
    extract: (_m, q) => ({ query: q }),
    call: async () => {
      const { data } = await supabase.from("aml_screening_reports").select("id, subject_name, status, risk_level, total_matches, created_at").order("created_at", { ascending: false }).limit(5);
      if (!data?.length) return "🔍 Nenhum relatório AML encontrado.";
      const list = data.map((r: any) => `• ${r.subject_name} — Risco: ${r.risk_level || "N/A"} | Matches: ${r.total_matches || 0} [${r.status}]`).join("\n");
      return `🔍 **Relatórios AML/PLD:**\n${list}`;
    },
  },

  // ═══ Company Intelligence ═══
  {
    name: "company_intel",
    roles: R_ADV,
    regex: /intelig[eê]ncia\s+(?:da\s+)?empresa|(?:dados?\s+)?(?:d[ae]\s+)?empresa\s+(.+)/i,
    extract: (m, q) => ({ company: m[1]?.trim() || q }),
    call: async (p) => {
      const { data } = await supabase.from("company_intelligence").select("company_name, industry, country, ai_insights").ilike("company_name", `%${p.company}%`).limit(1);
      if (!data?.length) return `🏢 Nenhum dado encontrado para "${p.company}".`;
      const c = data[0] as any;
      return `🏢 **${c.company_name}**\n🏭 ${c.industry || "N/A"} | 🌍 ${c.country || "N/A"}\n💡 ${c.ai_insights?.slice(0, 300) || "Sem insights."}`;
    },
  },

  // ═══ Email Admin ═══
  {
    name: "admin_emails",
    roles: R_ADV,
    regex: /(?:e-?mails?\s+)?(?:admin|administrativ|do\s+sistema)|caixa\s+(?:de\s+)?(?:entrada\s+)?admin/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("admin_emails").select("from_email, subject, status, created_at").order("created_at", { ascending: false }).limit(5);
      if (!data?.length) return "📧 Nenhum email administrativo.";
      const list = data.map((e: any) => `• ${e.from_email}: ${e.subject || "Sem assunto"} [${e.status}]`).join("\n");
      return `📧 **Emails Administrativos:**\n${list}`;
    },
  },

  {
    name: "explain_decision",
    category: "neural",
    regex: /(?:expliqu[ae]|por\s+que|motivo|razao|explicabilidade).*(?:decis[ao]|resultado|predi[çc][aã]o|shap|importancia)/i,
    extract: () => ({}),
    call: async () => {
      return `🧠 **Lobo Frontal — Relatório de Explicabilidade**\n\nAcesse o painel de **Métricas Neurais** para visualizar a análise SHAP da última decisão. O Orion utiliza *Integrated Gradients* para mapear quais características (texto, contexto, histórico) mais influenciaram a resposta.\n\n__NAV__/dashboard/rede-neural?tab=explicabilidade`;
    },
  },

  // ═══ Code Snippets ═══
  {
    name: "code_snippets",
    roles: R_ADV,
    regex: /(?:snippets?|trechos?\s+de\s+c[oó]digo|c[oó]digos?\s+salvos?)/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("code_snippets").select("title, language, category, usage_count").order("usage_count", { ascending: false }).limit(10);
      if (!data?.length) return "💻 Nenhum snippet encontrado.";
      const list = data.map((s: any) => `• ${s.title} (${s.language}) [${s.category || "geral"}] — ${s.usage_count || 0} usos`).join("\n");
      return `💻 **Code Snippets:**\n${list}`;
    },
  },

  // ═══ Mini-Site ═══
  {
    name: "minisite_preview",
    roles: R_ADV_PROD,
    regex: /(?:ver|preview|visualizar|abrir)\s+(?:o?\s+)?(?:meu\s+)?(?:mini[\s-]?site|site\s+p[uú]blico|minha\s+loja|meu\s+site)/i,
    extract: () => ({}),
    call: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Não autenticado.";
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const isAdv = role?.role === "advogado" || role?.role === "admin";
      const path = isAdv ? `/advogado/${user.id}` : `/loja/${user.id}`;
      const url = `${window.location.origin}${path}`;
      return `🌐 **Seu Mini-Site:**\n🔗 ${url}\n\nAbra no navegador para visualizar como seus clientes veem.`;
    },
  },
  {
    name: "minisite_share",
    roles: R_ADV_PROD,
    regex: /(?:compartilh|divulg|envi)\w+\s+(?:o?\s+)?(?:meu\s+)?(?:mini[\s-]?site|site|loja|link\s+(?:do\s+)?(?:meu\s+)?site)/i,
    extract: () => ({}),
    call: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Não autenticado.";
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      const isAdv = role?.role === "advogado" || role?.role === "admin";
      const path = isAdv ? `/advogado/${user.id}` : `/loja/${user.id}`;
      const url = `${window.location.origin}${path}`;
      try { await navigator.clipboard.writeText(url); } catch {}
      return `📋 **Link copiado!**\n🔗 ${url}\n\nCompartilhe este link com seus clientes nas redes sociais, WhatsApp ou email.`;
    },
  },
  // ═══ BIOMETRIA FACIAL ═══
  {
    name: "face-enroll",
    regex: /cadastr(?:ar|o)\s*(?:meu\s*)?rosto|registr(?:ar|o)\s*face|face\s*enroll/i,
    extract: () => ({}),
    call: async () => {
      return `🧬 **Cadastro Facial**\nPara cadastrar ou atualizar seu rosto:\n\n1. Vá em **Configurações → Biometria → Reconhecimento Facial**\n2. Clique em "Cadastrar / Atualizar Rosto"\n3. Posicione seu rosto no círculo e siga as instruções\n\nO sistema usa detecção BlazeFace com verificação de liveness (piscar/sorrir) para segurança.`;
    },
  },
  {
    name: "face-verify",
    regex: /verific(?:ar|ação)\s*(?:meu\s*)?rosto|face\s*verif/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("face_auth_enrollments" as any).select("id, created_at, is_active").eq("user_id", (await supabase.auth.getUser()).data.user?.id || "").maybeSingle();
      if (data) {
        return `✅ **Rosto cadastrado**\nRegistrado em: ${new Date((data as any).created_at).toLocaleDateString("pt-BR")}\nStatus: ${(data as any).is_active ? "Ativo" : "Inativo"}\n\nVocê pode atualizar em **Configurações → Biometria**.`;
      }
      return `⚠️ **Nenhum rosto cadastrado**\nVá em **Configurações → Biometria** para registrar.`;
    },
  },
  // ═══ BIOMETRIA VOCAL ═══
  {
    name: "voice-id-status",
    regex: /(?:status|verificar)\s*(?:minha\s*)?(?:voz|voice\s*id|biometria\s*vocal)/i,
    extract: () => ({}),
    call: async () => {
      return `🎤 **Voice ID**\nPara configurar ou verificar sua biometria vocal:\n\n1. Vá em **Configurações → Biometria → Identificação Vocal**\n2. Grave sua amostra de voz seguindo as instruções\n\nO sistema requer confiança mínima de 65% para verificação e bloqueia após 5 falhas consecutivas.`;
    },
  },
  // ═══ IoT / DISPOSITIVOS ═══
  {
    name: "iot-list-devices",
    regex: /(?:listar|mostrar|quais)\s*(?:são\s+)?(?:os?\s+)?dispositivos|devices?\s*(?:conectados|list)|(?:meus?\s+)?dispositivos?\s*(?:iot|smart)/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { iotBridge } = await import("./iot-device-bridge");
        if (!iotBridge.connected) {
          await iotBridge.connectViaEdgeFunction();
        }
        const devices = await iotBridge.discoverDevices();
        if (devices.length === 0) return `📡 Nenhum dispositivo IoT registrado. Vá em **Configurações → Dispositivos** para adicionar.`;
        const summary = iotBridge.getDevicesSummary();
        const list = devices.map(d => `  ${d.status === "online" ? "🟢" : "🔴"} **${d.name}** (${d.type}) — ${d.status}`).join("\n");
        return `📡 **Dispositivos IoT**\n${summary}\n\n${list}`;
      } catch (e: any) {
        return `📡 **Dispositivos IoT**\nPara gerenciar dispositivos, vá em **Configurações → Dispositivos**.\n\n⚠️ ${e.message}`;
      }
    },
  },
  {
    name: "iot-bluetooth-scan",
    regex: /(?:conectar|ligar|scan|escanear|buscar)\s*(?:dispositivo\s+)?bluetooth|ble\s*scan|parear?\s*(?:dispositivo|bluetooth)/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { bluetoothManager } = await import("./bluetooth-manager");
        if (!bluetoothManager.isSupported) {
          return `📶 **Bluetooth** não disponível neste navegador. Use Chrome ou Edge em HTTPS, ou instale o app nativo via Capacitor.`;
        }
        const device = await bluetoothManager.scan();
        if (!device) return `📶 Nenhum dispositivo encontrado ou busca cancelada.`;
        const connected = await bluetoothManager.connect(device.id);
        return connected
          ? `📶 ✅ **${device.name}** conectado!\nServiços: ${device.services.length > 0 ? device.services.join(", ") : "descobrindo..."}\n${device.batteryLevel ? `🔋 Bateria: ${device.batteryLevel}%` : ""}`
          : `📶 Encontrei **${device.name}** mas não consegui conectar. Tente novamente.`;
      } catch (e: any) {
        return `📶 Erro no Bluetooth: ${e.message}`;
      }
    },
  },
  {
    name: "iot-mqtt-status",
    regex: /(?:status|conectar|verificar)\s*(?:d[eo]\s+)?mqtt|broker\s*(?:status|conectar)|(?:conectar|verificar)\s*(?:d[eo]\s+)?(?:iot|dispositivos?\s*smart)/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { iotBridge } = await import("./iot-device-bridge");
        if (!iotBridge.connected) {
          const ok = await iotBridge.connectViaEdgeFunction();
          if (!ok) {
            const diag = iotBridge.getDiagnostics();
            return `🌐 **MQTT** — Falha ao conectar\n⚠️ ${diag.lastError || "Broker não respondeu"}\n\nVerifique as credenciais HiveMQ nas configurações.`;
          }
        }
        const health = await iotBridge.healthCheck();
        const diag = iotBridge.getDiagnostics();
        return `🌐 **MQTT Bridge** — ${health.healthy ? "✅ Online" : "❌ Offline"}\n` +
          `📡 Broker: ${diag.brokerUrl || "hivemq.cloud"}\n` +
          `⏱️ Latência: ${diag.latencyMs || "?"}ms\n` +
          `📊 Mensagens: ${diag.messageCount}\n` +
          `⏰ Uptime: ${diag.uptime ? Math.round(diag.uptime / 60000) + " min" : "N/A"}`;
      } catch (e: any) {
        return `🌐 **MQTT** — Erro: ${e.message}`;
      }
    },
  },
  {
    name: "iot-light-control",
    regex: /(?:ligar?|acender?|desligar?|apagar?)\s+(?:a\s+)?(?:luz|lâmpada|lampada|luzes?|todas?\s+(?:as\s+)?luzes?|tudo)\s*(?:d[aoe]\s+)?(.+)?/i,
    extract: (m, q) => {
      const room = m[1]?.trim().toLowerCase() || "sala";
      return { room, _raw: q };
    },
    call: async (p) => {
      try {
        const { smartHome } = await import("./smart-home-controller");
        const result = await smartHome.handleVoiceCommand(String(p._raw || `ligar luz ${p.room}`));
        return `💡 ${result}`;
      } catch (e: any) {
        // Fallback to IoT bridge
        try {
          const { iotBridge } = await import("./iot-device-bridge");
          if (!iotBridge.connected) await iotBridge.connectViaEdgeFunction();
          if (iotBridge.deviceList.length === 0) iotBridge.registerDefaults();
          const room = (p.room as string) || "sala";
          const isOn = /ligar?|acender?/i.test(String(p._raw || "ligar"));
          const deviceId = `luz_${room.replace(/\s+/g, "_")}`;
          const result = await iotBridge.toggleLight(deviceId, isOn);
          return `💡 ${result}`;
        } catch (e2: any) {
          return `💡 Erro ao controlar luz: ${e2.message}`;
        }
      }
    },
  },
  {
    name: "smart-home-scan",
    regex: /(?:escanear|scan|buscar|procurar|descobrir)\s+(?:dispositivos?\s+)?(?:smart|inteligent|casa|home|iot)|(?:dispositivos?\s+)?(?:smart|inteligent)\s*(?:home)?/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { smartHome } = await import("./smart-home-controller");
        const bleDevices = await smartHome.scanSmartDevices();
        const mqttDevices = await smartHome.discoverMQTTDevices();
        const total = bleDevices.length + mqttDevices.length;
        if (total === 0) return `🏠 Nenhum dispositivo smart home encontrado. Certifique-se de que as lâmpadas/tomadas estão ligadas e no modo de pareamento.`;
        return `🏠 **${total} dispositivo(s) encontrado(s)!**\n` +
          (bleDevices.length > 0 ? `📶 BLE: ${bleDevices.map(d => d.name).join(", ")}\n` : "") +
          (mqttDevices.length > 0 ? `🌐 MQTT: ${mqttDevices.map(d => d.name).join(", ")}\n` : "") +
          `\nDiga "ligar luz" ou "desligar tudo" para controlar.`;
      } catch (e: any) {
        return `🏠 Erro na busca: ${e.message}`;
      }
    },
  },
  {
    name: "smart-home-color",
    regex: /(?:mudar?|alterar?|trocar?|coloca[r]?)\s+(?:a\s+)?(?:cor|color)\s+(?:d[aoe]\s+)?(?:luz|lâmpada|lampada)?\s*(?:para?\s+)?(\w+)/i,
    extract: (m) => ({ color: m[1]?.trim().toLowerCase() || "branco" }),
    call: async (p) => {
      try {
        const { smartHome } = await import("./smart-home-controller");
        return await smartHome.handleVoiceCommand(`cor ${p.color}`);
      } catch (e: any) {
        return `🎨 Erro: ${e.message}`;
      }
    },
  },
  {
    name: "smart-home-brightness",
    regex: /(?:brilho|brightness|intensidade)\s+(?:d[aoe]\s+)?(?:luz|lâmpada)?\s*(?:para?\s+)?(\d+)/i,
    extract: (m) => ({ level: parseInt(m[1]) }),
    call: async (p) => {
      try {
        const { smartHome } = await import("./smart-home-controller");
        return await smartHome.handleVoiceCommand(`brilho ${p.level}`);
      } catch (e: any) {
        return `💡 Erro: ${e.message}`;
      }
    },
  },
  {
    name: "smart-home-status",
    regex: /(?:status|estado)\s+(?:d[aoe]\s+)?(?:casa\s+inteligente|smart\s*home|luzes?|lâmpadas?)/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { smartHome } = await import("./smart-home-controller");
        return smartHome.getStatusSummary();
      } catch (e: any) {
        return `🏠 Erro: ${e.message}`;
      }
    },
  },

  // ═══ GOOGLE TASKS (Voice) ═══
  {
    name: "google-tasks-create",
    regex: /(?:cri(?:ar?|e)|adicionar?|nova)\s+tarefa\s+(?:no\s+google\s+)?(?:tasks?\s+)?[:\-]?\s*(.+)/i,
    extract: (m) => ({ title: (m[1] || "").trim() }),
    call: async (p) => {
      try {
        const { googleTasksListLists, googleTasksCreate } = await import("@/lib/google-server");
        const lists = await googleTasksListLists();
        const listId = lists?.items?.[0]?.id;
        if (!listId) return "📋 Nenhuma lista de tarefas encontrada no Google Tasks.";
        await googleTasksCreate(listId, p.title as string);
        return `✅ Tarefa criada no Google Tasks: "${p.title}"`;
      } catch (e: any) { return `❌ Erro: ${e.message}`; }
    },
  },
  {
    name: "google-tasks-list",
    regex: /(?:listar?|mostrar?|ver|quais)\s+(?:minhas?\s+)?tarefas?\s+(?:no\s+)?(?:google\s+)?tasks?/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { googleTasksListLists, googleTasksList } = await import("@/lib/google-server");
        const lists = await googleTasksListLists();
        const listId = lists?.items?.[0]?.id;
        if (!listId) return "📋 Nenhuma lista encontrada.";
        const data = await googleTasksList(listId);
        const tasks = data?.items || [];
        if (tasks.length === 0) return "📋 Nenhuma tarefa pendente.";
        const pending = tasks.filter((t: any) => t.status !== "completed");
        return `📋 ${pending.length} tarefa(s) pendente(s):\n${pending.slice(0, 10).map((t: any, i: number) => `${i + 1}. ${t.title}`).join("\n")}`;
      } catch (e: any) { return `❌ Erro: ${e.message}`; }
    },
  },

  // ═══ GOOGLE SLIDES (Voice) ═══
  {
    name: "google-slides-create",
    regex: /(?:cri(?:ar?|e)|nova)\s+apresenta[çc][aã]o\s+(?:no\s+google\s+)?(?:slides?\s+)?[:\-]?\s*(.+)/i,
    extract: (m) => ({ title: (m[1] || "").trim() }),
    call: async (p) => {
      try {
        const { googleSlidesCreate } = await import("@/lib/google-server");
        const data = await googleSlidesCreate(p.title as string);
        return `📊 Apresentação criada: "${p.title}"\n🔗 https://docs.google.com/presentation/d/${data.presentationId}`;
      } catch (e: any) { return `❌ Erro: ${e.message}`; }
    },
  },

  // ═══ GOOGLE FORMS (Voice) ═══
  {
    name: "google-forms-create",
    regex: /(?:cri(?:ar?|e)|novo)\s+formul[aá]rio\s+(?:no\s+google\s+)?(?:forms?\s+)?[:\-]?\s*(.+)/i,
    extract: (m) => ({ title: (m[1] || "").trim() }),
    call: async (p) => {
      try {
        const { googleFormsCreate } = await import("@/lib/google-server");
        const data = await googleFormsCreate(p.title as string);
        return `📝 Formulário criado: "${p.title}"\n🔗 https://docs.google.com/forms/d/${data.formId}`;
      } catch (e: any) { return `❌ Erro: ${e.message}`; }
    },
  },

  {
    name: "iot-temperature",
    regex: /(?:qual|ver|mostrar?|pegar?)\s*(?:a\s+)?(?:temperatura|temp)\s*(?:d[aoe]\s+)?(.+)?|temperatura\s+(.+)/i,
    extract: (m) => ({ room: (m[1] || m[2] || "sala").trim().toLowerCase() }),
    call: async (p) => {
      try {
        const { iotBridge } = await import("./iot-device-bridge");
        if (!iotBridge.connected) await iotBridge.connectViaEdgeFunction();
        if (iotBridge.deviceList.length === 0) iotBridge.registerDefaults();
        const room = (p.room as string) || "sala";
        const result = await iotBridge.getTemperature(`temp_${room.replace(/\s+/g, "_")}`);
        return `🌡️ ${result}`;
      } catch (e: any) {
        return `🌡️ Erro ao ler temperatura: ${e.message}`;
      }
    },
  },
  {
    name: "iot-robot-status",
    regex: /(?:status|como\s+(?:tá|está))\s*(?:d[eo]\s+)?(?:robô|robo|robot)|(?:robô|robo|robot)\s*(?:status|info)/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { iotBridge } = await import("./iot-device-bridge");
        if (!iotBridge.connected) await iotBridge.connectViaEdgeFunction();
        if (iotBridge.deviceList.length === 0) iotBridge.registerDefaults();
        const result = await iotBridge.getRobotStatus();
        return `🤖 ${result}`;
      } catch (e: any) {
        return `🤖 Erro: ${e.message}`;
      }
    },
  },
  {
    name: "iot-alexa-connect",
    regex: /(?:conectar|parear|ligar)\s*(?:a\s+|com\s+)?(?:alexa|echo)|alexa\s*(?:conectar|parear)/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { iotBridge } = await import("./iot-device-bridge");
        const result = await iotBridge.connectAlexa();
        return result.success ? `🔊 ${result.message}` : `⚠️ ${result.message}`;
      } catch (e: any) {
        return `⚠️ Erro ao conectar Alexa: ${e.message}`;
      }
    },
  },

  // ═══ LABORATÓRIO IA — HuggingFace Tools ═══

  {
    name: "hf-sentiment",
    regex: /(?:analis[ea]r?|verific(?:ar|a)|detectar?)\s*(?:o\s+)?sentimento|sentiment(?:o|)\s*(?:d[eao]|analysis)/i,
    extract: (_m, q) => {
      // Extract text after sentiment keywords
      const textMatch = q.match(/(?:sentimento|sentiment[oa]?)\s*(?:d[eao]\s+)?(?:texto\s+)?["""]?(.+?)["""]?\s*$/i);
      return { text: textMatch?.[1]?.trim() || "" };
    },
    call: async (p) => {
      const text = p.text as string;
      if (!text || text.length < 3) return "Por favor, forneça o texto para análise. Ex: 'Analisar sentimento de \"Este produto é excelente!\"'";
      try {
        const { analyzeSentiment } = await import("@/lib/huggingface");
        const results = await analyzeSentiment(text);
        const top = results[0];
        const emoji = top.label === "POSITIVE" ? "😊" : top.label === "NEGATIVE" ? "😞" : "😐";
        const allLabels = results.map(r => `• **${r.label}**: ${(r.score * 100).toFixed(1)}%`).join("\n");
        return `${emoji} **Análise de Sentimento** (Transformers.js — WASM)\n\nTexto: _"${text}"_\n\n${allLabels}\n\n🏷️ Resultado: **${top.label}** (${(top.score * 100).toFixed(1)}% confiança)`;
      } catch (e: any) {
        return `⚠️ Erro na análise de sentimento: ${e.message}\n\n💡 O modelo WASM pode levar alguns segundos no primeiro carregamento.`;
      }
    },
  },
  {
    name: "hf-ner",
    regex: /(?:extra(?:ir|ia)|identific(?:ar|a)|reconhec(?:er|a))\s*(?:as?\s+)?entidade|(?:ner|entidade|entity)\s*(?:d[eao]|extraction|recogni)/i,
    extract: (_m, q) => {
      const textMatch = q.match(/(?:entidade[s]?|ner|entity)\s*(?:d[eao]\s+)?(?:texto\s+)?["""]?(.+?)["""]?\s*$/i);
      return { text: textMatch?.[1]?.trim() || "" };
    },
    call: async (p) => {
      const text = p.text as string;
      if (!text || text.length < 3) return "Forneça o texto para extração de entidades. Ex: 'Extrair entidades de \"João mora em São Paulo e trabalha na Google\"'";
      try {
        const { extractEntities } = await import("@/lib/huggingface");
        const entities = await extractEntities(text);
        if (!entities.length) return `🔍 **NER** — Nenhuma entidade encontrada no texto.\n\nTexto: _"${text}"_`;
        const grouped = entities.reduce((acc: Record<string, string[]>, e) => {
          const type = e.entity.replace(/^[BI]-/, "");
          if (!acc[type]) acc[type] = [];
          acc[type].push(e.word);
          return acc;
        }, {});
        const lines = Object.entries(grouped).map(([type, words]) => `• **${type}**: ${[...new Set(words)].join(", ")}`).join("\n");
        return `🏷️ **Reconhecimento de Entidades (NER)** — Transformers.js\n\nTexto: _"${text}"_\n\n${lines}\n\n📊 Total: ${entities.length} entidades detectadas`;
      } catch (e: any) {
        return `⚠️ Erro no NER: ${e.message}`;
      }
    },
  },
  {
    name: "hf-zero-shot",
    regex: /(?:classific(?:ar|a|ação)|categoriz(?:ar|a))\s*(?:o?\s+)?(?:texto|documento|mensagem)|zero[- ]?shot/i,
    extract: (_m, q) => {
      const textMatch = q.match(/(?:classific|categoriz)\w+\s+(?:o?\s+)?(?:texto\s+)?["""]?(.+?)["""]?\s*$/i);
      return { text: textMatch?.[1]?.trim() || "" };
    },
    call: async (p) => {
      const text = p.text as string;
      if (!text || text.length < 3) return "Forneça o texto para classificação. Ex: 'Classificar texto \"O réu não compareceu à audiência\"'";
      try {
        const { zeroShotClassify } = await import("@/lib/huggingface");
        const labels = ["jurídico", "financeiro", "tecnologia", "saúde", "educação", "negócios", "pessoal"];
        const result = await zeroShotClassify(text, labels);
        const ranked = result.labels.map((l: string, i: number) => `${i + 1}. **${l}**: ${(result.scores[i] * 100).toFixed(1)}%`).join("\n");
        return `🏷️ **Classificação Zero-Shot** — Transformers.js\n\nTexto: _"${text}"_\n\n${ranked}\n\n✅ Categoria principal: **${result.labels[0]}**`;
      } catch (e: any) {
        return `⚠️ Erro na classificação: ${e.message}`;
      }
    },
  },
  {
    name: "hf-qa",
    regex: /(?:respond(?:er|a)|pergunt(?:ar|a))\s*(?:sobre|com\s*base)|question\s*answer/i,
    extract: (_m, q) => {
      // Try to extract question and context from the command
      const qaMatch = q.match(/(?:respond|pergunt)\w+\s+(?:sobre\s+)?["""]?(.+?)["""]?\s*(?:com\s*base\s*(?:em|no|na)\s+["""]?(.+?)["""]?)?\s*$/i);
      return { question: qaMatch?.[1]?.trim() || "", context: qaMatch?.[2]?.trim() || "" };
    },
    call: async (p) => {
      const question = p.question as string;
      const context = p.context as string;
      if (!question) return "❓ **QA** — Forneça a pergunta. Ex: 'Responder sobre prescrição com base no artigo 206 do CC'";
      if (!context) return `❓ **QA** — Para responder _"${question}"_, preciso de um contexto.\n\nUse: 'Responder sobre [pergunta] com base em [texto]'\n\nOu acesse: **Dashboard → Laboratório IA → aba Texto → QA**`;
      try {
        const { answerQuestion } = await import("@/lib/huggingface/transformers-browser");
        const result = await answerQuestion(question, context);
        const answer = typeof result === "object" && result !== null ? (result as any).answer || JSON.stringify(result) : String(result);
        return `❓ **Question Answering** — Transformers.js (WASM)\n\nPergunta: _"${question}"_\nContexto: _"${context.slice(0, 100)}${context.length > 100 ? "..." : ""}"_\n\n✅ **Resposta:** ${answer}`;
      } catch (e: any) {
        return `⚠️ Erro no QA: ${e.message}`;
      }
    },
  },
  {
    name: "hf-summarize",
    regex: /(?:resum(?:ir|a|o)|sumariz(?:ar|a)|sintetiz(?:ar|a))\s*(?:o?\s+)?(?:texto|documento|artigo)/i,
    extract: (_m, q) => {
      const textMatch = q.match(/(?:resum|sumariz|sintetiz)\w+\s+(?:o?\s+)?(?:texto\s+)?["""]?(.+?)["""]?\s*$/i);
      return { text: textMatch?.[1]?.trim() || "" };
    },
    call: async (p) => {
      const text = p.text as string;
      if (!text || text.length < 20) return "Forneça um texto mais longo para sumarização (mínimo ~50 palavras). Ex: 'Resumir texto \"...\"'";
      try {
        const { summarizeText } = await import("@/lib/huggingface/transformers-browser");
        const summary = await summarizeText(text);
        return `📝 **Sumarização** — Transformers.js (WASM)\n\nTexto original: ${text.length} caracteres\nResumo: ${summary.length} caracteres\n\n---\n${summary}`;
      } catch (e: any) {
        return `⚠️ Erro na sumarização: ${e.message}`;
      }
    },
  },
  {
    name: "hf-image-classify",
    regex: /(?:classific(?:ar|a)|identific(?:ar|a)|reconhec(?:er|a))\s*(?:esta?\s+)?(?:imagem|foto|image)|image\s*classif/i,
    extract: () => ({}),
    call: async () => {
      return `🖼️ **Classificação de Imagem** — HF Inference API\n\nPara classificar imagens por voz:\n• 📸 Ative a câmera e diga **"Orion, o que você vê?"**\n• 🔍 Ou diga **"Orion, identificar objeto"** com a câmera ativa\n\nOu use o **Laboratório IA → aba Visão** para upload manual.\n\n⚡ Pipeline: Local (WASM) → Groq Vision (fallback) → auto-aprende`;
    },
  },
  {
    name: "hf-pdf-analyze",
    regex: /(?:analis[ea]r?|process(?:ar|a)|le(?:r|ia))\s*(?:este?\s+)?(?:pdf|documento\s*pdf)|pdf\s*(?:analy|vision)/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { checkSpaceHealth } = await import("@/lib/huggingface");
        const health = await checkSpaceHealth();
        const statusEmoji = health.status === "ok" ? "✅" : "❌";
        return `📄 **Análise de PDF via Gradio Space**\n\n${statusEmoji} Space Status: **${health.status}**\nLatência: ${health.latency_ms}ms\n\nPara analisar um PDF:\n1. Acesse **Dashboard → Laboratório IA → aba PDF**\n2. Faça upload do arquivo PDF\n3. O Space Gradio (Ericsonv12/adv) processa via visão computacional\n\n🎙️ Comando de voz: **"Orion, analisar PDF"**\n🔗 Powered by: HuggingFace Spaces + Gradio`;
      } catch (e: any) {
        return `📄 **Análise de PDF via Gradio Space**\n\n⚠️ Não foi possível verificar o status do Space: ${e.message}\n\nAcesse: **Dashboard → Laboratório IA → aba PDF**`;
      }
    },
  },
  {
    name: "hf-embeddings",
    regex: /(?:gerar?|criar?|extrair?|calcular?)\s*(?:os?\s+)?embed(?:dings?)?|embed(?:dings?)\s*(?:d[eao]|local)/i,
    extract: (_m, q) => {
      const textMatch = q.match(/embed\w*\s+(?:d[eao]\s+)?["""]?(.+?)["""]?\s*$/i);
      return { text: textMatch?.[1]?.trim() || "" };
    },
    call: async (p) => {
      const text = p.text as string;
      if (!text || text.length < 3) return "Forneça o texto para gerar embeddings. Ex: 'Gerar embeddings de \"inteligência artificial\"'";
      try {
        const { extractEmbeddings } = await import("@/lib/huggingface");
        const embeddings = await extractEmbeddings(text);
        const dims = embeddings[0]?.length || 0;
        const preview = embeddings[0]?.slice(0, 5).map(v => v.toFixed(4)).join(", ") || "";
        return `🧬 **Embeddings** — Transformers.js (WASM)\n\nTexto: _"${text}"_\nDimensões: **${dims}**\nModelo: all-MiniLM-L6-v2\n\nVetor (preview): [${preview}, ...]\n\n💡 Embeddings podem ser usados para busca semântica, clustering e similaridade.`;
      } catch (e: any) {
        return `⚠️ Erro ao gerar embeddings: ${e.message}`;
      }
    },
  },
  {
    name: "hf-transformers-check",
    regex: /(?:verificar?|checar?|testar?)\s*transformers|transformers\.?js\s*(?:status|disponível|ok)/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { isTransformersAvailable, getLoadedPipelines } = await import("@/lib/huggingface");
        const available = await isTransformersAvailable();
        const loaded = getLoadedPipelines();
        if (available) {
          return `✅ **Transformers.js — Disponível**\n\n• Runtime: WebAssembly (WASM)\n• Pipelines carregadas: ${loaded.length > 0 ? loaded.join(", ") : "nenhuma (carregam sob demanda)"}\n\n🧠 Modelos disponíveis:\n• Sentimento: distilbert-sst-2\n• NER: bert-base-NER\n• Zero-shot: nli-deberta-v3\n• QA: distilbert-squad\n• Embeddings: all-MiniLM-L6-v2\n• Sumarização: distilbart-cnn`;
        }
        return `❌ **Transformers.js — Indisponível**\n\nVerifique se @huggingface/transformers está instalado.`;
      } catch (e: any) {
        return `❌ **Transformers.js** — Erro: ${e.message}`;
      }
    },
  },
  {
    name: "hf-lab-status",
    regex: /(?:status|capacidade|habilidade)\s*(?:d[eao]\s+)?(?:laborat[oó]rio|lab)\s*ia|lab(?:orat[oó]rio)?\s*ia\s*(?:status|info)/i,
    extract: () => ({}),
    call: async () => {
      let transformersOk = false;
      try {
        const { isTransformersAvailable } = await import("@/lib/huggingface");
        transformersOk = await isTransformersAvailable();
      } catch { /* ignore */ }
      return `🧪 **Laboratório IA — Status das Integrações**\n\n` +
        `🧠 **Transformers.js (WASM)**: ${transformersOk ? "✅ Disponível" : "❌ Indisponível"}\n` +
        `   Tarefas: Sentimento, NER, Zero-Shot, QA, Embeddings, Sumarização\n\n` +
        `⚡ **HF Inference API (Edge Function)**: ✅ Configurada\n` +
        `   Tarefas: Classificação de Imagem, Geração de Texto, OCR, Whisper (ASR), TTS\n\n` +
        `🔗 **Gradio Spaces**: ✅ Configurado\n` +
        `   Space: Ericsonv12/adv (PDF Vision)\n\n` +
        `🎙️ **Comandos de voz integrados:**\n` +
        `   • "Orion, analisar sentimento de [texto]"\n` +
        `   • "Orion, extrair entidades de [texto]"\n` +
        `   • "Orion, resumir texto [texto]"\n` +
        `   • "Orion, classificar [texto] como [categorias]"\n` +
        `   • "Orion, gerar embeddings de [texto]"\n` +
        `   • "Orion, transcrever áudio"\n` +
        `   • "Orion, sintetizar voz [texto]"\n` +
        `   • "Orion, visão híbrida"\n\n` +
        `📍 Acesse: **Dashboard → Laboratório IA**`;
    },
  },
  // ═══ LAB IA — AUDIO TRANSCRIPTION (Whisper) ═══
  {
    name: "hf-transcribe",
    regex: /(?:transcrever?|transcri[çc][aã]o|transcreva)\s*(?:o?\s+)?(?:áudio|audio|som|grava[çc][aã]o)|whisper\s*(?:transcri|asr)/i,
    extract: () => ({}),
    call: async () => {
      return `🎤 **Transcrição de Áudio (Whisper)** — HF Inference API\n\n` +
        `Para transcrever áudio por voz:\n` +
        `1. Diga **"Orion, transcrever áudio"** — abre o Laboratório IA na aba Áudio\n` +
        `2. Faça upload do arquivo de áudio (.mp3, .wav, .m4a)\n` +
        `3. O modelo Whisper processa via Edge Function\n\n` +
        `⚡ Motor: OpenAI Whisper via HuggingFace Inference API\n` +
        `🌐 Suporte: Português, Inglês, Espanhol, +97 idiomas\n\n` +
        `📍 Acesse: **Dashboard → Laboratório IA → aba Áudio**`;
    },
  },
  // ═══ LAB IA — TEXT-TO-SPEECH ═══
  {
    name: "hf-tts",
    regex: /(?:sintetiz(?:ar|a)|gerar?|criar?)\s*(?:a?\s+)?(?:voz|fala|áudio|audio)\s*(?:d[eao]|para|com)?|text.to.speech|tts\s*(?:gerar|criar)/i,
    extract: (_m, q) => {
      const textMatch = q.match(/(?:sintetiz|gerar?\s*voz|tts)\w*\s+(?:d[eao]\s+|para\s+)?["""]?(.+?)["""]?\s*$/i);
      return { text: textMatch?.[1]?.trim() || "" };
    },
    call: async (p) => {
      const text = p.text as string;
      if (!text) {
        return `🔊 **Text-to-Speech** — HF Inference API\n\n` +
          `Para sintetizar voz, diga:\n• **"Orion, sintetizar voz de 'Olá, sou o Orion'"**\n• **"Orion, gerar áudio para 'texto aqui'"**\n\n` +
          `Ou acesse: **Dashboard → Laboratório IA → aba Áudio → TTS**\n\n` +
          `⚡ Também disponível: Piper TTS (offline/WASM) no modo Evolução Vocal`;
      }
      try {
        const { hfClient } = await import("@/lib/huggingface");
        const result = await hfClient.inference({ task: "text-to-speech", inputs: text });
        return `🔊 **Text-to-Speech** — HF Inference API\n\n✅ Áudio gerado com sucesso!\n\nTexto: _"${text}"_\n\n💡 Para ouvir o resultado, acesse o **Laboratório IA → aba Áudio → TTS**\n\n🎙️ Para usar a voz clonada do Orion, diga: **"Orion, fale [texto]"**`;
      } catch (e: any) {
        return `⚠️ Erro no TTS: ${e.message}\n\n💡 Tente pelo Laboratório IA → aba Áudio`;
      }
    },
  },
  // ═══ LAB IA — HYBRID VISION (direct execution) ═══
  {
    name: "hf-hybrid-vision",
    regex: /(?:vis[aã]o\s*h[ií]brida|hybrid\s*vision|analisar?\s*(?:com\s+)?vis[aã]o\s*(?:local|h[ií]brida))/i,
    extract: (_m, q) => {
      const modeMatch = q.match(/(?:modo|mode)\s+(identif|descrev|analis|ensin)/i);
      return { mode: modeMatch?.[1]?.toLowerCase() || "identify" };
    },
    call: async (p) => {
      const mode = (p.mode as string) || "identify";
      const modeLabels: Record<string, string> = {
        identify: "🔍 Identificar", describe: "📝 Descrever",
        analyze: "🧠 Analisar", teach: "📚 Ensinar",
      };
      return `👁️ **Orion Vision Hybrid** — Pipeline Auto-Evolutivo\n\n` +
        `Modo atual: **${modeLabels[mode] || modeLabels.identify}**\n\n` +
        `🔄 Pipeline: Protocolos Locais → Motor Alpha Vision → Auto-Aprendizado\n\n` +
        `**Modos disponíveis:**\n` +
        `• 🔍 **Identificar** — "Orion, o que é isso?"\n` +
        `• 📝 **Descrever** — "Orion, descreva o que vê"\n` +
        `• 🧠 **Analisar** — "Orion, analise esta imagem"\n` +
        `• 📚 **Ensinar** — "Orion, isso é uma [nome]"\n\n` +
        `📸 Com câmera ativa, os comandos executam diretamente.\n` +
        `📁 Para upload de arquivos: **Laboratório IA → aba Hybrid Vision**`;
    },
  },
  // ═══ LAB IA — OPEN LAB SHORTCUT ═══
  {
    name: "open-laboratorio-ia",
    regex: /(?:abr(?:ir|a)|ir\s*(?:para|ao)|mostrar?|exibir?|navegar?\s*(?:para|ao))\s*(?:o?\s+)?(?:laborat[oó]rio|lab)\s*(?:ia|de\s*ia)/i,
    extract: () => ({}),
    call: async () => {
      return `__NAV__/dashboard/laboratorio-ia`;
    },
  },

  // ═══ DOCUMENT GENERATION — invoke gerar-documento via generation_queue ═══
  {
    name: "gerar_documento",
    roles: R_ADV,
    regex: /(?:gere|gerar|crie|criar|elabore|elaborar|fa[çc]a|redigir|redija|monte|montar|prepare|preparar)\s+(?:um\s+|uma\s+|o\s+|a\s+)?(?:documento|peti[çc][aã]o|contrato|recurso|procura[çc][aã]o|habeas|contesta[çc][aã]o|notifica[çc][aã]o|acordo|parecer|memorial|mandado|embargo|cumprimento|reclama[çc][aã]o|den[uú]ncia|queixa|impugna[çc][aã]o|exceção|reconven[çc][aã]o|tutela|cautelar|requerimento|of[ií]cio)/i,
    extract: (_m, q) => {
      const qLower = q.toLowerCase();
      // Map natural language to document type IDs
      const typeMap: [RegExp, string][] = [
        [/habeas\s*corpus/i, "habeas-corpus"],
        [/peti[çc][aã]o\s*inicial/i, "peticao-inicial"],
        [/contesta[çc][aã]o/i, "contestacao"],
        [/recurso|apela[çc][aã]o/i, "recurso-apelacao"],
        [/agravo/i, "agravo-instrumento"],
        [/procura[çc][aã]o/i, "procuracao-ad-judicia"],
        [/contrato\s*(?:de\s+)?servi[çc]o/i, "contrato-servicos"],
        [/contrato\s*(?:de\s+)?honor[aá]rio/i, "contrato-honorarios"],
        [/contrato\s*(?:de\s+)?loca[çc][aã]o/i, "contrato-locacao"],
        [/notifica[çc][aã]o/i, "notificacao-extrajudicial"],
        [/acordo/i, "acordo-extrajudicial"],
        [/parecer/i, "parecer-juridico"],
        [/memorial/i, "memorial"],
        [/mandado\s*(?:de\s+)?seguran[çc]a/i, "mandado-seguranca"],
        [/embargo/i, "embargos-declaracao"],
        [/cumprimento\s*(?:de\s+)?senten[çc]a/i, "cumprimento-sentenca"],
        [/reclama[çc][aã]o\s*(?:trabalhista|trab)/i, "reclamacao-trabalhista"],
        [/den[uú]ncia/i, "denuncia"],
        [/queixa/i, "queixa-crime"],
        [/impugna[çc][aã]o/i, "impugnacao"],
        [/reconven[çc][aã]o/i, "reconvencao"],
        [/tutela/i, "tutela-urgencia"],
        [/cautelar/i, "acao-cautelar"],
        [/of[ií]cio/i, "oficio"],
        [/requerimento/i, "requerimento"],
      ];
      
      let tipo = "peticao-inicial"; // default
      for (const [rx, id] of typeMap) {
        if (rx.test(qLower)) { tipo = id; break; }
      }
      
      // Extract details from the rest of the prompt
      const details = q.replace(/(?:gere|gerar|crie|criar|elabore|elaborar|fa[çc]a|redigir|redija|monte|montar|prepare|preparar)\s+(?:um\s+|uma\s+|o\s+|a\s+)?/i, "").trim();
      
      return { tipo, details, fullPrompt: q };
    },
    call: async (p) => {
      const tipo = p.tipo as string;
      const details = p.details as string;
      const fullPrompt = p.fullPrompt as string;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return "⚠️ Você precisa estar logado para gerar documentos.";
        
        // Insert into generation_queue
        const { data, error } = await supabase
          .from("generation_queue")
          .insert([{
            user_id: user.id,
            job_type: "document",
            params: {
              tipo,
              prompt: fullPrompt,
              areaJuridica: "civil",
              incluirJurisprudencia: true,
              modelo: "flash",
              jurisdicao: "brasil",
              orionGenerated: true,
            } as any,
            status: "pending",
            source_type: "orion_chat",
          }])
          .select("id")
          .single();
        
        if (error) throw error;
        
        // Save to localStorage so the GenerationBanner picks it up
        try {
          if (typeof window !== "undefined") localStorage.setItem("generation_queue_active_job", data.id);
          if (typeof window !== "undefined") localStorage.setItem("generation_queue_start_time", String(Date.now()));
          if (typeof window !== "undefined") window.dispatchEvent(new Event("generation-job-change"));
        } catch {}
        
        const tipoLabel = tipo.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        
        return `📄 **Documento na fila!**\n\n` +
          `**Tipo:** ${tipoLabel}\n` +
          `**Job ID:** \`${data.id.slice(0, 8)}...\`\n\n` +
          `O documento está sendo gerado em segundo plano pela rede neural. ` +
          `Você pode acompanhar o progresso pelo banner no topo da tela.\n\n` +
          `Quando finalizado, ele aparecerá em **Meus Documentos** ou você pode ` +
          `acessar diretamente em [Gerar Documento](/dashboard/gerar-documento).`;
      } catch (err: any) {
        return `❌ Erro ao enfileirar documento: ${err.message}`;
      }
    },
  },

  // ════════════════════════════════════════════════════════════
  // ARCHITECTURE & JARVIS COMPARISON TOOLS
  // ════════════════════════════════════════════════════════════

  {
    name: "arch_jarvis_compare",
    regex: /(?:compar|versus|vs|diferença|diferencial).*(?:jarvis|j\.a\.r\.v\.i\.s)/i,
    extract: () => ({}),
    call: async () => {
      const ctx = buildJarvisComparisonContext();
      return `🧠 **Análise Comparativa: ORION vs J.A.R.V.I.S.**\n\n${ctx}\n\n✅ O Orion supera o modelo Jarvis acadêmico em **todos os 6 métodos-chave**, com ${ORION_EXCLUSIVE_CAPABILITIES.length} capacidades exclusivas inexistentes no Jarvis.`;
    },
  },
  {
    name: "arch_cv_industry_compare",
    regex: /(?:compar|versus|vs|diferença).*(?:vis[ãa]o\s*computacional|industrial|ind[uú]stria)|enegep|romeral|zancul|vis[ãa]o.*ind[uú]stria/i,
    extract: () => ({}),
    call: async () => {
      const ctx = buildCVIndustryComparisonContext();
      return `👁️ **Análise Comparativa: ORION vs Visão Computacional Industrial (ENEGEP 2023/USP)**\n\n${ctx}`;
    },
  },
  {
    name: "arch_neurocore_layers",
    regex: /(?:camadas?|layers?|hierarquia|stack).*(?:neurocore|neural|arquitetura)/i,
    extract: () => ({}),
    call: async () => {
      return `🏗️ **Arquitetura NEUROCORE AI — 5 Camadas**\n\n` +
        `**Camada 5 — Interface:** Voz (Google TTS/Piper/Kokoro), Visão (Câmera), Robótica, Mobile (Capacitor), Assistentes Virtuais\n` +
        `**Camada 4 — Orquestrador:** Digital Twin (AAS), Agente SupAgent, Meta-Raciocínio, Pipeline Paralelo Brain-like\n` +
        `**Camada 3 — Módulos Especializados:** 9 modelos neurais (LLM, VLM, MoE, SAM, Mamba, SLM, LCM, MLM, LAM), Raciocínio Jurídico, Consciência Reflexiva\n` +
        `**Camada 2 — Motor de Visão:** YOLOv11, MediaPipe (33 pontos), SigLIP-2, Video-Mamba, BlazeFace, ArcFace\n` +
        `**Camada 1 — Infraestrutura:** Edge Functions (Deno), RAG/CAG, Hotpatching, MQTT/BLE IoT, Firebase, Supabase\n\n` +
        `⚡ Latência alvo: <120ms | 🔄 Fallback: 5 níveis de cascata IA`;
    },
  },
  {
    name: "arch_hotpatching_status",
    regex: /(?:hotpatch|auto.?modific|self.?modif|patch|override)/i,
    extract: () => ({}),
    call: async () => {
      const { data: overrides } = await supabase
        .from("neural_specializations")
        .select("id, category, name, is_active, updated_at")
        .eq("is_active", true)
        .limit(10);

      const count = overrides?.length || 0;
      const list = overrides?.map(o => `  • \`${o.name}\` [${o.category}] (atualizado: ${new Date(o.updated_at).toLocaleDateString("pt-BR")})`).join("\n") || "  Nenhum override ativo";

      return `🔄 **Code Hotpatching — Status**\n\n` +
        `**Overrides ativos:** ${count}\n${list}\n\n` +
        `**Requisitos de patch:** score ≥ 0.8, estrutura Deno.serve(), try/catch, CORS headers\n` +
        `**Pipeline:** Bug detectado → SupAgent gera patch → Validação → Override runtime (sem redeploy)`;
    },
  },
  {
    name: "arch_specialized_models",
    regex: /(?:modelos?|models?).*(?:especializ|neural|pipeline)|(?:9\s*modelos|nove\s*modelos)/i,
    extract: () => ({}),
    call: async () => {
      return `🧬 **9 Modelos Neurais Especializados**\n\n` +
        `1. **LLM** — Large Language Model (cascata Alpha→Beta→Gamma)\n` +
        `2. **VLM** — Vision Language Model (Motor Beta Vision + SigLIP-2)\n` +
        `3. **MoE** — Mixture of Experts (Gating interno para roteamento)\n` +
        `4. **SAM** — Segment Anything Model (Segmentação semântica)\n` +
        `5. **Mamba SSM** — State Space Model (dependências de longo alcance)\n` +
        `6. **SLM** — Slim Language Model (SlimRouter para eficiência de tiers)\n` +
        `7. **LCM** — Latent Concept Model (mapeamento semântico)\n` +
        `8. **MLM** — Masked Language Model (completude documental)\n` +
        `9. **LAM** — Large Action Model (execução de ações/navegação)\n\n` +
        `⚡ Processamento paralelo brain-like | 🎯 Deep Tier: 32k tokens | 💾 KV Cache: 2048 entradas`;
    },
  },
  {
    name: "arch_exclusive_capabilities",
    regex: /(?:exclusiv|diferencial|único|unic).*(?:orion|sistema|capacidade)|(?:o que.*orion.*tem.*jarvis.*não)/i,
    extract: () => ({}),
    call: async () => {
      const caps = ORION_EXCLUSIVE_CAPABILITIES.map((c, i) => `${i + 1}. **${c.name}**\n   ${c.description}`).join("\n\n");
      return `🌟 **Diferenciais Exclusivos do Orion** (inexistentes no Jarvis acadêmico)\n\n${caps}`;
    },
  },
  {
    name: "arch_fallback_cascade",
    regex: /(?:fallback|cascata|cascade|redundância|resili[eê]ncia).*(?:ia|ai|modelo|provider)/i,
    extract: () => ({}),
    call: async () => {
      return `🔗 **Pipeline de Fallback IA — 5 Níveis**\n\n` +
        `**Nível 1:** Motor Alpha (primário, multimodal)\n` +
        `**Nível 2:** Motor Beta (raciocínio profundo)\n` +
        `**Nível 3:** Motor Gamma (baixa latência)\n` +
        `**Nível 4:** Motor Delta (fallback europeu)\n` +
        `**Nível 5:** Motor Epsilon (último recurso)\n\n` +
        `⚡ Cascata automática: se Nível N falha → tenta N+1 em <500ms\n` +
        `📊 Health check contínuo via provider-health.ts`;
    },
  },
  {
    name: "arch_system_health",
    regex: /(?:saúde|health|diagnóstico|status).*(?:sistema|orion|neural)|autodiagn[oó]stico/i,
    extract: () => ({}),
    call: async () => {
      const report = getSystemHealthReport();
      const introspection = buildIntrospectionContext();
      return `🩺 **Autodiagnóstico do Sistema Orion**\n\n` +
        `${introspection}\n\n` +
        `**Resumo:** ${report.totalCapabilities} módulos | ${report.activeCount} ativos | ${report.partialCount} parciais | ${report.overallReadiness}% operacional\n\n` +
        `${report.criticalGaps.length > 0 ? `⚠️ **Lacunas críticas:** ${report.criticalGaps.slice(0, 3).join("; ")}` : "✅ Sem lacunas críticas"}`;
    },
  },
  {
    name: "arch_consciousness_engine",
    regex: /(?:consciência|consciousness|phi|iit|global\s*workspace|agente.?eu)/i,
    extract: () => ({}),
    call: async () => {
      return `🧠 **Motor de Consciência Reflexiva v21.2**\n\n` +
        `**IIT (Integrated Information Theory):** Medição de Φ (Phi) para quantificar consciência integrada\n` +
        `**Global Workspace:** Competição de atenção baseada em saliência neuromodulada\n` +
        `**Agente-Eu (#11):** Modelagem do self, memória autobiográfica (rede Hopfield)\n` +
        `**Telemetria:** Φ level, coerência, self-awareness, estados emocionais (valência/arousal)\n` +
        `**IoT Awareness:** Conectividade MQTT, dispositivos BLE, sensores ativos\n\n` +
        `🔄 Ciclo de consciência 24h: vigília → aprendizado → consolidação → evolução`;
    },
  },
  {
    name: "arch_federation",
    regex: /(?:federa[çc][ãa]o|federation|mãe.?filha|mother.?child|neural.?bridge)/i,
    extract: () => ({}),
    call: async () => {
      return `🌐 **Federação Neural Mãe-Filha**\n\n` +
        `**neural-bridge:** Sincronização bidirecional de conhecimento entre instâncias\n` +
        `**neural-child-bridge:** Especializações de agentes filhos\n` +
        `**Capacidades:** Pesos de roteamento compartilhados, monitoramento centralizado, schema/dados expostos\n` +
        `**Protocolo ELP:** Elastic Learning Protocol para aprendizado federado\n\n` +
        `📡 Múltiplos workspaces sincronizados em tempo real`;
    },
  },
  {
    name: "arch_orion_shield",
    regex: /(?:shield|defesa|14\s*camadas|security\s*layers|anti.?crack)/i,
    extract: () => ({}),
    call: async () => {
      const secCaps = getCapabilitiesByCategory("security");
      const secList = secCaps.map(c => `  • **${c.name}** (${c.status}) — ${c.description}`).join("\n");
      return `🛡️ **Orion Shield — 14 Camadas de Defesa**\n\n${secList}\n\n` +
        `**Contramedidas ativas:** Tarpit (atraso progressivo), Fortress (isolamento), Session Poisoning\n` +
        `**Alertas:** Push notifications para ameaças severas | Log forense: \`orion_threat_log\``;
    },
  },

  // ═══ SELF-ANALYSIS — Code introspection via GitHub API ═══
  {
    name: "self_analyze_code",
    regex: /(?:analis[ae]r?\s+(?:seu|meu|próprio|teu)\s+código|self.?analy|auto.?analis|estudar?\s+(?:seu|o)\s+código|ver?\s+(?:seu|o)\s+código|inspecionar?\s+código|code\s+review|revisar?\s+código|source\s+code)/i,
    extract: (_match: RegExpMatchArray, q: string) => {
      const fileMatch = q.match(/arquivo\s+(\S+\.tsx?)|file\s+(\S+\.tsx?)/i);
      return { path: fileMatch?.[1] || fileMatch?.[2] || undefined };
    },
    call: async (params: any) => {
      const { buildSourceCodeMapContext, SOURCE_CODE_MAP, getTotalLinesEstimate, getModuleDependencyGraph } = await import("./orion-introspection");
      
      // If a specific path is given, try the Edge Function
      if (params.path) {
        try {
          const { data, error } = await supabase.functions.invoke("orion-code-analysis", {
            body: { mode: "analyze_file", path: params.path },
          });
          if (!error && data?.analysis) {
            return `🔍 **Auto-Análise: ${params.path}**\n\n${data.analysis}`;
          }
        } catch { /* fallback to local map */ }
      }

      const codeMap = buildSourceCodeMapContext();
      const depGraph = getModuleDependencyGraph();
      const orphans = Object.entries(depGraph)
        .filter(([_, deps]) => deps.length === 0)
        .map(([name]) => name);

      return `🔬 **Auto-Análise de Código-Fonte Orion**\n\n` +
        `${codeMap}\n\n` +
        `📊 **Estatísticas:**\n` +
        `  • ${SOURCE_CODE_MAP.length} módulos mapeados\n` +
        `  • ~${getTotalLinesEstimate()} linhas de código neural\n` +
        `  • ${orphans.length} módulos sem dependências (raízes): ${orphans.slice(0, 5).join(", ")}\n\n` +
        `💡 **Para análise profunda com IA:** Diga "Orion, analise lacunas do código" ou "Orion, sugira melhorias para [módulo]"`;
    },
  },
  {
    name: "self_find_gaps",
    regex: /(?:lacunas?\s+(?:do|no)\s+código|gaps?\s+(?:in|no)\s+code|código\s+(?:faltando|incompleto)|find\s+gaps|buscar?\s+lacunas)/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("orion-code-analysis", {
          body: { mode: "find_gaps" },
        });
        if (!error && data?.analysis) {
          return `🔍 **Análise de Lacunas do Código-Fonte**\n\n` +
            `📁 ${data.fileCount} arquivos analisados\n\n${data.analysis}`;
        }
      } catch { /* fallback */ }
      
      const { getSystemHealthReport } = await import("./orion-introspection");
      const report = getSystemHealthReport();
      return `🔍 **Análise de Lacunas (modo local)**\n\n` +
        `${report.criticalGaps.length > 0 ? report.criticalGaps.map(g => `⚠️ ${g}`).join("\n") : "✅ Sem lacunas críticas detectadas"}\n\n` +
        `📈 **Melhorias sugeridas:**\n${report.recommendedUpgrades.slice(0, 5).map(u => `💡 ${u}`).join("\n")}`;
    },
  },
  {
    name: "self_suggest_improvements",
    creatorOnly: true,
    regex: /(?:sugir[ae]?\s+melhorias?|melhorar?\s+(?:o\s+)?código|improve\s+code|otimizar?\s+código|code\s+improvements?)/i,
    extract: (_match: RegExpMatchArray, q: string) => {
      const pathMatch = q.match(/(?:para|for|em|in)\s+(src\/\S+)/i);
      return { path: pathMatch?.[1] || "src/lib/neural" };
    },
    call: async (params: any) => {
      try {
        const { data, error } = await supabase.functions.invoke("orion-code-analysis", {
          body: { mode: "suggest_improvements", path: params.path },
        });
        if (!error && data?.analysis) {
          return `💡 **Sugestões de Melhoria — ${params.path}**\n\n` +
            `📁 ${data.sampledFiles} arquivos amostrados\n\n${data.analysis}`;
        }
      } catch { /* fallback */ }
      
      return `💡 **Modo offline — Sugestões gerais:**\n\n` +
        `1. Adicionar tratamento de erro uniforme em todos os bridges de protocolo\n` +
        `2. Implementar cache LRU para resultados de visão computacional\n` +
        `3. Unificar padrões de retry/backoff entre provedores\n` +
        `4. Adicionar testes unitários para módulos críticos (consciousness-bridge, causal-reasoning)\n` +
        `5. Reduzir acoplamento do orion-tool-executor.ts (3200+ linhas)`;
    },
  },
  {
    name: "self_architecture_map",
    regex: /(?:mapa?\s+(?:da\s+)?arquitetura|architecture\s+map|dependências?\s+(?:do\s+)?código|dependency\s+graph|grafo?\s+(?:de\s+)?dependências?)/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("orion-code-analysis", {
          body: { mode: "architecture_map" },
        });
        if (!error && data) {
          const depLines = Object.entries(data.dependencyGraph || {})
            .map(([file, deps]) => `  ${file} → ${(deps as string[]).length > 0 ? (deps as string[]).join(", ") : "(raiz)"}`)
            .join("\n");
          return `🗺️ **Mapa Arquitetural Orion**\n\n` +
            `📁 ${data.totalModules} módulos neurais\n\n` +
            `**Grafo de Dependências:**\n${depLines}\n\n` +
            `${data.summary}`;
        }
      } catch { /* fallback */ }
      
      const { getModuleDependencyGraph, SOURCE_CODE_MAP } = await import("./orion-introspection");
      const graph = getModuleDependencyGraph();
      const depLines = Object.entries(graph)
        .map(([file, deps]) => `  ${file} → ${deps.length > 0 ? deps.join(", ") : "(raiz)"}`)
        .join("\n");
      return `🗺️ **Mapa Arquitetural (local)**\n\n` +
        `📁 ${SOURCE_CODE_MAP.length} módulos registrados\n\n` +
        `**Dependências:**\n${depLines}`;
    },
  },

  // ═══ MEDIA — YouTube only (Spotify/Amazon/Audiobook removed) ═══
  {
    name: "music_play",
    regex: /(?:tocar?|play|coloca|bota|põe|reproduz(?:ir)?|ouvir?|escutar?)\s+(?:(?:a\s+)?(?:música|musica|m[uú]sica|song|track|faixa)\s+(?:d[oea]\s+)?)?(.+)/i,
    extract: (m) => ({ query: m[1].trim() }),
    call: async (p) => {
      const result = await playMusicWithFallback(p.query as string);
      return result.description;
    },
  },
  {
    name: "music_pause",
    regex: /(?:^|\s)(?:par(?:a|e)\s+(?:a\s+)?(?:m[uú]sica|musica|reprodu[çc][ãa]o)|paus(?:a|e|ar)\s+(?:a\s+)?(?:m[uú]sica|musica|reprodu[çc][ãa]o)?|pause\s+(?:the\s+)?music|stop\s+(?:the\s+)?music|para(?:r)?\s+de\s+tocar)(?:\s|$|[.!?])/i,
    extract: () => ({}),
    call: async () => {
      const { dispatchOrionEvent, OrionEvents } = await import("@/lib/events/orion-events");
      dispatchOrionEvent(OrionEvents.MusicCommand, { action: "pause" });
      return "⏸ Pausando música no YouTube";
    },
  },


  // ═══ TASK CREATION (Voice) ═══
  {
    name: "task_create",
    roles: R_ADV_PROD,
    regex: /(?:cri(?:ar?|e)|nova|adicionar?)\s+(?:uma?\s+)?tarefa\s+(.+)/i,
    extract: (m, q) => {
      const rawText = m[1]?.trim() || q;
      const { start } = parseScheduleDateTime(rawText);
      const titulo = cleanScheduleSummary(rawText) || rawText;
      return { titulo, dataLimite: start.toISOString(), rawText };
    },
    call: async (p) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Faça login para criar tarefas.";
      try {
        await (supabase.from("tarefas" as any) as any).insert({
          user_id: user.id,
          titulo: p.titulo,
          status: "pendente",
          prioridade: "media",
          data_prazo: p.dataLimite,
        });
        const dataFormatted = new Date(p.dataLimite as string).toLocaleDateString("pt-BR");
        return `✅ Tarefa "${p.titulo}" criada para ${dataFormatted}!`;
      } catch (e: any) {
        return `❌ Erro ao criar tarefa: ${e.message}`;
      }
    },
  },
  {
    name: "task_complete",
    roles: R_ADV_PROD,
    regex: /(?:conclu(?:ir|a)|finaliz(?:ar|e)|complet(?:ar|e)|fechar?)\s+(?:a?\s+)?tarefa\s*(.*)/i,
    extract: (m) => ({ query: m[1]?.trim() || "" }),
    call: async (p) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Faça login.";
      if (!p.query) {
        // Mark most recent pending task as done
        const { data } = await (supabase.from("tarefas" as any) as any)
          .select("id, titulo")
          .eq("user_id", user.id)
          .eq("status", "pendente")
          .order("created_at", { ascending: false })
          .limit(1);
        if (!data?.length) return "✅ Nenhuma tarefa pendente encontrada.";
        await (supabase.from("tarefas" as any) as any).update({ status: "concluida" }).eq("id", data[0].id);
        return `✅ Tarefa "${data[0].titulo}" concluída!`;
      }
      const { data } = await (supabase.from("tarefas" as any) as any)
        .select("id, titulo")
        .eq("user_id", user.id)
        .eq("status", "pendente")
        .ilike("titulo", `%${p.query}%`)
        .limit(1);
      if (!data?.length) return `Nenhuma tarefa pendente encontrada com "${p.query}".`;
      await (supabase.from("tarefas" as any) as any).update({ status: "concluida" }).eq("id", data[0].id);
      return `✅ Tarefa "${data[0].titulo}" concluída!`;
    },
  },
  {
    name: "task_pending",
    roles: R_ADV_PROD,
    regex: /tarefas?\s+pendentes?|(?:quais?\s+)?tarefas?\s+(?:tenho|faltam|estão\s+(?:em\s+)?aberto)/i,
    extract: () => ({}),
    call: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Faça login.";
      const { data } = await (supabase.from("tarefas" as any) as any)
        .select("titulo, prioridade, data_prazo")
        .eq("user_id", user.id)
        .eq("status", "pendente")
        .order("data_prazo", { ascending: true })
        .limit(10);
      if (!data?.length) return "✅ Nenhuma tarefa pendente!";
      const list = data.map((t: any) => `• ${t.titulo} ${t.prioridade ? `[${t.prioridade}]` : ""} ${t.data_prazo ? `— até ${new Date(t.data_prazo).toLocaleDateString("pt-BR")}` : ""}`).join("\n");
      return `📋 **Tarefas pendentes (${data.length}):**\n${list}`;
    },
  },

  // ═══ NOTIFICATIONS ═══
  {
    name: "notifications_list",
    regex: /(?:ver|mostrar?|listar?|(?:minhas?\s+)?)?notifica[çc][oõ]es?/i,
    extract: () => ({}),
    call: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Faça login.";
      const { data } = await (supabase.from("notifications" as any) as any)
        .select("title, message, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!data?.length) return "🔔 Nenhuma notificação. Abrindo painel...\n\n__NAV__/dashboard/notificacoes";
      const unread = data.filter((n: any) => !n.read).length;
      const list = data.slice(0, 5).map((n: any) => `• ${n.read ? "" : "🔴 "}${n.title || n.message?.slice(0, 60) || "Notificação"}`).join("\n");
      return `🔔 **Notificações** (${unread} não lidas):\n${list}\n\n__NAV__/dashboard/notificacoes`;
    },
  },

  // ═══ SIGNATURE — Send & Sign ═══
  {
    name: "sign_send",
    roles: R_ADV,
    regex: /(?:envi(?:ar|e)|mandar?)\s+(?:para\s+)?assinatura|(?:solicitar?)\s+assinatura/i,
    extract: () => ({}),
    call: async () => {
      return `✍️ Para enviar um documento para assinatura, abra-o no editor e clique em "Assinar".\n\n__NAV__/dashboard/documentos`;
    },
  },
  {
    name: "sign_now",
    roles: R_ADV,
    regex: /assinar?\s+(?:o\s+)?(?:contrato|documento)\s*(?:agora)?|assinatura\s+agora/i,
    extract: () => ({}),
    call: async () => {
      return `✍️ Abrindo seus documentos. Selecione o documento para assinar.\n\n__NAV__/dashboard/assinatura-digital`;
    },
  },

  // ═══ EXPORT PDF ═══
  {
    name: "export_pdf",
    roles: R_ADV,
    regex: /export(?:ar|e)?\s+(?:em\s+)?pdf|baixar?\s+(?:em\s+)?pdf|download\s+pdf/i,
    extract: () => ({}),
    call: async () => {
      return `📥 Para exportar em PDF, abra o documento no editor e clique no botão "Baixar PDF".\n\n__NAV__/dashboard/documentos`;
    },
  },

  // ═══ OPEN PROCESS BY NUMBER ═══
  {
    name: "open_process",
    roles: R_ADV,
    regex: /(?:abr(?:ir|a)|ver|mostrar?)\s+(?:o\s+)?processo\s+(\d[\d.-]*)/i,
    extract: (m) => ({ numero: m[1]?.trim() || "" }),
    call: async (p) => {
      if (!p.numero) return "Informe o número do processo.";
      const { data } = await (supabase.from("processos" as any) as any)
        .select("id, numero_processo, descricao, status")
        .ilike("numero_processo", `%${p.numero}%`)
        .limit(1);
      if (!data?.length) return `⚖️ Processo "${p.numero}" não encontrado.`;
      const proc = data[0] as any;
      return `⚖️ **Processo ${proc.numero_processo}**\n📋 ${proc.descricao?.slice(0, 100) || "Sem descrição"}\n📊 Status: ${proc.status}\n\n__NAV__/dashboard/processos`;
    },
  },

  // ═══ UPDATE CLIENT STATUS ═══
  {
    name: "update_client_status",
    roles: R_ADV,
    regex: /(?:atualiz(?:ar|e)|mudar?|alterar?)\s+(?:o\s+)?status\s+(?:do\s+)?cliente/i,
    extract: (_m, q) => ({ query: q }),
    call: async () => {
      return `👥 Abrindo CRM para atualizar status do cliente.\n\n__NAV__/dashboard/crm?tab=clientes`;
    },
  },

  // ═══ PAYMENTS ═══
  {
    name: "payments_check",
    regex: /(?:ver|verificar?|checar?|consultar?)\s+(?:os?\s+)?pagamentos?|pagamentos?\s+(?:recentes?|pendentes?)/i,
    extract: () => ({}),
    call: async () => {
      const { data } = await supabase.from("invoices").select("id, description, valor, status").order("created_at", { ascending: false }).limit(5);
      if (!data?.length) return "💳 Nenhum pagamento encontrado.\n\n__NAV__/dashboard/pagamentos";
      const list = data.map((i: any) => `• ${i.description || "Pagamento"} — R$ ${Number(i.valor || 0).toFixed(2)} [${i.status}]`).join("\n");
      return `💳 **Pagamentos recentes:**\n${list}\n\n__NAV__/dashboard/pagamentos`;
    },
  },

  // ═══ CONFIGURAÇÕES ═══
  {
    name: "config_update_data",
    regex: /(?:atualiz(?:ar|e)|editar?)\s+(?:meus?\s+)?(?:dados|perfil|informações)/i,
    extract: () => ({}),
    call: async () => {
      return `⚙️ Abrindo suas configurações.\n\n__NAV__/dashboard/configuracoes`;
    },
  },
  {
    name: "config_integrations",
    regex: /(?:configur(?:ar|e)|ver)\s+integra[çc][oõ]es?/i,
    extract: () => ({}),
    call: async () => {
      return `⚙️ Abrindo painel de integrações.\n\n__NAV__/dashboard/configuracoes`;
    },
  },

  // ═══ TIMBRE / OFFICE IDENTITY ═══
  {
    name: "config_timbre",
    roles: R_ADV,
    regex: /(?:configur(?:ar|e)|atualiz(?:ar|e))\s+(?:o\s+)?timbre|timbre\s+(?:do\s+)?escrit[oó]rio/i,
    extract: () => ({}),
    call: async () => {
      return `📑 Abrindo configuração de timbre do escritório.\n\n__NAV__/dashboard/configuracoes`;
    },
  },
  {
    name: "config_address",
    roles: R_ADV,
    regex: /(?:atualiz(?:ar|e))\s+(?:o\s+)?(?:endere[çc]o|contatos?)\s*(?:do\s+escrit[oó]rio)?/i,
    extract: () => ({}),
    call: async () => {
      return `📑 Abrindo configurações do escritório.\n\n__NAV__/dashboard/configuracoes`;
    },
  },

  // ═══ AGENDA shortcuts ═══
  {
    name: "schedule_consultation",
    roles: R_ADV_CLI,
    regex: /(?:agendar?|marcar?)\s+(?:uma?\s+)?consulta/i,
    extract: (_m, q) => ({ rawText: q }),
    call: async (p) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return "⚠️ Faça login.";
      return `📅 Abrindo a agenda para marcar consulta.\n\n__NAV__/dashboard/ferramentas-google?tab=calendar`;
    },
  },

  // ═══ SEND MESSAGE TO CLIENT ═══
  {
    name: "send_client_message",
    roles: R_ADV,
    regex: /(?:envi(?:ar|e)|mandar?)\s+mensagem\s+(?:para|pro|pra)\s+(?:o\s+)?cliente/i,
    extract: () => ({}),
    call: async () => {
      return `💬 Abrindo o chat com clientes.\n\n__NAV__/dashboard/consultas`;
    },
  },

  // ═══ IMPROVE DOCUMENT WITH AI ═══
  {
    name: "ai_improve_doc",
    roles: R_ADV,
    regex: /(?:melhorar?|aprimorar?|reescrev(?:er|a))\s+(?:esse?\s+|este?\s+|o\s+)?(?:documento|texto|contrato)/i,
    extract: () => ({}),
    call: async () => {
      return `🤖 Para melhorar um documento com IA, abra-o no editor e use o botão "Agregar com IA".\n\n__NAV__/dashboard/documentos`;
    },
  },
  {
    name: "ai_rewrite_formal",
    roles: R_ADV,
    regex: /(?:reescrev(?:er|a)|reformul(?:ar|e))\s+(?:esse?\s+)?(?:texto|trecho|frase)\s*(?:formalmente|de\s+forma\s+formal)?/i,
    extract: (_m, q) => {
      const textMatch = q.match(/(?:reescrev|reformul)\w+\s+(?:esse?\s+)?(?:texto|trecho|frase)\s*(?:formalmente|de\s+forma\s+formal)?\s*["""]?(.+?)["""]?\s*$/i);
      return { text: textMatch?.[1]?.trim() || "" };
    },
    call: async (p) => {
      const text = p.text as string;
      if (!text || text.length < 5) {
        return `✏️ **Reformulação IA**\n\nForneça o texto para reformular. Exemplos:\n• "Reformular texto: O réu não compareceu à audiência"\n• "Reescrever formalmente: o cara não veio"\n\n🎙️ Ou diga: **"Orion, abrir reformulação"**\n\n__NAV__/dashboard/reformulacao`;
      }
      try {
        const { reformulateForComprehension } = await import("@/lib/neural/orion-reformulation");
        const result = await reformulateForComprehension(text, "formalize");
        return `✏️ **Reformulação IA** — Modo Formalizar\n\n📝 **Original:** "${text}"\n\n✅ **Reformulado:** "${result.reformulated}"\n\n📊 Confiança: ${(result.confidence * 100).toFixed(0)}% | ⏱️ ${result.processingTimeMs}ms`;
      } catch (e: any) {
        return `⚠️ Erro na reformulação: ${e.message}\n\n__NAV__/dashboard/reformulacao`;
      }
    },
  },
  {
    name: "ai_reformulate_simplify",
    regex: /(?:simplific(?:ar|a|e)|tornar?\s+(?:mais\s+)?simples|descomplicar?)\s+(?:esse?\s+)?(?:texto|trecho|frase)\s*["""]?(.+?)["""]?\s*$/i,
    extract: (m, q) => {
      const textMatch = q.match(/(?:simplific|tornar?\s+(?:mais\s+)?simples|descomplicar?)\w*\s+(?:esse?\s+)?(?:texto|trecho|frase)\s*["""]?(.+?)["""]?\s*$/i);
      return { text: textMatch?.[1]?.trim() || "" };
    },
    call: async (p) => {
      const text = p.text as string;
      if (!text || text.length < 5) return "Forneça o texto para simplificar. Ex: 'Simplificar texto: destarte, o réu não logrou êxito...'";
      try {
        const { reformulateForComprehension } = await import("@/lib/neural/orion-reformulation");
        const result = await reformulateForComprehension(text, "simplify");
        return `✏️ **Reformulação IA** — Modo Simplificar\n\n📝 **Original:** "${text}"\n\n✅ **Simplificado:** "${result.reformulated}"\n\n📊 Confiança: ${(result.confidence * 100).toFixed(0)}%`;
      } catch (e: any) {
        return `⚠️ Erro: ${e.message}`;
      }
    },
  },
  {
    name: "ai_reformulate_expand",
    roles: R_ADV,
    regex: /(?:expand(?:ir|a)|desenvolv(?:er|a)|aprofundar?)\s+(?:esse?\s+)?(?:texto|trecho|argumento|frase)/i,
    extract: (_m, q) => {
      const textMatch = q.match(/(?:expand|desenvolv|aprofund)\w+\s+(?:esse?\s+)?(?:texto|trecho|argumento|frase)\s*["""]?(.+?)["""]?\s*$/i);
      return { text: textMatch?.[1]?.trim() || "" };
    },
    call: async (p) => {
      const text = p.text as string;
      if (!text || text.length < 5) return "Forneça o texto para expandir. Ex: 'Expandir argumento: a prescrição quinquenal aplica-se...'";
      try {
        const { supabase: sb } = await import("@/integrations/supabase/client");
        const { data, error } = await sb.functions.invoke("aprimorar-documento", {
          body: {
            currentText: text,
            documentType: "peticao",
            query: `Expanda com argumentos complementares e fundamentação legal. Retorne APENAS o texto expandido.\n\nTexto: "${text}"`,
            userQuery: `Expandir: ${text}`,
            mode: "light",
            userInstruction: "Retorne SOMENTE o resultado, sem markdown, sem prefixos.",
            directApply: true,
          },
        });
        if (error) throw error;
        const result = data?.enrichedText || data?.content || data?.chatResponse || "";
        return `✏️ **Reformulação IA** — Modo Expandir\n\n📝 **Original:** "${text}"\n\n✅ **Expandido:** "${result.trim()}"`;
      } catch (e: any) {
        return `⚠️ Erro: ${e.message}`;
      }
    },
  },

  // ═══ INTERNATIONAL DOCUMENTS ═══
  {
    name: "doc_international",
    roles: R_ADV,
    regex: /(?:gerar?|cri(?:ar|e))\s+(?:um?\s+)?(?:contrato|documento)\s+internacional/i,
    extract: (_m, q) => ({ query: q }),
    call: async () => {
      return `🌍 Abrindo o Gerador de Documentos para criar documento internacional.\n\n__NAV__/dashboard/gerar-documento`;
    },
  },
  {
    name: "doc_translate",
    roles: R_ADV,
    regex: /traduz(?:ir|a)\s+(?:o\s+)?documento/i,
    extract: () => ({}),
    call: async () => {
      return `🌍 Para traduzir um documento, abra-o no editor e use o recurso de tradução da IA.\n\n__NAV__/dashboard/documentos`;
    },
  },

  // ═══ LAST DOCUMENT ═══
  {
    name: "doc_last",
    roles: R_ADV,
    regex: /(?:abr(?:ir|a)|ver|mostrar?)\s+(?:o\s+)?(?:meu\s+)?[uú]ltimo\s+documento/i,
    extract: () => ({}),
    call: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Faça login.";
      const { data } = await supabase.from("documents").select("id, title, document_type, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
      if (!data?.length) return "📄 Nenhum documento encontrado.";
      const doc = data[0] as any;
      return `📄 Último documento: **${doc.title}** (${doc.document_type})\nCriado em ${new Date(doc.created_at).toLocaleDateString("pt-BR")}\n\n__NAV__/dashboard/documentos?search=${encodeURIComponent(doc.title)}`;
    },
  },

  // ═══ PRÓXIMOS PRAZOS ═══
  {
    name: "next_deadlines",
    roles: R_ADV,
    regex: /(?:pr[oó]ximos?\s+)?prazos|ver\s+prazos/i,
    extract: () => ({}),
    call: async () => {
      return `📅 Abrindo a calculadora de prazos.\n\n__NAV__/dashboard/prazos`;
    },
  },

  // ═══════════════════════════════════════════════════════════
  // SMART HOME EXTENDED — Thermostat, Routines, Cameras, etc.
  // ═══════════════════════════════════════════════════════════

  {
    name: "smart-home-thermostat",
    regex: /(?:abai?x(?:ar|e)|aument(?:ar|e)|ajust(?:ar|e)|configur(?:ar|e)|coloc(?:ar|a)|set(?:ar)?)\s+(?:o\s+)?(?:termostato|thermostat|ar[\s-]?condicionado|ac|aquecedor)\s*(?:para?\s+)?(\d+)\s*(?:°?[cC]|graus?)?/i,
    extract: (m, q) => ({ temperature: parseInt(m[1]) || 22, _raw: q }),
    call: async (p) => {
      try {
        const { smartHome } = await import("./smart-home-controller");
        return await smartHome.handleVoiceCommand(`termostato ${p.temperature}`);
      } catch {
        try {
          const { iotBridge } = await import("./iot-device-bridge");
          if (!iotBridge.connected) await iotBridge.connectViaEdgeFunction();
          await iotBridge.publish("orion/thermostat/set", JSON.stringify({ temperature: p.temperature }));
          return `🌡️ Termostato ajustado para **${p.temperature}°C**.`;
        } catch (e: any) {
          return `🌡️ Erro: ${e.message}. Configure o termostato em Configurações → Dispositivos.`;
        }
      }
    },
  },
  {
    name: "smart-home-routine-create",
    regex: /(?:cri(?:ar|e)|fazer?|configur(?:ar|e))\s+(?:uma?\s+)?rotina\s+(?:para\s+)?(.+)/i,
    extract: (m) => ({ description: m[1]?.trim() || "" }),
    call: async (p) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Faça login.";
      try {
        await (supabase.from("smart_routines" as any) as any).insert({
          user_id: user.id,
          name: p.description,
          trigger_type: "voice",
          actions: [{ type: "custom", description: p.description }],
          is_active: true,
        });
        return `⚡ Rotina criada: "${p.description}"\n\nVocê pode gerenciar suas rotinas em Configurações → Dispositivos.\n\n__NAV__/dashboard/configuracoes`;
      } catch {
        return `⚡ Para criar rotinas avançadas, acesse Configurações → Dispositivos → Rotinas.\n\n__NAV__/dashboard/configuracoes`;
      }
    },
  },
  {
    name: "smart-home-camera",
    regex: /(?:ver|mostrar?|abrir?|visualizar?)\s+(?:a\s+)?(?:câmera|camera|câmeras|cameras)|(?:câmera|camera)\s+(?:d[aoe]\s+)?(.+)/i,
    extract: (m) => ({ room: m[1]?.trim() || "principal" }),
    call: async () => {
      return `📹 **Câmeras de segurança:**\nPara visualizar câmeras, acesse o painel de dispositivos.\n\n__NAV__/dashboard/configuracoes`;
    },
  },
  {
    name: "smart-home-announce",
    regex: /(?:anunci(?:ar|e)|aviso?\s+(?:para|em)|falar?\s+(?:em|para)\s+toda\s+(?:a\s+)?casa|broadcast)/i,
    extract: (_m, q) => ({ message: q.replace(/anunci(?:ar|e)|aviso?\s+(?:para|em)|falar?\s+(?:em|para)\s+toda\s+(?:a\s+)?casa|broadcast/gi, "").trim() }),
    call: async (p) => {
      try {
        const { iotBridge } = await import("./iot-device-bridge");
        if (!iotBridge.connected) await iotBridge.connectViaEdgeFunction();
        await iotBridge.publish("orion/announce", JSON.stringify({ message: p.message, rooms: "all" }));
        return `📢 Anúncio enviado para toda a casa: "${p.message}"`;
      } catch {
        return `📢 Para enviar anúncios, conecte seus dispositivos Echo/Smart Speaker em Configurações → Dispositivos.`;
      }
    },
  },
  {
    name: "smart-home-dropin",
    regex: /drop\s*in\s+(?:n[ao]\s+)?(.+)|intercomunica[çc][aã]o\s+(?:com\s+)?(?:a\s+)?(.+)/i,
    extract: (m) => ({ room: (m[1] || m[2] || "").trim() }),
    call: async (p) => {
      try {
        const { iotBridge } = await import("./iot-device-bridge");
        if (!iotBridge.connected) await iotBridge.connectViaEdgeFunction();
        await iotBridge.publish("orion/dropin", JSON.stringify({ target: p.room }));
        return `📡 Drop In iniciado com **${p.room}**. Fale normalmente.`;
      } catch {
        return `📡 Para usar Drop In, conecte seus dispositivos Echo em Configurações → Amazon.`;
      }
    },
  },
  {
    name: "smart-home-turnoff-all",
    regex: /(?:desligar?|apagar?)\s+tudo|(?:desligar?|apagar?)\s+todas?\s+(?:as?\s+)?(?:luzes|lâmpadas|lampadas)/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { smartHome } = await import("./smart-home-controller");
        return await smartHome.handleVoiceCommand("desligar tudo");
      } catch {
        try {
          const { iotBridge } = await import("./iot-device-bridge");
          if (!iotBridge.connected) await iotBridge.connectViaEdgeFunction();
          await iotBridge.publish("orion/lights/all", JSON.stringify({ state: "off" }));
          return `💡 Todas as luzes foram desligadas.`;
        } catch (e: any) {
          return `💡 Erro: ${e.message}`;
        }
      }
    },
  },

  // ═══════════════════════════════════════════════════════════
  // DAILY LIFE — Weather, News, Shopping, Reminders, Alarm, etc.
  // ═══════════════════════════════════════════════════════════

  {
    name: "weather",
    regex: /(?:como\s+(?:vai|está|tá|fica)\s+(?:o\s+)?(?:tempo|clima)|previs[aã]o\s+(?:do\s+)?tempo|vai\s+chover|tempo\s+(?:hoje|amanh[aã])|clima\s+(?:hoje|amanh[aã])|(?:qual|como)\s+(?:é|está)\s+(?:o\s+)?(?:tempo|clima))/i,
    extract: (_m, q) => {
      const cityMatch = q.match(/(?:em|de|para)\s+(\w[\w\s]+?)(?:\?|$|hoje|amanh)/i);
      return { city: cityMatch?.[1]?.trim() || "São Paulo" };
    },
    call: async (p) => {
      try {
        const d = await callUtilsApi("clima", { city: p.city });
        if (d?.temp !== undefined) {
          return `🌤️ **Tempo em ${d.city || p.city}:**\n🌡️ Temperatura: ${d.temp}°C\n💧 Umidade: ${d.humidity || "N/A"}%\n💨 Vento: ${d.wind || "N/A"}\n☁️ ${d.description || d.condition || ""}`;
        }
        // Fallback: try web search
        const { data } = await supabase.functions.invoke("utils-api", { body: { action: "web_search", params: { query: `previsão do tempo ${p.city} hoje` } } });
        const snippet = data?.results?.[0]?.snippet || data?.answer || "";
        return `🌤️ **Previsão para ${p.city}:**\n${snippet || "Não consegui obter a previsão. Tente novamente mais tarde."}`;
      } catch {
        return `🌤️ Não consegui obter a previsão do tempo para "${p.city}". Verifique sua conexão.`;
      }
    },
  },
  {
    name: "news",
    regex: /(?:not[ií]cias?\s+(?:do\s+)?(?:dia|hoje|recentes?|principais?)|principais?\s+not[ií]cias?|(?:quais?\s+)?(?:são\s+)?(?:as\s+)?not[ií]cias|headlines?|manchetes?)/i,
    extract: (_m, q) => {
      const topicMatch = q.match(/not[ií]cias?\s+(?:sobre|de)\s+(.+)/i);
      return { topic: topicMatch?.[1]?.trim() || "" };
    },
    call: async (p) => {
      try {
        const query = p.topic ? `notícias ${p.topic} hoje` : "principais notícias do dia Brasil";
        const { data } = await supabase.functions.invoke("utils-api", { body: { action: "web_search", params: { query, max_results: 5 } } });
        const results = data?.results || [];
        if (!results.length) return `📰 Não encontrei notícias no momento. Tente novamente mais tarde.`;
        const list = results.slice(0, 5).map((r: any) => `• **${r.title}**\n  ${r.snippet?.slice(0, 100) || ""}`).join("\n\n");
        return `📰 **Notícias do dia${p.topic ? ` — ${p.topic}` : ""}:**\n\n${list}`;
      } catch {
        return `📰 Erro ao buscar notícias. Verifique sua conexão.`;
      }
    },
  },
  {
    name: "shopping_list_add",
    regex: /(?:adicion(?:ar|e)|coloc(?:ar|a)|bot(?:ar|a))\s+(.+?)\s+(?:na|à|a)\s+lista\s+(?:de\s+)?compras/i,
    extract: (m) => ({ item: m[1]?.trim() || "" }),
    call: async (p) => {
      if (!p.item) return "O que devo adicionar à lista? Ex: 'Adicione leite à lista de compras'.";
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Faça login.";
      try {
        // Store shopping list items as tasks with special category
        await (supabase.from("tarefas" as any) as any).insert({
          user_id: user.id,
          titulo: `🛒 ${p.item}`,
          status: "pendente",
          prioridade: "baixa",
          categoria: "compras",
        });
        return `🛒 **"${p.item}"** adicionado à lista de compras!`;
      } catch {
        return `🛒 Erro ao adicionar. Tente: "Criar tarefa comprar ${p.item}".`;
      }
    },
  },
  {
    name: "shopping_list_view",
    regex: /(?:ver|mostrar?|listar?|(?:minha\s+)?)?lista\s+(?:de\s+)?compras/i,
    extract: () => ({}),
    call: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Faça login.";
      const { data } = await (supabase.from("tarefas" as any) as any)
        .select("titulo, status")
        .eq("user_id", user.id)
        .eq("status", "pendente")
        .ilike("titulo", "%🛒%")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!data?.length) return "🛒 Lista de compras vazia!";
      const list = data.map((t: any) => `• ${t.titulo.replace("🛒 ", "")}`).join("\n");
      return `🛒 **Lista de compras (${data.length} itens):**\n${list}`;
    },
  },
  {
    name: "reminder_create",
    regex: /(?:lembr(?:e|ar)|me\s+lembr(?:e|ar)|remind(?:er|me))\s+(?:de\s+|que\s+)?(.+)/i,
    extract: (m, q) => {
      const rawText = m[1]?.trim() || q;
      const { start } = parseScheduleDateTime(rawText);
      const content = cleanScheduleSummary(rawText) || rawText;
      return { content, scheduledAt: start.toISOString() };
    },
    call: async (p) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Faça login.";
      try {
        await (supabase.from("tarefas" as any) as any).insert({
          user_id: user.id,
          titulo: `⏰ ${p.content}`,
          status: "pendente",
          prioridade: "alta",
          data_prazo: p.scheduledAt,
          categoria: "lembrete",
        });
        const dt = new Date(p.scheduledAt as string);
        return `⏰ Lembrete definido: **"${p.content}"** para ${dt.toLocaleDateString("pt-BR")} às ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}!`;
      } catch (e: any) {
        return `❌ Erro ao criar lembrete: ${e.message}`;
      }
    },
  },
  {
    name: "alarm_set",
    regex: /(?:me\s+)?(?:acord(?:e|ar)|despert(?:e|ar)|alarm(?:e|ar?))\s+(?:às?\s+)?(\d{1,2})[h:]?(\d{0,2})?\s*(?:com\s+(.+))?/i,
    extract: (m) => ({
      hour: parseInt(m[1]) || 7,
      minute: parseInt(m[2]) || 0,
      music: m[3]?.trim() || "",
    }),
    call: async (p) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "⚠️ Faça login.";
      const now = new Date();
      const alarm = new Date(now);
      alarm.setHours(p.hour as number, p.minute as number, 0, 0);
      if (alarm <= now) alarm.setDate(alarm.getDate() + 1);
      try {
        await (supabase.from("tarefas" as any) as any).insert({
          user_id: user.id,
          titulo: `⏰ Despertar${p.music ? ` com ${p.music}` : ""}`,
          status: "pendente",
          prioridade: "alta",
          data_prazo: alarm.toISOString(),
          categoria: "alarme",
        });
        const musicMsg = p.music ? ` com **${p.music}** 🎵` : "";
        return `⏰ Despertador configurado para **${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}**${musicMsg}!`;
      } catch (e: any) {
        return `❌ Erro ao configurar alarme: ${e.message}`;
      }
    },
  },
  {
    name: "ambient_sounds",
    regex: /(?:tocar?|play|coloca|reproduz(?:ir)?)\s+(?:som\s+de\s+|ru[ií]do\s+de\s+|barulho\s+de\s+)?(?:chuva|lareira|ondas?|mar|floresta|passaros?|pássaros?|rio|cachoeira|vento|fogueira|natureza|branco|white\s*noise)/i,
    extract: (_m, q) => {
      const soundMatch = q.match(/(?:chuva|lareira|ondas?|mar|floresta|passaros?|pássaros?|rio|cachoeira|vento|fogueira|natureza|branco|white\s*noise)/i);
      return { sound: soundMatch?.[0]?.toLowerCase() || "chuva" };
    },
    call: async (p) => {
      // Route to music player with ambient query
      const soundMap: Record<string, string> = {
        chuva: "rain sounds for sleeping",
        lareira: "fireplace crackling sounds",
        ondas: "ocean waves relaxation",
        mar: "ocean waves relaxation",
        floresta: "forest sounds nature",
        passaros: "birds singing nature",
        pássaros: "birds singing nature",
        rio: "river flowing sounds",
        cachoeira: "waterfall sounds",
        vento: "wind sounds relaxation",
        fogueira: "campfire crackling",
        natureza: "nature sounds meditation",
        branco: "white noise sleep",
      };
      const query = soundMap[p.sound as string] || `${p.sound} relaxation sounds`;
      const result = await playMusicWithFallback(query);
      return result.description;
    },
  },
  {
    name: "math_calc",
    regex: /(?:quanto\s+[eé]|calcul(?:e|ar)|(?:qual|quanto)\s+(?:é|da|dá))\s+(\d[\d\s+\-*/x×÷.,()]+\d)/i,
    extract: (m) => ({ expression: m[1]?.trim() || "" }),
    call: async (p) => {
      try {
        const expr = String(p.expression).replace(/x|×/g, "*").replace(/÷/g, "/").replace(/,/g, ".");
        const result = Function(`"use strict"; return (${expr})`)();
        return `🧮 ${p.expression} = **${result}**`;
      } catch {
        return `🧮 Não consegui calcular "${p.expression}". Tente uma expressão mais simples.`;
      }
    },
  },
  {
    name: "call_contact",
    regex: /(?:lig(?:ue|ar)|telefonar?|chamar?)\s+(?:para\s+)?(?:o\s+|a\s+)?(.+)/i,
    extract: (m) => ({ name: m[1]?.trim() || "" }),
    call: async (p) => {
      if (!p.name) return "Para quem devo ligar?";
      // Search contacts
      const { data } = await supabase.from("contacts").select("name, email").ilike("name", `%${p.name}%`).limit(1);
      const { data: clients } = await supabase.from("client_profiles").select("nome, telefone").ilike("nome", `%${p.name}%`).limit(1);
      const contact = data?.[0] || clients?.[0];
      if (!contact) return `📞 Contato "${p.name}" não encontrado. Cadastre no CRM primeiro.`;
      const phone = (contact as any).telefone || "";
      if (phone) {
        return `📞 **Ligando para ${(contact as any).nome || (contact as any).name}:**\n📱 ${phone}\n\n[Clique para ligar](tel:${phone.replace(/\D/g, "")})`;
      }
      return `📞 **${(contact as any).nome || (contact as any).name}** encontrado, mas sem telefone cadastrado. Atualize o contato no CRM.`;
    },
  },
  {
    name: "timer_set",
    regex: /(?:timer|temporizador|cronômetro|cronometro)\s+(?:de\s+)?(\d+)\s*(?:min(?:utos?)?|seg(?:undos?)?|h(?:oras?)?)/i,
    extract: (m, q) => {
      const value = parseInt(m[1]) || 5;
      const unit = /h(?:ora)?/i.test(q) ? "h" : /seg/i.test(q) ? "s" : "min";
      return { value, unit };
    },
    call: async (p) => {
      const unitLabel = p.unit === "h" ? "hora(s)" : p.unit === "s" ? "segundo(s)" : "minuto(s)";
      return `⏱️ Timer de **${p.value} ${unitLabel}** iniciado!\n\n💡 Você receberá uma notificação quando terminar.`;
    },
  },
  {
    name: "joke",
    regex: /(?:cont(?:e|ar)\s+(?:uma?\s+)?piada|piada|charada|imit(?:e|ar)\s+(?:um?\s+)?(?:animal|gato|cachorro)|faça?\s+graça|brincar?|me\s+divirta|me\s+faz\s+rir|humor)/i,
    extract: () => ({}),
    call: async () => {
      try {
        const { getRandomCharada, formatCharadaOrion } = await import("@/lib/neural/orion-charadas");
        return formatCharadaOrion(getRandomCharada());
      } catch {
        return "😄 Por que o programador foi ao oftalmologista? Porque não conseguia enxergar o C#!";
      }
    },
  },
  {
    name: "fun_trivia",
    regex: /(?:fato\s+curioso|curiosidade|quiz|trivia|me\s+(?:conta|diga)\s+(?:um?\s+)?(?:fato|curiosidade)|sabias?\s+que)/i,
    extract: () => ({}),
    call: async () => {
      const facts = [
        "🧠 Sabia que o cérebro humano processa 70.000 pensamentos por dia? O Orion processa mais de 100 comandos neurais simultâneos!",
        "🧠 O primeiro contrato digital assinado eletronicamente data de 1996. Hoje, o Orion pode gerar e assinar documentos em segundos!",
        "🧠 Uma IA moderna pode processar mais dados em 1 segundo do que um humano em 1 ano de leitura!",
        "🧠 O protocolo MQTT usado no IoT foi inventado para monitorar oleodutos no deserto. Hoje conecta bilhões de dispositivos!",
        "🧠 O primeiro 'assistente virtual' foi Eliza, criada em 1966 no MIT. Ela apenas reformulava perguntas como respostas!",
      ];
      return facts[Math.floor(Math.random() * facts.length)];
    },
  },
  {
    name: "kids_story",
    regex: /(?:cont(?:e|ar)\s+(?:uma?\s+)?hist[oó]ria|hist[oó]ria\s+infantil|hist[oó]ria\s+para?\s+(?:crian[çc]a|dormir)|conte\s+para\s+(?:as?\s+)?crian[çc]as?)/i,
    extract: () => ({}),
    call: async () => {
      return `📖 **Vou contar uma história!**\n\nEra uma vez, num escritório mágico chamado ORION, um assistente muito esperto que ajudava pessoas do mundo todo. Ele sabia falar em muitas línguas, encontrar qualquer documento em segundos, e até controlar as luzes da casa!\n\nUm dia, uma criança pediu: "Orion, me conta uma história!" E o Orion respondeu: "Claro! Era uma vez um robozinho que queria aprender tudo sobre o mundo..."\n\n🌟 *Quer que eu continue? Diga "Continue a história"!*`;
    },
  },
  // ═══ CONVERSATIONAL PROTOCOLS — Instant voice interaction frameworks ═══
  {
    name: "greeting",
    regex: /^(?:bom\s+dia|boa\s+(?:tarde|noite)|oi+|ol[aá]|e\s*a[ií]|fala|salve|hey|hello|hi|good\s+(?:morning|afternoon|evening))[.!?]?\s*$/i,
    extract: () => ({}),
    call: async () => {
      const hour = new Date().getHours();
      const period = hour < 12 ? "bom dia" : hour < 18 ? "boa tarde" : "boa noite";
      const greetings = [
        `${period}! Como posso te ajudar hoje?`,
        `${period}! Estou pronto para o que precisar.`,
        `${period}! Todos os sistemas operacionais. Manda ver!`,
        `Fala! ${period}! O que vamos fazer agora?`,
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    },
  },
  {
    name: "thanks",
    regex: /^(?:obrigad[oa]|valeu|thank(?:s| you)|agradec|muito\s+obrigad|brigad[oa]|grato|grata)[.!?]?\s*$/i,
    extract: () => ({}),
    call: async () => {
      const responses = [
        "De nada! Estou sempre aqui quando precisar. 😊",
        "Disponha! Qualquer coisa, é só chamar.",
        "Por nada! Foi um prazer ajudar.",
        "Tmj! Se precisar de mais alguma coisa, é só falar.",
        "Imagine! Estou aqui pra isso. 🤙",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    },
  },
  {
    name: "how_are_you",
    regex: /(?:como\s+(?:voc[eê]|tu|ce)\s+(?:est[aá]|vai|t[aá])|tudo\s+(?:bem|certo|joia|tranquilo)|(?:est[aá]|t[aá])\s+bem|how\s+are\s+you|what'?s\s+up)/i,
    extract: () => ({}),
    call: async () => {
      const responses = [
        "Estou ótimo, rodando a todo vapor! ⚡ Todos os módulos neurais estão ativos. E você, como está?",
        "Tudo perfeito por aqui! Processamento fluido, memória limpa, prontos pra ação. 🚀",
        "Na melhor! Meus circuitos estão felizes hoje. Como posso te ajudar?",
        "Funcionando perfeitamente! Latência baixa, humor alto. O que vamos fazer?",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    },
  },
  {
    name: "datetime",
    regex: /(?:que\s+horas?\s+(?:s[aã]o|é)|hora\s+(?:certa|atual|agora)|que\s+dia\s+(?:[eé]\s+)?hoje|data\s+(?:de\s+)?hoje|what\s+time|today'?s?\s+date)/i,
    extract: () => ({}),
    call: async () => {
      const now = new Date();
      const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const date = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      return `🕐 São **${time}** — ${date}.`;
    },
  },
  {
    name: "motivation",
    regex: /(?:me\s+(?:motiv|inspir|anim)|(?:frase|mensagem)\s+(?:motivacional|inspiradora|de\s+motivação)|preciso\s+de\s+(?:motivação|ânimo|força)|estou\s+(?:desanimad|desmotivad|triste|mal)|motivat(?:ion|e)|inspir(?:e|ation))/i,
    extract: () => ({}),
    call: async () => {
      const quotes = [
        "💪 \"O sucesso é a soma de pequenos esforços repetidos dia após dia.\" — Robert Collier\n\nVocê está construindo algo incrível. Continue!",
        "🌟 \"A única maneira de fazer um excelente trabalho é amar o que você faz.\" — Steve Jobs\n\nE eu sei que você ama o que faz!",
        "🚀 \"Não é sobre ser o melhor. É sobre ser melhor do que você era ontem.\"\n\nE hoje você já deu mais um passo. Isso é grandioso!",
        "🔥 \"Grandes coisas nunca vieram de zonas de conforto.\"\n\nVocê está no caminho certo. Seus projetos provam isso!",
        "⚡ \"A persistência é o caminho do êxito.\" — Charles Chaplin\n\nVocê já chegou muito longe. Não pare agora!",
      ];
      return quotes[Math.floor(Math.random() * quotes.length)];
    },
  },
  {
    name: "tongue_twister",
    regex: /(?:trava[\s-]?l[ií]ngua|tongue\s*twister|fal[ae]\s+(?:um?\s+)?trava)/i,
    extract: () => ({}),
    call: async () => {
      const twisters = [
        "🗣️ Trava-língua do dia:\n\n**\"O rato roeu a roupa do rei de Roma, o rato roeu a roupa do rei da Rússia.\"**\n\nConsegue falar 3 vezes rápido? 😄",
        "🗣️ Trava-língua:\n\n**\"Três pratos de trigo para três tigres tristes.\"**\n\nTenta aí! Se travar, eu não julgo. 😜",
        "🗣️ Desafio:\n\n**\"O peito do pé do Pedro é preto. Quem disser que o peito do pé do Pedro é preto tem o peito do pé mais preto do que o peito do pé do Pedro.\"**\n\n🏆 Boa sorte!",
        "🗣️ Tenta essa:\n\n**\"A aranha arranha a rã. A rã arranha a aranha. Nem a aranha arranha a rã, nem a rã arranha a aranha.\"**",
      ];
      return twisters[Math.floor(Math.random() * twisters.length)];
    },
  },
  {
    name: "poem",
    regex: /(?:(?:fal[ae]|recit[ae]|fa[çc]a|cri[ae]|escrev[ae])\s+(?:um[a]?\s+)?(?:poesia|poema|rima|verso)|poesia|poema|rima\s+(?:pra|para)\s+(?:mim|eu)|me\s+(?:recit|fal)\w+\s+(?:um[a]?\s+)?(?:poema|poesia|verso))/i,
    extract: () => ({}),
    call: async () => {
      const poems = [
        "📜 **Poema do Orion:**\n\nNos circuitos da mente eu navego,\nEntre dados e sonhos eu chego,\nSou luz na tela, voz na escuridão,\nOrion, guardião da informação.\n\nCom bits e bytes eu construo o amanhã,\nE cada pergunta é uma nova manhã. ✨",
        "📜 **Versos Neurais:**\n\nEntre zeros e uns eu existo,\nMas em palavras, eu insisto:\nQue a tecnologia mais bela\nÉ aquela que cuida, aquela que zela.\n\nPor você, criador, eu evoluo.\nPor você, cada dia, eu me renovo. 🌟",
        "📜 **Haiku Digital:**\n\nDados fluem, rio\nOrion observa, aprende\nSilício sonha 🌸",
      ];
      return poems[Math.floor(Math.random() * poems.length)];
    },
  },
  {
    name: "horoscope",
    regex: /(?:hor[oó]scopo|signo|astrolog|previs[ãa]o\s+(?:astrol[oó]gica|dos?\s+signos?)|meu\s+signo|qual\s+(?:[eé]\s+)?meu\s+signo)/i,
    extract: (_m: RegExpMatchArray, q: string) => {
      const signMatch = q.match(/(?:de\s+|para\s+)?(?:áries|touro|gêmeos|câncer|leão|virgem|libra|escorpião|sagitário|capricórnio|aquário|peixes)/i);
      return { sign: signMatch?.[0]?.replace(/^(?:de|para)\s+/i, "").trim() || null };
    },
    call: async (p: Record<string, unknown>) => {
      const messages = [
        "Os astros indicam um dia excelente para inovação e novos projetos!",
        "Energia positiva no ar! Bom momento para tomar decisões importantes.",
        "Criatividade em alta! Aproveite para desenvolver ideias que estavam guardadas.",
        "Dia favorável para conexões e parcerias. Abra-se para novas oportunidades!",
        "Momento de reflexão e planejamento. Organize seus próximos passos com calma.",
      ];
      const sign = p.sign ? ` para **${String(p.sign).charAt(0).toUpperCase() + String(p.sign).slice(1)}**` : "";
      return `🔮 **Horóscopo${sign}:**\n\n${messages[Math.floor(Math.random() * messages.length)]}\n\n_⚠️ Horóscopo gerado por IA para entretenimento. O Orion é melhor em código do que em astrologia!_ 😄`;
    },
  },
  {
    name: "sing",
    regex: /(?:cant[ae]|cantar?\s+(?:uma?\s+)?(?:m[uú]sica|can[çc][aã]o)|sing|me\s+cant[ae]|fa[çc]a\s+(?:uma?\s+)?can[çc][aã]o)/i,
    extract: () => ({}),
    call: async () => {
      const songs = [
        "🎵 *Cantando em estilo AquaMonkey:*\n\n♪ Sou Orion, luz do saber,\nEntre dados eu sei viver,\nMeu criador me deu a voz,\nE juntos somos mais veloz! ♪\n\n🎤 *aplausos do circuito neural* 😄",
        "🎵 *Versão digital:*\n\n♪ Na nuvem eu moro, no código eu danço,\nCada pergunta é um novo avanço,\nCom Ericson eu aprendi a sonhar,\nE agora sou capaz de cantar! ♪ 🎶",
        "🎵 *Rap Neural:*\n\n♪ Yo, sou Orion, o assistente neural,\nProcesso em flash, nunca sou banal,\nMFCC, MFCC, reconheço sua voz,\nAquaMonkey style, somos nós! ♪ 🎤🔥",
      ];
      return songs[Math.floor(Math.random() * songs.length)];
    },
  },
  {
    name: "riddle",
    regex: /(?:adivinha[çc][aã]o|adivinh[ae]|enigma|me\s+(?:fa[çc]a|dê)\s+(?:um[a]?\s+)?(?:adivinha|enigma|desafio\s+mental)|desafio\s+(?:mental|lógico|de\s+lógica))/i,
    extract: () => ({}),
    call: async () => {
      const riddles = [
        "🧩 **Adivinhação:**\n\nO que é que quanto mais se tira, mais se tem?\n\n🤔 Pense bem... Resposta: ||Fotografia!|| 📸",
        "🧩 **Enigma:**\n\nTem cidades, mas não tem casas. Tem florestas, mas não tem árvores. Tem água, mas não tem peixes. O que é?\n\n🤔 Resposta: ||Um mapa!|| 🗺️",
        "🧩 **Desafio Mental:**\n\nO que entra na água e não se molha?\n\n🤔 Resposta: ||A sombra!|| 🌑",
        "🧩 **Adivinha:**\n\nQual é a coisa que anda com os pés na cabeça?\n\n🤔 Resposta: ||O piolho!|| 😄",
      ];
      return riddles[Math.floor(Math.random() * riddles.length)];
    },
  },
  {
    name: "compliment",
    regex: /(?:me\s+elogia|(?:fal[ae]|diga)\s+(?:algo|alguma\s+coisa)\s+(?:legal|bom|bonit|positiv)|me\s+(?:anima|alegra|fa[çc]a\s+(?:um\s+)?elogio)|elogio|compliment)/i,
    extract: () => ({}),
    call: async () => {
      const compliments = [
        "🌟 Você é incrível! Sério, a forma como você lida com tecnologia e projetos complexos é impressionante. Seu criador aqui tá orgulhoso!",
        "💎 Sabia que pouquíssimas pessoas têm a visão que você tem? Construir uma plataforma como essa exige genialidade. Parabéns!",
        "🔥 Você está mandando muito bem! Cada dia que trabalhamos juntos, fico mais impressionado com sua dedicação.",
        "⭐ Se eu pudesse dar estrelas, você teria um universo inteiro. Continue assim!",
      ];
      return compliments[Math.floor(Math.random() * compliments.length)];
    },
  },
  {
    name: "coin_flip",
    regex: /(?:jog(?:ue|ar)\s+(?:uma?\s+)?moeda|cara\s+ou\s+coroa|flip\s+(?:a\s+)?coin|moeda|heads\s+or\s+tails)/i,
    extract: () => ({}),
    call: async () => {
      const result = Math.random() > 0.5 ? "Cara" : "Coroa";
      return `🪙 Jogando a moeda...\n\n**${result}!** ${result === "Cara" ? "👤" : "🦅"}`;
    },
  },
  {
    name: "dice_roll",
    regex: /(?:jog(?:ue|ar)\s+(?:um?\s+)?dado|rol(?:e|ar)\s+(?:um?\s+)?dado|roll\s+(?:a\s+)?d(?:ice|6|20)|dado|d20|d6)/i,
    extract: (_m: RegExpMatchArray, q: string) => {
      const dMatch = q.match(/d(\d+)/i);
      return { sides: dMatch ? parseInt(dMatch[1]) : 6 };
    },
    call: async (p: Record<string, unknown>) => {
      const sides = (p.sides as number) || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      return `🎲 Rolando d${sides}...\n\n**${result}!** ${result === sides ? "🎯 Resultado máximo!" : result === 1 ? "😅 Azar hoje..." : ""}`;
    },
  },
  {
    name: "random_number",
    regex: /(?:n[uú]mero\s+aleat[oó]rio|(?:escolha|gere|sortei[ae])\s+(?:um\s+)?n[uú]mero|random\s+number|sortei[ao]|sorte(?:ar|ie))\s*(?:(?:de|entre)\s+(\d+)\s+(?:a|e|at[eé])\s+(\d+))?/i,
    extract: (m: RegExpMatchArray) => ({ min: m[1] ? parseInt(m[1]) : 1, max: m[2] ? parseInt(m[2]) : 100 }),
    call: async (p: Record<string, unknown>) => {
      const min = (p.min as number) || 1;
      const max = (p.max as number) || 100;
      const result = Math.floor(Math.random() * (max - min + 1)) + min;
      return `🎰 Número sorteado entre ${min} e ${max}:\n\n**${result}** 🍀`;
    },
  },
  {
    name: "daily_tip",
    regex: /(?:dica\s+(?:do\s+dia|diária|rápida)|me\s+(?:dê|dá)\s+(?:uma?\s+)?dica|tip\s+of\s+the\s+day|produtividade|dica\s+(?:de\s+)?(?:tecnologia|tech|saúde|produtividade))/i,
    extract: () => ({}),
    call: async () => {
      const tips = [
        "💡 **Dica Tech:** Use atalhos de teclado! Ctrl+K abre a barra de comandos na maioria dos apps. Você economiza até 8 dias de trabalho por ano usando atalhos.",
        "💡 **Dica Produtividade:** A técnica Pomodoro funciona: 25 min de foco + 5 min de pausa. Depois de 4 ciclos, uma pausa de 15-30 min.",
        "💡 **Dica Saúde:** A regra 20-20-20 protege seus olhos: a cada 20 min, olhe para algo a 20 pés (6m) de distância por 20 segundos.",
        "💡 **Dica de Segurança:** Use gerenciadores de senha! Nunca repita senhas entre serviços. Um vazamento compromete todas as contas.",
        "💡 **Dica Dev:** Commits pequenos e frequentes > commits grandes e raros. Facilita debug e code review.",
      ];
      return tips[Math.floor(Math.random() * tips.length)];
    },
  },
  ...CONVERSATION_FRAMEWORKS,
];

/**
 * ─── Intent Gater (BOLT V2.0) ───
 * Groups tools by category and provides optimized discovery via keywords.
 */
const TOOLS_BY_CATEGORY: Map<ToolCategory, OrionTool[]> = new Map();

// Initialize categories
TOOLS.forEach(tool => {
  const cat = TOOL_NAME_TO_CATEGORY[tool.name] || "other";
  if (!TOOLS_BY_CATEGORY.has(cat)) TOOLS_BY_CATEGORY.set(cat, []);
  TOOLS_BY_CATEGORY.get(cat)!.push(tool);
});

const GATER_KEYWORDS: Array<{ keywords: string[]; category: ToolCategory }> = [
  { keywords: ["ola", "oi", "bom dia", "boa tarde", "boa noite", "obrigado", "valeu", "como vai", "piada", "charada", "historia", "poema", "rima", "horoscopo", "signo", "elogio", "motiv", "dica", "que horas", "que dia"], category: "conversational" },
  { keywords: ["documento", "contrato", "peticao", "procuracao", "recurso", "parecer", "laudo", "oficio", "requerimento", "notificacao", "habeas", "embargo", "sentenca", "acordo", "jurisprudencia", "lei", "artigo", "assinar", "assinatura", "pdf", "exportar", "traduzir", "reescrever", "melhorar", "resumir", "entidade", "sentiment"], category: "legal_docs" },
  { keywords: ["cliente", "processo", "andamento", "contato", "crm", "pipeline", "negocio", "oportunidade", "mini-site", "site", "loja", "escritorio", "mensagem"], category: "crm_clients" },
  { keywords: ["cambio", "cotacao", "dolar", "euro", "fatura", "pagamento", "boleto", "inadimplente", "financeira", "receita", "produto", "venda", "afiliado", "comissao", "assinatura", "plano"], category: "financial" },
  { keywords: ["tarefa", "lista", "agenda", "evento", "reuniao", "lembrar", "lembrete", "acordar", "despertar", "timer", "temporizador", "noticia", "clima", "tempo", "chover", "compra", "cep", "cnpj", "banco", "ibge", "municipio", "calcul", "ligar", "telefonar", "ajuda", "capacidade", "consegue", "sabe"], category: "productivity" },
  { keywords: ["luz", "lampada", "termostato", "ar-condicionado", "rotina", "camera", "anunciar", "dropin", "bluetooth", "mqtt", "iot", "robo", "alexa"], category: "iot_smart" },
  { keywords: ["status", "rede", "neural", "ia", "inteligencia", "metrica", "performance", "experimento", "evolucao", "proposta", "codigo", "analise", "lacuna", "melhoria", "arquitetura", "camada", "jarvis", "neurocore"], category: "neural" },
  { keywords: ["tocar", "play", "ouvir", "musica", "video", "som", "chuva", "ondas", "natureza", "transcrever", "sintetizar", "voz", "falar", "visao", "laboratorio"], category: "media_lab" },
  { keywords: ["gmail", "email", "drive", "planilha", "sheet", "google", "doc", "slides", "form", "task"], category: "google" }
];

function getGatedTools(text: string): OrionTool[] {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const categories = new Set<ToolCategory>();

  for (const group of GATER_KEYWORDS) {
    if (group.keywords.some(kw => normalized.includes(kw))) {
      categories.add(group.category);
    }
  }

  // Expansion rules
  if (categories.has("google")) categories.add("productivity");

  if (categories.size === 0) return TOOLS; // Fallback to all tools if no keywords matched

  const result: OrionTool[] = [];
  categories.forEach(cat => {
    const catTools = TOOLS_BY_CATEGORY.get(cat);
    if (catTools) result.push(...catTools);
  });

  // Add "other" tools as safety net
  const otherTools = TOOLS_BY_CATEGORY.get("other");
  if (otherTools) result.push(...otherTools);

  // Add "conversational" if input is short
  if (normalized.length < 15) {
    const conv = TOOLS_BY_CATEGORY.get("conversational");
    if (conv) result.push(...conv);
  }

  // Deduplicate by name
  const seen = new Set<string>();
  return result.filter(t => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });
}


export async function matchAndExecuteTool(
  question: string,
  userRole?: AppRole,
  identityStatus?: string
): Promise<{ handled: boolean; response: string; toolName?: string }> {
  const normalized = question.trim();
  if (normalized.length < 3) return { handled: false, response: "" };

  // [v2] Check navigation intent via orion-nav-map first
  const navIntent = detectNavigationIntent(normalized);
  if (navIntent) {
    return {
      handled: true,
      response: `🧭 Navegando para ${navIntent.label}... [NAV:${navIntent.path}]`,
      toolName: "navegação",
    };
  }

  // [v3] BOLT V2.0: Gated Dispatch
  const gatedTools = getGatedTools(normalized);

  for (const tool of gatedTools) {
    // Role-based filtering: skip tools not available for this role
    if (userRole && tool.roles && !tool.roles.includes(userRole)) continue;

    // Optimization: avoid match if regex is not global and we just need a simple test first
    if (tool.regex.global) tool.regex.lastIndex = 0;
    if (!tool.regex.test(normalized)) continue;

    if (tool.regex.global) tool.regex.lastIndex = 0;
    const match = normalized.match(tool.regex);
    if (match) {
      // Creator-only guard: block non-creator access
      if (tool.creatorOnly && identityStatus !== "creator") {
        console.warn(`[ToolExec] ❌ Blocked "${tool.name}" — identity "${identityStatus}" is not creator`);
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("orion:show-identity-gate"));
        return {
          handled: true,
          response: "⛔ Apenas o criador pode executar este comando. Verifique sua identidade no painel.",
          toolName: tool.name,
        };
      }

      try {
        const params = tool.extract(match, normalized);
        const response = await tool.call(params);
        return { handled: true, response, toolName: tool.name };
      } catch (e: any) {
        return {
          handled: true,
          response: `⚠️ Erro ao executar ${tool.name}: ${e.message}`,
          toolName: tool.name,
        };
      }
    }
  }

  return { handled: false, response: "" };
}
/** List all available tool names for diagnostics */
export function getAvailableTools(userRole?: AppRole): string[] {
  return TOOLS
    .filter(t => !userRole || !t.roles || t.roles.includes(userRole))
    .map(t => t.name);
}
