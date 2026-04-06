import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  MessageSquare,
  FolderOpen,
  TrendingUp,
  Settings,
  LogOut,
  User,
  Sparkles,
  Search,
  Globe,
  PenTool,
  BookUser,
  ListTodo,
  CreditCard,
  Calendar,
  Users,
  MessagesSquare,
  Brain,
  BookOpen,
  Star,
  BarChart3,
  Scale,
  Webhook,
  FlaskConical,
  UserCog,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Crown,
  ScrollText,
  Chrome,
  HelpCircle,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useTranslation } from "@/contexts/LanguageContext";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import logoElp from "@/assets/logo-elp.webp";

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface MenuSection {
  label: string;
  items: { id: string; label: string; icon: any; path: string }[];
  restricted?: boolean;
  defaultOpen?: boolean;
}

export function DashboardSidebar({ collapsed, onToggle }: DashboardSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { unreadCount } = useUnreadMessages();
  const { t } = useTranslation();

  const sections: MenuSection[] = [
    {
      label: "Principal",
      defaultOpen: true,
      items: [
        { id: "home", label: t.dashboard.home, icon: TrendingUp, path: "/dashboard" },
        { id: "gerar", label: t.dashboard.generateDocument, icon: Sparkles, path: "/dashboard/gerar-documento" },
        { id: "documentos", label: t.dashboard.myDocuments, icon: FolderOpen, path: "/dashboard/documentos" },
        { id: "orion-ia", label: "Orion IA", icon: Brain, path: "/consulta" },
      ],
    },
    {
      label: "Gestão Jurídica",
      defaultOpen: true,
      items: [
        { id: "crm", label: "CRM & Clientes", icon: Users, path: "/dashboard/crm" },
        { id: "processos", label: t.dashboard.cases, icon: FileText, path: "/dashboard/processos" },
        { id: "tarefas", label: "Tarefas & Prazos", icon: ListTodo, path: "/dashboard/tarefas" },
        { id: "assinatura", label: t.dashboard.digitalSignature, icon: PenTool, path: "/dashboard/assinatura-digital" },
        { id: "docs-internacionais", label: "Docs Internacionais", icon: Globe, path: "/dashboard/documentos-internacionais" },
      ],
    },
    {
      label: "Comunicação",
      defaultOpen: true,
      items: [
        { id: "chat-ao-vivo", label: t.dashboard.liveChat, icon: MessagesSquare, path: "/dashboard/chat-ao-vivo" },
        { id: "consultas", label: t.dashboard.consultations, icon: Calendar, path: "/dashboard/consultas" },
        { id: "notificacoes", label: "Notificações", icon: Bell, path: "/dashboard/notificacoes" },
        { id: "pagamentos", label: t.dashboard.payments, icon: CreditCard, path: "/dashboard/pagamentos" },
      ],
    },
    {
      label: "Ferramentas IA",
      defaultOpen: true,
      items: [
        { id: "pesquisa", label: "Pesquisa Avançada", icon: Search, path: "/dashboard/pesquisa-unificada" },
        { id: "reformulacao", label: "Reformulação IA", icon: ScrollText, path: "/dashboard/reformulacao" },
        { id: "laboratorio-ia", label: "Laboratório IA", icon: FlaskConical, path: "/dashboard/laboratorio-ia" },
        { id: "marketplace", label: "Marketplace", icon: Star, path: "/dashboard/marketplace" },
        { id: "instrucoes", label: "Central de Ajuda", icon: HelpCircle, path: "/dashboard/instrucoes" },
      ],
    },
    {
      label: "Administração",
      items: [
        { id: "config", label: "Meu Escritório", icon: Settings, path: "/dashboard/configuracoes" },
      ],
    },
    {
      label: "Proprietário",
      restricted: true,
      items: [
        { id: "rede-neural", label: "Rede Neural", icon: Brain, path: "/dashboard/rede-neural" },
        { id: "ferramentas-google", label: "Ferramentas Google", icon: Globe, path: "/dashboard/ferramentas-google" },
        { id: "controle-robotico", label: "Controle Robótico", icon: Bot, path: "/dashboard/controle-robotico" },
        { id: "usuarios", label: "Usuários", icon: UserCog, path: "/dashboard/usuarios" },
        { id: "publicacoes-admin", label: "Publicações", icon: BookOpen, path: "/dashboard/publicacoes-admin" },
        { id: "recursos-eu", label: "Recursos EU", icon: Globe, path: "/dashboard/recursos-eu" },
        { id: "extension", label: "Extensão Chrome", icon: Chrome, path: "/dashboard/extension" },
      ],
    },
  ];

  const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Admin";

  const handleSignOut = async () => {
    await signOut();
    toast({ title: t.common.logoutSuccess, description: t.common.seeYou });
    navigate("/");
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const activeSectionIdx = sections.findIndex((s) =>
    s.items.some((item) => isActive(item.path))
  );

  const { unlocked: adminUnlocked, validate: validateAdminCode, lock: lockAdmin } = useAdminAccess();

  const allRestrictedItems = sections.filter(s => s.restricted).flatMap(s => s.items);
  const isOnRestrictedRoute = allRestrictedItems.some((item) => isActive(item.path));

  const [openSections, setOpenSections] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    sections.forEach((s, i) => {
      initial[i] = s.defaultOpen || i === activeSectionIdx;
    });
    if (isOnRestrictedRoute || adminUnlocked) {
      sections.forEach((s, j) => { if (s.restricted) initial[j] = true; });
    }
    return initial;
  });

  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminCodeError, setAdminCodeError] = useState(false);
  const pendingAdminIdx = useRef<number | null>(null);

  const toggleSection = (idx: number) => {
    const section = sections[idx];
    if (section.restricted && !adminUnlocked && !isOnRestrictedRoute && !openSections[idx]) {
      pendingAdminIdx.current = idx;
      setAdminCode("");
      setAdminCodeError(false);
      setShowAdminDialog(true);
      return;
    }
    setOpenSections((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleAdminCodeSubmit = () => {
    if (validateAdminCode(adminCode)) {
      setShowAdminDialog(false);
      if (pendingAdminIdx.current !== null) {
        setOpenSections((prev) => ({ ...prev, [pendingAdminIdx.current!]: true }));
      }
    } else {
      setAdminCodeError(true);
    }
  };

  return (
    <aside
      className={`bg-secondary/20 backdrop-blur-xl flex flex-col z-50 transition-all duration-300 h-full border-r border-cyan/10 shadow-[inset_0_0_60px_rgba(0,188,212,0.03)] ${
        collapsed ? "w-[72px]" : "w-72"
      }`}
    >
      {/* Logo + Toggle */}
      <div className="px-4 py-5 border-b border-border/20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <img src={logoElp} alt="ELP" className="h-10 w-10 flex-shrink-0 object-contain transition-transform duration-300 group-hover:scale-110" />
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-serif text-foreground tracking-[0.2em] font-bold">
                ORION
              </h1>
              <p className="text-[8px] text-primary tracking-[0.15em] mt-0.5 font-medium">
                IA EMPRESARIAL • BY ELP
              </p>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-card/60 flex-shrink-0"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-border/20">
          <Button
            className="w-full btn-gold text-[10px] h-9 tracking-wider gap-2"
            onClick={() => navigate("/dashboard/gerar-documento?tipo=contrato-servicos")}
          >
            <Plus className="h-3.5 w-3.5" />
            NOVO DOCUMENTO
          </Button>
        </div>
      )}

      {/* Grouped Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-2 sidebar-scroll">
        {sections.map((section, sIdx) => {
          const isOpen = openSections[sIdx] ?? false;
          return (
            <div key={section.label} className="mb-1">
              {!collapsed && (
                <button
                  onClick={() => toggleSection(sIdx)}
                  className="w-full flex items-center justify-between px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60 hover:text-muted-foreground transition-colors font-medium"
                >
                  <span>{section.label}</span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
                  />
                </button>
              )}
              {collapsed && section.restricted && !adminUnlocked && (
                <button
                  onClick={() => {
                    pendingAdminIdx.current = sIdx;
                    setAdminCode("");
                    setAdminCodeError(false);
                    setShowAdminDialog(true);
                  }}
                  className="w-full flex items-center justify-center py-2 text-muted-foreground/40 hover:text-primary transition-colors"
                  title="Área restrita — clique para desbloquear"
                >
                  <Brain className="h-4 w-4" />
                </button>
              )}
              {((collapsed || isOpen) && !(section.restricted && !adminUnlocked)) && (
                <div className={`${collapsed ? "py-1" : "pb-1"} space-y-0.5`}>
                  {section.items.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.id}
                        to={item.path}
                        onClick={(e) => {
                          if (location.pathname === item.path.split("?")[0] && location.search) {
                            e.preventDefault();
                            navigate(item.path, { replace: true });
                            window.setTimeout(() => navigate(item.path, { replace: true }), 0);
                          }
                        }}
                        className={`flex items-center gap-3 mx-2 px-3 py-2 text-[11px] tracking-wide transition-all duration-200 relative group ${
                          active
                            ? "bg-cyan/10 text-cyan font-medium border-l-2 border-cyan shadow-[0_0_15px_hsl(195_90%_50%/0.1)]"
                            : "text-muted-foreground hover:text-foreground hover:bg-card/60 border-l-2 border-transparent"
                        } ${collapsed ? "justify-center mx-1 px-0" : ""}`}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className={`h-4 w-4 flex-shrink-0 transition-colors ${active ? "text-cyan" : "text-muted-foreground group-hover:text-foreground"}`} />
                        {!collapsed && <span>{item.label}</span>}
                        {item.id === "chat-ao-vivo" && unreadCount > 0 && (
                          <span className="absolute right-2 h-4 min-w-4 px-1 bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Disclaimer */}
      {!collapsed && (
        <div className="px-4 py-2 border-t border-border/20">
          <p className="text-[8px] text-muted-foreground/40 leading-relaxed">
            ORION IA — Sistema inteligente by ELP Global. Revise sempre os resultados. LGPD aplicável.
          </p>
        </div>
      )}

      {/* User Info */}
      <div className="p-3 border-t border-border/20">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-foreground truncate font-medium">{userName}</p>
                <p className="text-[9px] text-muted-foreground/60 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-[9px] text-muted-foreground hover:text-foreground h-7 hover:bg-card/60"
                onClick={() => navigate("/dashboard/configuracoes")}
              >
                <Settings className="h-3 w-3 mr-1" />
                {t.dashboard.settings}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-[9px] text-muted-foreground hover:text-primary h-7 hover:bg-card/60"
                onClick={handleSignOut}
              >
                <LogOut className="h-3 w-3 mr-1" />
                {t.common.logout}
              </Button>
            </div>
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

      {/* Admin Access Code Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">🔒 Área Restrita — Desenvolvedor</DialogTitle>
            <DialogDescription className="text-xs">
              Esta área é exclusiva para o desenvolvedor proprietário da Rede Neural. Se você é o desenvolvedor, digite a senha de acesso abaixo.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAdminCodeSubmit();
            }}
            className="space-y-3"
          >
            <Input
              type="password"
              placeholder="Código de acesso"
              value={adminCode}
              onChange={(e) => {
                setAdminCode(e.target.value);
                setAdminCodeError(false);
              }}
              autoFocus
              className={adminCodeError ? "border-destructive" : ""}
            />
            {adminCodeError && (
              <p className="text-[10px] text-destructive">Código incorreto. Tente novamente.</p>
            )}
            <Button type="submit" className="w-full btn-gold text-xs h-9">
              Acessar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
