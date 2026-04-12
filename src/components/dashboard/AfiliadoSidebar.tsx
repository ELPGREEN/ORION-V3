import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoElp from "@/assets/logo-elp.webp";
import { JarvisHUDOverlay, jarvisSidebar as s } from "./JarvisSidebarStyles";
// [REMOVED] import { getOrionIcon, LogOut } from "./icons/OrionIcons";

const afiliadoItems = [
  { id: "home", label: "Meu Painel", path: "/dashboard" },
  { id: "afiliados", label: "Meus Links", path: "/dashboard/afiliados" },
  { id: "marketplace", label: "Marketplace", path: "/dashboard/marketplace" },
  { id: "pagamentos", label: "Comissões", path: "/dashboard/pagamentos" },
  { id: "documentos", label: "Documentos", path: "/dashboard/documentos" },
  { id: "meu-site", label: "Perfil Público", path: "/dashboard/escritorio" },
  { id: "orion-ia", label: "Orion IA", path: "/consulta" },
  { id: "plano", label: "Meu Plano", path: "/dashboard/plano" },
  { id: "notificacoes", label: "Notificações", path: "/dashboard/notificacoes" },
  { id: "configuracoes", label: "Configurações", path: "/dashboard/configuracoes" },
];

interface AfiliadoSidebarProps { collapsed: boolean }

export function AfiliadoSidebar({ collapsed }: AfiliadoSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`${s.aside} ${collapsed ? "w-[72px]" : "w-72"}`}>
      <JarvisHUDOverlay />

      <div className={s.logoSection}>
        <div className="flex items-center gap-3">
          <img src={logoElp} alt="ELP" className="h-9 w-9 object-contain drop-shadow-[0_0_8px_rgba(0,188,212,0.12)]" />
          {!collapsed && (
            <div>
              <p className={s.logoTitle}>ORION</p>
              <p className={`${s.logoSubtitle} text-emerald-400/60`}>PAINEL AFILIADO</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-3 px-1 space-y-0.5 overflow-y-auto">
        {afiliadoItems.map((item) => {
          const active = isActive(item.path);
          const Icon = null;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={`${s.menuItem(active)} ${collapsed ? "justify-center mx-1 px-0" : ""}`}
            >
              <Icon className={s.menuIcon(active)} />
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-cyan-500/8">
        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          title={collapsed ? "Sair" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-[11px] text-slate-500 hover:text-red-400 transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut size={16} />
          {!collapsed && "Sair"}
        </button>
      </div>
    </aside>
  );
}
