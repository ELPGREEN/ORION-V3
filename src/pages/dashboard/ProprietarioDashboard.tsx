import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, FolderOpen, Users, MessageSquare, Store, ShoppingCart, Brain, Bot, Cpu, FlaskConical, Globe2, Chrome, ScrollText, UserCog, Wifi, PenTool, Search, Calendar, Gavel, BarChart3, Shield, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { lazy, Suspense } from "react";

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
    { label: "Clientes", value: stats?.clients ?? 0, icon: Users, gradient: "from-primary/20 to-primary/5" },
    { label: "Processos", value: stats?.processos ?? 0, icon: FolderOpen, gradient: "from-accent/20 to-accent/5" },
    { label: "Produtos", value: stats?.products ?? 0, icon: Store, gradient: "from-primary/15 to-transparent" },
    { label: "Pedidos", value: stats?.orders ?? 0, icon: ShoppingCart, gradient: "from-accent/15 to-transparent" },
    { label: "Documentos", value: stats?.docs ?? 0, icon: FileText, gradient: "from-primary/10 to-transparent" },
    { label: "Conversas", value: stats?.conversations ?? 0, icon: MessageSquare, gradient: "from-accent/10 to-transparent" },
  ];

  const sections = [
    {
      title: "Jurídico",
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
      items: [
        { title: "Meus Produtos", icon: Store, path: "/dashboard/meus-produtos" },
        { title: "Marketplace", icon: ShoppingCart, path: "/dashboard/marketplace" },
        { title: "Programa Afiliados", icon: BarChart3, path: "/dashboard/produtor-afiliados" },
        { title: "Editor de Vendas", icon: ScrollText, path: "/dashboard/editor-vendas" },
        { title: "Campanhas Email", icon: Globe2, path: "/dashboard/campanhas-email" },
        { title: "Explorar Lojas", icon: Store, path: "/dashboard/explorar-lojas" },
      ],
    },
    {
      title: "Centro de Comando Orion",
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
      {/* Hero Header */}
      <div className="relative overflow-hidden border border-primary/20 bg-gradient-to-br from-card via-card/95 to-primary/8 p-6 sm:p-8 rounded-lg">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/10 blur-[120px] animate-pulse" style={{ animationDuration: "4s" }} />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-accent/8 blur-[100px] animate-pulse" style={{ animationDuration: "6s", animationDelay: "2s" }} />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] tracking-[0.3em] uppercase text-primary/60 mb-1.5 font-sans">{greeting}</p>
          <h1 className="text-2xl sm:text-3xl font-serif text-foreground">
            <span className="text-gold-shine">{userName}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Painel do Proprietário — Acesso Total
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className={`bg-gradient-to-br ${s.gradient} border-border/50`}>
            <CardContent className="p-4 flex flex-col items-center text-center">
              <s.icon className="h-5 w-5 text-primary/70 mb-1" />
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-xl font-bold text-foreground">{s.value}</span>
              )}
              <span className="text-[10px] text-muted-foreground mt-0.5">{s.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orion Comando Total */}
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />}>
        <OrionComandoTotal />
      </Suspense>

      {/* Tool Sections */}
      {sections.map((section) => (
        <div key={section.title} className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{section.title}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {section.items.map((item) => (
              <Button
                key={item.path}
                variant="outline"
                className="justify-start gap-2 h-auto py-3 px-3 group hover:border-primary/40 transition-colors"
                onClick={() => navigate(item.path)}
              >
                <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                <span className="text-xs font-medium truncate">{item.title}</span>
                <ArrowUpRight className="h-3 w-3 text-muted-foreground/50 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
