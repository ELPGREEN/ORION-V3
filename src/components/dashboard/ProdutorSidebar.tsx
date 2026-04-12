import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoElp from "@/assets/logo-elp.webp";
import { JarvisHUDOverlay, jarvisSidebar as s } from "./JarvisSidebarStyles";
import { LogOut } from "lucide-react";

const produtorItems = [
  { id: "home", label: "Meu Painel", path: "/dashboard" },
  { id: "meus-produtos", label: "Meus Produtos", path: "/dashboard/meus-produtos" },
  { id: "marketplace", label: "Marketplace", path: "/dashboard/marketplace" },
  { id: "afiliados", label: "Afiliados", path: "/dashboard/afiliados" },
  { id: "pagamentos", label: "Vendas & Receita", path: "/dashboard/pagamentos" },
  { id: "documentos", label: "Documentos", path: "/dashboard/documentos" },
  { id: "docs-internacionais", label: "Docs Internacionais", path: "/dashboard/documentos-internacionais" },
  { id: "analytics", label: "Analytics", path: "/dashboard/rede-neural" },
  { id: "meu-site", label: "Minha Loja", path: "/dashboard/escritorio" },
  { id: "orion-ia", label: "Orion IA", path: "/consulta" },
  { id: "plano", label: "Meu Plano", path: "/dashboard/plano" },
  { id: "notificacoes", label: "Notificações", path: "/dashboard/notificacoes" },
  { id: "configuracoes", label: "Configurações", path: "/dashboard/configuracoes" },
];

interface ProdutorSidebarProps { collapsed: boolean }

export function ProdutorSidebar({ collapsed }: ProdutorSidebarProps) {
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
              <p className={`${s.logoSubtitle} text-amber-400/60`}>PAINEL PRODUTOR</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-3 px-1 space-y-0.5 overflow-y-auto">
        {produtorItems.map((item) => {
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
