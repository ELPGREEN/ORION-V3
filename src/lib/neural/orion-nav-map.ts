// ═══ Shared Navigation Map for Orion + AssistenteIA ═══
// Synced with Central de Ajuda (InstrucoesPlataforma.tsx)

export const NAV_MAP: Record<string, { path: string; label: string }> = {
  // ── GERAL ──
  "home": { path: "/dashboard", label: "Dashboard Home" },
  "dashboard": { path: "/dashboard", label: "Dashboard Home" },
  "painel": { path: "/dashboard", label: "Dashboard Home" },
  "início": { path: "/dashboard", label: "Dashboard Home" },
  "inicio": { path: "/dashboard", label: "Dashboard Home" },
  "configurações": { path: "/dashboard/configuracoes", label: "Configurações" },
  "configuracoes": { path: "/dashboard/configuracoes", label: "Configurações" },
  "settings": { path: "/dashboard/configuracoes", label: "Configurações" },
  "perfil": { path: "/dashboard/configuracoes", label: "Meu Perfil" },
  "meu perfil": { path: "/dashboard/configuracoes", label: "Meu Perfil" },
  "notificações": { path: "/dashboard/notificacoes", label: "Notificações" },
  "notificacoes": { path: "/dashboard/notificacoes", label: "Notificações" },
  "pagamentos": { path: "/dashboard/pagamentos", label: "Pagamentos" },
  "fatura": { path: "/dashboard/pagamentos", label: "Pagamentos" },
  "faturas": { path: "/dashboard/pagamentos", label: "Pagamentos" },
  "financeiro": { path: "/dashboard/pagamentos", label: "Financeiro" },
  "timbre": { path: "/dashboard/configuracoes", label: "Timbre e Identidade" },
  "meu plano": { path: "/dashboard/plano", label: "Meu Plano" },
  "plano": { path: "/dashboard/plano", label: "Meu Plano" },
  "ajuda": { path: "/dashboard/instrucoes", label: "Central de Ajuda" },
  "instrucoes": { path: "/dashboard/instrucoes", label: "Central de Ajuda" },
  "instruções": { path: "/dashboard/instrucoes", label: "Central de Ajuda" },
  "central de ajuda": { path: "/dashboard/instrucoes", label: "Central de Ajuda" },
  "guia completo": { path: "/dashboard/instrucoes", label: "Guia Completo" },
  "guia de uso": { path: "/dashboard/instrucoes", label: "Guia de Uso" },
  "manual": { path: "/dashboard/instrucoes", label: "Manual da Plataforma" },

  // ── JURÍDICO ──
  "documentos": { path: "/dashboard/documentos", label: "Meus Documentos" },
  "documento": { path: "/dashboard/documentos", label: "Meus Documentos" },
  "meus documentos": { path: "/dashboard/documentos", label: "Meus Documentos" },
  "gerar documento": { path: "/dashboard/gerar-documento", label: "Gerar Documento" },
  "gerar": { path: "/dashboard/gerar-documento", label: "Gerar Documento" },
  "clientes": { path: "/dashboard/crm?tab=clientes", label: "Clientes" },
  "cliente": { path: "/dashboard/crm?tab=clientes", label: "Clientes" },
  "crm": { path: "/dashboard/crm?tab=pipeline", label: "CRM" },
  "contatos": { path: "/dashboard/crm?tab=contatos", label: "Contatos" },
  "processos": { path: "/dashboard/processos", label: "Processos" },
  "processo": { path: "/dashboard/processos", label: "Processos" },
  "tarefas": { path: "/dashboard/tarefas", label: "Tarefas & Prazos" },
  "tarefa": { path: "/dashboard/tarefas", label: "Tarefas & Prazos" },
  "prazos": { path: "/dashboard/tarefas", label: "Tarefas & Prazos" },
  "assinatura digital": { path: "/dashboard/assinatura-digital", label: "Assinatura Digital" },
  "assinatura": { path: "/dashboard/assinatura-digital", label: "Assinatura Digital" },
  "assinaturas": { path: "/dashboard/assinatura-digital", label: "Assinatura Digital" },
  "assinatura cliente": { path: "/dashboard/assinatura-cliente", label: "Assinatura Cliente" },
  "documentos internacionais": { path: "/dashboard/documentos-internacionais", label: "Documentos Internacionais" },
  "docs internacionais": { path: "/dashboard/documentos-internacionais", label: "Documentos Internacionais" },
  "pesquisa": { path: "/dashboard/pesquisa-unificada", label: "Pesquisa Jurídica" },
  "pesquisar": { path: "/dashboard/pesquisa-unificada", label: "Pesquisa Jurídica" },
  "pesquisa avançada": { path: "/dashboard/pesquisa-unificada", label: "Pesquisa Avançada" },
  "pesquisa avancada": { path: "/dashboard/pesquisa-unificada", label: "Pesquisa Avançada" },
  "jurisprudencia": { path: "/dashboard/pesquisa-unificada", label: "Pesquisa Jurídica" },
  "jurisprudência": { path: "/dashboard/pesquisa-unificada", label: "Pesquisa Jurídica" },
  "reformulação": { path: "/dashboard/reformulacao", label: "Reformulação IA" },
  "reformulacao": { path: "/dashboard/reformulacao", label: "Reformulação IA" },
  "chat ao vivo": { path: "/dashboard/chat-ao-vivo", label: "Chat ao Vivo" },
  "chat": { path: "/dashboard/chat-ao-vivo", label: "Chat ao Vivo" },
  "consultas": { path: "/dashboard/consultas", label: "Consultas" },
  "consulta": { path: "/dashboard/consultas", label: "Consultas" },
  "agendar consulta": { path: "/dashboard/consultas", label: "Agendar Consulta" },
  "publicações": { path: "/dashboard/publicacoes-admin", label: "Publicações" },
  "publicacoes": { path: "/dashboard/publicacoes-admin", label: "Publicações" },
  "recursos eu": { path: "/dashboard/recursos-eu", label: "Recursos EU" },
  "recursos europeus": { path: "/dashboard/recursos-eu", label: "Recursos Europeus" },

  // ── INTELIGÊNCIA ARTIFICIAL ──
  "rede neural": { path: "/dashboard/rede-neural", label: "Rede Neural" },
  "neural": { path: "/dashboard/rede-neural", label: "Rede Neural" },
  "metricas": { path: "/dashboard/rede-neural", label: "Métricas IA" },
  "métricas": { path: "/dashboard/rede-neural", label: "Métricas IA" },
  "laboratorio": { path: "/dashboard/laboratorio-ia", label: "Laboratório IA" },
  "laboratório": { path: "/dashboard/laboratorio-ia", label: "Laboratório IA" },
  "laboratorio ia": { path: "/dashboard/laboratorio-ia", label: "Laboratório IA" },
  "google": { path: "/dashboard/ferramentas-google", label: "Ferramentas Google" },
  "ferramentas google": { path: "/dashboard/ferramentas-google", label: "Ferramentas Google" },
  "gmail": { path: "/dashboard/ferramentas-google?tab=gmail", label: "Gmail" },
  "agenda": { path: "/dashboard/ferramentas-google?tab=calendar", label: "Agenda" },
  "calendar": { path: "/dashboard/ferramentas-google?tab=calendar", label: "Calendar" },
  "bloom": { path: "/dashboard/rede-neural", label: "Bloom Network" },

  // ── IOT & SMART HOME ──
  "controle robótico": { path: "/dashboard/controle-robotico", label: "Controle Robótico" },
  "controle robotico": { path: "/dashboard/controle-robotico", label: "Controle Robótico" },
  "smart home": { path: "/dashboard/dispositivos-iot", label: "Smart Home" },
  "casa inteligente": { path: "/dashboard/dispositivos-iot", label: "Casa Inteligente" },
  "dispositivos": { path: "/dashboard/dispositivos-iot", label: "Dispositivos IoT" },
  "iot": { path: "/dashboard/dispositivos-iot", label: "Dispositivos IoT" },

  // ── INDUSTRIAL ──
  "scada": { path: "/dashboard/controle-robotico", label: "SCADA / Supervisório" },
  "supervisório": { path: "/dashboard/controle-robotico", label: "Supervisório" },
  "supervisorio": { path: "/dashboard/controle-robotico", label: "Supervisório" },
  "frota": { path: "/dashboard/controle-robotico", label: "Gestão de Frota" },
  "fleet": { path: "/dashboard/controle-robotico", label: "Fleet Management" },
  "agv": { path: "/dashboard/controle-robotico", label: "AGVs / AMRs" },
  "amr": { path: "/dashboard/controle-robotico", label: "AGVs / AMRs" },
  "qualidade": { path: "/dashboard/rede-neural", label: "Qualidade & OEE" },
  "oee": { path: "/dashboard/rede-neural", label: "OEE" },
  "spc": { path: "/dashboard/rede-neural", label: "Controle Estatístico" },
  "manutenção": { path: "/dashboard/tarefas", label: "Manutenção" },
  "manutencao": { path: "/dashboard/tarefas", label: "Manutenção" },
  "estoque": { path: "/dashboard/marketplace", label: "Estoque" },
  "inventário": { path: "/dashboard/marketplace", label: "Inventário" },
  "inventario": { path: "/dashboard/marketplace", label: "Inventário" },
  "erp": { path: "/dashboard/marketplace", label: "ERP" },
  "produção": { path: "/dashboard/marketplace", label: "Produção" },
  "producao": { path: "/dashboard/marketplace", label: "Produção" },
  "logística": { path: "/dashboard/marketplace", label: "Logística" },
  "logistica": { path: "/dashboard/marketplace", label: "Logística" },
  "expedição": { path: "/dashboard/marketplace", label: "Expedição" },
  "expedicao": { path: "/dashboard/marketplace", label: "Expedição" },
  "rh": { path: "/dashboard/crm?tab=contatos", label: "Recursos Humanos" },
  "recursos humanos": { path: "/dashboard/crm?tab=contatos", label: "Recursos Humanos" },

  // ── MARKETPLACE ──
  "marketplace": { path: "/dashboard/marketplace", label: "Marketplace" },
  "loja": { path: "/dashboard/marketplace", label: "Marketplace" },
  "meus produtos": { path: "/dashboard/meus-produtos", label: "Meus Produtos" },
  "afiliados": { path: "/dashboard/afiliados", label: "Afiliados" },

  // ── EXTENSÃO ──
  "extensão": { path: "/dashboard/extension", label: "Extensão Chrome" },
  "extensao": { path: "/dashboard/extension", label: "Extensão Chrome" },

  // ── ADMIN ──
  "webhooks": { path: "/dashboard/configuracoes", label: "Webhooks" },
  "usuarios": { path: "/dashboard/usuarios", label: "Usuários" },
  "usuários": { path: "/dashboard/usuarios", label: "Usuários" },

  // ── ORION ──
  "orion": { path: "/consulta", label: "Orion IA" },
  "orion ia": { path: "/consulta", label: "Orion IA" },

  // ── EXTERNAL / PUBLIC PAGES ──
  "contato": { path: "/contato", label: "Contato e Planos" },
  "planos": { path: "/contato", label: "Planos e Preços" },
  "preços": { path: "/contato", label: "Planos e Preços" },
  "precos": { path: "/contato", label: "Planos e Preços" },
  "clientes site": { path: "/servicos", label: "Soluções e Serviços" },

  // ── PUBLIC SITE PAGES ──
  "home site": { path: "/", label: "Página Inicial" },
  "página inicial": { path: "/", label: "Página Inicial" },
  "pagina inicial": { path: "/", label: "Página Inicial" },
  "site": { path: "/", label: "Página Inicial" },
  "serviços": { path: "/servicos", label: "Soluções e Serviços" },
  "servicos": { path: "/servicos", label: "Soluções e Serviços" },
  "soluções": { path: "/servicos", label: "Soluções e Serviços" },
  "solucoes": { path: "/servicos", label: "Soluções e Serviços" },
  "advogados": { path: "/solucoes/advogados", label: "Soluções para Advogados" },
  "para advogados": { path: "/solucoes/advogados", label: "Soluções para Advogados" },
  "produtores digitais": { path: "/solucoes/produtores", label: "Soluções para Produtores Digitais" },
  "para produtores": { path: "/solucoes/produtores", label: "Soluções para Produtores Digitais" },
  "produtores": { path: "/solucoes/produtores", label: "Soluções para Produtores" },
  "afiliados site": { path: "/solucoes/afiliados", label: "Soluções para Afiliados" },
  "para afiliados": { path: "/solucoes/afiliados", label: "Soluções para Afiliados" },
  "indústria": { path: "/solucoes/industria", label: "Soluções para Indústria" },
  "industria": { path: "/solucoes/industria", label: "Soluções para Indústria" },
  "para indústria": { path: "/solucoes/industria", label: "Soluções para Indústria" },
  "robotica": { path: "/solucoes/industria", label: "Robótica e Automação" },
  "robótica": { path: "/solucoes/industria", label: "Robótica e Automação" },
  "automação": { path: "/solucoes/industria", label: "Automação Industrial" },
  "automacao": { path: "/solucoes/industria", label: "Automação Industrial" },
  "plataforma": { path: "/plataforma", label: "Plataforma Orion" },
  "funcionalidades": { path: "/plataforma", label: "Funcionalidades" },
  "investidor": { path: "/investidor", label: "Portal do Investidor" },
  "investidores": { path: "/investidor", label: "Portal do Investidor" },
  "investir": { path: "/investidor", label: "Portal do Investidor" },
  "publicações site": { path: "/publicacoes", label: "Publicações e Insights" },
  "blog": { path: "/publicacoes", label: "Blog e Publicações" },
  "insights": { path: "/publicacoes", label: "Insights Orion" },
  "escritório": { path: "/solucoes/advogados", label: "Soluções para Advogados" },
  "escritorio": { path: "/solucoes/advogados", label: "Soluções para Advogados" },
  "depoimentos": { path: "/depoimentos", label: "Casos de Sucesso" },
  "casos de sucesso": { path: "/depoimentos", label: "Casos de Sucesso" },
  "privacidade": { path: "/privacidade", label: "Política de Privacidade" },
  "termos": { path: "/termos", label: "Termos de Uso" },
  "lgpd": { path: "/lgpd", label: "LGPD" },
  "login": { path: "/auth", label: "Login" },
  "entrar": { path: "/auth", label: "Fazer Login" },
  "cadastro": { path: "/cadastro", label: "Cadastrar" },
  "cadastrar": { path: "/cadastro", label: "Cadastrar" },
  "criar conta": { path: "/cadastro", label: "Criar Conta" },
  "instalar": { path: "/install", label: "Instalar App" },
  "instalar app": { path: "/install", label: "Instalar App" },
  "download": { path: "/install", label: "Instalar App" },
};

export function detectNavigationIntent(text: string): { path: string; label: string } | null {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // "Voltar para o painel / dashboard"
  if (/volt[ae]r?\s*(para|pro|pra|ao)?\s*(painel|dashboard|inicio|home)/i.test(lower)) {
    return NAV_MAP["dashboard"];
  }
  // "Voltar para a página inicial / site"
  if (/volt[ae]r?\s*(para|pro|pra|ao?)?\s*(site|pagina\s*inicial)/i.test(lower)) {
    return NAV_MAP["pagina inicial"];
  }
  // "Quero ver os planos" / "Me mostra os preços"
  if (/(?:ver|mostrar?|quais?\s*s[aã]o)\s*(?:os|as)?\s*(?:planos|precos|preços)/i.test(lower)) {
    return NAV_MAP["planos"];
  }
  // "Quero contratar" / "quero assinar"
  if (/(?:quero|desejo|gostaria)\s*(?:de)?\s*(?:contratar|assinar|comprar)/i.test(lower)) {
    return NAV_MAP["planos"];
  }

  const navPatterns = [
    /(?:abr[aie]|ir\s*(?:para|pra|pro)|naveg(?:ar|ue)|mostr[ae]|acesse|va\s*(?:para|pra)|leve\s*(?:me|para)|me\s*lev[ae])\s+(?:a|o|os|as|ao|a|no|na|nos|nas)?\s*(.+)/i,
    /(?:quero\s*(?:ver|ir|acessar|abrir))\s+(?:a|o|os|as)?\s*(.+)/i,
  ];
  for (const pattern of navPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const target = match[1].trim().replace(/[.!?,]$/, "");
      const sortedKeys = Object.keys(NAV_MAP).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        if (target.includes(key)) return NAV_MAP[key];
      }
    }
  }
  return null;
}
