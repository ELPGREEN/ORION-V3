import { Link, useLocation, useNavigate } from "react-router-dom";
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

import { JarvisHUDOverlay, jarvisSidebar as s } from "./JarvisSidebarStyles";
import { ChevronRight, ChevronLeft, Plus, ChevronDown, Brain, User, Settings, LogOut } from "lucide-react";
interface DashboardSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface MenuSection {
  label: string;
  items: { id: string; label: string; path: string }[];
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
        { id: "home", label: t.dashboard.home, path: "/dashboard" },
        { id: "gerar", label: t.dashboard.generateDocument, path: "/dashboard/gerar-documento" },
        { id: "documentos", label: t.dashboard.myDocuments, path: "/dashboard/documentos" },
        { id: "orion-ia", label: "Orion IA", path: "/consulta" },
      ],
    },
    {
      label: "Gestão Jurídica",
      defaultOpen: true,
      items: [
        { id: "crm", label: "CRM & Clientes", path: "/dashboard/crm" },
        { id: "processos", label: t.dashboard.cases, path: "/dashboard/processos" },
        { id: "tarefas", label: "Tarefas & Prazos", path: "/dashboard/tarefas" },
        { id: "assinatura", label: t.dashboard.digitalSignature, path: "/dashboard/assinatura-digital" },
        { id: "docs-internacionais", label: "Docs Internacionais", path: "/dashboard/documentos-internacionais" },
      ],
    },
    {
      label: "Comunicação",
      defaultOpen: true,
      items: [
        { id: "chat-ao-vivo", label: t.dashboard.liveChat, path: "/dashboard/chat-ao-vivo" },
        { id: "consultas", label: t.dashboard.consultations, path: "/dashboard/consultas" },
        { id: "notificacoes", label: "Notificações", path: "/dashboard/notificacoes" },
        { id: "pagamentos", label: t.dashboard.payments, path: "/dashboard/pagamentos" },
      ],
    },
    {
      label: "Ferramentas IA",
      defaultOpen: true,
      items: [
        { id: "pesquisa", label: "Pesquisa Avançada", path: "/dashboard/pesquisa-unificada" },
        { id: "reformulacao", label: "Reformulação IA", path: "/dashboard/reformulacao" },
        { id: "laboratorio-ia", label: "Laboratório IA", path: "/dashboard/laboratorio-ia" },
        { id: "marketplace", label: "Marketplace", path: "/dashboard/marketplace" },
        { id: "instrucoes", label: "Central de Ajuda", path: "/dashboard/instrucoes" },
      ],
    },
    {
      label: "Administração",
      items: [
        { id: "config", label: "Meu Escritório", path: "/dashboard/configuracoes" },
      ],
    },
    {
      label: "Proprietário",
      restricted: true,
      items: [
        { id: "rede-neural", label: "Rede Neural", path: "/dashboard/rede-neural" },
        { id: "ferramentas-google", label: "Ferramentas Google", path: "/dashboard/ferramentas-google" },
        { id: "controle-robotico", label: "Controle Robótico", path: "/dashboard/controle-robotico" },
        { id: "usuarios", label: "Usuários", path: "/dashboard/usuarios" },
        { id: "publicacoes-admin", label: "Publicações", path: "/dashboard/publicacoes-admin" },
        { id: "recursos-eu", label: "Recursos EU", path: "/dashboard/recursos-eu" },
        { id: "extension", label: "Extensão Chrome", path: "/dashboard/rede-neural" },
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

  const activeSectionIdx = sections.findIndex((sec) =>
    sec.items.some((item) => isActive(item.path))
  );

  const { unlocked: adminUnlocked, validate: validateAdminCode, lock: lockAdmin } = useAdminAccess();

  const allRestrictedItems = sections.filter(sec => sec.restricted).flatMap(sec => sec.items);
  const isOnRestrictedRoute = allRestrictedItems.some((item) => isActive(item.path));

  const [openSections, setOpenSections] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    sections.forEach((sec, i) => {
      initial[i] = sec.defaultOpen || i === activeSectionIdx;
    });
    if (isOnRestrictedRoute || adminUnlocked) {
      sections.forEach((sec, j) => { if (sec.restricted) initial[j] = true; });
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
    <aside className={`${s.aside} ${collapsed ? "w-[72px]" : "w-72"}`}>
      <JarvisHUDOverlay />

      {/* Logo + Toggle */}
      <div className={s.logoSection}>
        <Link to="/" className="flex items-center gap-3 group">
          <img src={logoElp} alt="ELP" className="h-10 w-10 flex-shrink-0 object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_10px_rgba(0,188,212,0.15)]" />
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className={s.logoTitle}>ORION</h1>
              <p className={`${s.logoSubtitle} text-cyan-500/70`}>
                IA EMPRESARIAL • BY ELP
              </p>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-7 w-7 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 flex-shrink-0"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-cyan-500/6">
          <Button
            className={s.quickAction}
            onClick={() => navigate("/dashboard/gerar-documento?tipo=contrato-servicos")}
          >
            <Plus size={14} />
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
                <button onClick={() => toggleSection(sIdx)} className={s.sectionHeader}>
                  <span>{section.label}</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
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
                  className="w-full flex items-center justify-center py-2 text-slate-600 hover:text-cyan-400 transition-colors"
                  title="Área restrita — clique para desbloquear"
                >
                  <Brain size={16} />
                </button>
              )}
              {((collapsed || isOpen) && !(section.restricted && !adminUnlocked)) && (
                <div className={`${collapsed ? "py-1" : "pb-1"} space-y-0.5`}>
                  {section.items.map((item) => {
                    const active = isActive(item.path);
                    const Icon = null;
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
                        className={`${s.menuItem(active)} ${collapsed ? "justify-center mx-1 px-0" : ""}`}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className={s.menuIcon(active)} />
                        {!collapsed && <span>{item.label}</span>}
                        {item.id === "chat-ao-vivo" && unreadCount > 0 && (
                          <span className={s.badge}>
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
        <div className={s.disclaimer}>
          <p className={s.disclaimerText}>
            ORION IA — Sistema inteligente by ELP Global. Revise sempre os resultados. LGPD aplicável.
          </p>
        </div>
      )}

      {/* User Info */}
      <div className={s.userSection}>
        {!collapsed ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className={s.userAvatar}>
                <User size={16} className="text-cyan-400/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={s.userName}>{userName}</p>
                <p className={s.userEmail}>{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className={s.settingsBtn}
                onClick={() => navigate("/dashboard/configuracoes")}
              >
                <Settings size={12} className="mr-1" />
                {t.dashboard.settings}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={s.logoutBtn}
                onClick={handleSignOut}
              >
                <LogOut size={12} className="mr-1" />
                {t.common.logout}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-red-400"
              onClick={handleSignOut}
              title={t.common.logout}
            >
              <LogOut size={16} />
            </Button>
          </div>
        )}
      </div>

      {/* Admin Access Code Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="sm:max-w-sm bg-[hsl(230_30%_8%)] border-cyan-500/20">
          <DialogHeader>
            <DialogTitle className="text-sm text-cyan-200">🔒 Área Restrita — Desenvolvedor</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Esta área é exclusiva para o desenvolvedor proprietário da Rede Neural.
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
              className={`bg-slate-900/50 border-cyan-500/20 text-cyan-100 ${adminCodeError ? "border-red-500" : ""}`}
            />
            {adminCodeError && (
              <p className="text-[10px] text-red-400">Código incorreto. Tente novamente.</p>
            )}
            <Button type="submit" className="w-full bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/30 text-xs h-9">
              Acessar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
