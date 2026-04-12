import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import logoElp from "@/assets/logo-elp.webp";
import { useState } from "react";
import { JarvisHUDOverlay, jarvisSidebar as s } from "./JarvisSidebarStyles";
import {
  getOrionIcon,
  IconClose,
  IconLogout,
  IconChevronDown,
} from "./icons/OrionIcons";

interface MobileSidebarOverlayProps {
  open: boolean;
  onClose: () => void;
  role: "advogado" | "cliente" | "produtor" | "afiliado" | "nomade";
  label: string;
}

interface MenuSection {
  label: string;
  items: { id: string; label: string; path: string }[];
  restricted?: boolean;
}

const clienteSections: MenuSection[] = [
  {
    label: "Principal",
    items: [
      { id: "home", label: "Meu Painel", path: "/dashboard" },
      { id: "orion-ia", label: "Orion IA", path: "/consulta" },
    ],
  },
  {
    label: "Meu Caso",
    items: [
      { id: "meus-processos", label: "Meus Processos", path: "/dashboard/meus-processos" },
      { id: "documentos", label: "Documentos", path: "/dashboard/documentos" },
      { id: "assinatura-cliente", label: "Assinatura Digital", path: "/dashboard/assinatura-cliente" },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { id: "chat-ao-vivo", label: "Chat ao Vivo", path: "/dashboard/chat-ao-vivo" },
      { id: "consulta-ia", label: "Consulta IA", path: "/consulta" },
      { id: "notificacoes", label: "Notificações", path: "/dashboard/notificacoes" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { id: "consultas", label: "Agendar Consulta", path: "/dashboard/consultas" },
      { id: "pagamentos", label: "Pagamentos", path: "/dashboard/pagamentos" },
    ],
  },
  {
    label: "Conta",
    items: [
      { id: "plano", label: "Meu Plano", path: "/dashboard/plano" },
      { id: "config", label: "Meu Perfil", path: "/dashboard/configuracoes" },
      { id: "instrucoes", label: "Central de Ajuda", path: "/dashboard/instrucoes" },
      { id: "manual", label: "Orion IA", path: "/consulta" },
    ],
  },
];

const advogadoSections: MenuSection[] = [
  {
    label: "Principal",
    items: [
      { id: "home", label: "Meu Painel", path: "/dashboard" },
      { id: "gerar", label: "Gerar Documento", path: "/dashboard/gerar-documento" },
      { id: "documentos", label: "Meus Documentos", path: "/dashboard/documentos" },
      { id: "orion-ia", label: "Orion IA", path: "/consulta" },
    ],
  },
  {
    label: "Gestão Jurídica",
    items: [
      { id: "crm", label: "CRM & Clientes", path: "/dashboard/crm" },
      { id: "processos", label: "Processos", path: "/dashboard/processos" },
      { id: "tarefas", label: "Tarefas & Prazos", path: "/dashboard/tarefas" },
      { id: "assinatura", label: "Assinatura Digital", path: "/dashboard/assinatura-digital" },
      { id: "docs-internacionais", label: "Docs Internacionais", path: "/dashboard/documentos-internacionais" },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { id: "chat-ao-vivo", label: "Chat ao Vivo", path: "/dashboard/chat-ao-vivo" },
      { id: "consultas", label: "Consultas", path: "/dashboard/consultas" },
      { id: "notificacoes", label: "Notificações", path: "/dashboard/notificacoes" },
      { id: "pagamentos", label: "Pagamentos", path: "/dashboard/pagamentos" },
    ],
  },
  {
    label: "Ferramentas IA",
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

const produtorSections: MenuSection[] = [
  {
    label: "Principal",
    items: [
      { id: "home", label: "Meu Painel", path: "/dashboard" },
      { id: "meus-produtos", label: "Meus Produtos", path: "/dashboard/meus-produtos" },
      { id: "meu-site", label: "Meu Site / Loja", path: "/dashboard/escritorio" },
      { id: "marketplace", label: "Marketplace", path: "/dashboard/marketplace" },
      { id: "pagamentos", label: "Vendas & Receita", path: "/dashboard/pagamentos" },
      { id: "orion-ia", label: "Orion IA", path: "/consulta" },
      { id: "plano", label: "Meu Plano", path: "/dashboard/plano" },
      { id: "configuracoes", label: "Configurações", path: "/dashboard/configuracoes" },
      { id: "notificacoes", label: "Notificações", path: "/dashboard/notificacoes" },
    ],
  },
];

const afiliadoSections: MenuSection[] = [
  {
    label: "Principal",
    items: [
      { id: "home", label: "Meu Painel", path: "/dashboard" },
      { id: "afiliados", label: "Meus Links", path: "/dashboard/afiliados" },
      { id: "meu-site", label: "Meu Perfil Público", path: "/dashboard/escritorio" },
      { id: "marketplace", label: "Marketplace", path: "/dashboard/marketplace" },
      { id: "pagamentos", label: "Comissões", path: "/dashboard/pagamentos" },
      { id: "orion-ia", label: "Orion IA", path: "/consulta" },
      { id: "plano", label: "Meu Plano", path: "/dashboard/plano" },
      { id: "configuracoes", label: "Configurações", path: "/dashboard/configuracoes" },
      { id: "notificacoes", label: "Notificações", path: "/dashboard/notificacoes" },
    ],
  },
];

const nomadeSections: MenuSection[] = [
  {
    label: "Principal",
    items: [
      { id: "home", label: "Meu Painel", path: "/dashboard" },
      { id: "meus-produtos", label: "Meus Produtos", path: "/dashboard/meus-produtos" },
      { id: "marketplace", label: "Marketplace", path: "/dashboard/marketplace" },
      { id: "afiliados", label: "Afiliados", path: "/dashboard/afiliados" },
      { id: "meu-site", label: "Minha Loja", path: "/dashboard/escritorio" },
      { id: "pagamentos", label: "Pagamentos", path: "/dashboard/pagamentos" },
      { id: "orion-ia", label: "Orion IA", path: "/consulta" },
      { id: "plano", label: "Meu Plano", path: "/dashboard/plano" },
      { id: "configuracoes", label: "Configurações", path: "/dashboard/configuracoes" },
      { id: "notificacoes", label: "Notificações", path: "/dashboard/notificacoes" },
    ],
  },
];

function getSections(role: string): MenuSection[] {
  switch (role) {
    case "advogado": return advogadoSections;
    case "produtor": return produtorSections;
    case "afiliado": return afiliadoSections;
    case "nomade": return nomadeSections;
    default: return clienteSections;
  }
}

export function MobileSidebarOverlay({ open, onClose, role, label }: MobileSidebarOverlayProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { unlocked: adminUnlocked, validate: validateAdminCode } = useAdminAccess();
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminCodeError, setAdminCodeError] = useState(false);

  if (!open) return null;

  const sections = getSections(role);

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const handleAdminSubmit = () => {
    if (validateAdminCode(adminCode)) {
      setShowAdminInput(false);
      setAdminCode("");
      setAdminCodeError(false);
    } else {
      setAdminCodeError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <aside className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] z-50 shadow-2xl animate-slide-right ${s.aside}`}>
        <JarvisHUDOverlay />

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/8 flex-shrink-0 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoElp} alt="ELP" className="h-9 w-9 object-contain flex-shrink-0 drop-shadow-[0_0_8px_rgba(0,188,212,0.12)]" />
            <div className="min-w-0">
              <p className={s.logoTitle}>ORION</p>
              <p className={`${s.logoSubtitle} text-cyan-500/60 truncate`}>{label}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 flex-shrink-0 text-slate-500 hover:text-cyan-400">
            <IconClose size={16} />
          </Button>
        </div>

        {/* Menu Items with sections */}
        <nav className="flex-1 py-3 px-2 space-y-3 overflow-y-auto relative z-10">
          {(sections ?? []).map((section) => {
            const isRestricted = section.restricted && !adminUnlocked;

            return (
              <div key={section.label}>
                <button
                  onClick={() => {
                    if (isRestricted) {
                      setShowAdminInput(true);
                      setAdminCode("");
                      setAdminCodeError(false);
                    }
                  }}
                  className={s.sectionHeader}
                >
                  <span>{section.label}</span>
                  {isRestricted && <span className="text-[8px] text-cyan-500/40">🔒</span>}
                </button>

                {!isRestricted && (
                  <div className="space-y-0.5">
                    {(section.items ?? []).filter(Boolean).map((item) => {
                      if (!item?.id) return null;
                      const active = isActive(item.path);
                      const Icon = getOrionIcon(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            navigate(item.path);
                            onClose();
                          }}
                          className={s.menuItem(active)}
                        >
                          <Icon className={s.menuIcon(active)} />
                          <span className="truncate">{item.label ?? ""}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Admin Code Input */}
          {showAdminInput && !adminUnlocked && (
            <div className="px-3 py-3 border border-cyan-500/15 bg-cyan-500/5 space-y-2 rounded-sm">
              <p className="text-[10px] text-cyan-400 font-medium">🔒 Área Restrita</p>
              <form onSubmit={(e) => { e.preventDefault(); handleAdminSubmit(); }} className="space-y-2">
                <Input
                  type="password"
                  placeholder="Código de acesso"
                  value={adminCode}
                  onChange={(e) => { setAdminCode(e.target.value); setAdminCodeError(false); }}
                  autoFocus
                  className={`h-8 text-xs bg-slate-900/50 border-cyan-500/20 text-cyan-100 ${adminCodeError ? "border-red-500" : ""}`}
                />
                {adminCodeError && <p className="text-[9px] text-red-400">Código incorreto.</p>}
                <Button type="submit" size="sm" className="w-full h-7 text-[10px] bg-cyan-600/20 border border-cyan-500/25 text-cyan-300 hover:bg-cyan-600/30">Desbloquear</Button>
              </form>
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-cyan-500/8 flex-shrink-0 relative z-10">
          <button
            onClick={async () => {
              await signOut();
              navigate("/");
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] text-slate-500 hover:text-red-400 transition-colors"
          >
            <IconLogout size={16} />
            Sair
          </button>
        </div>
      </aside>
    </div>
  );
}
