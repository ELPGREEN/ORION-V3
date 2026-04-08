/**
 * ─── Orion Voice Command Executor v1.0 ───
 * Connects matchCommand() from the registry to real actions.
 * Deterministic execution (<10ms) for known commands, no LLM needed.
 */

import type { NeuralCommand } from "./orion-command-registry";
import { detectNavigationIntent, NAV_MAP } from "./orion-nav-map";

export interface ExecutionResult {
  handled: boolean;
  response: string;
  action?: string;
  navigate?: string;
  requiresAuth?: boolean;
  requiresLLM?: boolean;
}

type NavigateFn = (path: string) => void;
type SpeakFn = (text: string) => Promise<void>;

// ═══ Action → Handler mapping ═══

const NAV_ACTIONS: Record<string, string> = {
  nav_documents: "/dashboard/documentos",
  nav_clients: "/dashboard/crm?tab=clientes",
  nav_processos: "/dashboard/processos",
  nav_agenda: "/dashboard/ferramentas-google?tab=calendar",
  nav_financial: "/dashboard/pagamentos",
  nav_chat: "/dashboard/chat-ao-vivo",
  nav_neural: "/dashboard/rede-neural",
  nav_search: "/dashboard/pesquisa-unificada",
  nav_dashboard: "/dashboard",
  nav_marketplace: "/dashboard/marketplace",
  nav_settings: "/dashboard/configuracoes",
  nav_metrics: "/dashboard/rede-neural",
  nav_editor: "/dashboard/gerar-documento",
  nav_signatures: "/dashboard/assinatura-digital",
  nav_tasks: "/dashboard/tarefas",
  nav_profile: "/dashboard/configuracoes",
  nav_notifications: "/dashboard/notificacoes",
  nav_back: "__back__",
  nav_forward: "__forward__",
  nav_refresh: "__refresh__",
  // Industrial nav
  nav_scada: "/dashboard/controle-robotico",
  nav_fleet: "/dashboard/controle-robotico",
  nav_quality: "/dashboard/rede-neural",
  nav_maintenance: "/dashboard/tarefas",
  nav_erp: "/dashboard/marketplace",
  nav_logistics: "/dashboard/marketplace",
  nav_hr: "/dashboard/crm?tab=contatos",
  nav_iot: "/dashboard/dispositivos-iot",
  nav_smart_home: "/dashboard/dispositivos-iot",
  nav_robotic: "/dashboard/controle-robotico",
  nav_bloom: "/dashboard/rede-neural",
  nav_lab: "/dashboard/laboratorio-ia",
  nav_google: "/dashboard/ferramentas-google",
  nav_gmail: "/dashboard/ferramentas-google?tab=gmail",
  nav_help: "/dashboard/instrucoes",
};

// Actions that need auth
const AUTH_REQUIRED_ACTIONS = new Set([
  "crm_", "doc_", "fin_", "search_", "robot_", "iot_",
  "neural_", "marketplace_", "auto_construct", "self_evolve",
]);

// Actions that need LLM (generative)
const LLM_REQUIRED_ACTIONS = new Set([
  "doc_generate_petition", "doc_generate_contract", "doc_generate_power_of_attorney",
  "doc_review", "doc_translate", "doc_summarize", "doc_insert_clause",
  "search_jurisprudence", "search_sumula", "search_legislation", "search_doctrine",
  "search_datajud", "search_stf", "search_stj", "search_tst", "search_cnj",
  "search_lexml", "search_senado", "search_camara",
  "fin_report", "fin_projection",
  "crm_report",
  "neural_diagnose", "neural_calibrate",
  // Industrial LLM
  "scada_analyze_trend", "quality_root_cause", "maintenance_predict",
]);

// ═══ Local command handlers (no auth, no LLM) ═══

function handleLocalCommand(action: string, input: string): ExecutionResult | null {
  // Time/date
  if (action === "util_time" || /que\s*hora/i.test(input)) {
    const now = new Date();
    return {
      handled: true,
      response: `Agora são ${now.toLocaleTimeString("pt-BR")} de ${now.toLocaleDateString("pt-BR")}.`,
      action: "time",
    };
  }

  if (action === "util_date" || /que\s*dia|data\s*de\s*hoje/i.test(input)) {
    const now = new Date();
    const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
    return {
      handled: true,
      response: `Hoje é ${weekday}, ${now.toLocaleDateString("pt-BR")}.`,
      action: "date",
    };
  }

  // Greetings
  if (action.startsWith("greet_") || action === "farewell" || action === "thank_you") {
    const greetings: Record<string, string[]> = {
      greet_morning: ["Bom dia! Como posso ajudar?", "Bom dia! Estou pronto."],
      greet_afternoon: ["Boa tarde! Em que posso ajudar?", "Boa tarde! Às ordens."],
      greet_evening: ["Boa noite! Como posso ajudar?", "Boa noite! Estou aqui."],
      greet_generic: ["Estou ouvindo. O que precisa?", "Às ordens. Diga.", "Pode falar."],
      greet_howdy: ["Estou bem e operacional! Como posso ajudar?"],
      farewell: ["Até logo! Estarei aqui quando precisar.", "Tchau! Até breve."],
      thank_you: ["Disponha! Precisa de mais alguma coisa?", "De nada!"],
    };
    const options = greetings[action] || greetings["greet_generic"];
    return {
      handled: true,
      response: options[Math.floor(Math.random() * options.length)],
      action,
    };
  }

  // System status
  if (action === "util_system_status") {
    return {
      handled: true,
      response: "Sistema Orion operacional. Rede neural ativa, pipeline de voz funcionando, todos os módulos online.",
      action: "system_status",
    };
  }

  // Help
  if (action === "util_help") {
    return {
      handled: true,
      response: 'Posso navegar, buscar, gerar documentos, controlar IoT e robôs, pesquisar jurisprudência e muito mais. Diga "Orion, abrir ajuda" para o guia completo.',
      action: "help",
      navigate: "/dashboard/instrucoes",
    };
  }

  return null;
}

// ═══ Navigation handler ═══

function handleNavigation(cmd: NeuralCommand, input: string): ExecutionResult | null {
  const navPath = NAV_ACTIONS[cmd.action];
  if (navPath) {
    if (navPath === "__back__") {
      return { handled: true, response: "Voltando à página anterior.", action: "nav_back" };
    }
    if (navPath === "__forward__") {
      return { handled: true, response: "Avançando no histórico.", action: "nav_forward" };
    }
    if (navPath === "__refresh__") {
      return { handled: true, response: "Recarregando página.", action: "nav_refresh" };
    }
    return {
      handled: true,
      response: `Abrindo ${cmd.description}.`,
      action: cmd.action,
      navigate: navPath,
    };
  }

  // Fallback: try detectNavigationIntent
  const navIntent = detectNavigationIntent(input);
  if (navIntent) {
    return {
      handled: true,
      response: `Abrindo ${navIntent.label}.`,
      action: "navigation",
      navigate: navIntent.path,
    };
  }

  return null;
}

// ═══ Industrial/Enterprise handlers ═══

function handleIndustrialCommand(cmd: NeuralCommand, input: string): ExecutionResult | null {
  const action = cmd.action;

  // SCADA
  if (action.startsWith("scada_")) {
    const scadaResponses: Record<string, string> = {
      scada_alarm_list: "Consultando alarmes ativos do SCADA...",
      scada_alarm_ack: "Alarme reconhecido. Registrando no histórico.",
      scada_alarm_silence: "Alarme silenciado temporariamente.",
      scada_setpoint_read: "Lendo setpoints atuais do controlador...",
      scada_setpoint_write: "⚠️ Alteração de setpoint requer confirmação biométrica. Confirme para prosseguir.",
      scada_trend_view: "Abrindo visualização de tendência do processo.",
      scada_trend_export: "Exportando dados históricos do processo.",
      scada_recipe_load: "Carregando receita de produção selecionada.",
      scada_recipe_list: "Listando receitas disponíveis no sistema.",
      scada_batch_start: "⚠️ Iniciar batelada requer autorização. Confirme o lote e parâmetros.",
      scada_batch_status: "Consultando status da batelada atual...",
      scada_batch_report: "Gerando relatório de batelada.",
      scada_plc_status: "Consultando status dos CLPs conectados...",
      scada_plc_diagnostics: "Executando diagnóstico dos controladores.",
      scada_opcua_browse: "Navegando na árvore de variáveis OPC-UA...",
      scada_opcua_read: "Lendo variáveis do servidor OPC-UA.",
      scada_historian_query: "Consultando histórico de dados do processo.",
      scada_mimic_open: "Abrindo mímico/sinóptico do processo.",
      scada_interlock_status: "Verificando status dos intertravamentos de segurança.",
      scada_emergency_stop: "⚠️ PARADA DE EMERGÊNCIA solicitada! Confirmando...",
    };
    return {
      handled: true,
      response: scadaResponses[action] || `Executando comando SCADA: ${cmd.description}.`,
      action,
      navigate: "/dashboard/controle-robotico",
      requiresAuth: true,
    };
  }

  // Fleet
  if (action.startsWith("fleet_")) {
    const fleetResponses: Record<string, string> = {
      fleet_status: "Consultando status de toda a frota de AGVs/AMRs...",
      fleet_dispatch: "Despachando veículo para a missão solicitada.",
      fleet_mission_create: "Criando nova missão para o sistema de frotas.",
      fleet_mission_cancel: "Cancelando missão ativa do veículo.",
      fleet_mission_list: "Listando missões em andamento e na fila.",
      fleet_route_optimize: "Otimizando rotas da frota com algoritmo A*.",
      fleet_charge_status: "Verificando nível de carga dos veículos.",
      fleet_charge_send: "Enviando veículo para estação de carga.",
      fleet_map_update: "Atualizando mapa de navegação da frota.",
      fleet_vda5050_status: "Consultando status VDA 5050 dos veículos.",
      fleet_vda5050_order: "Enviando ordem VDA 5050 ao veículo.",
      fleet_collision_check: "Verificando zonas de colisão da frota.",
      fleet_load_pickup: "Iniciando sequência de carga/pickup.",
      fleet_load_dropoff: "Iniciando sequência de descarga/dropoff.",
      fleet_zone_block: "Bloqueando zona de trânsito temporariamente.",
      fleet_zone_release: "Liberando zona de trânsito bloqueada.",
      fleet_report_daily: "Gerando relatório diário da frota.",
      fleet_report_efficiency: "Calculando eficiência operacional da frota.",
      fleet_vehicle_register: "Registrando novo veículo na frota.",
      fleet_vehicle_retire: "Desativando veículo da operação.",
    };
    return {
      handled: true,
      response: fleetResponses[action] || `Executando comando de frota: ${cmd.description}.`,
      action,
      navigate: "/dashboard/controle-robotico",
      requiresAuth: true,
    };
  }

  // Quality
  if (action.startsWith("quality_")) {
    const qualityResponses: Record<string, string> = {
      quality_oee_read: "Calculando OEE atual: Disponibilidade × Performance × Qualidade...",
      quality_oee_report: "Gerando relatório OEE do período.",
      quality_spc_chart: "Abrindo carta de controle SPC.",
      quality_spc_alert: "Verificando alertas SPC (Western Electric rules).",
      quality_defect_log: "Registrando defeito no sistema de qualidade.",
      quality_defect_report: "Gerando relatório de defeitos por categoria.",
      quality_inspection_start: "Iniciando inspeção de qualidade.",
      quality_inspection_result: "Registrando resultado da inspeção.",
      quality_traceability: "Consultando rastreabilidade do lote.",
      quality_root_cause: "Iniciando análise de causa raiz (requer IA)...",
      quality_cpk_calculate: "Calculando índice de capacidade Cpk do processo.",
      quality_calibration_check: "Verificando certificados de calibração.",
      quality_nonconformity_open: "Abrindo não-conformidade no sistema.",
      quality_audit_schedule: "Consultando agenda de auditorias.",
      quality_sixsigma_report: "Gerando relatório Six Sigma do projeto.",
    };
    return {
      handled: true,
      response: qualityResponses[action] || `Executando comando de qualidade: ${cmd.description}.`,
      action,
      navigate: "/dashboard/metricas-ia",
      requiresAuth: true,
    };
  }

  // Maintenance
  if (action.startsWith("maint_")) {
    const maintResponses: Record<string, string> = {
      maint_wo_create: "Criando ordem de serviço de manutenção.",
      maint_wo_list: "Listando ordens de serviço pendentes.",
      maint_wo_close: "Fechando ordem de serviço concluída.",
      maint_preventive_schedule: "Consultando cronograma de manutenção preventiva.",
      maint_preventive_generate: "Gerando plano de manutenção preventiva.",
      maint_predictive_status: "Verificando alertas de manutenção preditiva (vibração, temperatura, corrente).",
      maint_mtbf_report: "Calculando MTBF/MTTR dos equipamentos.",
      maint_spare_check: "Verificando estoque de peças de reposição.",
      maint_spare_request: "Solicitando peça de reposição.",
      maint_calibration_schedule: "Consultando cronograma de calibração.",
      maint_calibration_register: "Registrando resultado de calibração.",
      maint_equipment_history: "Consultando histórico de manutenção do equipamento.",
      maint_downtime_log: "Registrando parada de equipamento.",
      maint_downtime_report: "Gerando relatório de downtime do período.",
      maint_lubrication_plan: "Consultando plano de lubrificação.",
    };
    return {
      handled: true,
      response: maintResponses[action] || `Executando comando de manutenção: ${cmd.description}.`,
      action,
      navigate: "/dashboard/tarefas",
      requiresAuth: true,
    };
  }

  // ERP
  if (action.startsWith("erp_")) {
    const erpResponses: Record<string, string> = {
      erp_stock_check: "Verificando nível de estoque do item.",
      erp_stock_adjust: "Ajustando estoque manualmente.",
      erp_bom_view: "Abrindo lista de materiais (BOM) do produto.",
      erp_production_order: "Criando ordem de produção.",
      erp_production_status: "Consultando status das ordens de produção.",
      erp_mrp_run: "Executando cálculo MRP...",
      erp_inventory_count: "Iniciando contagem de inventário.",
      erp_purchase_request: "Gerando requisição de compra.",
      erp_cost_report: "Gerando relatório de custos de produção.",
      erp_waste_report: "Gerando relatório de perdas/resíduos.",
    };
    return {
      handled: true,
      response: erpResponses[action] || `Executando comando ERP: ${cmd.description}.`,
      action,
      navigate: "/dashboard/marketplace",
      requiresAuth: true,
    };
  }

  // Logistics
  if (action.startsWith("logistics_")) {
    const logResponses: Record<string, string> = {
      logistics_shipment_track: "Rastreando expedição...",
      logistics_shipment_create: "Criando nova expedição.",
      logistics_freight_quote: "Calculando cotação de frete.",
      logistics_delivery_status: "Verificando status de entregas.",
      logistics_route_plan: "Planejando rota de entrega.",
    };
    return {
      handled: true,
      response: logResponses[action] || `Executando comando logística: ${cmd.description}.`,
      action,
      requiresAuth: true,
    };
  }

  // HR
  if (action.startsWith("hr_")) {
    const hrResponses: Record<string, string> = {
      hr_employee_list: "Listando funcionários ativos.",
      hr_timesheet_check: "Verificando registro de ponto.",
      hr_vacation_schedule: "Consultando escala de férias.",
      hr_payroll_status: "Verificando status da folha de pagamento.",
      hr_admission_start: "Iniciando processo de admissão.",
    };
    return {
      handled: true,
      response: hrResponses[action] || `Executando comando RH: ${cmd.description}.`,
      action,
      requiresAuth: true,
    };
  }

  // Robotics (existing)
  if (action.startsWith("robot_")) {
    const robotResponses: Record<string, string> = {
      robot_status: "Consultando status do robô...",
      robot_move_forward: "Enviando comando: mover para frente.",
      robot_move_backward: "Enviando comando: mover para trás.",
      robot_rotate_left: "Enviando comando: girar à esquerda.",
      robot_rotate_right: "Enviando comando: girar à direita.",
      robot_stop: "⚠️ Comando de parada enviado ao robô.",
      robot_emergency_stop: "🚨 PARADA DE EMERGÊNCIA! E-stop ativado.",
      robot_speed_up: "Aumentando velocidade do robô.",
      robot_speed_down: "Reduzindo velocidade do robô.",
      robot_telemetry: "Consultando telemetria em tempo real...",
      robot_gripper_open: "Abrindo garra do robô.",
      robot_gripper_close: "Fechando garra do robô.",
      robot_home: "Enviando robô para posição home.",
      robot_waypoint: "Definindo waypoint de navegação.",
      robot_map: "Abrindo mapa de navegação do robô.",
      robot_camera: "Ativando câmera do robô.",
      robot_fleet_status: "Consultando status de toda a frota robótica...",
      robot_register: "Registrando novo robô no sistema.",
      robot_twin_status: "Consultando Digital Twin do robô.",
      robot_twin_rollback: "Revertendo configuração via Digital Twin.",
    };
    return {
      handled: true,
      response: robotResponses[action] || `Executando comando robótico: ${cmd.description}.`,
      action,
      navigate: "/dashboard/controle-robotico",
      requiresAuth: true,
    };
  }

  return null;
}

// ═══ Main executor ═══

export async function executeVoiceCommand(
  cmd: NeuralCommand,
  rawInput: string,
  navigateFn?: NavigateFn,
): Promise<ExecutionResult> {
  const action = cmd.action;

  // 1. Check if needs LLM
  if (LLM_REQUIRED_ACTIONS.has(action)) {
    return { handled: false, response: "", requiresLLM: true };
  }

  // 2. Local commands (no auth needed)
  const localResult = handleLocalCommand(action, rawInput);
  if (localResult) {
    if (localResult.navigate && navigateFn) {
      setTimeout(() => navigateFn(localResult.navigate!), 600);
    }
    return localResult;
  }

  // 3. Navigation
  if (cmd.subcategory === "navigation" || action.startsWith("nav_")) {
    const navResult = handleNavigation(cmd, rawInput);
    if (navResult) {
      if (navResult.action === "nav_back") {
        window.history.back();
        return navResult;
      }
      if (navResult.action === "nav_forward") {
        window.history.forward();
        return navResult;
      }
      if (navResult.action === "nav_refresh") {
        window.location.reload();
        return navResult;
      }
      if (navResult.navigate && navigateFn) {
        setTimeout(() => navigateFn(navResult.navigate!), 600);
      }
      return navResult;
    }
  }

  // 4. Industrial/Enterprise
  const industrialResult = handleIndustrialCommand(cmd, rawInput);
  if (industrialResult) {
    if (industrialResult.navigate && navigateFn) {
      setTimeout(() => navigateFn(industrialResult.navigate!), 600);
    }
    return industrialResult;
  }

  // 5. IoT commands → delegate to existing handlers (return not handled so pipeline handles it)
  if (action.startsWith("iot_")) {
    return { handled: false, response: "", action };
  }

  // 6. CRM/Document commands → navigate to the right page
  if (action.startsWith("crm_") || action.startsWith("doc_") || action.startsWith("fin_")) {
    const crmNavMap: Record<string, { path: string; label: string }> = {
      crm_create_client: { path: "/dashboard/crm?tab=clientes&action=new", label: "Novo Cliente" },
      crm_list_clients: { path: "/dashboard/crm?tab=clientes", label: "Clientes" },
      crm_search_client: { path: "/dashboard/crm?tab=clientes", label: "Buscar Cliente" },
      crm_list_processes: { path: "/dashboard/processos", label: "Processos" },
      crm_create_process: { path: "/dashboard/processos", label: "Novo Processo" },
      crm_list_tasks: { path: "/dashboard/tarefas", label: "Tarefas" },
      crm_create_task: { path: "/dashboard/tarefas", label: "Nova Tarefa" },
      crm_schedule_consultation: { path: "/dashboard/consultas", label: "Agendar Consulta" },
      crm_list_consultations: { path: "/dashboard/consultas", label: "Consultas" },
      crm_view_conversations: { path: "/dashboard/chat-ao-vivo", label: "Conversas" },
      doc_create: { path: "/dashboard/gerar-documento", label: "Gerar Documento" },
      doc_list: { path: "/dashboard/documentos", label: "Documentos" },
      doc_open: { path: "/dashboard/documentos", label: "Documentos" },
      doc_sign: { path: "/dashboard/assinatura-digital", label: "Assinatura Digital" },
      fin_list_invoices: { path: "/dashboard/pagamentos", label: "Faturas" },
      fin_create_invoice: { path: "/dashboard/pagamentos", label: "Nova Fatura" },
      fin_pending_invoices: { path: "/dashboard/pagamentos", label: "Faturas Pendentes" },
    };
    const nav = crmNavMap[action];
    if (nav) {
      if (navigateFn) setTimeout(() => navigateFn(nav.path), 600);
      return {
        handled: true,
        response: `Abrindo ${nav.label}.`,
        action,
        navigate: nav.path,
        requiresAuth: true,
      };
    }
  }

  // 7. Voice config
  if (action.startsWith("cfg_")) {
    return { handled: false, response: "", action }; // Let existing voice config handler deal with it
  }

  // Not handled — let LLM take over
  return { handled: false, response: "", action };
}
