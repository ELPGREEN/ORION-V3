import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  FolderOpen,
  TrendingUp,
  Settings,
  LogOut,
  User,
  Sparkles,
  Search,
  PenTool,
  BookUser,
  ListTodo,
  CreditCard,
  Calendar,
  Users,
  MessagesSquare,
  Bell,
  BookOpen,
  Star,
  Brain,
  BarChart3,
  Database,
  Globe,
  Webhook,
  Scale,
  Home,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const advogadoMenuItems = [
  { id: "home", label: "Visão Geral", icon: TrendingUp, path: "/dashboard" },
  { id: "assistente-ia", label: "Assistente IA", icon: Brain, path: "/dashboard/assistente-ia" },
  { id: "crm", label: "CRM Clientes", icon: Users, path: "/dashboard/crm" },
  { id: "gerar", label: "Gerar Documento IA", icon: Sparkles, path: "/dashboard/gerar-documento" },
  { id: "documentos", label: "Meus Documentos", icon: FolderOpen, path: "/dashboard/documentos" },
  { id: "chat-ao-vivo", label: "Chat ao Vivo", icon: MessagesSquare, path: "/dashboard/chat-ao-vivo" },
  { id: "pesquisa", label: "Pesquisa Avançada", icon: Search, path: "/dashboard/pesquisa-unificada" },
  { id: "clientes", label: "Clientes", icon: User, path: "/dashboard/clientes" },
  { id: "processos", label: "Processos", icon: FileText, path: "/dashboard/processos" },
  { id: "assinatura", label: "Assinatura Digital", icon: PenTool, path: "/dashboard/assinatura" },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard, path: "/dashboard/pagamentos" },
  { id: "consultas", label: "Consultas Agendadas", icon: Calendar, path: "/dashboard/consultas" },
  { id: "contatos", label: "Contatos & Envios", icon: BookUser, path: "/dashboard/contatos" },
  { id: "tarefas", label: "Tarefas", icon: ListTodo, path: "/dashboard/tarefas" },
  { id: "prazos", label: "Prazos", icon: Calendar, path: "/dashboard/prazos" },
  { id: "reformulacao", label: "Reformulação IA", icon: FileText, path: "/dashboard/reformulacao" },
  { id: "escritorio", label: "Meu Escritório", icon: BookUser, path: "/dashboard/escritorio" },
  { id: "notificacoes", label: "Notificações", icon: Bell, path: "/dashboard/notificacoes" },
  { id: "config", label: "Configurações", icon: Settings, path: "/dashboard/configuracoes" },
  { id: "instrucoes", label: "Central de Ajuda", icon: HelpCircle, path: "/dashboard/instrucoes" },
];

const clienteMenuItems = [
  { id: "home", label: "Meu Painel", icon: TrendingUp, path: "/dashboard" },
  { id: "assistente-ia", label: "Assistente IA", icon: Brain, path: "/dashboard/assistente-ia" },
  { id: "meus-processos", label: "Meus Processos", icon: FileText, path: "/dashboard/meus-processos" },
  { id: "documentos", label: "Meus Documentos", icon: FolderOpen, path: "/dashboard/documentos" },
  { id: "chat-ao-vivo", label: "Falar com Advogado", icon: MessagesSquare, path: "/dashboard/chat-ao-vivo" },
  { id: "consultas", label: "Agendar Consulta", icon: Calendar, path: "/dashboard/consultas" },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard, path: "/dashboard/pagamentos" },
  { id: "assinatura", label: "Assinatura Digital", icon: PenTool, path: "/dashboard/assinatura-cliente" },
  { id: "notificacoes", label: "Notificações", icon: Bell, path: "/dashboard/notificacoes" },
  { id: "config", label: "Meu Perfil", icon: Settings, path: "/dashboard/configuracoes" },
  { id: "instrucoes", label: "Central de Ajuda", icon: HelpCircle, path: "/dashboard/instrucoes" },
];

interface MobileNavigationProps {
  role: "advogado" | "cliente";
  onClose: () => void;
}

export function MobileNavigation({ role, onClose }: MobileNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { unreadCount } = useUnreadMessages();

  const menuItems = role === "advogado" ? advogadoMenuItems : clienteMenuItems;
  const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || (role === "advogado" ? "Admin" : "Usuário");

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Logout realizado", description: "Até a próxima!" });
    navigate("/");
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm tracking-wide transition-all duration-200 relative group ${
                active
                  ? "bg-primary/10 text-primary border-l-2 border-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50 border-l-2 border-transparent"
              }`}
            >
              <item.icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              <span className="text-xs">{item.label}</span>
              {item.id === "chat-ao-vivo" && unreadCount > 0 && (
                <span className="absolute right-2 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Disclaimer */}
      <div className="px-4 py-2 border-t border-border/20">
        <p className="text-[8px] text-muted-foreground/40 leading-relaxed">
          {role === "advogado" 
            ? "ORION IA — Sistema inteligente by ELP Global. Revise sempre. LGPD aplicável."
            : "ORION IA by ELP Global. Revise sempre os resultados. LGPD aplicável."}
        </p>
      </div>

      {/* User Info */}
      <div className="p-3 border-t border-border/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate font-medium">{userName}</p>
            <p className="text-[10px] text-secondary/60 truncate">
              {role === "advogado" ? user?.email : "Usuário ORION"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-[10px] text-muted-foreground hover:text-primary h-8 hover:bg-card/60"
          onClick={handleSignOut}
        >
          <LogOut className="h-3 w-3 mr-1.5" />
          Sair
        </Button>
      </div>
    </div>
  );
}
