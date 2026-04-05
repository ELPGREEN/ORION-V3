import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  TrendingUp,
  FileText,
  FolderOpen,
  Users,
  ListTodo,
  PenTool,
  Globe,
  MessagesSquare,
  Calendar,
  CreditCard,
  Bell,
  Brain,
  Settings,
  Sparkles,
  ScrollText,
  FlaskConical,
  Mic,
  Home,
  Lightbulb,
  HelpCircle,
  ExternalLink,
  BookOpen,
  Shield,
  ChevronRight,
  Cpu,
  Store,
  Link2,
  Network,
  Leaf,
  Gamepad2,
  Chrome,
  Eye,
  Volume2,
  Navigation,
  Zap,
  Bot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Section {
  id: string;
  title: string;
  icon: any;
  description: string;
  roles: string[];
  category: "geral" | "juridico" | "ia" | "voz" | "iot" | "marketplace";
  links: { label: string; path: string }[];
  steps: string[];
  voiceCommands?: string[];
  faq?: { q: string; a: string }[];
}

const allSections: Section[] = [
  // ═══════════════════════════════════════
  // GERAL
  // ═══════════════════════════════════════
  {
    id: "visao-geral",
    title: "Visão Geral da Plataforma",
    icon: TrendingUp,
    category: "geral",
    description:
      "A plataforma ORION é um sistema completo de gestão jurídica e empresarial com inteligência artificial. Gerencie documentos, clientes, processos, tarefas, assinaturas digitais e muito mais — tudo em um só lugar.",
    roles: ["advogado", "cliente", "produtor", "afiliado"],
    links: [{ label: "Ir para o Painel", path: "/dashboard" }],
    steps: [
      "Faça login com seu e-mail e senha ou autenticação biométrica.",
      "Você será redirecionado ao painel inicial com resumo de atividades.",
      "Use o menu lateral para navegar entre as seções.",
      "No celular, toque no ícone ☰ para abrir o menu.",
      'Use o Assistente Orion por voz dizendo "Orion" ou "Painel" seguido de um comando.',
    ],
    faq: [
      { q: "Posso usar em dispositivos móveis?", a: "Sim, a plataforma é totalmente responsiva e também pode ser instalada como app (PWA)." },
      { q: "Preciso pagar para usar?", a: "Há um plano gratuito com funcionalidades básicas. Planos avançados desbloqueiam IA, assinatura digital e mais." },
    ],
  },
  {
    id: "configuracoes",
    title: "⚙️ Perfil & Configurações",
    icon: Settings,
    category: "geral",
    description:
      "Personalize seu perfil, dados profissionais, escritório, plano de assinatura, integrações, webhooks e segurança (biometria, dispositivos).",
    roles: ["advogado", "cliente", "produtor", "afiliado"],
    links: [{ label: "Configurações", path: "/dashboard/configuracoes" }],
    steps: [
      'Acesse "Configurações" ou "Meu Escritório" no menu.',
      "Edite seus dados pessoais e profissionais.",
      "Configure integrações (Google, webhooks, dispositivos).",
      "Gerencie segurança: biometria, sessões ativas, dispositivos.",
      "Atualize seu plano de assinatura.",
    ],
    voiceCommands: [
      '"Orion, abrir configurações"',
      '"Orion, atualizar meus dados"',
    ],
  },
  {
    id: "notificacoes",
    title: "🔔 Notificações",
    icon: Bell,
    category: "geral",
    description:
      "Central de alertas de prazos, mensagens, atividades, movimentações processuais e atualizações do sistema.",
    roles: ["advogado", "cliente", "produtor", "afiliado"],
    links: [{ label: "Notificações", path: "/dashboard/notificacoes" }],
    steps: [
      'Acesse "Notificações" no menu ou clique no ícone 🔔.',
      "Veja alertas organizados por data.",
      "Clique em uma notificação para ir diretamente à ação.",
      "Configure preferências de notificação nas configurações.",
    ],
    voiceCommands: ['"Orion, ver notificações"', '"Orion, abrir notificações"'],
  },
  {
    id: "pagamentos",
    title: "💳 Pagamentos",
    icon: CreditCard,
    category: "geral",
    description:
      "Controle de honorários, cobranças, faturamento e histórico de pagamentos. Integração com Stripe para pagamentos online.",
    roles: ["advogado", "cliente", "produtor", "afiliado"],
    links: [{ label: "Pagamentos", path: "/dashboard/pagamentos" }],
    steps: [
      'Acesse "Pagamentos" no menu.',
      "Veja histórico de cobranças e pagamentos.",
      "Gere novas cobranças vinculadas a clientes ou processos.",
      "Acompanhe status (pendente, pago, vencido).",
    ],
    voiceCommands: ['"Orion, verificar pagamentos"', '"Orion, abrir financeiro"'],
  },
  {
    id: "timbre",
    title: "📑 Timbre e Identidade Profissional",
    icon: ScrollText,
    category: "geral",
    description:
      "Personalize seus documentos com identidade visual: logo, número da OAB, contatos no rodapé, linha dourada e endereço profissional.",
    roles: ["advogado"],
    links: [{ label: "Configurações do Escritório", path: "/dashboard/configuracoes" }],
    steps: [
      'Acesse "Meu Escritório" > "Timbre".',
      "Faça upload do logo do escritório.",
      "Preencha OAB, endereço, telefone e e-mail.",
      "Ative a linha dourada decorativa nos documentos.",
      "Todos os documentos gerados usarão automaticamente o timbre configurado.",
    ],
    voiceCommands: ['"Orion, configurar timbre"'],
  },

  // ═══════════════════════════════════════
  // JURÍDICO
  // ═══════════════════════════════════════
  {
    id: "documentos",
    title: "📄 Gestão de Documentos",
    icon: FolderOpen,
    category: "juridico",
    description:
      "Crie, edite, organize e armazene documentos jurídicos ou empresariais. Gere contratos, petições e relatórios automaticamente com IA. Exporte em PDF ou Word.",
    roles: ["advogado", "cliente", "produtor"],
    links: [
      { label: "Gerar Documento IA", path: "/dashboard/gerar-documento" },
      { label: "Meus Documentos", path: "/dashboard/documentos" },
    ],
    steps: [
      'Acesse "Gerar Documento IA" no menu.',
      "Escolha o tipo de documento (contrato, petição, relatório, etc.).",
      "Preencha os campos do formulário ou dite por voz.",
      "A IA gerará o documento automaticamente.",
      "Revise, edite e salve. Exporte em PDF ou Word.",
      'Documentos salvos ficam em "Meus Documentos".',
    ],
    voiceCommands: [
      '"Orion, gerar um contrato de prestação de serviços"',
      '"Orion, abrir meu último documento"',
      '"Orion, abrir documentos"',
    ],
    faq: [
      { q: "Posso editar um documento gerado?", a: "Sim, todos os documentos podem ser editados no editor integrado antes de exportar." },
      { q: "Os documentos são salvos na nuvem?", a: "Sim, todos ficam armazenados com segurança no seu painel." },
    ],
  },
  {
    id: "crm",
    title: "👥 CRM & Clientes",
    icon: Users,
    category: "juridico",
    description:
      "Gestão completa de clientes e relacionamento. Cadastro, histórico, acompanhamento de casos, classificação por prioridade, pipeline de vendas e anotações internas.",
    roles: ["advogado"],
    links: [
      { label: "CRM Pipeline", path: "/dashboard/crm?tab=pipeline" },
      { label: "Clientes", path: "/dashboard/crm?tab=clientes" },
      { label: "Contatos", path: "/dashboard/crm?tab=contatos" },
    ],
    steps: [
      'Acesse "CRM & Clientes" no menu.',
      'Clique em "Novo Cliente" para cadastrar.',
      "Preencha nome, e-mail, telefone, CPF e tipo de caso.",
      "Use filtros para buscar clientes por status ou prioridade.",
      "Use o Pipeline para acompanhar o funil de conversão.",
      "Clique em um cliente para ver histórico completo e documentos vinculados.",
    ],
    voiceCommands: [
      '"Orion, abrir CRM"',
      '"Orion, abrir clientes"',
      '"Orion, abrir contatos"',
      '"Orion, adicionar novo cliente"',
    ],
    faq: [
      { q: "Clientes podem ver seus próprios dados?", a: "Sim, clientes com conta na plataforma acessam seus processos e documentos pelo painel." },
    ],
  },
  {
    id: "processos",
    title: "⚙️ Processos",
    icon: FileText,
    category: "juridico",
    description:
      "Controle de processos jurídicos ou administrativos. Acompanhe andamento, vincule documentos e clientes, e receba alertas de movimentação.",
    roles: ["advogado"],
    links: [{ label: "Processos", path: "/dashboard/processos" }],
    steps: [
      'Acesse "Processos" no menu.',
      'Clique em "Novo Processo" e preencha número, tipo e partes.',
      "Vincule clientes e documentos ao processo.",
      "Registre andamentos com data e descrição.",
      "Acompanhe a linha do tempo de cada processo.",
    ],
    voiceCommands: [
      '"Orion, abrir processos"',
      '"Orion, abrir processo 12345"',
      '"Orion, ver próximos prazos"',
    ],
  },
  {
    id: "tarefas",
    title: "⏰ Tarefas & Prazos",
    icon: ListTodo,
    category: "juridico",
    description:
      "Organize atividades e compromissos com criação de tarefas, alertas automáticos, prioridades e integração com agenda.",
    roles: ["advogado"],
    links: [{ label: "Tarefas & Prazos", path: "/dashboard/tarefas" }],
    steps: [
      'Acesse "Tarefas & Prazos" no menu.',
      'Clique em "Nova Tarefa".',
      "Defina título, descrição, prazo e prioridade (alta/média/baixa).",
      "Tarefas com prazo próximo geram alertas automáticos.",
      "Marque como concluída quando finalizar.",
    ],
    voiceCommands: [
      '"Orion, abrir tarefas"',
      '"Orion, criar tarefa para amanhã às 10h"',
      '"Orion, listar tarefas pendentes"',
    ],
  },
  {
    id: "assinatura",
    title: "✍️ Assinatura Digital",
    icon: PenTool,
    category: "juridico",
    description:
      "Assine documentos digitalmente com validade legal. Solicite assinatura de clientes, acompanhe status e mantenha histórico certificado.",
    roles: ["advogado", "cliente"],
    links: [
      { label: "Assinatura (Advogado)", path: "/dashboard/assinatura-digital" },
      { label: "Assinatura (Cliente)", path: "/dashboard/assinatura-cliente" },
    ],
    steps: [
      "Abra o documento que deseja assinar.",
      'Clique em "Assinar Digitalmente".',
      "Desenhe sua assinatura ou use a assinatura salva.",
      "Confirme e o documento receberá certificação digital.",
      "Para solicitar assinatura de terceiros, clique em 'Enviar para Assinatura'.",
    ],
    voiceCommands: [
      '"Orion, abrir assinatura digital"',
      '"Orion, enviar documento para assinatura"',
    ],
  },
  {
    id: "docs-internacionais",
    title: "🌍 Documentos Internacionais",
    icon: Globe,
    category: "juridico",
    description:
      "Crie e adapte documentos para outros países com tradução automática jurídica, modelos internacionais e adequação a legislações locais.",
    roles: ["advogado", "produtor"],
    links: [{ label: "Docs Internacionais", path: "/dashboard/documentos-internacionais" }],
    steps: [
      'Acesse "Docs Internacionais" no menu.',
      "Escolha o tipo de documento e o país de destino.",
      "A IA adapta automaticamente a legislação e traduz.",
      "Revise o documento final e exporte.",
    ],
    voiceCommands: [
      '"Orion, traduzir documento para inglês"',
      '"Orion, gerar contrato internacional"',
    ],
  },
  {
    id: "pesquisa",
    title: "🔍 Pesquisa Jurídica Unificada",
    icon: Search,
    category: "juridico",
    description:
      "Busca inteligente que combina semântica + palavras-chave em jurisprudência (STF, STJ, TST, TSE), legislação (LexML, Câmara, Senado), doutrina e dados abertos do CNJ/Datajud.",
    roles: ["advogado"],
    links: [{ label: "Pesquisa Avançada", path: "/dashboard/pesquisa-unificada" }],
    steps: [
      'Acesse "Pesquisa Avançada" no menu de Ferramentas.',
      "Digite sua consulta jurídica em linguagem natural.",
      "Filtre por tribunal, tipo, data e jurisdição.",
      "Veja resultados ranqueados por relevância semântica e autoridade.",
      "Clique para ver detalhes e link para a fonte original.",
    ],
    voiceCommands: [
      '"Orion, pesquisar jurisprudência sobre dano moral"',
      '"Orion, abrir pesquisa"',
      '"Orion, buscar legislação sobre LGPD"',
    ],
  },
  {
    id: "reformulacao",
    title: "✏️ Reformulação Jurídica IA",
    icon: ScrollText,
    category: "juridico",
    description:
      "Reformule textos jurídicos automaticamente com IA. Escolha entre estilos: formal, simplificado, técnico, persuasivo. Ideal para adequação de linguagem em petições e contratos.",
    roles: ["advogado"],
    links: [{ label: "Reformulação IA", path: "/dashboard/reformulacao" }],
    steps: [
      'Acesse "Reformulação IA" no menu.',
      "Cole ou digite o texto a ser reformulado.",
      "Escolha o estilo desejado (formal, simplificado, técnico, etc.).",
      "A IA irá reescrever mantendo o sentido jurídico.",
      "Copie ou exporte o texto reformulado.",
    ],
    voiceCommands: [
      '"Orion, abrir reformulação"',
      '"Orion, reescrever esse texto formalmente"',
    ],
  },
  {
    id: "chat",
    title: "💬 Chat ao Vivo",
    icon: MessagesSquare,
    category: "juridico",
    description:
      "Comunicação em tempo real entre advogado e cliente. Histórico completo de conversas, notificações de mensagens não lidas.",
    roles: ["advogado", "cliente"],
    links: [{ label: "Chat ao Vivo", path: "/dashboard/chat-ao-vivo" }],
    steps: [
      'Acesse "Chat ao Vivo" no menu.',
      "Selecione uma conversa existente ou inicie uma nova.",
      "Digite sua mensagem e envie.",
      "Mensagens não lidas aparecem com badge de notificação.",
    ],
    voiceCommands: ['"Orion, abrir chat"'],
  },
  {
    id: "consultas",
    title: "📅 Consultas Agendadas",
    icon: Calendar,
    category: "juridico",
    description:
      "Agende consultas com advogados, registre anotações automáticas e gerencie pagamentos associados.",
    roles: ["advogado", "cliente"],
    links: [{ label: "Agendar Consulta", path: "/dashboard/consultas" }],
    steps: [
      'Acesse "Consultas" ou "Agendar Consulta" no menu.',
      "Escolha data, horário e tipo de consulta.",
      "Confirme o agendamento e realize o pagamento (se necessário).",
      "Receba notificação antes da consulta.",
    ],
    voiceCommands: ['"Orion, agendar consulta"', '"Orion, abrir consultas"'],
  },
  {
    id: "publicacoes",
    title: "📰 Publicações & Blog",
    icon: BookOpen,
    category: "juridico",
    description:
      "Publique artigos jurídicos, atualizações legislativas e conteúdo informativo. Gerencie depoimentos e avaliações de clientes.",
    roles: ["advogado"],
    links: [{ label: "Publicações Admin", path: "/dashboard/publicacoes-admin" }],
    steps: [
      'Acesse "Publicações" no menu.',
      'Clique em "Nova Publicação" para criar um artigo.',
      "Use o editor rico para formatar o conteúdo.",
      "Publique ou agende para data futura.",
      "Gerencie depoimentos e avaliações na mesma seção.",
    ],
    voiceCommands: ['"Orion, abrir publicações"'],
  },
  {
    id: "recursos-eu",
    title: "🇪🇺 Recursos & Financiamento EU",
    icon: Leaf,
    category: "juridico",
    description:
      "Acesso a informações sobre financiamentos europeus, IA Act, Indústria 5.0, GAIA-X e programas de apoio à inovação e sustentabilidade.",
    roles: ["advogado"],
    links: [{ label: "Recursos EU", path: "/dashboard/recursos-eu" }],
    steps: [
      'Acesse "Recursos EU" no menu de Ferramentas.',
      "Explore programas de financiamento disponíveis.",
      "Filtre por área (IA, sustentabilidade, indústria).",
      "Veja requisitos e prazos de candidatura.",
    ],
    voiceCommands: ['"Orion, abrir recursos europeus"'],
  },

  // ═══════════════════════════════════════
  // INTELIGÊNCIA ARTIFICIAL
  // ═══════════════════════════════════════
  {
    id: "ferramentas-ia",
    title: "🤖 Ferramentas Inteligentes (IA)",
    icon: Brain,
    category: "ia",
    description:
      "Ambiente de produtividade avançada com IA. Geração automática de textos jurídicos, reformulação, pesquisa avançada, laboratório de testes e rede neural completa.",
    roles: ["advogado"],
    links: [
      { label: "Rede Neural", path: "/dashboard/rede-neural" },
      { label: "Reformulação IA", path: "/dashboard/reformulacao" },
      { label: "Pesquisa Avançada", path: "/dashboard/pesquisa-unificada" },
      { label: "Laboratório IA", path: "/dashboard/laboratorio-ia" },
    ],
    steps: [
      "Acesse uma das ferramentas IA pelo menu.",
      "Na Rede Neural, veja métricas, provedores, consciência e agentes.",
      "Na Reformulação, cole um texto e escolha o estilo desejado.",
      "Na Pesquisa Avançada, busque jurisprudência e legislação.",
      "No Laboratório, teste novas funções e automações experimentais.",
    ],
    voiceCommands: [
      '"Orion, abrir rede neural"',
      '"Orion, pesquisar jurisprudência"',
      '"Orion, melhorar esse documento"',
      '"Orion, abrir laboratório"',
    ],
  },
  {
    id: "laboratorio",
    title: "🧪 Laboratório IA",
    icon: FlaskConical,
    category: "ia",
    description:
      "Ambiente experimental para testar novos modelos de IA, automações e fluxos de trabalho. Teste prompts, compare provedores e explore capacidades avançadas.",
    roles: ["advogado"],
    links: [{ label: "Laboratório IA", path: "/dashboard/laboratorio-ia" }],
    steps: [
      'Acesse "Laboratório IA" no menu de Ferramentas.',
      "Escolha o experimento ou teste que deseja executar.",
      "Configure parâmetros e execute.",
      "Veja resultados comparativos entre modelos.",
    ],
    voiceCommands: ['"Orion, abrir laboratório"'],
  },
  {
    id: "ferramentas-google",
    title: "🔗 Ferramentas Google",
    icon: Globe,
    category: "ia",
    description:
      "Integração com Google Agenda, Google Drive e Gmail para sincronizar compromissos, arquivos, e-mails e documentos.",
    roles: ["advogado"],
    links: [
      { label: "Ferramentas Google", path: "/dashboard/ferramentas-google" },
      { label: "Gmail", path: "/dashboard/ferramentas-google?tab=gmail" },
      { label: "Agenda", path: "/dashboard/ferramentas-google?tab=calendar" },
    ],
    steps: [
      'Acesse "Ferramentas Google" no menu.',
      "Conecte sua conta Google pelo botão de autorização.",
      "Sincronize agenda, drive e documentos automaticamente.",
      "Use as abas Gmail, Calendar e Drive para acessar cada serviço.",
    ],
    voiceCommands: [
      '"Orion, abrir Google"',
      '"Orion, abrir agenda"',
      '"Orion, abrir Gmail"',
    ],
  },
  {
    id: "bloom",
    title: "🌸 Bloom Network",
    icon: Network,
    category: "ia",
    description:
      "Rede de mapeamento mental e notas interconectadas. Crie ideias, conecte conceitos, organize pensamentos com IA e compartilhe com outros usuários.",
    roles: ["advogado", "cliente", "produtor", "afiliado"],
    links: [{ label: "Bloom Network", path: "/dashboard/bloom" }],
    steps: [
      'Acesse "Bloom" no menu.',
      "Crie um novo nó (bloom) com título e conteúdo.",
      "Conecte blooms relacionados arrastando entre eles.",
      "Use IA para expandir ideias automaticamente.",
      "Compartilhe blooms com outros usuários da plataforma.",
    ],
    voiceCommands: ['"Orion, abrir Bloom"'],
  },

  // ═══════════════════════════════════════
  // VOZ & ORION
  // ═══════════════════════════════════════
  {
    id: "orion-voz",
    title: "🎙️ Assistente Orion — Guia Completo de Voz",
    icon: Mic,
    category: "voz",
    description:
      'O Orion é seu assistente de IA com controle por voz. Diga "Orion" ou "Painel" seguido de um comando para executar ações. Funciona em todas as telas da plataforma, com suporte a navegação, geração de documentos, controle IoT, pesquisa jurídica e muito mais.',
    roles: ["advogado", "cliente", "produtor", "afiliado"],
    links: [{ label: "Orion IA (Consulta)", path: "/consulta" }],
    steps: [
      'Diga "Orion" ou "Painel" para ativar o assistente — pode ser uma frase contínua (ex: "Orion, que horas são?").',
      "O assistente detecta o wake-word e captura o comando automaticamente.",
      "Aguarde a resposta por voz e/ou ação na tela.",
      "O Orion funciona em qualquer tela — não precisa estar em uma página específica.",
      "Permita acesso ao microfone no navegador para usar.",
      "A sensibilidade está otimizada para funcionar mesmo em ambientes com ruído.",
    ],
    voiceCommands: [
      // Navegação
      '"Orion, abrir documentos" — navega para Meus Documentos',
      '"Orion, ir para o CRM" — abre o CRM',
      '"Orion, abrir processos" — abre a lista de processos',
      '"Orion, ir para tarefas" — abre Tarefas & Prazos',
      '"Orion, abrir configurações" — abre as configurações',
      '"Orion, ir para agenda" — abre Google Calendar',
      '"Orion, abrir notificações" — abre central de notificações',
      '"Orion, ir para pagamentos" — abre painel financeiro',
      '"Orion, abrir Bloom" — abre o Bloom Network',
      '"Orion, abrir rede neural" — abre painel neural',
      '"Orion, ir para o dashboard" — volta ao painel inicial',
      // Documentos
      '"Orion, gerar contrato de prestação de serviços"',
      '"Orion, gerar petição inicial"',
      '"Orion, gerar relatório"',
      // Pesquisa
      '"Orion, pesquisar jurisprudência sobre dano moral"',
      '"Orion, buscar legislação sobre LGPD"',
      // Tarefas
      '"Orion, criar tarefa para amanhã às 10h"',
      '"Orion, listar tarefas pendentes"',
      // Consultas e CRM
      '"Orion, agendar consulta"',
      '"Orion, adicionar novo cliente"',
      // Informações gerais
      '"Orion, que horas são?"',
      '"Orion, como vai o tempo hoje?"',
      '"Orion, qual o câmbio do dólar?"',
      // Sistema
      '"Orion, ajuda" — lista de comandos disponíveis',
      '"Orion, status do sistema" — estado de saúde da IA',
    ],
    faq: [
      { q: "O Orion funciona offline?", a: "Parcialmente: o wake-word e visão computacional funcionam offline. O processamento de linguagem natural requer internet." },
      { q: "Posso usar no celular?", a: "Sim, basta permitir acesso ao microfone no navegador." },
      { q: "O Orion me interrompe se eu falar?", a: "Sim, o 'barge-in' está ativo — se você falar enquanto ele responde, ele para e ouve você (mínimo 8 caracteres para evitar falsos positivos)." },
      { q: "O Orion se ouve e se interrompe sozinho?", a: "Não. O sistema tem detecção de eco que impede que a IA se interrompa ao ouvir sua própria voz." },
      { q: "A voz do Orion muda com o tempo?", a: "Sim! O Orion tem um sistema de evolução vocal que adapta prosódia, vocabulário e tom de voz com base nas interações." },
    ],
  },
  {
    id: "orion-navegacao",
    title: "🧭 Navegação por Voz",
    icon: Navigation,
    category: "voz",
    description:
      'O Orion entende comandos de navegação em linguagem natural. Use verbos como "abrir", "ir para", "mostrar", "acessar" seguidos do nome da seção. Suporta mais de 50 destinos mapeados.',
    roles: ["advogado", "cliente", "produtor", "afiliado"],
    links: [{ label: "Orion IA", path: "/consulta" }],
    steps: [
      'Diga "Orion, abrir [seção]" para navegar.',
      "O sistema reconhece variações: abrir, ir para, mostrar, acessar, navegar, levar.",
      "Funciona com ou sem artigos (a/o/as/os).",
      "Suporta acentos e variações de escrita.",
    ],
    voiceCommands: [
      '"Orion, abrir documentos"',
      '"Orion, ir para o CRM"',
      '"Orion, mostrar processos"',
      '"Orion, acessar tarefas"',
      '"Orion, ir pra agenda"',
      '"Orion, me leve para pagamentos"',
      '"Orion, abrir Gmail"',
      '"Orion, ir para consultas"',
      '"Orion, abrir pesquisa"',
      '"Orion, navegar para rede neural"',
      '"Orion, abrir planos"',
      '"Orion, ir para o perfil"',
      '"Orion, abrir webhooks"',
      '"Orion, ir para usuários"',
      '"Orion, abrir publicações"',
    ],
  },
  {
    id: "orion-evolucao-vocal",
    title: "🎭 Evolução Vocal do Orion",
    icon: Volume2,
    category: "voz",
    description:
      "O Orion possui um sistema de evolução vocal adaptativa. Ele aprende prosódia, vocabulário e entonação com o uso, absorve padrões de mídia (músicas, audiolivros) e mantém uma identidade vocal consistente entre dispositivos.",
    roles: ["advogado", "cliente", "produtor", "afiliado"],
    links: [{ label: "Orion IA", path: "/consulta" }],
    steps: [
      "A evolução vocal acontece automaticamente a cada interação.",
      "O sistema prioriza voz clonada via ElevenLabs quando configurada.",
      "Fallback offline disponível via Piper TTS (WebAssembly).",
      "O perfil vocal sincroniza entre dispositivos via Supabase.",
      "O vocabulário é limitado a 5.000 palavras para otimização.",
    ],
    faq: [
      { q: "Como configuro a voz clonada?", a: "Grave amostras de 3-5 segundos nas configurações de voz. O sistema usa ElevenLabs para clonar." },
      { q: "Funciona sem internet?", a: "Sim, o Piper TTS (offline) assume quando não há conexão." },
    ],
  },
  {
    id: "orion-visao",
    title: "👁️ Visão Computacional",
    icon: Eye,
    category: "voz",
    description:
      "O Orion possui visão computacional em tempo real 100% local no navegador. Detecta objetos, rostos, mãos, texto e cenas usando MediaPipe + YOLOv8 via WebAssembly/WebGL. Aprende e melhora com o uso.",
    roles: ["advogado", "cliente", "produtor", "afiliado"],
    links: [{ label: "Rede Neural", path: "/dashboard/rede-neural" }],
    steps: [
      "Permita acesso à câmera no navegador.",
      "A visão processa frames a cada 12 ciclos para manter 30+ FPS.",
      "Detecções de alta confiança (≥75%) são salvas como 'Learned Priors' para evolução offline.",
      "O sistema funde detecções MediaPipe + YOLO usando IoU > 0.4 para eliminar duplicatas.",
      "Use com o Orion por voz: \"Orion, o que você vê?\"",
    ],
    voiceCommands: [
      '"Orion, o que você vê?" — descreve a cena atual',
      '"Orion, identificar objetos" — lista objetos detectados',
      '"Orion, ler texto" — OCR na cena (vision text detection)',
    ],
    faq: [
      { q: "Os dados da câmera saem do dispositivo?", a: "Não. Todo processamento de visão é 100% local no navegador, sem envio de imagens para servidores." },
      { q: "Funciona em qualquer navegador?", a: "Funciona melhor em Chrome/Edge com suporte a WebGL2 ou WebGPU." },
    ],
  },

  // ═══════════════════════════════════════
  // IOT & SMART HOME
  // ═══════════════════════════════════════
  {
    id: "smart-home",
    title: "🏠 Smart Home (Casa Inteligente)",
    icon: Home,
    category: "iot",
    description:
      "Controle dispositivos inteligentes por voz: luzes, tomadas, termostatos, TVs, aspiradores, fechaduras, câmeras, cafeteiras e mais. Crie rotinas automáticas. Suporta MQTT, Zigbee, Z-Wave e Alexa.",
    roles: ["advogado", "cliente", "produtor", "afiliado"],
    links: [{ label: "Ferramentas IA / IoT", path: "/dashboard/rede-neural" }],
    steps: [
      "Configure seus dispositivos IoT nas integrações (MQTT/Bluetooth).",
      'Diga "Orion, ligue a luz da sala" para controlar dispositivos.',
      'Crie rotinas: "Orion, crie uma rotina para desligar tudo quando eu sair".',
      "Monitore câmeras e sensores pelo painel.",
      "O Bluetooth reconecta automaticamente com backoff exponencial.",
    ],
    voiceCommands: [
      '"Orion, ligue a luz da sala"',
      '"Orion, desligue a luz"',
      '"Orion, abaixe o termostato para 22°C"',
      '"Orion, ligue a cafeteira"',
      '"Orion, tranque a porta da frente"',
      '"Orion, mostre a câmera da garagem"',
      '"Orion, ligue o aspirador"',
      '"Orion, desligue a TV"',
    ],
    faq: [
      { q: "Quais dispositivos são compatíveis?", a: "Dispositivos com protocolo MQTT, Zigbee, Z-Wave, Bluetooth e integrações Alexa/Google Home." },
      { q: "Preciso de um hub?", a: "O Orion se conecta via MQTT (HiveMQ) e Bluetooth direto do navegador. Alguns dispositivos Zigbee/Z-Wave precisam de bridge." },
    ],
  },
  {
    id: "controle-robotico",
    title: "🤖 Controle Robótico",
    icon: Gamepad2,
    category: "iot",
    description:
      "Interface para controle de robôs e dispositivos autônomos via ROS2, VDA5050 e protocolos industriais. Integração com digital twins e sensores IoT.",
    roles: ["advogado"],
    links: [{ label: "Controle Robótico", path: "/dashboard/controle-robotico" }],
    steps: [
      'Acesse "Controle Robótico" no menu.',
      "Configure a conexão com o dispositivo (ROS2, VDA5050).",
      "Use os controles visuais ou comandos de voz.",
      "Monitore telemetria em tempo real.",
    ],
    voiceCommands: ['"Orion, abrir controle robótico"'],
  },

  // ═══════════════════════════════════════
  // MARKETPLACE
  // ═══════════════════════════════════════
  {
    id: "marketplace",
    title: "🛒 Marketplace",
    icon: Store,
    category: "marketplace",
    description:
      "Marketplace de produtos digitais e serviços jurídicos. Compre modelos de contratos, cursos, templates e mais. Produtores podem vender seus produtos.",
    roles: ["advogado", "cliente", "produtor", "afiliado"],
    links: [
      { label: "Marketplace", path: "/dashboard/marketplace" },
      { label: "Meus Produtos", path: "/dashboard/meus-produtos" },
    ],
    steps: [
      'Acesse "Marketplace" no menu.',
      "Navegue pelos produtos disponíveis.",
      "Clique em um produto para ver detalhes e comprar.",
      "Produtores podem criar e gerenciar produtos em 'Meus Produtos'.",
    ],
    voiceCommands: ['"Orion, abrir marketplace"'],
  },
  {
    id: "afiliados",
    title: "🤝 Programa de Afiliados",
    icon: Link2,
    category: "marketplace",
    description:
      "Ganhe comissões indicando produtos do marketplace. Gere links de afiliado, acompanhe cliques, conversões e comissões pendentes/pagas.",
    roles: ["advogado", "afiliado"],
    links: [{ label: "Afiliados", path: "/dashboard/afiliados" }],
    steps: [
      'Acesse "Afiliados" no menu.',
      "Selecione um produto para gerar seu link de afiliado.",
      "Compartilhe o link nas suas redes.",
      "Acompanhe cliques, conversões e comissões no painel.",
    ],
    voiceCommands: ['"Orion, abrir afiliados"'],
  },

  // ═══════════════════════════════════════
  // EXTENSÃO
  // ═══════════════════════════════════════
  {
    id: "extensao",
    title: "🌐 Extensão Chrome — Orion",
    icon: Chrome,
    category: "geral",
    description:
      'Extensão oficial do Orion para Chrome (Manifest V3). Permite detecção do wake-word "Orion" em qualquer aba, monitoramento de saúde do sistema e comunicação bidirecional com o dashboard.',
    roles: ["advogado", "cliente", "produtor", "afiliado"],
    links: [{ label: "Página da Extensão", path: "/extension" }],
    steps: [
      "Instale a extensão pelo link na página dedicada.",
      "Após instalar, o ícone do Orion aparece na barra do Chrome.",
      'Diga "Orion" em qualquer aba para ativar o assistente.',
      "Use o popup da extensão para ver o status do sistema.",
      "A extensão se comunica com o dashboard para executar ações.",
    ],
    faq: [
      { q: "Funciona em outros navegadores?", a: "Atualmente apenas Chrome e navegadores baseados em Chromium (Edge, Brave, etc.)." },
      { q: "A extensão ouve tudo?", a: "Não. Ela só processa áudio quando detecta o wake-word 'Orion'. Nenhum dado de áudio é armazenado." },
    ],
  },
];

export default function InstrucoesPlataforma() {
  const { role } = useUserRole();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("todos");

  const userRole = role || "cliente";

  const filteredSections = useMemo(() => {
    return allSections
      .filter((s) => s.roles.includes(userRole))
      .filter((s) => {
        if (activeTab !== "todos" && s.category !== activeTab) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.steps.some((st) => st.toLowerCase().includes(q)) ||
          (s.voiceCommands || []).some((v) => v.toLowerCase().includes(q))
        );
      });
  }, [search, userRole, activeTab]);

  const totalVoiceCommands = useMemo(
    () => allSections.filter(s => s.roles.includes(userRole)).reduce((a, s) => a + (s.voiceCommands?.length || 0), 0),
    [userRole]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              Central de Ajuda & Instruções
            </h1>
            <p className="text-sm text-muted-foreground">
              Guia completo de uso da plataforma ORION
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {userRole === "advogado"
            ? "Acesso Completo"
            : userRole === "produtor"
            ? "Produtor"
            : userRole === "afiliado"
            ? "Afiliado"
            : "Cliente"}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar função, comando de voz ou instrução..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">
              {allSections.filter(s => s.roles.includes(userRole)).length}
            </p>
            <p className="text-[10px] text-muted-foreground">Seções disponíveis</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{totalVoiceCommands}</p>
            <p className="text-[10px] text-muted-foreground">Comandos de voz</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">
              {allSections.filter(s => s.roles.includes(userRole)).reduce((a, s) => a + s.links.length, 0)}
            </p>
            <p className="text-[10px] text-muted-foreground">Links diretos</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">24/7</p>
            <p className="text-[10px] text-muted-foreground">Orion IA disponível</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="todos" className="text-xs">📋 Todos</TabsTrigger>
          <TabsTrigger value="geral" className="text-xs">🏠 Geral</TabsTrigger>
          <TabsTrigger value="juridico" className="text-xs">⚖️ Jurídico</TabsTrigger>
          <TabsTrigger value="ia" className="text-xs">🤖 IA</TabsTrigger>
          <TabsTrigger value="voz" className="text-xs">🎙️ Voz & Visão</TabsTrigger>
          <TabsTrigger value="iot" className="text-xs">📡 IoT</TabsTrigger>
          <TabsTrigger value="marketplace" className="text-xs">🛒 Loja</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Sections */}
      {filteredSections.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma seção encontrada para "{search}"</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {filteredSections.map((section) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="border rounded-lg bg-card overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-3 text-left">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <section.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{section.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {section.description.slice(0, 80)}...
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {section.description}
                </p>

                {/* Steps */}
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                    Passo a passo
                  </h4>
                  <ol className="space-y-1.5">
                    {section.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Voice Commands */}
                {section.voiceCommands && section.voiceCommands.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                      <Mic className="h-3.5 w-3.5 text-primary" />
                      Comandos de voz
                    </h4>
                    <div className="space-y-1">
                      {section.voiceCommands.map((cmd, i) => (
                        <div
                          key={i}
                          className="text-xs bg-muted/50 rounded px-3 py-1.5 text-muted-foreground font-mono"
                        >
                          🎤 {cmd}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAQ */}
                {section.faq && section.faq.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 text-primary" />
                      Perguntas frequentes
                    </h4>
                    <div className="space-y-2">
                      {section.faq.map((f, i) => (
                        <div key={i} className="text-xs">
                          <p className="font-medium text-foreground">{f.q}</p>
                          <p className="text-muted-foreground mt-0.5">{f.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                  {section.links.map((link, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 gap-1"
                      onClick={() => navigate(link.path)}
                    >
                      {link.label}
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Footer */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Precisa de mais ajuda?</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Use o Assistente Orion dizendo <strong>"Orion, ajuda"</strong> a qualquer momento, ou entre em contato pelo Chat ao Vivo com nossa equipe.
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs h-8" onClick={() => navigate("/consulta")}>
              <Mic className="h-3 w-3 mr-1" /> Falar com Orion
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8"
              onClick={() => navigate("/dashboard/chat-ao-vivo")}
            >
              <MessagesSquare className="h-3 w-3 mr-1" /> Chat ao Vivo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
