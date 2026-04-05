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
  "meu plano": { path: "/dashboard/meu-plano", label: "Meu Plano" },
  "plano": { path: "/dashboard/meu-plano", label: "Meu Plano" },
  "ajuda": { path: "/dashboard/instrucoes", label: "Central de Ajuda" },
  "instrucoes": { path: "/dashboard/instrucoes", label: "Central de Ajuda" },
  "instruções": { path: "/dashboard/instrucoes", label: "Central de Ajuda" },
  "central de ajuda": { path: "/dashboard/instrucoes", label: "Central de Ajuda" },

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
  "metricas": { path: "/dashboard/metricas-ia", label: "Métricas IA" },
  "métricas": { path: "/dashboard/metricas-ia", label: "Métricas IA" },
  "laboratorio": { path: "/dashboard/laboratorio-ia", label: "Laboratório IA" },
  "laboratório": { path: "/dashboard/laboratorio-ia", label: "Laboratório IA" },
  "laboratorio ia": { path: "/dashboard/laboratorio-ia", label: "Laboratório IA" },
  "google": { path: "/dashboard/ferramentas-google", label: "Ferramentas Google" },
  "ferramentas google": { path: "/dashboard/ferramentas-google", label: "Ferramentas Google" },
  "gmail": { path: "/dashboard/ferramentas-google?tab=gmail", label: "Gmail" },
  "agenda": { path: "/dashboard/ferramentas-google?tab=calendar", label: "Agenda" },
  "calendar": { path: "/dashboard/ferramentas-google?tab=calendar", label: "Calendar" },
  "bloom": { path: "/dashboard/bloom", label: "Bloom Network" },

  // ── IOT & SMART HOME ──
  "controle robótico": { path: "/dashboard/controle-robotico", label: "Controle Robótico" },
  "controle robotico": { path: "/dashboard/controle-robotico", label: "Controle Robótico" },

  // ── MARKETPLACE ──
  "marketplace": { path: "/dashboard/marketplace", label: "Marketplace" },
  "loja": { path: "/dashboard/marketplace", label: "Marketplace" },
  "meus produtos": { path: "/dashboard/meus-produtos", label: "Meus Produtos" },
  "afiliados": { path: "/dashboard/afiliados", label: "Afiliados" },

  // ── EXTENSÃO ──
  "extensão": { path: "/extension", label: "Extensão Chrome" },
  "extensao": { path: "/extension", label: "Extensão Chrome" },

  // ── ADMIN ──
  "webhooks": { path: "/dashboard/webhooks", label: "Webhooks" },
  "usuarios": { path: "/dashboard/usuarios", label: "Usuários" },
  "usuários": { path: "/dashboard/usuarios", label: "Usuários" },

  // ── ORION ──
  "orion": { path: "/consulta", label: "Orion IA" },
  "orion ia": { path: "/consulta", label: "Orion IA" },

  // ── EXTERNAL PAGES ──
  "contato": { path: "/contato", label: "Contato e Planos" },
  "planos": { path: "/contato", label: "Planos e Preços" },
  "preços": { path: "/contato", label: "Planos e Preços" },
  "precos": { path: "/contato", label: "Planos e Preços" },
  "clientes site": { path: "/clientes", label: "Página de Clientes" },
};

export function detectNavigationIntent(text: string): { path: string; label: string } | null {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const navPatterns = [
    /(?:abr[aie]|ir\s*(?:para|pra|pro)|naveg(?:ar|ue)|mostr[ae]|acesse|vá\s*(?:para|pra)|leve\s*(?:me|para)|me\s*lev[ae])\s+(?:a|o|os|as|ao|à|no|na|nos|nas)?\s*(.+)/i,
    /(?:quero\s*(?:ver|ir|acessar|abrir))\s+(?:a|o|os|as)?\s*(.+)/i,
  ];
  for (const pattern of navPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const target = match[1].trim().replace(/[.!?,]$/, "");
      // Try longest match first to avoid partial matches
      const sortedKeys = Object.keys(NAV_MAP).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        if (target.includes(key)) return NAV_MAP[key];
      }
    }
  }
  return null;
}
