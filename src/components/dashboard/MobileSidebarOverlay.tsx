import { useLocation, useNavigate } from "react-router-dom";
import {
  TrendingUp, FolderOpen, MessageSquare, Calendar, CreditCard,
  Bell, LogOut, X, Brain, Scale, PenTool, Bot, BookOpen, Settings,
  Crown, FileText, Sparkles, Search, Globe, Users, ListTodo,
  MessagesSquare, FlaskConical, UserCog, ScrollText, Star, Package,
  ShoppingBag, DollarSign, Link2, HelpCircle, Chrome,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import logoElp from "@/assets/logo-elp.webp";
import { useState } from "react";

interface MobileSidebarOverlayProps {
  open: boolean;
  onClose: () => void;
  role: "advogado" | "cliente" | "produtor" | "afiliado" | "nomade";
  label: string;
}

interface MenuSection {
  label: string;
  items: { id: string; label: string; icon: any; path: string }[];
  restricted?: boolean;
}

const clienteSections: MenuSection[] = [
  {
    label: "Principal",
    items: [
      { id: "home", label: "Meu Painel", icon: TrendingUp, path: "/dashboard" },
      { id: "orion-ia", label: "Orion IA", icon: Brain, path: "/consulta" },
    ],
  },
  {
    label: "Meu Caso",
    items: [
      { id: "meus-processos", label: "Meus Processos", icon: Scale, path: "/dashboard/meus-processos" },
      { id: "documentos", label: "Documentos", icon: FolderOpen, path: "/dashboard/documentos" },
      { id: "assinatura", label: "Assinatura Digital", icon: PenTool, path: "/dashboard/assinatura-cliente" },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { id: "chat-ao-vivo", label: "Chat ao Vivo", icon: MessageSquare, path: "/dashboard/chat-ao-vivo" },
      { id: "consulta-ia", label: "Consulta IA", icon: Bot, path: "/consulta" },
      { id: "notificacoes", label: "Notificações", icon: Bell, path: "/dashboard/notificacoes" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { id: "consultas", label: "Agendar Consulta", icon: Calendar, path: "/dashboard/consultas" },
      { id: "pagamentos", label: "Pagamentos", icon: CreditCard, path: "/dashboard/pagamentos" },
    ],
  },
  {
    label: "Conta",
    items: [
      { id: "plano", label: "Meu Plano", icon: Crown, path: "/dashboard/plano" },
      { id: "config", label: "Meu Perfil", icon: Settings, path: "/dashboard/configuracoes" },
      { id: "instrucoes", label: "Central de Ajuda", icon: HelpCircle, path: "/dashboard/instrucoes" },
      { id: "manual", label: "Orion IA", icon: BookOpen, path: "/consulta" },
    ],
  },
];

const advogadoSections: MenuSection[] = [
  {
    label: "Principal",
    items: [
      { id: "home", label: "Meu Painel", icon: TrendingUp, path: "/dashboard" },
      { id: "gerar", label: "Gerar Documento", icon: Sparkles, path: "/dashboard/gerar-documento" },
      { id: "documentos", label: "Meus Documentos", icon: FolderOpen, path: "/dashboard/documentos" },
      { id: "orion-ia", label: "Orion IA", icon: Brain, path: "/consulta" },
    ],
  },
  {
    label: "Gestão Jurídica",
    items: [
      { id: "crm", label: "CRM & Clientes", icon: Users, path: "/dashboard/crm" },
      { id: "processos", label: "Processos", icon: FileText, path: "/dashboard/processos" },
      { id: "tarefas", label: "Tarefas & Prazos", icon: ListTodo, path: "/dashboard/tarefas" },
      { id: "assinatura", label: "Assinatura Digital", icon: PenTool, path: "/dashboard/assinatura-digital" },
      { id: "docs-internacionais", label: "Docs Internacionais", icon: Globe, path: "/dashboard/documentos-internacionais" },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { id: "chat-ao-vivo", label: "Chat ao Vivo", icon: MessagesSquare, path: "/dashboard/chat-ao-vivo" },
      { id: "consultas", label: "Consultas", icon: Calendar, path: "/dashboard/consultas" },
      { id: "notificacoes", label: "Notificações", icon: Bell, path: "/dashboard/notificacoes" },
      { id: "pagamentos", label: "Pagamentos", icon: CreditCard, path: "/dashboard/pagamentos" },
    ],
  },
  {
    label: "Ferramentas IA",
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

const produtorSections: MenuSection[] = [
  {
    label: "Principal",
    items: [
      { id: "home", label: "Meu Painel", icon: ShoppingBag, path: "/dashboard" },
      { id: "meus-produtos", label: "Meus Produtos", icon: Package, path: "/dashboard/meus-produtos" },
      { id: "meu-site", label: "Meu Site / Loja", icon: Globe, path: "/dashboard/escritorio" },
      { id: "marketplace", label: "Marketplace", icon: ShoppingBag, path: "/dashboard/marketplace" },
      { id: "pagamentos", label: "Vendas & Receita", icon: DollarSign, path: "/dashboard/pagamentos" },
      { id: "orion-ia", label: "Orion IA", icon: Brain, path: "/consulta" },
      { id: "plano", label: "Meu Plano", icon: Crown, path: "/dashboard/plano" },
      { id: "configuracoes", label: "Configurações", icon: Settings, path: "/dashboard/configuracoes" },
      { id: "notificacoes", label: "Notificações", icon: Bell, path: "/dashboard/notificacoes" },
    ],
  },
];

const afiliadoSections: MenuSection[] = [
  {
    label: "Principal",
    items: [
      { id: "home", label: "Meu Painel", icon: ShoppingBag, path: "/dashboard" },
      { id: "afiliados", label: "Meus Links", icon: Link2, path: "/dashboard/afiliados" },
      { id: "meu-site", label: "Meu Perfil Público", icon: Globe, path: "/dashboard/escritorio" },
      { id: "marketplace", label: "Marketplace", icon: ShoppingBag, path: "/dashboard/marketplace" },
      { id: "pagamentos", label: "Comissões", icon: DollarSign, path: "/dashboard/pagamentos" },
      { id: "orion-ia", label: "Orion IA", icon: Brain, path: "/consulta" },
      { id: "plano", label: "Meu Plano", icon: Crown, path: "/dashboard/plano" },
      { id: "configuracoes", label: "Configurações", icon: Settings, path: "/dashboard/configuracoes" },
      { id: "notificacoes", label: "Notificações", icon: Bell, path: "/dashboard/notificacoes" },
    ],
  },
];

const nomadeSections: MenuSection[] = [
  {
    label: "Principal",
    items: [
      { id: "home", label: "Meu Painel", icon: ShoppingBag, path: "/dashboard" },
      { id: "meus-produtos", label: "Meus Produtos", icon: Package, path: "/dashboard/meus-produtos" },
      { id: "marketplace", label: "Marketplace", icon: ShoppingBag, path: "/dashboard/marketplace" },
      { id: "afiliados", label: "Afiliados", icon: Link2, path: "/dashboard/afiliados" },
      { id: "meu-site", label: "Minha Loja", icon: Globe, path: "/dashboard/escritorio" },
      { id: "pagamentos", label: "Pagamentos", icon: DollarSign, path: "/dashboard/pagamentos" },
      { id: "orion-ia", label: "Orion IA", icon: Brain, path: "/consulta" },
      { id: "plano", label: "Meu Plano", icon: Crown, path: "/dashboard/plano" },
      { id: "configuracoes", label: "Configurações", icon: Settings, path: "/dashboard/configuracoes" },
      { id: "notificacoes", label: "Notificações", icon: Bell, path: "/dashboard/notificacoes" },
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] z-50 shadow-2xl animate-slide-right bg-card border-r border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoElp} alt="ELP" className="h-9 w-9 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-serif text-foreground tracking-[0.2em] font-bold">ORION</p>
              <p className="text-[8px] text-primary tracking-[0.15em] uppercase truncate">{label}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Menu Items with sections */}
        <nav className="flex-1 py-3 px-3 space-y-3 overflow-y-auto">
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
                  className="w-full flex items-center justify-between text-[9px] text-muted-foreground/50 uppercase tracking-[0.15em] px-3 mb-1 font-medium"
                >
                  <span>{section.label}</span>
                  {isRestricted && (
                    <span className="text-[8px] text-primary/60">🔒</span>
                  )}
                </button>

                {!isRestricted && (
                  <div className="space-y-0.5">
                    {(section.items ?? []).filter(Boolean).map((item) => {
                      if (!item?.id) return null;
                      const active = isActive(item.path);
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            navigate(item.path);
                            onClose();
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all ${
                            active
                              ? "text-primary bg-primary/10 border-l-2 border-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          {Icon && <Icon className={`h-4 w-4 flex-shrink-0 ${active ? "text-primary" : ""}`} />}
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
            <div className="px-3 py-3 border border-primary/20 bg-primary/5 space-y-2">
              <p className="text-[10px] text-primary font-medium">🔒 Área Restrita</p>
              <form onSubmit={(e) => { e.preventDefault(); handleAdminSubmit(); }} className="space-y-2">
                <Input
                  type="password"
                  placeholder="Código de acesso"
                  value={adminCode}
                  onChange={(e) => { setAdminCode(e.target.value); setAdminCodeError(false); }}
                  autoFocus
                  className={`h-8 text-xs ${adminCodeError ? "border-destructive" : ""}`}
                />
                {adminCodeError && <p className="text-[9px] text-destructive">Código incorreto.</p>}
                <Button type="submit" size="sm" className="w-full h-7 text-[10px]">Desbloquear</Button>
              </form>
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-border/30 flex-shrink-0">
          <button
            onClick={async () => {
              await signOut();
              navigate("/");
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
    </div>
  );
}