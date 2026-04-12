import {
  Home, FileText, FolderOpen, Bot, Users, Briefcase, CheckSquare, PenTool,
  Globe, MessageSquare, Calendar, Bell, CreditCard, Search, Wand2, FlaskConical,
  ShoppingBag, HelpCircle, Settings, Brain, Wrench, Gamepad2, UserCog,
  Newspaper, Flag, Chrome, Link, BarChart3, Store, Star, Package, LucideIcon, Circle
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  gerar: FileText,
  documentos: FolderOpen,
  "orion-ia": Bot,
  crm: Users,
  processos: Briefcase,
  tarefas: CheckSquare,
  assinatura: PenTool,
  "docs-internacionais": Globe,
  "chat-ao-vivo": MessageSquare,
  chat: MessageSquare,
  consultas: Calendar,
  notificacoes: Bell,
  pagamentos: CreditCard,
  pesquisa: Search,
  reformulacao: Wand2,
  "laboratorio-ia": FlaskConical,
  marketplace: ShoppingBag,
  instrucoes: HelpCircle,
  config: Settings,
  configuracoes: Settings,
  "rede-neural": Brain,
  "ferramentas-google": Wrench,
  "controle-robotico": Gamepad2,
  usuarios: UserCog,
  "publicacoes-admin": Newspaper,
  "recursos-eu": Flag,
  extension: Chrome,
  afiliados: Link,
  analytics: BarChart3,
  "meu-site": Store,
  metricas: BarChart3,
  plano: Star,
  "meus-produtos": Package,
};

export function getMenuIcon(itemId: string): LucideIcon {
  return iconMap[itemId] || Circle;
}
