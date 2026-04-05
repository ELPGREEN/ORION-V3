import { useLocation, useNavigate } from "react-router-dom";
import { Link2, ShoppingBag, DollarSign, Brain, Settings, Bell, LogOut, Globe, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logoElp from "@/assets/logo-elp.webp";

const afiliadoItems = [
  { id: "home", label: "Meu Painel", icon: ShoppingBag, path: "/dashboard" },
  { id: "afiliados", label: "Meus Links", icon: Link2, path: "/dashboard/afiliados" },
  { id: "meu-site", label: "Meu Perfil Público", icon: Globe, path: "/dashboard/escritorio" },
  { id: "marketplace", label: "Marketplace", icon: ShoppingBag, path: "/dashboard/marketplace" },
  { id: "pagamentos", label: "Comissões", icon: DollarSign, path: "/dashboard/pagamentos" },
  { id: "orion-ia", label: "Orion IA", icon: Brain, path: "/consulta" },
  { id: "plano", label: "Meu Plano", icon: Crown, path: "/dashboard/plano" },
  { id: "configuracoes", label: "Configurações", icon: Settings, path: "/dashboard/configuracoes" },
  { id: "notificacoes", label: "Notificações", icon: Bell, path: "/dashboard/notificacoes" },
];

interface AfiliadoSidebarProps {
  collapsed: boolean;
}

export function AfiliadoSidebar({ collapsed }: AfiliadoSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="h-full bg-card border-r border-border/40 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/30">
        <img src={logoElp} alt="ELP" className="h-9 w-9 object-contain" />
        {!collapsed && (
          <div>
            <p className="text-sm font-serif text-foreground tracking-[0.2em] font-bold">ORION</p>
            <p className="text-[8px] text-primary tracking-[0.15em] uppercase">PAINEL AFILIADO</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {afiliadoItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all ${
                active
                  ? "text-primary bg-primary/10 border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border/30">
        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          title={collapsed ? "Sair" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-primary transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Sair"}
        </button>
      </div>
    </aside>
  );
}
