import {
  Home, FileText, FolderOpen, MessageSquare, Scale, ListChecks,
  PenTool, Globe, CreditCard, Bell, Settings, Users, Brain,
  ShoppingBag, Share2, BarChart3, Search, FlaskConical, BookOpen,
  HelpCircle, Bot, Chrome, ScrollText, Briefcase, LogOut, Plus,
  ChevronRight, ChevronLeft, ChevronDown, User, X, type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  home: Home, gerar: PenTool, documentos: FolderOpen,
  "orion-ia": Brain, crm: Users, processos: Scale,
  tarefas: ListChecks, assinatura: PenTool, "docs-internacionais": Globe,
  "chat-ao-vivo": MessageSquare, consultas: BookOpen,
  notificacoes: Bell, pagamentos: CreditCard, pesquisa: Search,
  reformulacao: ScrollText, "laboratorio-ia": FlaskConical,
  marketplace: ShoppingBag, instrucoes: HelpCircle, config: Settings,
  "rede-neural": Brain, "ferramentas-google": Globe,
  "controle-robotico": Bot, usuarios: Users,
  "publicacoes-admin": FileText, "recursos-eu": Globe,
  extension: Chrome, "meus-produtos": ShoppingBag,
  "meu-site": Briefcase, afiliados: Share2, analytics: BarChart3,
  metricas: BarChart3, chat: MessageSquare, manual: BookOpen,
  "assinatura-cliente": PenTool, "consulta-ia": Brain,
  "meus-processos": Scale, plano: CreditCard, configuracoes: Settings,
};

export function getOrionIcon(id: string): LucideIcon {
  return iconMap[id] || FileText;
}

export const IconLogout = LogOut;
export const IconPlus = Plus;
export const IconChevronRight = ChevronRight;
export const IconChevronLeft = ChevronLeft;
export const IconChevronDown = ChevronDown;
export const IconUser = User;
export const IconSettings = Settings;
export const IconBrain = Brain;
export const IconClose = X;
