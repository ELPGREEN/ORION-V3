import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, FolderOpen, Users, MessageSquare, Store, ShoppingCart, Brain, Bot, Cpu, FlaskConical, Globe2, Chrome, ScrollText, UserCog, Wifi, PenTool, Search, Calendar, Gavel, BarChart3, Shield, ArrowUpRight, Bell, CreditCard, ListTodo, Globe, HelpCircle, Settings, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { lazy, Suspense } from "react";
import { ThemedHeader, ThemedStatCard, ThemedSection, StatusLED } from "@/components/dashboard/DashboardTheme";

const OrionComandoTotal = lazy(() => import("@/components/dashboard/OrionComandoTotal"));

export default function ProprietarioDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Proprietário";

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  const { data: stats, isLoading } = useQuery({
    queryKey: ["owner-stats", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user");
      const [clients, processos, products, orders, docs, conversations] = await Promise.all([
        supabase.from("client_profiles").select("id", { count: "exact", head: true }),
        supabase.from("processos").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("chat_conversations").select("id", { count: "exact", head: true }),
      ]);
      return {
        clients: clients.count || 0,
        processos: processos.count || 0,
        products: products.count || 0,
        orders: orders.count || 0,
        docs: docs.count || 0,
        conversations: conversations.count || 0,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const statCards = [
    { label: "Clientes", value: stats?.clients ?? 0, icon: Users },
    { label: "Processos", value: stats?.processos ?? 0, icon: FolderOpen },
    { label: "Produtos", value: stats?.products ?? 0, icon: Store },
    { label: "Pedidos", value: stats?.orders ?? 0, icon: ShoppingCart },
    { label: "Documentos", value: stats?.docs ?? 0, icon: FileText },
    { label: "Conversas", value: stats?.conversations ?? 0, icon: MessageSquare },
  ];

  const sections = [
    {
      title: "Jurídico",
      icon: Gavel,
      items: [
        { title: "Processos", icon: FolderOpen, path: "/dashboard/processos" },
        { title: "CRM Clientes", icon: Users, path: "/dashboard/crm" },
        { title: "Documentos", icon: FileText, path: "/dashboard/documentos" },
        { title: "Pesquisa Jurídica", icon: Search, path: "/dashboard/pesquisa-unificada" },
        { title: "Chat ao Vivo", icon: MessageSquare, path: "/dashboard/chat-ao-vivo" },
        { title: "Assinaturas", icon: PenTool, path: "/dashboard/assinaturas" },
        { title: "Gerar Documento", icon: Gavel, path: "/dashboard/gerar-documento" },
        { title: "Consultas", icon: Calendar, path: "/dashboard/consultas" },
      ],
    },
    {
      title: "Produtos & Vendas",
      icon: Store,
      items: [
        { title: "Meus Produtos", icon: Store, path: "/dashboard/meus-produtos" },
        { title: "Marketplace", icon: ShoppingCart, path: "/dashboard/marketplace" },
        { title: "Programa Afiliados", icon: BarChart3, path: "/dashboard/produtor-afiliados" },
        { title: "Editor de Vendas", icon: ScrollText, path: "/dashboard/editor-vendas" },
        { title: "Campanhas Email", icon: Globe2, path: "/dashboard/campanhas-email" },
        { title: "Explorar Lojas", icon: Store, path: "/dashboard/explorar-lojas" },
        { title: "Loja Orion Industrial", icon: Bot, path: "/loja-orion" },
      ],
    },
    {
      title: "Centro de Comando Orion",
      icon: Brain,
      items: [
        { title: "Rede Neural", icon: Cpu, path: "/dashboard/rede-neural" },
        { title: "Laboratório IA", icon: FlaskConical, path: "/dashboard/laboratorio-ia" },
        { title: "Controle Robótico", icon: Bot, path: "/dashboard/controle-robotico" },
        { title: "Dispositivos IoT", icon: Wifi, path: "/dashboard/dispositivos-iot" },
        { title: "Ferramentas Google", icon: Globe2, path: "/dashboard/ferramentas-google" },
        { title: "Extensão Chrome", icon: Chrome, path: "/dashboard/extension" },
        { title: "Reformulação IA", icon: ScrollText, path: "/dashboard/reformulacao" },
        { title: "Recursos EU", icon: Globe2, path: "/dashboard/recursos-eu" },
        { title: "Usuários", icon: UserCog, path: "/dashboard/usuarios" },
        { title: "Publicações", icon: FileText, path: "/dashboard/publicacoes-admin" },
        { title: "Analytics", icon: BarChart3, path: "/dashboard/admin" },
        { title: "Orion IA", icon: Brain, path: "/consulta" },
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header — Owner HUD style */}
      <ThemedHeader
        role="owner"
        greeting={greeting}
        userName={userName}
        subtitle="Painel do Proprietário — Acesso Total"
        icon={Shield}
        badgeLabel="COMANDO TOTAL"
      >
        <div className="flex items-center gap-3">
          <StatusLED status="online" label="SISTEMAS" />
          <StatusLED status="online" label="ORION" />
        </div>
      </ThemedHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => (
          isLoading ? (
            <div key={s.label} className="p-4 rounded-lg border border-border/50 bg-card/80 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ThemedStatCard key={s.label} role="owner" label={s.label} value={s.value} icon={s.icon} />
          )
        ))}
      </div>

      {/* Orion Comando Total */}
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />}>
        <OrionComandoTotal />
      </Suspense>

      {/* Tool Sections */}
      {sections.map((section) => (
        <ThemedSection key={section.title} role="owner" title={section.title} icon={section.icon}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {section.items.map((item) => (
              <Button
                key={item.path}
                variant="outline"
                className="justify-start gap-2 h-auto py-3 px-3 group hover:border-[hsl(30,85%,52%,0.4)] transition-colors border-border/50"
                onClick={() => navigate(item.path)}
              >
                <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-[hsl(30,85%,52%)] shrink-0 transition-colors" />
                <span className="text-xs font-medium truncate">{item.title}</span>
                <ArrowUpRight className="h-3 w-3 text-muted-foreground/50 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            ))}
          </div>
        </ThemedSection>
      ))}
    </div>
  );
}
