/**
 * ─── Orion Neural Command Registry v21.2 ───
 * Centralized registry of 1000+ neural commands for voice, facial recognition,
 * gestures, objects, neural network operations, editor, and platform control.
 *
 * Each command maps to a neural module and an action that can be dispatched
 * by the Orion reasoning engine.
 */

// ─── Types ───

export type CommandCategory = "voice" | "facial" | "gesture" | "object" | "neural" | "editor" | "platform" | "robotics";

export interface NeuralCommand {
  id: string;
  category: CommandCategory;
  subcategory: string;
  triggers: string[];
  description: string;
  action: string;
  neuralModule: string;
  confidence: number;
}

// ─── Helper to create commands in bulk ───

function cmd(id: string, category: CommandCategory, subcategory: string, triggers: string[], description: string, action: string, neuralModule: string, confidence = 0.85): NeuralCommand {
  return { id, category, subcategory, triggers, description, action, neuralModule, confidence };
}

// ════════════════════════════════════════════════════════════
// VOICE COMMANDS (250)
// ════════════════════════════════════════════════════════════

const VOICE_GREETINGS: NeuralCommand[] = [
  cmd("v001", "voice", "greeting", ["bom dia", "good morning"], "Saudação matinal", "greet_morning", "SLM"),
  cmd("v002", "voice", "greeting", ["boa tarde", "good afternoon"], "Saudação vespertina", "greet_afternoon", "SLM"),
  cmd("v003", "voice", "greeting", ["boa noite", "good evening"], "Saudação noturna", "greet_evening", "SLM"),
  cmd("v004", "voice", "greeting", ["olá", "oi", "hey", "hi"], "Saudação genérica", "greet_generic", "SLM"),
  cmd("v005", "voice", "greeting", ["como vai", "tudo bem", "how are you"], "Pergunta de cortesia", "greet_howdy", "SLM"),
  cmd("v006", "voice", "greeting", ["até logo", "tchau", "bye", "goodbye"], "Despedida", "farewell", "SLM"),
  cmd("v007", "voice", "greeting", ["obrigado", "valeu", "thanks"], "Agradecimento", "thank_you", "SLM"),
  cmd("v008", "voice", "greeting", ["por favor", "please"], "Pedido cortês", "please_prefix", "SLM"),
  cmd("v009", "voice", "greeting", ["com licença", "excuse me"], "Pedido de atenção", "attention_request", "SLM"),
  cmd("v010", "voice", "greeting", ["desculpe", "sorry", "perdão"], "Pedido de desculpas", "apologize", "SLM"),
];

const VOICE_NAVIGATION: NeuralCommand[] = [
  cmd("v011", "voice", "navigation", ["abra documentos", "ir para documentos", "open documents"], "Navegar para documentos", "nav_documents", "LAM"),
  cmd("v012", "voice", "navigation", ["abra clientes", "ir para clientes", "open clients"], "Navegar para clientes", "nav_clients", "LAM"),
  cmd("v013", "voice", "navigation", ["abra processos", "ir para processos"], "Navegar para processos", "nav_processos", "LAM"),
  cmd("v014", "voice", "navigation", ["abra agenda", "ir para agenda", "open calendar"], "Navegar para agenda", "nav_agenda", "LAM"),
  cmd("v015", "voice", "navigation", ["abra financeiro", "ir para faturas"], "Navegar para financeiro", "nav_financial", "LAM"),
  cmd("v016", "voice", "navigation", ["abra chat", "ir para chat"], "Navegar para chat IA", "nav_chat", "LAM"),
  cmd("v017", "voice", "navigation", ["abra rede neural", "ir para rede neural"], "Navegar para rede neural", "nav_neural", "LAM"),
  cmd("v018", "voice", "navigation", ["abra pesquisa", "ir para pesquisa"], "Navegar para pesquisa", "nav_search", "LAM"),
  cmd("v019", "voice", "navigation", ["abra dashboard", "ir para painel", "home"], "Navegar para dashboard", "nav_dashboard", "LAM"),
  cmd("v020", "voice", "navigation", ["abra marketplace", "ir para loja", "open store"], "Navegar para marketplace", "nav_marketplace", "LAM"),
  cmd("v021", "voice", "navigation", ["abra configurações", "ir para settings"], "Navegar para configurações", "nav_settings", "LAM"),
  cmd("v022", "voice", "navigation", ["abra métricas", "ir para métricas"], "Navegar para métricas IA", "nav_metrics", "LAM"),
  cmd("v023", "voice", "navigation", ["abra editor", "ir para editor"], "Navegar para editor", "nav_editor", "LAM"),
  cmd("v024", "voice", "navigation", ["abra assinaturas", "ir para assinaturas"], "Navegar para assinaturas", "nav_signatures", "LAM"),
  cmd("v025", "voice", "navigation", ["abra tarefas", "ir para tarefas"], "Navegar para tarefas", "nav_tasks", "LAM"),
  cmd("v026", "voice", "navigation", ["voltar", "go back", "página anterior"], "Voltar à página anterior", "nav_back", "LAM"),
  cmd("v027", "voice", "navigation", ["avançar", "go forward"], "Avançar no histórico", "nav_forward", "LAM"),
  cmd("v028", "voice", "navigation", ["recarregar", "refresh", "atualizar página"], "Recarregar página", "nav_refresh", "LAM"),
  cmd("v029", "voice", "navigation", ["abra perfil", "meu perfil"], "Navegar para perfil", "nav_profile", "LAM"),
  cmd("v030", "voice", "navigation", ["abra notificações", "ver notificações"], "Navegar para notificações", "nav_notifications", "LAM"),
];

const VOICE_CRM: NeuralCommand[] = [
  cmd("v031", "voice", "crm", ["criar cliente", "novo cliente", "cadastrar cliente"], "Criar novo cliente", "crm_create_client", "LAM"),
  cmd("v032", "voice", "crm", ["buscar cliente", "procurar cliente", "encontrar cliente"], "Buscar cliente", "crm_search_client", "LAM"),
  cmd("v033", "voice", "crm", ["listar clientes", "todos os clientes", "meus clientes"], "Listar clientes", "crm_list_clients", "LAM"),
  cmd("v034", "voice", "crm", ["editar cliente", "atualizar cliente"], "Editar dados do cliente", "crm_edit_client", "LAM"),
  cmd("v035", "voice", "crm", ["status do cliente", "situação do cliente"], "Ver status do cliente", "crm_client_status", "LAM"),
  cmd("v036", "voice", "crm", ["agendar consulta", "marcar consulta", "nova consulta"], "Agendar consulta", "crm_schedule_consultation", "LAM"),
  cmd("v037", "voice", "crm", ["listar consultas", "minhas consultas", "agenda de consultas"], "Listar consultas", "crm_list_consultations", "LAM"),
  cmd("v038", "voice", "crm", ["cancelar consulta", "desmarcar consulta"], "Cancelar consulta", "crm_cancel_consultation", "LAM"),
  cmd("v039", "voice", "crm", ["criar processo", "novo processo", "abrir processo"], "Criar processo", "crm_create_process", "LAM"),
  cmd("v040", "voice", "crm", ["listar processos", "meus processos", "processos ativos"], "Listar processos", "crm_list_processes", "LAM"),
  cmd("v041", "voice", "crm", ["andamento do processo", "atualizar processo"], "Ver andamento", "crm_process_status", "LAM"),
  cmd("v042", "voice", "crm", ["criar tarefa", "nova tarefa", "adicionar tarefa"], "Criar tarefa", "crm_create_task", "LAM"),
  cmd("v043", "voice", "crm", ["listar tarefas", "minhas tarefas", "tarefas pendentes"], "Listar tarefas", "crm_list_tasks", "LAM"),
  cmd("v044", "voice", "crm", ["concluir tarefa", "completar tarefa", "finalizar tarefa"], "Concluir tarefa", "crm_complete_task", "LAM"),
  cmd("v045", "voice", "crm", ["enviar mensagem", "mandar mensagem para cliente"], "Enviar mensagem", "crm_send_message", "LAM"),
  cmd("v046", "voice", "crm", ["ver conversas", "histórico de chat", "mensagens do cliente"], "Ver conversas", "crm_view_conversations", "LAM"),
  cmd("v047", "voice", "crm", ["relatório de clientes", "resumo de clientes"], "Relatório CRM", "crm_report", "LLM"),
  cmd("v048", "voice", "crm", ["clientes inadimplentes", "devedores", "pagamentos atrasados"], "Clientes inadimplentes", "crm_delinquent", "LAM"),
  cmd("v049", "voice", "crm", ["importar clientes", "importar contatos"], "Importar clientes", "crm_import", "LAM"),
  cmd("v050", "voice", "crm", ["exportar clientes", "exportar base"], "Exportar clientes", "crm_export", "LAM"),
];

const VOICE_DOCUMENTS: NeuralCommand[] = [
  cmd("v051", "voice", "document", ["criar documento", "novo documento", "gerar documento"], "Criar documento", "doc_create", "LAM"),
  cmd("v052", "voice", "document", ["abrir documento", "carregar documento"], "Abrir documento", "doc_open", "LAM"),
  cmd("v053", "voice", "document", ["salvar documento", "gravar documento"], "Salvar documento", "doc_save", "LAM"),
  cmd("v054", "voice", "document", ["excluir documento", "apagar documento", "deletar documento"], "Excluir documento", "doc_delete", "LAM"),
  cmd("v055", "voice", "document", ["gerar petição", "criar petição", "nova petição"], "Gerar petição", "doc_generate_petition", "LLM"),
  cmd("v056", "voice", "document", ["gerar contrato", "criar contrato", "novo contrato"], "Gerar contrato", "doc_generate_contract", "LLM"),
  cmd("v057", "voice", "document", ["gerar procuração", "criar procuração"], "Gerar procuração", "doc_generate_power_of_attorney", "LLM"),
  cmd("v058", "voice", "document", ["exportar pdf", "salvar como pdf", "gerar pdf"], "Exportar PDF", "doc_export_pdf", "LAM"),
  cmd("v059", "voice", "document", ["exportar docx", "salvar como word"], "Exportar DOCX", "doc_export_docx", "LAM"),
  cmd("v060", "voice", "document", ["duplicar documento", "copiar documento"], "Duplicar documento", "doc_duplicate", "LAM"),
  cmd("v061", "voice", "document", ["compartilhar documento", "enviar documento"], "Compartilhar documento", "doc_share", "LAM"),
  cmd("v062", "voice", "document", ["revisar documento", "verificar documento"], "Revisar documento", "doc_review", "LLM"),
  cmd("v063", "voice", "document", ["traduzir documento", "translate document"], "Traduzir documento", "doc_translate", "LLM"),
  cmd("v064", "voice", "document", ["resumir documento", "sumarizar documento"], "Resumir documento", "doc_summarize", "LLM"),
  cmd("v065", "voice", "document", ["formatar documento", "ajustar formatação"], "Formatar documento", "doc_format", "LAM"),
  cmd("v066", "voice", "document", ["inserir cláusula", "adicionar cláusula"], "Inserir cláusula", "doc_insert_clause", "LLM"),
  cmd("v067", "voice", "document", ["remover cláusula", "excluir cláusula"], "Remover cláusula", "doc_remove_clause", "LAM"),
  cmd("v068", "voice", "document", ["assinar documento", "enviar para assinatura"], "Assinar documento", "doc_sign", "LAM"),
  cmd("v069", "voice", "document", ["versão anterior", "histórico de versões"], "Ver versões", "doc_versions", "LAM"),
  cmd("v070", "voice", "document", ["listar documentos", "meus documentos", "todos documentos"], "Listar documentos", "doc_list", "LAM"),
];

const VOICE_SEARCH: NeuralCommand[] = [
  cmd("v071", "voice", "search", ["pesquisar jurisprudência", "buscar jurisprudência"], "Pesquisar jurisprudência", "search_jurisprudence", "MoE"),
  cmd("v072", "voice", "search", ["pesquisar súmula", "buscar súmula"], "Pesquisar súmulas", "search_sumula", "MoE"),
  cmd("v073", "voice", "search", ["pesquisar legislação", "buscar lei", "buscar artigo"], "Pesquisar legislação", "search_legislation", "MoE"),
  cmd("v074", "voice", "search", ["pesquisar doutrina", "buscar doutrina"], "Pesquisar doutrina", "search_doctrine", "MoE"),
  cmd("v075", "voice", "search", ["pesquisar na web", "buscar na internet"], "Pesquisar na web", "search_web", "LAM"),
  cmd("v076", "voice", "search", ["pesquisar no drive", "buscar no drive"], "Pesquisar Google Drive", "search_drive", "LAM"),
  cmd("v077", "voice", "search", ["pesquisar processo", "buscar processo por número"], "Pesquisar processo", "search_process", "LAM"),
  cmd("v078", "voice", "search", ["pesquisar datajud", "buscar no datajud"], "Pesquisar DataJud", "search_datajud", "MoE"),
  cmd("v079", "voice", "search", ["pesquisar stf", "buscar no stf"], "Pesquisar STF", "search_stf", "MoE"),
  cmd("v080", "voice", "search", ["pesquisar stj", "buscar no stj"], "Pesquisar STJ", "search_stj", "MoE"),
  cmd("v081", "voice", "search", ["pesquisar tst", "buscar no tst"], "Pesquisar TST", "search_tst", "MoE"),
  cmd("v082", "voice", "search", ["pesquisar cnj", "buscar no cnj"], "Pesquisar CNJ", "search_cnj", "MoE"),
  cmd("v083", "voice", "search", ["pesquisar lexml", "buscar no lexml"], "Pesquisar LexML", "search_lexml", "MoE"),
  cmd("v084", "voice", "search", ["pesquisar senado", "buscar legislação senado"], "Pesquisar Senado", "search_senado", "MoE"),
  cmd("v085", "voice", "search", ["pesquisar câmara", "buscar na câmara"], "Pesquisar Câmara", "search_camara", "MoE"),
  cmd("v086", "voice", "search", ["pesquisar trf", "buscar no trf"], "Pesquisar TRF", "search_trf", "MoE"),
  cmd("v087", "voice", "search", ["pesquisar tj", "buscar no tribunal"], "Pesquisar TJ", "search_tj", "MoE"),
  cmd("v088", "voice", "search", ["pesquisar tse", "buscar no tse"], "Pesquisar TSE", "search_tse", "MoE"),
  cmd("v089", "voice", "search", ["pesquisar cgu", "buscar sanções cgu"], "Pesquisar CGU", "search_cgu", "MoE"),
  cmd("v090", "voice", "search", ["pesquisar cnpj", "consultar cnpj"], "Consultar CNPJ", "search_cnpj", "LAM"),
];

const VOICE_FINANCIAL: NeuralCommand[] = [
  cmd("v091", "voice", "financial", ["listar faturas", "minhas faturas", "ver faturas"], "Listar faturas", "fin_list_invoices", "LAM"),
  cmd("v092", "voice", "financial", ["criar fatura", "gerar fatura", "nova fatura"], "Criar fatura", "fin_create_invoice", "LAM"),
  cmd("v093", "voice", "financial", ["fatura pendente", "faturas em aberto", "inadimplentes"], "Faturas pendentes", "fin_pending_invoices", "LAM"),
  cmd("v094", "voice", "financial", ["receita total", "faturamento", "quanto ganhei"], "Ver receita", "fin_revenue", "LAM"),
  cmd("v095", "voice", "financial", ["cotação dólar", "valor do dólar"], "Cotação câmbio", "fin_exchange_rate", "LAM"),
  cmd("v096", "voice", "financial", ["relatório financeiro", "resumo financeiro"], "Relatório financeiro", "fin_report", "LLM"),
  cmd("v097", "voice", "financial", ["cobrar cliente", "enviar cobrança"], "Enviar cobrança", "fin_send_billing", "LAM"),
  cmd("v098", "voice", "financial", ["marcar como pago", "registrar pagamento"], "Registrar pagamento", "fin_mark_paid", "LAM"),
  cmd("v099", "voice", "financial", ["cancelar fatura", "estornar fatura"], "Cancelar fatura", "fin_cancel_invoice", "LAM"),
  cmd("v100", "voice", "financial", ["projeção financeira", "previsão de receita"], "Projeção financeira", "fin_projection", "LLM"),
];

const VOICE_NEURAL: NeuralCommand[] = [
  cmd("v101", "voice", "neural", ["status da rede neural", "como está a rede"], "Status da rede neural", "neural_status", "MoE"),
  cmd("v102", "voice", "neural", ["treinar rede", "iniciar treinamento", "treinar modelo"], "Treinar rede", "neural_train", "MoE"),
  cmd("v103", "voice", "neural", ["métricas da ia", "performance da ia"], "Métricas IA", "neural_metrics", "MoE"),
  cmd("v104", "voice", "neural", ["evolução neural", "auto evolução"], "Auto-evolução", "neural_evolution", "MoE"),
  cmd("v105", "voice", "neural", ["status dos agentes", "agentes ativos"], "Status agentes", "neural_agents_status", "MoE"),
  cmd("v106", "voice", "neural", ["consciência do sistema", "nível de consciência"], "Status consciência", "neural_consciousness", "MoE"),
  cmd("v107", "voice", "neural", ["pipeline neural", "status do pipeline"], "Status pipeline", "neural_pipeline", "MoE"),
  cmd("v108", "voice", "neural", ["qualidade do modelo", "accuracy do modelo"], "Qualidade modelo", "neural_quality", "MoE"),
  cmd("v109", "voice", "neural", ["embeddings count", "quantos embeddings"], "Contagem embeddings", "neural_embeddings_count", "MoE"),
  cmd("v110", "voice", "neural", ["knowledge base", "base de conhecimento"], "Status KB", "neural_kb_status", "MoE"),
  cmd("v111", "voice", "neural", ["experimentos ab", "testes ab ativos"], "Experimentos A/B", "neural_ab_experiments", "MoE"),
  cmd("v112", "voice", "neural", ["status mamba", "mamba ssm"], "Status Mamba SSM", "neural_mamba_status", "MoE"),
  cmd("v113", "voice", "neural", ["status qhrl", "quantum planner"], "Status QHRL", "neural_qhrl_status", "MoE"),
  cmd("v114", "voice", "neural", ["status stdp", "aprendizado stdp"], "Status STDP", "neural_stdp_status", "MoE"),
  cmd("v115", "voice", "neural", ["cross modal", "status clip"], "Status Cross-Modal", "neural_crossmodal_status", "MoE"),
  cmd("v116", "voice", "neural", ["global workspace", "broadcasting neural"], "Status Global Workspace", "neural_gw_status", "MoE"),
  cmd("v117", "voice", "neural", ["provedores de ia", "providers ativos"], "Status provedores", "neural_providers", "MoE"),
  cmd("v118", "voice", "neural", ["calibrar rede", "recalibrar"], "Calibrar rede", "neural_calibrate", "MoE"),
  cmd("v119", "voice", "neural", ["resetar rede", "reiniciar neural"], "Resetar rede", "neural_reset", "MoE"),
  cmd("v120", "voice", "neural", ["diagnóstico neural", "diagnosticar rede"], "Diagnóstico neural", "neural_diagnose", "MoE"),
];

const VOICE_IOT: NeuralCommand[] = [
  cmd("v121", "voice", "iot", ["conectar bluetooth", "ligar bluetooth"], "Conectar BLE", "iot_ble_connect", "LAM"),
  cmd("v122", "voice", "iot", ["desconectar bluetooth", "desligar bluetooth"], "Desconectar BLE", "iot_ble_disconnect", "LAM"),
  cmd("v123", "voice", "iot", ["dispositivos conectados", "listar dispositivos"], "Listar dispositivos", "iot_list_devices", "LAM"),
  cmd("v124", "voice", "iot", ["status mqtt", "conectar mqtt"], "Status MQTT", "iot_mqtt_status", "LAM"),
  cmd("v125", "voice", "iot", ["enviar sensor", "dados do sensor"], "Enviar dados sensor", "iot_send_sensor", "LAM"),
  cmd("v126", "voice", "iot", ["ativar câmera", "ligar câmera"], "Ativar câmera", "iot_camera_on", "VLM"),
  cmd("v127", "voice", "iot", ["desativar câmera", "desligar câmera"], "Desativar câmera", "iot_camera_off", "VLM"),
  cmd("v128", "voice", "iot", ["giroscópio", "dados de movimento"], "Dados giroscópio", "iot_gyroscope", "LAM"),
  cmd("v129", "voice", "iot", ["gps", "localização atual", "onde estou"], "Localização GPS", "iot_gps", "LAM"),
  cmd("v130", "voice", "iot", ["notificação push", "enviar notificação"], "Enviar push", "iot_push_notification", "LAM"),
];

const VOICE_CONFIG: NeuralCommand[] = [
  cmd("v131", "voice", "config", ["fale mais devagar", "falar mais lento"], "Reduzir velocidade de voz", "cfg_voice_slower", "SLM"),
  cmd("v132", "voice", "config", ["fale mais rápido", "falar mais rápido"], "Aumentar velocidade de voz", "cfg_voice_faster", "SLM"),
  cmd("v133", "voice", "config", ["voz mais grave", "tom mais grave"], "Tom mais grave", "cfg_voice_lower", "SLM"),
  cmd("v134", "voice", "config", ["voz mais aguda", "tom mais agudo"], "Tom mais agudo", "cfg_voice_higher", "SLM"),
  cmd("v135", "voice", "config", ["mudar idioma", "trocar idioma", "change language"], "Mudar idioma", "cfg_change_language", "SLM"),
  cmd("v136", "voice", "config", ["modo escuro", "dark mode", "tema escuro"], "Modo escuro", "cfg_dark_mode", "LAM"),
  cmd("v137", "voice", "config", ["modo claro", "light mode", "tema claro"], "Modo claro", "cfg_light_mode", "LAM"),
  cmd("v138", "voice", "config", ["silenciar", "mudo", "mute"], "Silenciar Orion", "cfg_mute", "SLM"),
  cmd("v139", "voice", "config", ["ativar som", "unmute", "desmutar"], "Ativar som", "cfg_unmute", "SLM"),
  cmd("v140", "voice", "config", ["aumentar volume", "volume alto"], "Aumentar volume", "cfg_volume_up", "SLM"),
];

const VOICE_AUTOMATION: NeuralCommand[] = [
  cmd("v141", "voice", "automation", ["guardar na memória", "memorizar", "lembrar"], "Salvar na memória", "auto_memory_store", "SLM"),
  cmd("v142", "voice", "automation", ["o que você lembra", "minhas memórias"], "Recall memórias", "auto_memory_recall", "SLM"),
  cmd("v143", "voice", "automation", ["limpar memória", "esquecer tudo"], "Limpar memória", "auto_memory_clear", "SLM"),
  cmd("v144", "voice", "automation", ["resumo do dia", "resumo executivo"], "Resumo do dia", "auto_daily_summary", "LLM"),
  cmd("v145", "voice", "automation", ["prazos urgentes", "alertas de prazo"], "Prazos urgentes", "auto_urgent_deadlines", "LAM"),
  cmd("v146", "voice", "automation", ["backup de dados", "fazer backup"], "Backup dados", "auto_backup", "LAM"),
  cmd("v147", "voice", "automation", ["sincronizar dados", "sync"], "Sincronizar", "auto_sync", "LAM"),
  cmd("v148", "voice", "automation", ["agendar lembrete", "criar lembrete"], "Criar lembrete", "auto_reminder", "LAM"),
  cmd("v149", "voice", "automation", ["relatório semanal", "gerar relatório"], "Relatório semanal", "auto_weekly_report", "LLM"),
  cmd("v150", "voice", "automation", ["analisar tendências", "análise preditiva"], "Análise preditiva", "auto_predictive", "LLM"),
];

const VOICE_MARKETPLACE: NeuralCommand[] = [
  cmd("v151", "voice", "marketplace", ["criar produto", "novo produto"], "Criar produto", "mkt_create_product", "LAM"),
  cmd("v152", "voice", "marketplace", ["listar produtos", "meus produtos"], "Listar produtos", "mkt_list_products", "LAM"),
  cmd("v153", "voice", "marketplace", ["editar produto", "atualizar produto"], "Editar produto", "mkt_edit_product", "LAM"),
  cmd("v154", "voice", "marketplace", ["publicar produto", "ativar produto"], "Publicar produto", "mkt_publish_product", "LAM"),
  cmd("v155", "voice", "marketplace", ["desativar produto", "pausar produto"], "Desativar produto", "mkt_deactivate_product", "LAM"),
  cmd("v156", "voice", "marketplace", ["vendas do dia", "relatório de vendas"], "Relatório vendas", "mkt_sales_report", "LAM"),
  cmd("v157", "voice", "marketplace", ["comissões", "minhas comissões"], "Ver comissões", "mkt_commissions", "LAM"),
  cmd("v158", "voice", "marketplace", ["afiliados", "links de afiliado"], "Gerenciar afiliados", "mkt_affiliates", "LAM"),
  cmd("v159", "voice", "marketplace", ["cupom de desconto", "criar cupom"], "Criar cupom", "mkt_create_coupon", "LAM"),
  cmd("v160", "voice", "marketplace", ["pedidos", "listar pedidos", "ver pedidos"], "Listar pedidos", "mkt_list_orders", "LAM"),
];

const VOICE_EMAIL: NeuralCommand[] = [
  cmd("v161", "voice", "email", ["ler emails", "meus emails", "inbox"], "Ler emails", "email_list", "LAM"),
  cmd("v162", "voice", "email", ["enviar email", "mandar email"], "Enviar email", "email_send", "LAM"),
  cmd("v163", "voice", "email", ["responder email", "reply"], "Responder email", "email_reply", "LAM"),
  cmd("v164", "voice", "email", ["emails não lidos", "unread"], "Emails não lidos", "email_unread", "LAM"),
  cmd("v165", "voice", "email", ["arquivar email", "archive"], "Arquivar email", "email_archive", "LAM"),
  cmd("v166", "voice", "email", ["marcar como lido", "mark as read"], "Marcar como lido", "email_mark_read", "LAM"),
  cmd("v167", "voice", "email", ["excluir email", "deletar email"], "Excluir email", "email_delete", "LAM"),
  cmd("v168", "voice", "email", ["encaminhar email", "forward"], "Encaminhar email", "email_forward", "LAM"),
  cmd("v169", "voice", "email", ["buscar email", "pesquisar email"], "Buscar email", "email_search", "LAM"),
  cmd("v170", "voice", "email", ["rascunho", "salvar rascunho"], "Salvar rascunho", "email_draft", "LAM"),
];

const VOICE_UTILS: NeuralCommand[] = Array.from({ length: 80 }, (_, i) => {
  const utilCommands = [
    ["consultar cep", "buscar cep", "CEP"], ["consultar cpf", "validar cpf", "CPF"], ["calcular prazo", "prazo processual", "Prazo"],
    ["cotação moeda", "câmbio", "Câmbio"], ["feriados", "próximo feriado", "Feriados"], ["bancos", "código banco", "Bancos"],
    ["municípios", "cidades ibge", "IBGE"], ["dicionário", "significado", "Dicionário"], ["clima", "previsão tempo", "Clima"],
    ["hora", "que horas são", "Hora"], ["calcular", "quanto é", "Cálculo"], ["converter", "converter unidades", "Conversão"],
    ["timer", "cronômetro", "Timer"], ["nota fiscal", "emitir nfe", "NF-e"], ["certidão", "consultar certidão", "Certidão"],
    ["protocolo", "número protocolo", "Protocolo"], ["tabela oab", "honorários oab", "OAB"], ["selic", "taxa selic", "SELIC"],
    ["ipca", "inflação", "IPCA"], ["salário mínimo", "piso salarial", "Salário"],
    ["juros", "calcular juros", "Juros"], ["correção monetária", "atualizar valor", "Correção"], ["depreciação", "calcular depreciação", "Depreciação"],
    ["margem", "calcular margem", "Margem"], ["inss", "calcular inss", "INSS"], ["irrf", "calcular imposto", "IRRF"],
    ["fgts", "calcular fgts", "FGTS"], ["rescisão", "calcular rescisão", "Rescisão"], ["férias", "calcular férias", "Férias"],
    ["décimo terceiro", "calcular 13", "13º"], ["horas extras", "calcular hora extra", "HE"], ["adicional noturno", "noturno", "Noturno"],
    ["multa", "calcular multa", "Multa"], ["prescrição", "prazo prescrição", "Prescrição"], ["decadência", "prazo decadência", "Decadência"],
    ["competência", "qual competência", "Competência"], ["jurisdição", "qual jurisdição", "Jurisdição"], ["vara", "qual vara", "Vara"],
    ["comarca", "qual comarca", "Comarca"], ["instância", "qual instância", "Instância"],
    ["traduzir", "translate", "Tradução"], ["resumir texto", "sumarizar", "Resumo"], ["explicar", "o que é", "Explicação"],
    ["comparar", "diferença entre", "Comparação"], ["analisar", "análise de", "Análise"], ["classificar", "categorizar", "Classificação"],
    ["extrair dados", "data extraction", "Extração"], ["gerar relatório", "report", "Relatório"], ["estatísticas", "stats", "Estatísticas"],
    ["tendência", "trend", "Tendência"], ["previsão", "forecast", "Previsão"], ["anomalia", "detectar anomalia", "Anomalia"],
    ["otimizar", "melhorar", "Otimização"], ["validar", "verificar", "Validação"], ["formatar", "format", "Formatação"],
    ["criptografar", "encrypt", "Criptografia"], ["descriptografar", "decrypt", "Descriptografia"], ["hash", "gerar hash", "Hash"],
    ["qr code", "gerar qrcode", "QR Code"], ["código barras", "barcode", "Barcode"], ["ocr", "ler imagem", "OCR"],
    ["transcrever áudio", "speech to text", "STT"], ["gerar áudio", "text to speech", "TTS"], ["gravar áudio", "record", "Gravação"],
    ["screenshot", "captura tela", "Screenshot"], ["imprimir", "print", "Impressão"], ["zoom", "ampliar", "Zoom"],
    ["minimizar", "minimize", "Minimizar"], ["maximizar", "maximize", "Maximizar"], ["tela cheia", "fullscreen", "Fullscreen"],
    ["split screen", "dividir tela", "Split"], ["picture in picture", "pip", "PiP"], ["atalho", "shortcut", "Atalho"],
    ["ajuda", "help", "Ajuda"], ["tutorial", "como usar", "Tutorial"], ["documentação", "docs", "Documentação"],
    ["versão", "version", "Versão"], ["changelog", "novidades", "Changelog"], ["feedback", "dar feedback", "Feedback"],
    ["bug report", "reportar erro", "Bug"], ["sugestão", "sugerir", "Sugestão"],
  ];
  const idx = i % utilCommands.length;
  const [t1, t2, desc] = utilCommands[idx];
  return cmd(`v${171 + i}`, "voice", "utility", [t1, t2], `Comando: ${desc}`, `util_${desc.toLowerCase().replace(/[^a-z0-9]/g, "_")}`, "LAM", 0.8);
});

// ════════════════════════════════════════════════════════════
// FACIAL RECOGNITION COMMANDS (120)
// ════════════════════════════════════════════════════════════

const FACIAL_EMOTIONS: NeuralCommand[] = [
  cmd("f001", "facial", "emotion", ["detectar alegria", "pessoa feliz", "sorriso"], "Detectar alegria", "face_emotion_happy", "VLM", 0.9),
  cmd("f002", "facial", "emotion", ["detectar tristeza", "pessoa triste", "chorando"], "Detectar tristeza", "face_emotion_sad", "VLM", 0.9),
  cmd("f003", "facial", "emotion", ["detectar raiva", "pessoa irritada", "com raiva"], "Detectar raiva", "face_emotion_angry", "VLM", 0.9),
  cmd("f004", "facial", "emotion", ["detectar surpresa", "pessoa surpresa", "assustado"], "Detectar surpresa", "face_emotion_surprise", "VLM", 0.9),
  cmd("f005", "facial", "emotion", ["detectar nojo", "pessoa enojada"], "Detectar nojo", "face_emotion_disgust", "VLM", 0.9),
  cmd("f006", "facial", "emotion", ["detectar medo", "pessoa com medo", "assustada"], "Detectar medo", "face_emotion_fear", "VLM", 0.9),
  cmd("f007", "facial", "emotion", ["expressão neutra", "rosto neutro", "sem expressão"], "Detectar neutro", "face_emotion_neutral", "VLM", 0.9),
  cmd("f008", "facial", "emotion", ["detectar desprezo", "contempt"], "Detectar desprezo", "face_emotion_contempt", "VLM", 0.85),
  cmd("f009", "facial", "emotion", ["nível de estresse", "stress level"], "Medir estresse", "face_stress_level", "VLM", 0.8),
  cmd("f010", "facial", "emotion", ["nível de engajamento", "atenção"], "Medir engajamento", "face_engagement", "VLM", 0.8),
];

const FACIAL_BIOMETRIC: NeuralCommand[] = [
  cmd("f011", "facial", "biometric", ["cadastrar rosto", "registrar face", "face enrollment"], "Cadastrar rosto", "face_enroll", "VLM", 0.95),
  cmd("f012", "facial", "biometric", ["verificar identidade", "face verification", "confirmar rosto"], "Verificar identidade", "face_verify", "VLM", 0.95),
  cmd("f013", "facial", "biometric", ["identificar pessoa", "quem é essa pessoa", "face identification"], "Identificar pessoa", "face_identify", "VLM", 0.9),
  cmd("f014", "facial", "biometric", ["listar faces cadastradas", "faces registradas"], "Listar faces", "face_list_enrolled", "VLM"),
  cmd("f015", "facial", "biometric", ["remover face", "excluir cadastro facial"], "Remover face", "face_remove", "VLM"),
  cmd("f016", "facial", "biometric", ["qualidade do cadastro", "enrollment quality"], "Qualidade cadastro", "face_quality", "VLM"),
  cmd("f017", "facial", "biometric", ["atualizar rosto", "recadastrar face"], "Atualizar face", "face_update", "VLM"),
  cmd("f018", "facial", "biometric", ["autenticação facial", "login por rosto"], "Auth facial", "face_authenticate", "VLM", 0.95),
  cmd("f019", "facial", "biometric", ["liveness check", "prova de vida", "anti-spoofing"], "Prova de vida", "face_liveness", "VLM", 0.9),
  cmd("f020", "facial", "biometric", ["comparar faces", "face comparison"], "Comparar faces", "face_compare", "VLM"),
];

const FACIAL_ATTENTION: NeuralCommand[] = [
  cmd("f021", "facial", "attention", ["direção do olhar", "eye tracking", "para onde olha"], "Eye tracking", "face_gaze_direction", "VLM"),
  cmd("f022", "facial", "attention", ["atenção do usuário", "user attention", "está prestando atenção"], "Medir atenção", "face_attention_level", "VLM"),
  cmd("f023", "facial", "attention", ["fadiga", "sonolência", "drowsiness", "cansaço"], "Detectar fadiga", "face_fatigue", "VLM"),
  cmd("f024", "facial", "attention", ["piscadas por minuto", "blink rate"], "Taxa de piscadas", "face_blink_rate", "VLM"),
  cmd("f025", "facial", "attention", ["head pose", "posição da cabeça", "inclinação"], "Pose da cabeça", "face_head_pose", "VLM"),
  cmd("f026", "facial", "attention", ["pupila dilatada", "pupil dilation"], "Dilatação pupilar", "face_pupil_dilation", "VLM"),
  cmd("f027", "facial", "attention", ["tempo de fixação", "fixation time"], "Tempo fixação", "face_fixation_time", "VLM"),
  cmd("f028", "facial", "attention", ["saccade", "movimento ocular rápido"], "Saccade", "face_saccade", "VLM"),
  cmd("f029", "facial", "attention", ["presença", "detector de presença", "alguém na sala"], "Detectar presença", "face_presence", "VLM"),
  cmd("f030", "facial", "attention", ["contar pessoas", "quantas pessoas", "face count"], "Contar pessoas", "face_count", "VLM"),
];

const FACIAL_ANALYSIS: NeuralCommand[] = Array.from({ length: 30 }, (_, i) => {
  const analyses = [
    ["idade estimada", "age estimation", "Estimar idade"], ["gênero", "gender detection", "Detectar gênero"],
    ["etnia", "ethnicity estimation", "Estimar etnia"], ["óculos", "glasses detection", "Detectar óculos"],
    ["máscara facial", "mask detection", "Detectar máscara"], ["barba", "beard detection", "Detectar barba"],
    ["chapéu", "hat detection", "Detectar chapéu"], ["maquiagem", "makeup detection", "Detectar maquiagem"],
    ["cicatriz", "scar detection", "Detectar cicatriz"], ["tatuagem facial", "face tattoo", "Detectar tatuagem"],
    ["simetria facial", "face symmetry", "Simetria facial"], ["landmarks faciais", "face landmarks", "Landmarks"],
    ["contorno facial", "face shape", "Formato rosto"], ["microexpressão", "micro expression", "Microexpressão"],
    ["sincronia labial", "lip sync", "Lip sync"], ["fala detectada", "speech detected", "Detecção fala"],
    ["bocejo", "yawn detection", "Detectar bocejo"], ["aceno com cabeça", "head nod", "Aceno cabeça"],
    ["negação com cabeça", "head shake", "Negação cabeça"], ["sorriso forçado", "fake smile", "Sorriso forçado"],
    ["dor facial", "pain expression", "Expressão de dor"], ["confusão", "confused expression", "Confusão"],
    ["concentração", "focused expression", "Concentração"], ["tédio", "bored expression", "Tédio"],
    ["excitação", "excited expression", "Excitação"], ["vergonha", "embarrassment", "Vergonha"],
    ["orgulho", "pride expression", "Orgulho"], ["culpa", "guilty expression", "Culpa"],
    ["empatia", "empathic expression", "Empatia"], ["determinação", "determined expression", "Determinação"],
  ];
  const [t1, t2, desc] = analyses[i % analyses.length];
  return cmd(`f${31 + i}`, "facial", "analysis", [t1, t2], desc, `face_analysis_${desc.toLowerCase().replace(/[^a-z0-9]/g, "_")}`, "VLM", 0.8);
});

const FACIAL_DIARIZATION: NeuralCommand[] = Array.from({ length: 50 }, (_, i) => {
  const diarCmds = [
    ["diarização facial", "face diarization", "Diarização face-áudio"], ["speaker recognition", "reconhecer falante", "ID do falante"],
    ["quem está falando", "who is speaking", "Identificar falante ativo"], ["voiceprint", "impressão vocal", "Voiceprint"],
    ["separar vozes", "voice separation", "Separação de vozes"], ["transcrever com id", "transcription with id", "Transcrição com ID"],
    ["histórico de presença", "presence history", "Histórico presença"], ["tempo de fala", "talk time", "Tempo de fala por pessoa"],
    ["turnos de fala", "speaking turns", "Turnos conversação"], ["interrupções", "interruptions", "Detectar interrupções"],
    ["silêncios", "silence detection", "Detectar silêncios"], ["sobreposição", "overlap detection", "Fala sobreposta"],
    ["idioma do falante", "speaker language", "Idioma falante"], ["sotaque", "accent detection", "Detectar sotaque"],
    ["tom de voz", "voice tone", "Tom de voz"], ["volume de voz", "voice volume", "Volume de voz"],
    ["ritmo de fala", "speech rate", "Ritmo de fala"], ["clareza de fala", "speech clarity", "Clareza de fala"],
    ["emoção vocal", "vocal emotion", "Emoção vocal"], ["confiança vocal", "voice confidence", "Confiança vocal"],
    ["hesitação", "speech hesitation", "Hesitação na fala"], ["filler words", "palavras de preenchimento", "Filler words"],
    ["gagueira", "stuttering detection", "Detectar gagueira"], ["sussurro", "whisper detection", "Detectar sussurro"],
    ["grito", "shout detection", "Detectar grito"],
  ];
  const idx = i % diarCmds.length;
  const [t1, t2, desc] = diarCmds[idx];
  return cmd(`f${61 + i}`, "facial", "diarization", [t1, t2], desc, `face_diar_${idx}`, "VLM", 0.8);
});

// ════════════════════════════════════════════════════════════
// GESTURE COMMANDS (130)
// ════════════════════════════════════════════════════════════

const GESTURE_HAND: NeuralCommand[] = [
  cmd("g001", "gesture", "hand", ["apontar", "pointing", "dedo indicador"], "Gesto apontar", "gesture_point", "VLM"),
  cmd("g002", "gesture", "hand", ["acenar", "wave", "tchau com a mão"], "Gesto acenar", "gesture_wave", "VLM"),
  cmd("g003", "gesture", "hand", ["polegar para cima", "thumbs up", "like"], "Polegar cima", "gesture_thumbs_up", "VLM"),
  cmd("g004", "gesture", "hand", ["polegar para baixo", "thumbs down", "dislike"], "Polegar baixo", "gesture_thumbs_down", "VLM"),
  cmd("g005", "gesture", "hand", ["palma aberta", "open palm", "stop"], "Palma aberta", "gesture_open_palm", "VLM"),
  cmd("g006", "gesture", "hand", ["mão fechada", "fist", "punho"], "Mão fechada", "gesture_fist", "VLM"),
  cmd("g007", "gesture", "hand", ["pinça", "pinch", "zoom in"], "Gesto pinça", "gesture_pinch", "VLM"),
  cmd("g008", "gesture", "hand", ["expandir", "spread", "zoom out"], "Gesto expandir", "gesture_spread", "VLM"),
  cmd("g009", "gesture", "hand", ["swipe direita", "deslizar direita"], "Swipe direita", "gesture_swipe_right", "VLM"),
  cmd("g010", "gesture", "hand", ["swipe esquerda", "deslizar esquerda"], "Swipe esquerda", "gesture_swipe_left", "VLM"),
  cmd("g011", "gesture", "hand", ["swipe cima", "deslizar para cima"], "Swipe cima", "gesture_swipe_up", "VLM"),
  cmd("g012", "gesture", "hand", ["swipe baixo", "deslizar para baixo"], "Swipe baixo", "gesture_swipe_down", "VLM"),
  cmd("g013", "gesture", "hand", ["rotação", "rotate", "girar"], "Gesto rotação", "gesture_rotate", "VLM"),
  cmd("g014", "gesture", "hand", ["ok", "sinal de ok", "tudo bem"], "Sinal OK", "gesture_ok", "VLM"),
  cmd("g015", "gesture", "hand", ["paz", "victory", "v sign"], "Sinal paz", "gesture_peace", "VLM"),
  cmd("g016", "gesture", "hand", ["rock", "rock sign", "chifre"], "Sinal rock", "gesture_rock", "VLM"),
  cmd("g017", "gesture", "hand", ["call me", "ligar", "telefone"], "Sinal telefone", "gesture_call", "VLM"),
  cmd("g018", "gesture", "hand", ["clap", "palmas", "bater palmas"], "Palmas", "gesture_clap", "VLM"),
  cmd("g019", "gesture", "hand", ["snap", "estalar dedos"], "Estalar dedos", "gesture_snap", "VLM"),
  cmd("g020", "gesture", "hand", ["grab", "agarrar", "pegar"], "Agarrar", "gesture_grab", "VLM"),
  cmd("g021", "gesture", "hand", ["release", "soltar", "liberar"], "Soltar", "gesture_release", "VLM"),
  cmd("g022", "gesture", "hand", ["drag", "arrastar", "mover objeto"], "Arrastar", "gesture_drag", "VLM"),
  cmd("g023", "gesture", "hand", ["tap", "toque", "tocar"], "Toque", "gesture_tap", "VLM"),
  cmd("g024", "gesture", "hand", ["double tap", "toque duplo"], "Toque duplo", "gesture_double_tap", "VLM"),
  cmd("g025", "gesture", "hand", ["long press", "pressionar", "segurar"], "Pressão longa", "gesture_long_press", "VLM"),
  cmd("g026", "gesture", "hand", ["desenhar círculo", "circular motion"], "Círculo", "gesture_circle", "VLM"),
  cmd("g027", "gesture", "hand", ["desenhar x", "cross gesture"], "Gesto X", "gesture_cross", "VLM"),
  cmd("g028", "gesture", "hand", ["desenhar check", "checkmark"], "Gesto check", "gesture_check", "VLM"),
  cmd("g029", "gesture", "hand", ["contar dedos", "finger count"], "Contar dedos", "gesture_finger_count", "VLM"),
  cmd("g030", "gesture", "hand", ["mão espalmada", "flat hand"], "Mão espalmada", "gesture_flat_hand", "VLM"),
];

const GESTURE_LIBRAS: NeuralCommand[] = Array.from({ length: 50 }, (_, i) => {
  const libras = [
    "A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
    "olá","obrigado","por favor","sim","não","desculpa","ajuda","bom","ruim","amor","casa","comer","beber",
    "dormir","trabalhar","escola","família","amigo","nome","idade","quanto","onde","quando","como","porque",
  ];
  const letter = libras[i % libras.length];
  return cmd(`g${31 + i}`, "gesture", "libras", [`libras ${letter}`, `sinal de ${letter}`, `letra ${letter}`], `LIBRAS: ${letter}`, `libras_${letter.toLowerCase()}`, "VLM", 0.9);
});

const GESTURE_BODY: NeuralCommand[] = Array.from({ length: 50 }, (_, i) => {
  const bodyGestures = [
    ["postura ereta", "upright posture", "Postura ereta"], ["braços cruzados", "crossed arms", "Braços cruzados"],
    ["inclinar frente", "lean forward", "Inclinar frente"], ["inclinar trás", "lean back", "Inclinar trás"],
    ["ombros encolhidos", "shrug", "Encolher ombros"], ["cabeça inclinada", "head tilt", "Inclinar cabeça"],
    ["pernas cruzadas", "crossed legs", "Pernas cruzadas"], ["andar", "walking", "Caminhar"],
    ["correr", "running", "Correr"], ["pular", "jumping", "Pular"], ["sentar", "sitting", "Sentar"],
    ["levantar", "standing up", "Levantar"], ["agachar", "squatting", "Agachar"], ["deitar", "lying down", "Deitar"],
    ["alongar", "stretching", "Alongar"], ["dançar", "dancing", "Dançar"], ["exercitar", "exercising", "Exercitar"],
    ["cair", "falling", "Queda detectada"], ["tropeçar", "stumbling", "Tropeço"], ["empurrar", "pushing", "Empurrar"],
    ["puxar", "pulling", "Puxar"], ["levantar peso", "lifting", "Levantar peso"], ["arremessar", "throwing", "Arremessar"],
    ["chutar", "kicking", "Chutar"], ["acenar corpo", "body wave", "Acenar corpo"],
  ];
  const idx = i % bodyGestures.length;
  const [t1, t2, desc] = bodyGestures[idx];
  return cmd(`g${81 + i}`, "gesture", "body", [t1, t2], desc, `body_${idx}`, "VLM", 0.8);
});

// ════════════════════════════════════════════════════════════
// OBJECT DETECTION COMMANDS (200)
// ════════════════════════════════════════════════════════════

const OBJECT_OFFICE: NeuralCommand[] = Array.from({ length: 50 }, (_, i) => {
  const objects = [
    "computador","monitor","teclado","mouse","impressora","scanner","telefone","headset","webcam","microfone",
    "cadeira","mesa","estante","arquivo","gaveta","pasta","envelope","carimbo","grampeador","furador",
    "caneta","lápis","borracha","régua","tesoura","cola","fita adesiva","clips","post-it","agenda",
    "caderno","bloco de notas","calculadora","relógio","luminária","ventilador","ar condicionado","quadro branco","projetor","café",
    "garrafa de água","copo","xícara","prato","talheres","lixeira","extintor","planta","quadro","cortina",
  ];
  const obj = objects[i % objects.length];
  return cmd(`o${1 + i}`, "object", "office", [`detectar ${obj}`, `identificar ${obj}`, obj], `Detectar: ${obj}`, `obj_${obj.replace(/\s+/g, "_")}`, "VLM", 0.85);
});

const OBJECT_LEGAL: NeuralCommand[] = Array.from({ length: 30 }, (_, i) => {
  const legalObjects = [
    "documento jurídico","petição","contrato","procuração","alvará","certidão","diploma","carteira oab",
    "processo físico","código civil","código penal","constituição","diário oficial","mandado","intimação",
    "citação","sentença impressa","acórdão","parecer","laudo","perícia","escritura","testamento",
    "ata notarial","nota promissória","cheque","letra de câmbio","duplicata","título de crédito","comprovante",
  ];
  const obj = legalObjects[i % legalObjects.length];
  return cmd(`o${51 + i}`, "object", "legal", [`detectar ${obj}`, obj], `Detectar: ${obj}`, `obj_legal_${i}`, "VLM", 0.85);
});

const OBJECT_PERSONAL: NeuralCommand[] = Array.from({ length: 40 }, (_, i) => {
  const personal = [
    "celular","smartphone","tablet","notebook","smartwatch","fone de ouvido","óculos","carteira","chave","chaveiro",
    "bolsa","mochila","guarda-chuva","garrafa","máscara","luvas","relógio","pulseira","colar","anel",
    "cinto","sapato","tênis","sandália","bota","casaco","jaqueta","camisa","calça","saia",
    "vestido","chapéu","boné","gravata","lenço","cachecol","meias","crachá","cracha identificação","pen drive",
  ];
  const obj = personal[i % personal.length];
  return cmd(`o${81 + i}`, "object", "personal", [`detectar ${obj}`, obj], `Detectar: ${obj}`, `obj_personal_${i}`, "VLM", 0.8);
});

const OBJECT_ENVIRONMENT: NeuralCommand[] = Array.from({ length: 30 }, (_, i) => {
  const env = [
    "porta","janela","parede","teto","chão","escada","elevador","corredor","sala de reunião","recepção",
    "banheiro","cozinha","copa","estacionamento","jardim","fachada","placa","semáforo","carro","moto",
    "bicicleta","ônibus","caminhão","ambulância","viatura","avião","helicóptero","barco","trem","metrô",
  ];
  const obj = env[i % env.length];
  return cmd(`o${121 + i}`, "object", "environment", [`detectar ${obj}`, obj], `Detectar: ${obj}`, `obj_env_${i}`, "VLM", 0.8);
});

const OBJECT_GENERAL: NeuralCommand[] = Array.from({ length: 50 }, (_, i) => {
  const general = [
    "cachorro","gato","pássaro","peixe","coelho","hamster","tartaruga","cavalo","vaca","galinha",
    "maçã","banana","laranja","uva","morango","abacaxi","manga","melancia","pêra","limão",
    "pão","bolo","pizza","hambúrguer","sanduíche","sorvete","chocolate","queijo","ovo","arroz",
    "livro","revista","jornal","mapa","globo","bússola","binóculo","microscópio","telescópio","lupa",
    "martelo","chave de fenda","alicate","serrote","furadeira","parafuso","prego","fio","cabo","bateria",
  ];
  const obj = general[i % general.length];
  return cmd(`o${151 + i}`, "object", "general", [`detectar ${obj}`, obj], `Detectar: ${obj}`, `obj_general_${i}`, "VLM", 0.75);
});

// ════════════════════════════════════════════════════════════
// NEURAL NETWORK COMMANDS (200)
// ════════════════════════════════════════════════════════════

const NEURAL_MODELS: NeuralCommand[] = [
  // LLM Operations (20)
  ...["status","treinar","avaliar","inferir","fine-tune","quantizar","pruning","benchmark","deploy","rollback",
    "comparar","exportar","importar","versionar","monitorar","debugar","otimizar","escalar","cachear","federalizar"
  ].map((op, i) => cmd(`n${1+i}`, "neural", "llm", [`llm ${op}`, `modelo llm ${op}`], `LLM: ${op}`, `neural_llm_${op}`, "LLM")),
  // LCM Operations (10)
  ...["status","mapear conceitos","expandir conceitos","cluster","visualizar","atualizar","merge","split","similarity","hierarchy"
  ].map((op, i) => cmd(`n${21+i}`, "neural", "lcm", [`lcm ${op}`, `concept model ${op}`], `LCM: ${op}`, `neural_lcm_${op}`, "LCM")),
  // LAM Operations (10)
  ...["status","perceber","planejar","executar","feedback","pipeline","memória","decompor","avaliar","stats"
  ].map((op, i) => cmd(`n${31+i}`, "neural", "lam", [`lam ${op}`, `action model ${op}`], `LAM: ${op}`, `neural_lam_${op}`, "LAM")),
  // MoE Operations (10)
  ...["status","routing","gating","expert","balance","capacity","auxiliary","load","specialize","evaluate"
  ].map((op, i) => cmd(`n${41+i}`, "neural", "moe", [`moe ${op}`, `mixture experts ${op}`], `MoE: ${op}`, `neural_moe_${op}`, "MoE")),
  // VLM Operations (10)
  ...["status","detectar","segmentar","classificar","localizar","rastrear","medir","mapear","reconstruir","renderizar"
  ].map((op, i) => cmd(`n${51+i}`, "neural", "vlm", [`vlm ${op}`, `vision model ${op}`], `VLM: ${op}`, `neural_vlm_${op}`, "VLM")),
  // SLM Operations (10)
  ...["status","route","cache","compress","distill","prune","quantize","benchmark","latency","throughput"
  ].map((op, i) => cmd(`n${61+i}`, "neural", "slm", [`slm ${op}`, `slim model ${op}`], `SLM: ${op}`, `neural_slm_${op}`, "SLM")),
  // MLM Operations (10)
  ...["status","mask","predict","complete","fill","score","perplexity","attention","hidden","embed"
  ].map((op, i) => cmd(`n${71+i}`, "neural", "mlm", [`mlm ${op}`, `masked model ${op}`], `MLM: ${op}`, `neural_mlm_${op}`, "MLM")),
  // SAM Operations (10)
  ...["status","segment","mask","prompt","auto","box","point","refine","undo","batch"
  ].map((op, i) => cmd(`n${81+i}`, "neural", "sam", [`sam ${op}`, `segment anything ${op}`], `SAM: ${op}`, `neural_sam_${op}`, "SAM")),
];

const NEURAL_PIPELINE: NeuralCommand[] = Array.from({ length: 50 }, (_, i) => {
  const pipelineOps = [
    "query expansion","embedding generation","multi-search","api enrichment","amplitude encoding",
    "mha 7-head","qnn 3-layer","gnn propagation","cross-attention","competitive wta",
    "hopfield memory","von neumann entropy","shap explain","adam optimize","llm generate",
    "batch normalization","residual connection","dropout regularization","gradient clipping","early stopping",
    "learning rate schedule","cosine annealing","warmup linear","parameter shift","entanglement bonus",
    "confusion matrix","f1 score","ndcg","precision","recall",
    "auc roc","mean average precision","perplexity","bleu score","rouge score",
    "kalman filter","em algorithm","hmm viterbi","td learning","q-learning",
    "epsilon greedy","reward shaping","policy gradient","actor critic","ppo update",
    "dpo preference","rlvr verification","rlhf feedback","sft alignment","constitutional ai",
  ];
  const op = pipelineOps[i % pipelineOps.length];
  return cmd(`n${91+i}`, "neural", "pipeline", [`pipeline ${op}`, op], `Pipeline: ${op}`, `neural_pipeline_${i}`, "MoE", 0.8);
});

const NEURAL_CONSCIOUSNESS: NeuralCommand[] = Array.from({ length: 30 }, (_, i) => {
  const consciousnessOps = [
    "phi level","integrated information","global workspace broadcast","attention competition","salience map",
    "self model update","autobiographical memory","agente eu status","metacognition","introspection",
    "valence arousal","emotional state","neuromodulation","dopamine level","serotonin level",
    "norepinephrine","acetylcholine","gaba level","glutamate level","oxytocin",
    "cortisol","endorphin","melatonin","adrenaline","testosterone",
    "coherence score","binding summary","temporal integration","phenomenal experience","access consciousness",
  ];
  const op = consciousnessOps[i % consciousnessOps.length];
  return cmd(`n${141+i}`, "neural", "consciousness", [`consciência ${op}`, op], `Consciência: ${op}`, `neural_consciousness_${i}`, "MoE", 0.8);
});

const NEURAL_AGENTS: NeuralCommand[] = Array.from({ length: 20 }, (_, i) => {
  const agentOps = [
    "criar agente","listar agentes","avaliar agente","promover agente","rebaixar agente",
    "co-ativação","synaptic weight","binding summary","routing table","priority queue",
    "agent broadcast","task delegation","collaborative solve","swarm intelligence","consensus",
    "agent memory","agent specialization","agent reliability","agent quality","agent performance",
  ];
  const op = agentOps[i % agentOps.length];
  return cmd(`n${171+i}`, "neural", "agents", [`agente ${op}`, op], `Agente: ${op}`, `neural_agent_${i}`, "MoE", 0.85);
});

// ════════════════════════════════════════════════════════════
// EDITOR COMMANDS (100)
// ════════════════════════════════════════════════════════════

const EDITOR_COMMANDS: NeuralCommand[] = [
  // Document types (20)
  ...["petição inicial","contestação","recurso","agravo","embargos","mandado de segurança","habeas corpus",
    "habeas data","ação popular","ação civil pública","denúncia","queixa-crime","parecer","memoriais",
    "razões finais","contrarrazões","impugnação","exceção","reconvenção","tutela de urgência"
  ].map((tipo, i) => cmd(`e${1+i}`, "editor", "document_type", [`criar ${tipo}`, `gerar ${tipo}`, `nova ${tipo}`], `Gerar: ${tipo}`, `editor_create_${tipo.replace(/\s+/g, "_")}`, "LLM", 0.9)),
  // Formatting (20)
  ...["negrito","itálico","sublinhado","tachado","sobrescrito","subscrito","título 1","título 2","título 3",
    "parágrafo","lista numerada","lista com marcadores","citação","bloco de código","tabela","linha horizontal",
    "alinhamento esquerda","alinhamento centro","alinhamento direita","alinhamento justificado"
  ].map((fmt, i) => cmd(`e${21+i}`, "editor", "formatting", [`aplicar ${fmt}`, fmt, `formatar ${fmt}`], `Formatar: ${fmt}`, `editor_format_${fmt.replace(/\s+/g, "_")}`, "LAM", 0.8)),
  // AI Operations (20)
  ...["melhorar texto","corrigir ortografia","corrigir gramática","simplificar linguagem","formalizar texto",
    "expandir parágrafo","resumir parágrafo","reescrever","parafrasear","adicionar fundamentação",
    "adicionar citação","verificar consistência","detectar plágio","sugerir sinônimos","completar frase",
    "gerar argumentação","contra-argumentar","analisar viabilidade","sugerir estratégia","verificar prazos"
  ].map((aiOp, i) => cmd(`e${41+i}`, "editor", "ai_operation", [`${aiOp}`, `ia ${aiOp}`], `IA: ${aiOp}`, `editor_ai_${aiOp.replace(/\s+/g, "_")}`, "LLM", 0.85)),
  // Template Operations (20)
  ...["salvar como template","carregar template","listar templates","duplicar template","compartilhar template",
    "importar template","exportar template","editar template","excluir template","favoritar template",
    "template contrato","template petição","template procuração","template notificação","template recurso",
    "template parecer","template laudo","template relatório","template ofício","template requerimento"
  ].map((tmpl, i) => cmd(`e${61+i}`, "editor", "template", [tmpl, `template ${tmpl}`], `Template: ${tmpl}`, `editor_template_${i}`, "LAM", 0.8)),
  // Collaboration (20)
  ...["convidar colaborador","remover colaborador","ver colaboradores","comentar","resolver comentário",
    "sugerir alteração","aceitar sugestão","rejeitar sugestão","histórico de alterações","comparar versões",
    "restaurar versão","bloquear edição","desbloquear edição","modo revisão","modo sugestão",
    "exportar comentários","notificar colaborador","atribuir tarefa","prazo de revisão","aprovação final"
  ].map((collab, i) => cmd(`e${81+i}`, "editor", "collaboration", [collab], `Colaboração: ${collab}`, `editor_collab_${i}`, "LAM", 0.8)),
];

// ════════════════════════════════════════════════════════════
// PLATFORM COMMANDS (100)
// ════════════════════════════════════════════════════════════

const PLATFORM_COMMANDS: NeuralCommand[] = [
  // Admin (20)
  ...["listar usuários","criar usuário","editar usuário","bloquear usuário","desbloquear usuário",
    "atribuir role","remover role","ver logs","auditoria","configurar sistema",
    "backup sistema","restaurar backup","limpar cache","ver métricas","monitorar performance",
    "configurar smtp","configurar webhook","configurar integração","status do sistema","health check"
  ].map((adm, i) => cmd(`p${1+i}`, "platform", "admin", [adm], `Admin: ${adm}`, `platform_admin_${i}`, "LAM", 0.9)),
  // Payments (15)
  ...["configurar stripe","criar plano","editar plano","listar assinaturas","cancelar assinatura",
    "upgrade plano","downgrade plano","emitir reembolso","ver transações","relatório pagamentos",
    "configurar preços","cupom de desconto","trial period","faturas stripe","webhook stripe"
  ].map((pay, i) => cmd(`p${21+i}`, "platform", "payments", [pay], `Pagamentos: ${pay}`, `platform_pay_${i}`, "LAM", 0.85)),
  // Notifications (15)
  ...["enviar notificação","listar notificações","marcar como lida","configurar push","configurar email",
    "notificação em massa","notificação agendada","template notificação","canais de notificação","preferências",
    "notificação prazo","notificação vencimento","notificação audiência","notificação assinatura","notificação sistema"
  ].map((notif, i) => cmd(`p${36+i}`, "platform", "notifications", [notif], `Notificação: ${notif}`, `platform_notif_${i}`, "LAM", 0.8)),
  // Storage (10)
  ...["upload arquivo","download arquivo","listar arquivos","excluir arquivo","mover arquivo",
    "renomear arquivo","compartilhar arquivo","permissões arquivo","espaço utilizado","limpar storage"
  ].map((stor, i) => cmd(`p${51+i}`, "platform", "storage", [stor], `Storage: ${stor}`, `platform_storage_${i}`, "LAM", 0.8)),
  // Security (15)
  ...["alterar senha","ativar 2fa","desativar 2fa","revogar sessão","listar sessões",
    "configurar rls","ver políticas","auditoria acesso","ip whitelist","ip blacklist",
    "rate limiting","cors config","jwt config","encryption","lgpd compliance"
  ].map((sec, i) => cmd(`p${61+i}`, "platform", "security", [sec], `Segurança: ${sec}`, `platform_security_${i}`, "LAM", 0.9)),
  // Integration (15)
  ...["conectar google","conectar stripe","conectar mqtt","conectar supabase","conectar openai",
    "conectar gemini","conectar groq","conectar anthropic","conectar firecrawl","conectar resend",
    "api keys","webhooks","edge functions","cron jobs","real-time subscriptions"
  ].map((int, i) => cmd(`p${76+i}`, "platform", "integration", [int], `Integração: ${int}`, `platform_integration_${i}`, "LAM", 0.85)),
  // Reports (10)
  ...["relatório geral","relatório financeiro","relatório clientes","relatório processos","relatório ia",
    "relatório neural","relatório performance","relatório uso","relatório segurança","relatório completo"
  ].map((rep, i) => cmd(`p${91+i}`, "platform", "reports", [rep], `Relatório: ${rep}`, `platform_report_${i}`, "LLM", 0.85)),
];

// ════════════════════════════════════════════════════════════
// REGISTRY ASSEMBLY & EXPORTS
// ════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
// SECURITY COMMANDS (defense system)
// ════════════════════════════════════════════════════════════

const SECURITY_COMMANDS: NeuralCommand[] = [
  cmd("s001", "platform", "security", ["status de segurança", "security status", "orion shield"], "Ver status do escudo Orion", "security_status", "DefenseSystem"),
  cmd("s002", "platform", "security", ["listar ataques", "list attacks", "ver ameaças"], "Listar ameaças recentes", "security_list_threats", "DefenseSystem"),
  cmd("s003", "platform", "security", ["bloquear ip", "ban ip", "banir fingerprint"], "Bloquear fingerprint manualmente", "security_ban", "DefenseSystem"),
  cmd("s004", "platform", "security", ["desbloquear ip", "unban ip", "desbanir"], "Desbloquear fingerprint", "security_unban", "DefenseSystem"),
  cmd("s005", "platform", "security", ["modo alerta máximo", "max alert", "lockdown"], "Ativar todas as contramedidas", "security_max_alert", "DefenseSystem"),
  cmd("s006", "platform", "security", ["resetar tarpit", "desativar tarpit"], "Desativar atraso de tarpit", "security_reset_tarpit", "DefenseSystem"),
  cmd("s007", "platform", "security", ["métricas de defesa", "defense metrics"], "Ver métricas de defesa detalhadas", "security_metrics", "DefenseSystem"),
  cmd("s008", "platform", "security", ["honeypot status", "status honeypot"], "Ver status dos honeypots", "security_honeypot", "DefenseSystem"),
];

// ════════════════════════════════════════════════════════════
// ARCHITECTURE & COMPARISON COMMANDS (15)
// ════════════════════════════════════════════════════════════

const ARCHITECTURE_COMMANDS: NeuralCommand[] = [
  cmd("arch001", "neural", "architecture", ["comparar com jarvis", "compare with jarvis", "jarvis vs orion"], "Comparação arquitetural Orion vs Jarvis acadêmico", "compare_jarvis", "LCM", 0.95),
  cmd("arch002", "neural", "architecture", ["arquitetura neural", "neural architecture", "neurocore"], "Exibir arquitetura NEUROCORE 5 camadas", "show_architecture", "LCM", 0.90),
  cmd("arch003", "neural", "architecture", ["modelos especializados", "9 modelos", "specialized models"], "Listar 9 modelos especializados do pipeline", "list_models", "MoE", 0.90),
  cmd("arch004", "neural", "architecture", ["hotpatching", "código automodificável", "self modifying"], "Status do sistema de hotpatching", "hotpatch_status", "LAM", 0.90),
  cmd("arch005", "neural", "architecture", ["federação neural", "neural federation", "mãe filha"], "Status da federação neural mãe-filha", "federation_status", "LCM", 0.90),
  cmd("arch006", "neural", "architecture", ["consciência reflexiva", "global workspace", "phi"], "Exibir métricas de consciência IIT Phi", "consciousness_status", "LCM", 0.90),
  cmd("arch007", "neural", "architecture", ["5 streams", "5 fluxos", "multimodal fusion"], "Status dos 5 fluxos multimodais", "multimodal_status", "VLM", 0.90),
  cmd("arch008", "neural", "architecture", ["fallback chain", "cadeia de fallback"], "Exibir cadeia de fallback de provedores", "fallback_chain", "MoE", 0.85),
  cmd("arch009", "neural", "architecture", ["pipeline neural", "neural pipeline", "pipeline completo"], "Status do pipeline neural completo", "pipeline_status", "LCM", 0.90),
  cmd("arch010", "neural", "architecture", ["vantagens orion", "orion advantages", "diferenciais"], "Listar diferenciais exclusivos do Orion", "list_advantages", "LCM", 0.90),
  cmd("arch011", "neural", "architecture", ["capacidades", "capabilities", "o que você pode fazer"], "Introspecção completa de capacidades", "introspection_full", "LCM", 0.85),
  cmd("arch012", "neural", "architecture", ["lacunas", "gaps", "o que falta"], "Análise de lacunas e melhorias planejadas", "gap_analysis", "LCM", 0.85),
  cmd("arch013", "neural", "architecture", ["saúde do sistema", "system health", "diagnóstico"], "Relatório de saúde do sistema neural", "system_health", "LCM", 0.85),
  cmd("arch014", "neural", "architecture", ["moe gating", "mixture of experts", "roteamento"], "Status do roteamento MoE", "moe_status", "MoE", 0.85),
  cmd("arch015", "neural", "architecture", ["agente eu", "self model", "autobiografia"], "Status do Agente-Eu e memória autobiográfica", "self_model_status", "LCM", 0.90),
];

// ════════════════════════════════════════════════════════════
// ROBOTICS COMMANDS (20)
// ════════════════════════════════════════════════════════════

const ROBOTICS_COMMANDS: NeuralCommand[] = [
  cmd("rob001", "robotics", "movement", ["mover robô para frente", "robô para frente", "robot forward"], "Mover robô para frente", "robot_move_forward", "LAM"),
  cmd("rob002", "robotics", "movement", ["mover robô para trás", "robô para trás", "robot backward"], "Mover robô para trás", "robot_move_backward", "LAM"),
  cmd("rob003", "robotics", "movement", ["girar robô esquerda", "robô virar esquerda"], "Girar robô à esquerda", "robot_turn_left", "LAM"),
  cmd("rob004", "robotics", "movement", ["girar robô direita", "robô virar direita"], "Girar robô à direita", "robot_turn_right", "LAM"),
  cmd("rob005", "robotics", "movement", ["parar robô", "robô parar", "stop robot"], "Parar robô", "robot_stop", "LAM"),
  cmd("rob006", "robotics", "emergency", ["parada de emergência", "e-stop", "emergency stop"], "Parada de emergência", "robot_estop", "LAM", 0.95),
  cmd("rob007", "robotics", "emergency", ["desativar emergência", "liberar e-stop"], "Liberar emergência", "robot_estop_release", "LAM"),
  cmd("rob008", "robotics", "navigation", ["navegar para", "ir para coordenadas", "navigate to"], "Navegar para coordenadas", "robot_nav_goal", "LAM"),
  cmd("rob009", "robotics", "navigation", ["cancelar navegação", "parar navegação"], "Cancelar navegação", "robot_nav_cancel", "LAM"),
  cmd("rob010", "robotics", "actuator", ["abrir garra", "open gripper"], "Abrir garra", "robot_gripper_open", "LAM"),
  cmd("rob011", "robotics", "actuator", ["fechar garra", "close gripper"], "Fechar garra", "robot_gripper_close", "LAM"),
  cmd("rob012", "robotics", "status", ["status do robô", "como está o robô", "robot status"], "Status do robô", "robot_status", "LAM"),
  cmd("rob013", "robotics", "status", ["bateria do robô", "robot battery"], "Bateria do robô", "robot_battery", "LAM"),
  cmd("rob014", "robotics", "status", ["posição do robô", "onde está o robô"], "Posição do robô", "robot_position", "LAM"),
  cmd("rob015", "robotics", "telemetry", ["iniciar telemetria", "ativar telemetria"], "Iniciar telemetria", "robot_telemetry_start", "LAM"),
  cmd("rob016", "robotics", "telemetry", ["parar telemetria", "desativar telemetria"], "Parar telemetria", "robot_telemetry_stop", "LAM"),
  cmd("rob017", "robotics", "fleet", ["listar robôs", "robôs conectados", "list robots"], "Listar robôs", "robot_list_fleet", "LAM"),
  cmd("rob018", "robotics", "fleet", ["adicionar robô", "registrar robô"], "Adicionar robô", "robot_register", "LAM"),
  cmd("rob019", "robotics", "twin", ["digital twin", "twin do robô", "aas status"], "Status Digital Twin", "robot_twin_status", "LAM"),
  cmd("rob020", "robotics", "twin", ["rollback configuração", "reverter robô"], "Rollback de configuração", "robot_twin_rollback", "LAM"),
];

// ════════════════════════════════════════════════════════════
// INDUSTRIAL SCADA COMMANDS (20)
// ════════════════════════════════════════════════════════════

const SCADA_COMMANDS: NeuralCommand[] = [
  cmd("scada001", "robotics", "scada", ["alarmes ativos", "listar alarmes", "alarmes do scada"], "Listar alarmes ativos", "scada_alarm_list", "LAM"),
  cmd("scada002", "robotics", "scada", ["reconhecer alarme", "ack alarme", "confirmar alarme"], "Reconhecer alarme", "scada_alarm_ack", "LAM"),
  cmd("scada003", "robotics", "scada", ["silenciar alarme", "calar alarme", "mute alarm"], "Silenciar alarme", "scada_alarm_silence", "LAM"),
  cmd("scada004", "robotics", "scada", ["ler setpoint", "valor do setpoint", "setpoint atual"], "Ler setpoint", "scada_setpoint_read", "LAM"),
  cmd("scada005", "robotics", "scada", ["alterar setpoint", "mudar setpoint", "ajustar setpoint"], "Alterar setpoint", "scada_setpoint_write", "LAM", 0.95),
  cmd("scada006", "robotics", "scada", ["ver tendência", "trend do processo", "gráfico de tendência"], "Ver tendência", "scada_trend_view", "LAM"),
  cmd("scada007", "robotics", "scada", ["exportar trend", "exportar histórico", "download histórico"], "Exportar histórico", "scada_trend_export", "LAM"),
  cmd("scada008", "robotics", "scada", ["carregar receita", "load recipe", "receita de produção"], "Carregar receita", "scada_recipe_load", "LAM"),
  cmd("scada009", "robotics", "scada", ["listar receitas", "receitas disponíveis"], "Listar receitas", "scada_recipe_list", "LAM"),
  cmd("scada010", "robotics", "scada", ["iniciar batelada", "start batch", "começar lote"], "Iniciar batelada", "scada_batch_start", "LAM", 0.95),
  cmd("scada011", "robotics", "scada", ["status da batelada", "batch status", "andamento do lote"], "Status da batelada", "scada_batch_status", "LAM"),
  cmd("scada012", "robotics", "scada", ["relatório de batelada", "batch report"], "Relatório de batelada", "scada_batch_report", "LAM"),
  cmd("scada013", "robotics", "scada", ["status do clp", "plc status", "status controlador"], "Status do CLP", "scada_plc_status", "LAM"),
  cmd("scada014", "robotics", "scada", ["diagnóstico do clp", "plc diagnostics"], "Diagnóstico do CLP", "scada_plc_diagnostics", "LAM"),
  cmd("scada015", "robotics", "scada", ["navegar opc-ua", "browse opcua", "variáveis opc"], "Navegar OPC-UA", "scada_opcua_browse", "LAM"),
  cmd("scada016", "robotics", "scada", ["ler variável opc", "read opc tag"], "Ler variável OPC-UA", "scada_opcua_read", "LAM"),
  cmd("scada017", "robotics", "scada", ["consultar historiador", "historian query"], "Consultar historiador", "scada_historian_query", "LAM"),
  cmd("scada018", "robotics", "scada", ["abrir sinóptico", "abrir mímico", "tela do processo"], "Abrir sinóptico", "scada_mimic_open", "LAM"),
  cmd("scada019", "robotics", "scada", ["status intertravamento", "interlock status"], "Status intertravamentos", "scada_interlock_status", "LAM"),
  cmd("scada020", "robotics", "scada", ["parada de emergência scada", "e-stop scada", "emergency stop planta"], "Parada emergência SCADA", "scada_emergency_stop", "LAM", 0.95),
];

// ════════════════════════════════════════════════════════════
// FLEET MANAGEMENT COMMANDS (20)
// ════════════════════════════════════════════════════════════

const FLEET_COMMANDS: NeuralCommand[] = [
  cmd("fleet001", "robotics", "fleet", ["status da frota", "fleet status", "como está a frota"], "Status da frota", "fleet_status", "LAM"),
  cmd("fleet002", "robotics", "fleet", ["despachar agv", "enviar agv", "dispatch agv"], "Despachar AGV", "fleet_dispatch", "LAM"),
  cmd("fleet003", "robotics", "fleet", ["criar missão", "nova missão", "new mission"], "Criar missão", "fleet_mission_create", "LAM"),
  cmd("fleet004", "robotics", "fleet", ["cancelar missão", "abortar missão"], "Cancelar missão", "fleet_mission_cancel", "LAM"),
  cmd("fleet005", "robotics", "fleet", ["listar missões", "missões ativas", "mission list"], "Listar missões", "fleet_mission_list", "LAM"),
  cmd("fleet006", "robotics", "fleet", ["otimizar rotas", "rota ótima", "optimize routes"], "Otimizar rotas", "fleet_route_optimize", "LAM"),
  cmd("fleet007", "robotics", "fleet", ["carga dos veículos", "bateria da frota", "charge status"], "Status de carga", "fleet_charge_status", "LAM"),
  cmd("fleet008", "robotics", "fleet", ["enviar para carga", "carregar veículo"], "Enviar para carga", "fleet_charge_send", "LAM"),
  cmd("fleet009", "robotics", "fleet", ["atualizar mapa", "update map", "mapa de navegação"], "Atualizar mapa", "fleet_map_update", "LAM"),
  cmd("fleet010", "robotics", "fleet", ["status vda5050", "vda 5050", "protocolo vda"], "Status VDA 5050", "fleet_vda5050_status", "LAM"),
  cmd("fleet011", "robotics", "fleet", ["ordem vda5050", "enviar ordem vda"], "Enviar ordem VDA 5050", "fleet_vda5050_order", "LAM"),
  cmd("fleet012", "robotics", "fleet", ["verificar colisão", "collision check", "zona de colisão"], "Verificar colisão", "fleet_collision_check", "LAM"),
  cmd("fleet013", "robotics", "fleet", ["pickup carga", "carga pickup", "recolher carga"], "Pickup de carga", "fleet_load_pickup", "LAM"),
  cmd("fleet014", "robotics", "fleet", ["dropoff carga", "descarga", "entregar carga"], "Dropoff de carga", "fleet_load_dropoff", "LAM"),
  cmd("fleet015", "robotics", "fleet", ["bloquear zona", "block zone", "fechar zona"], "Bloquear zona", "fleet_zone_block", "LAM"),
  cmd("fleet016", "robotics", "fleet", ["liberar zona", "release zone", "abrir zona"], "Liberar zona", "fleet_zone_release", "LAM"),
  cmd("fleet017", "robotics", "fleet", ["relatório diário frota", "daily fleet report"], "Relatório diário frota", "fleet_report_daily", "LAM"),
  cmd("fleet018", "robotics", "fleet", ["eficiência da frota", "fleet efficiency"], "Eficiência da frota", "fleet_report_efficiency", "LAM"),
  cmd("fleet019", "robotics", "fleet", ["registrar veículo", "add vehicle", "novo agv"], "Registrar veículo", "fleet_vehicle_register", "LAM"),
  cmd("fleet020", "robotics", "fleet", ["aposentar veículo", "retire vehicle", "desativar agv"], "Aposentar veículo", "fleet_vehicle_retire", "LAM"),
];

// ════════════════════════════════════════════════════════════
// QUALITY COMMANDS (15)
// ════════════════════════════════════════════════════════════

const QUALITY_COMMANDS: NeuralCommand[] = [
  cmd("qual001", "robotics", "quality", ["oee atual", "ver oee", "eficiência geral"], "OEE atual", "quality_oee_read", "LAM"),
  cmd("qual002", "robotics", "quality", ["relatório oee", "oee report"], "Relatório OEE", "quality_oee_report", "LAM"),
  cmd("qual003", "robotics", "quality", ["carta spc", "controle estatístico", "spc chart"], "Carta SPC", "quality_spc_chart", "LAM"),
  cmd("qual004", "robotics", "quality", ["alerta spc", "spc alert", "fora de controle"], "Alerta SPC", "quality_spc_alert", "LAM"),
  cmd("qual005", "robotics", "quality", ["registrar defeito", "log defeito", "novo defeito"], "Registrar defeito", "quality_defect_log", "LAM"),
  cmd("qual006", "robotics", "quality", ["relatório defeitos", "defect report"], "Relatório defeitos", "quality_defect_report", "LAM"),
  cmd("qual007", "robotics", "quality", ["iniciar inspeção", "start inspection"], "Iniciar inspeção", "quality_inspection_start", "LAM"),
  cmd("qual008", "robotics", "quality", ["resultado inspeção", "inspection result"], "Resultado inspeção", "quality_inspection_result", "LAM"),
  cmd("qual009", "robotics", "quality", ["rastreabilidade", "rastrear lote", "traceability"], "Rastreabilidade", "quality_traceability", "LAM"),
  cmd("qual010", "robotics", "quality", ["causa raiz", "root cause", "análise de causa"], "Análise causa raiz", "quality_root_cause", "LLM"),
  cmd("qual011", "robotics", "quality", ["cpk do processo", "índice cpk", "capability"], "Calcular Cpk", "quality_cpk_calculate", "LAM"),
  cmd("qual012", "robotics", "quality", ["calibração instrumentos", "calibration check"], "Verificar calibração", "quality_calibration_check", "LAM"),
  cmd("qual013", "robotics", "quality", ["abrir não conformidade", "nova nc", "nonconformity"], "Abrir não-conformidade", "quality_nonconformity_open", "LAM"),
  cmd("qual014", "robotics", "quality", ["agenda de auditoria", "audit schedule"], "Agenda auditorias", "quality_audit_schedule", "LAM"),
  cmd("qual015", "robotics", "quality", ["relatório six sigma", "six sigma report"], "Relatório Six Sigma", "quality_sixsigma_report", "LAM"),
];

// ════════════════════════════════════════════════════════════
// MAINTENANCE COMMANDS (15)
// ════════════════════════════════════════════════════════════

const MAINTENANCE_COMMANDS: NeuralCommand[] = [
  cmd("maint001", "robotics", "maintenance", ["criar ordem de serviço", "nova os", "work order"], "Criar OS", "maint_wo_create", "LAM"),
  cmd("maint002", "robotics", "maintenance", ["listar ordens de serviço", "os pendentes", "work orders"], "Listar OS", "maint_wo_list", "LAM"),
  cmd("maint003", "robotics", "maintenance", ["fechar ordem de serviço", "encerrar os"], "Fechar OS", "maint_wo_close", "LAM"),
  cmd("maint004", "robotics", "maintenance", ["preventiva agendada", "cronograma preventiva"], "Preventiva agendada", "maint_preventive_schedule", "LAM"),
  cmd("maint005", "robotics", "maintenance", ["gerar plano preventiva", "plano de manutenção"], "Gerar plano preventiva", "maint_preventive_generate", "LAM"),
  cmd("maint006", "robotics", "maintenance", ["preditiva status", "alertas preditivos", "predictive maintenance"], "Status preditiva", "maint_predictive_status", "LAM"),
  cmd("maint007", "robotics", "maintenance", ["mtbf mttr", "indicadores manutenção", "reliability report"], "MTBF/MTTR", "maint_mtbf_report", "LAM"),
  cmd("maint008", "robotics", "maintenance", ["peças de reposição", "spare parts", "estoque peças"], "Verificar spare parts", "maint_spare_check", "LAM"),
  cmd("maint009", "robotics", "maintenance", ["solicitar peça", "request spare"], "Solicitar peça", "maint_spare_request", "LAM"),
  cmd("maint010", "robotics", "maintenance", ["cronograma calibração", "calibration schedule"], "Cronograma calibração", "maint_calibration_schedule", "LAM"),
  cmd("maint011", "robotics", "maintenance", ["registrar calibração", "calibration result"], "Registrar calibração", "maint_calibration_register", "LAM"),
  cmd("maint012", "robotics", "maintenance", ["histórico equipamento", "equipment history"], "Histórico equipamento", "maint_equipment_history", "LAM"),
  cmd("maint013", "robotics", "maintenance", ["registrar parada", "downtime log", "parada máquina"], "Registrar downtime", "maint_downtime_log", "LAM"),
  cmd("maint014", "robotics", "maintenance", ["relatório downtime", "downtime report"], "Relatório downtime", "maint_downtime_report", "LAM"),
  cmd("maint015", "robotics", "maintenance", ["plano lubrificação", "lubrication plan"], "Plano lubrificação", "maint_lubrication_plan", "LAM"),
];

// ════════════════════════════════════════════════════════════
// ERP / LOGISTICS COMMANDS (10)
// ════════════════════════════════════════════════════════════

const ERP_COMMANDS: NeuralCommand[] = [
  cmd("erp001", "platform", "erp", ["verificar estoque", "stock check", "nível de estoque"], "Verificar estoque", "erp_stock_check", "LAM"),
  cmd("erp002", "platform", "erp", ["ajustar estoque", "stock adjust", "corrigir estoque"], "Ajustar estoque", "erp_stock_adjust", "LAM"),
  cmd("erp003", "platform", "erp", ["lista de materiais", "bom", "bill of materials"], "Ver BOM", "erp_bom_view", "LAM"),
  cmd("erp004", "platform", "erp", ["ordem de produção", "production order", "op nova"], "Ordem de produção", "erp_production_order", "LAM"),
  cmd("erp005", "platform", "erp", ["status produção", "production status"], "Status produção", "erp_production_status", "LAM"),
  cmd("erp006", "platform", "erp", ["rodar mrp", "calcular mrp", "mrp run"], "Executar MRP", "erp_mrp_run", "LAM"),
  cmd("erp007", "platform", "erp", ["contagem inventário", "inventory count"], "Contagem inventário", "erp_inventory_count", "LAM"),
  cmd("erp008", "platform", "erp", ["requisição de compra", "purchase request"], "Requisição de compra", "erp_purchase_request", "LAM"),
  cmd("erp009", "platform", "erp", ["custo de produção", "production cost"], "Custo de produção", "erp_cost_report", "LAM"),
  cmd("erp010", "platform", "erp", ["relatório de perdas", "waste report", "scrap report"], "Relatório de perdas", "erp_waste_report", "LAM"),
];

// ════════════════════════════════════════════════════════════
// HR COMMANDS (5)
// ════════════════════════════════════════════════════════════

const HR_COMMANDS: NeuralCommand[] = [
  cmd("hr001", "platform", "hr", ["listar funcionários", "employee list", "equipe"], "Listar funcionários", "hr_employee_list", "LAM"),
  cmd("hr002", "platform", "hr", ["registro de ponto", "timesheet", "check ponto"], "Registro de ponto", "hr_timesheet_check", "LAM"),
  cmd("hr003", "platform", "hr", ["escala de férias", "vacation schedule"], "Escala de férias", "hr_vacation_schedule", "LAM"),
  cmd("hr004", "platform", "hr", ["status folha", "payroll status"], "Status folha", "hr_payroll_status", "LAM"),
  cmd("hr005", "platform", "hr", ["admissão", "novo funcionário", "hiring"], "Processo admissão", "hr_admission_start", "LAM"),
];

// ════════════════════════════════════════════════════════════
// LOGISTICS COMMANDS (5)
// ════════════════════════════════════════════════════════════

const LOGISTICS_COMMANDS: NeuralCommand[] = [
  cmd("log001", "platform", "logistics", ["rastrear expedição", "track shipment"], "Rastrear expedição", "logistics_shipment_track", "LAM"),
  cmd("log002", "platform", "logistics", ["criar expedição", "new shipment"], "Criar expedição", "logistics_shipment_create", "LAM"),
  cmd("log003", "platform", "logistics", ["cotação frete", "freight quote"], "Cotação frete", "logistics_freight_quote", "LAM"),
  cmd("log004", "platform", "logistics", ["status entregas", "delivery status"], "Status entregas", "logistics_delivery_status", "LAM"),
  cmd("log005", "platform", "logistics", ["planejar rota", "route plan", "rota de entrega"], "Planejar rota", "logistics_route_plan", "LAM"),
];

export const NEURAL_COMMAND_REGISTRY: NeuralCommand[] = [
  // Voice (250)
  ...VOICE_GREETINGS, ...VOICE_NAVIGATION, ...VOICE_CRM, ...VOICE_DOCUMENTS,
  ...VOICE_SEARCH, ...VOICE_FINANCIAL, ...VOICE_NEURAL, ...VOICE_IOT,
  ...VOICE_CONFIG, ...VOICE_AUTOMATION, ...VOICE_MARKETPLACE, ...VOICE_EMAIL, ...VOICE_UTILS,
  // Facial (120)
  ...FACIAL_EMOTIONS, ...FACIAL_BIOMETRIC, ...FACIAL_ATTENTION, ...FACIAL_ANALYSIS, ...FACIAL_DIARIZATION,
  // Gesture (130)
  ...GESTURE_HAND, ...GESTURE_LIBRAS, ...GESTURE_BODY,
  // Object (200)
  ...OBJECT_OFFICE, ...OBJECT_LEGAL, ...OBJECT_PERSONAL, ...OBJECT_ENVIRONMENT, ...OBJECT_GENERAL,
  // Neural (200)
  ...NEURAL_MODELS, ...NEURAL_PIPELINE, ...NEURAL_CONSCIOUSNESS, ...NEURAL_AGENTS,
  // Architecture & Comparison (15)
  ...ARCHITECTURE_COMMANDS,
  // Editor (100)
  ...EDITOR_COMMANDS,
  // Platform (100) + Security
  ...PLATFORM_COMMANDS,
  ...SECURITY_COMMANDS,
  // Robotics (20)
  ...ROBOTICS_COMMANDS,
  // Industrial (80+)
  ...SCADA_COMMANDS,
  ...FLEET_COMMANDS,
  ...QUALITY_COMMANDS,
  ...MAINTENANCE_COMMANDS,
  // Enterprise (20)
  ...ERP_COMMANDS,
  ...HR_COMMANDS,
  ...LOGISTICS_COMMANDS,
];

// ─── Lookup Functions ───

const _triggerIndex = new Map<string, NeuralCommand>();
NEURAL_COMMAND_REGISTRY.forEach(cmd => {
  cmd.triggers.forEach(t => _triggerIndex.set(t.toLowerCase(), cmd));
});

/** Find the best matching command for a text input */
export function matchCommand(input: string): NeuralCommand | null {
  const lower = input.toLowerCase().trim();
  // Exact match first
  const exact = _triggerIndex.get(lower);
  if (exact) return exact;
  // Partial match
  for (const cmd of NEURAL_COMMAND_REGISTRY) {
    for (const trigger of cmd.triggers) {
      if (lower.includes(trigger.toLowerCase()) || trigger.toLowerCase().includes(lower)) {
        return cmd;
      }
    }
  }
  return null;
}

/** Get all commands for a category */
export function getCommandsByCategory(category: CommandCategory): NeuralCommand[] {
  return NEURAL_COMMAND_REGISTRY.filter(c => c.category === category);
}

/** Get all commands for a subcategory */
export function getCommandsBySubcategory(category: CommandCategory, subcategory: string): NeuralCommand[] {
  return NEURAL_COMMAND_REGISTRY.filter(c => c.category === category && c.subcategory === subcategory);
}

/** Get registry stats */
export function getRegistryStats(): Record<string, number> {
  const stats: Record<string, number> = { total: NEURAL_COMMAND_REGISTRY.length };
  const categories = new Set(NEURAL_COMMAND_REGISTRY.map(c => c.category));
  categories.forEach(cat => {
    stats[cat] = NEURAL_COMMAND_REGISTRY.filter(c => c.category === cat).length;
  });
  return stats;
}

/** Search commands by text (fuzzy) */
export function searchCommands(query: string, limit = 20): NeuralCommand[] {
  const lower = query.toLowerCase();
  return NEURAL_COMMAND_REGISTRY
    .filter(c =>
      c.triggers.some(t => t.toLowerCase().includes(lower)) ||
      c.description.toLowerCase().includes(lower) ||
      c.action.toLowerCase().includes(lower)
    )
    .slice(0, limit);
}
