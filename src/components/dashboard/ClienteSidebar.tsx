import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FolderOpen,
  TrendingUp,
  Settings,
  LogOut,
  User,
  CreditCard,
  Calendar,
  Bell,
  PenTool,
  MessagesSquare,
  BookOpen,
  Brain,
  FileText,
  Bot,
   Scale,
   Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useTranslation } from "@/contexts/LanguageContext";


interface ClienteSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface MenuSection {
  label: string;
  items: Array<{
    id: string;
    label: string;
    icon: any;
    path: string;
    highlight?: boolean;
    external?: boolean;
  }>;
}

export function ClienteSidebar({ collapsed, onToggle }: ClienteSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { unreadCount } = useUnreadMessages();
  const { t } = useTranslation();

  const sections: MenuSection[] = [
    {
      label: "Principal",
      items: [
        { id: "home", label: t.dashboard.client.title, icon: TrendingUp, path: "/dashboard" },
        { id: "orion-ia", label: "Orion IA", icon: Brain, path: "/consulta" },
      ],
    },
    {
      label: "Meu Caso",
      items: [
        { id: "meus-processos", label: "Meus Processos", icon: Scale, path: "/dashboard/meus-processos" },
        { id: "documentos", label: t.dashboard.client.myDocuments, icon: FolderOpen, path: "/dashboard/documentos" },
        { id: "assinatura", label: t.dashboard.digitalSignature, icon: PenTool, path: "/dashboard/assinatura-cliente" },
      ],
    },
    {
      label: "Comunicação",
      items: [
        { id: "chat-ao-vivo", label: t.dashboard.liveChat, icon: MessagesSquare, path: "/dashboard/chat-ao-vivo", highlight: true },
        { id: "consulta-ia", label: "Consulta Jurídica IA", icon: Bot, path: "/consulta", external: true },
        { id: "notificacoes", label: t.dashboard.notifications, icon: Bell, path: "/dashboard/notificacoes" },
      ],
    },
    {
      label: "Financeiro",
      items: [
        { id: "consultas", label: t.dashboard.scheduleConsultation, icon: Calendar, path: "/dashboard/consultas" },
        { id: "pagamentos", label: t.dashboard.client.myPayments, icon: CreditCard, path: "/dashboard/pagamentos" },
      ],
    },
    {
      label: "Conta",
      items: [
        { id: "plano", label: "Meu Plano", icon: Crown, path: "/dashboard/plano" },
        { id: "config", label: t.dashboard.profile, icon: Settings, path: "/dashboard/configuracoes" },
        { id: "manual", label: "Manual Orion IA", icon: BookOpen, path: "/consulta" },
      ],
    },
  ];

  const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Cliente";

  const handleSignOut = async () => {
    await signOut();
    toast({ title: t.common.logoutSuccess, description: t.common.seeYou });
    navigate("/");
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`bg-secondary border-r border-border flex flex-col z-50 transition-all duration-300 h-full ${
        collapsed ? "w-[72px]" : "w-72"
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 border border-primary/30 bg-primary/5 flex items-center justify-center flex-shrink-0">
            <Brain className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-105" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-xs font-serif text-foreground tracking-[0.2em] font-bold">
                ORION
              </h1>
              <p className="text-[9px] text-primary tracking-[0.15em]">{t.dashboard.client.title.toUpperCase()}</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.15em] px-3 mb-1 font-medium">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  target={item.external ? "_blank" : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm tracking-wide transition-all group relative ${
                    isActive(item.path)
                      ? "bg-card text-primary border-l-2 border-primary"
                      : item.highlight
                      ? "text-primary/80 hover:text-primary hover:bg-card/50 border-l-2 border-transparent"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/50 border-l-2 border-transparent"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span className="text-xs font-medium">{item.label}</span>}
                  {item.id === "chat-ao-vivo" && unreadCount > 0 && (
                    <span className="absolute right-2 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Disclaimer */}
      {!collapsed && (
        <div className="px-4 py-2 border-t border-border">
          <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
            IA auxiliar – revise sempre. Não substitui assessoria jurídica completa. LGPD aplicável.
          </p>
        </div>
      )}

      {/* User Info */}
      <div className="p-3 border-t border-border">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 bg-card border border-border flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{userName}</p>
                <p className="text-[10px] text-primary/70 truncate">Cliente</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[10px] text-muted-foreground hover:text-primary h-8"
              onClick={handleSignOut}
            >
              <LogOut className="h-3 w-3 mr-1" />
              {t.common.logout}
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={handleSignOut}
              title={t.common.logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
