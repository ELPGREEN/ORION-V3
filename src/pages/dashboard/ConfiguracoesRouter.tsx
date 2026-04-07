import { useUserRole } from "@/hooks/useUserRole";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Loader2, Settings, Building2, Crown, Webhook, ScanFace, Radio, ShoppingCart, Mic, Store } from "lucide-react";
import { lazy, Suspense, useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PerfilAdmin = lazy(() => import("./PerfilAdmin"));
const PerfilCliente = lazy(() => import("./PerfilCliente"));
const ConfiguracoesEscritorio = lazy(() => import("./ConfiguracoesEscritorio"));
const PlanoUsuario = lazy(() => import("./PlanoUsuario"));
const WebhooksPage = lazy(() => import("./WebhooksPage"));
const BiometriaConfigPage = lazy(() => import("@/components/dashboard/settings/BiometriaConfigPanel"));
const DispositivosConfigPage = lazy(() => import("@/components/dashboard/settings/DispositivosConfigPanel"));
const AmazonConfigPage = lazy(() => import("@/components/dashboard/settings/AmazonIntegrationPanel"));
const MicrophoneHardwarePage = lazy(() => import("@/components/dashboard/settings/MicrophoneHardwarePanel"));
const MeusProdutos = lazy(() => import("./MeusProdutos"));
const EditorPaginaVendas = lazy(() => import("./EditorPaginaVendas"));

const TabFallback = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

interface TabDef {
  value: string;
  label: string;
  icon: React.ElementType;
  roles: string[]; // "all" = everyone, "owner" = proprietário only
  content: React.ReactNode;
}

export default function ConfiguracoesRouter() {
  const { isCliente, isAdvogado, isProdutor, isNomade, isAdmin, loading } = useUserRole();
  const { isOwner } = useAdminAccess();
  const [activeTab, setActiveTab] = useState("perfil");

  const tabs = useMemo<TabDef[]>(() => [
    {
      value: "perfil",
      label: "Perfil",
      icon: Settings,
      roles: ["all"],
      content: <PerfilAdmin />,
    },
    {
      value: "escritorio",
      label: "Escritório",
      icon: Building2,
      roles: ["owner", "advogado"],
      content: <ConfiguracoesEscritorio />,
    },
    {
      value: "plano",
      label: "Meu Plano",
      icon: Crown,
      roles: ["all"],
      content: <PlanoUsuario />,
    },
    {
      value: "webhooks",
      label: "Webhooks",
      icon: Webhook,
      roles: ["owner"],
      content: <WebhooksPage />,
    },
    {
      value: "biometria",
      label: "Biometria",
      icon: ScanFace,
      roles: ["owner", "advogado"],
      content: <BiometriaConfigPage />,
    },
    {
      value: "dispositivos",
      label: "Dispositivos",
      icon: Radio,
      roles: ["owner"],
      content: <DispositivosConfigPage />,
    },
    {
      value: "amazon",
      label: "Amazon",
      icon: ShoppingCart,
      roles: ["owner"],
      content: <AmazonConfigPage />,
    },
    {
      value: "microfone",
      label: "Microfone",
      icon: Mic,
      roles: ["owner"],
      content: <MicrophoneHardwarePage />,
    },
    {
      value: "loja",
      label: "Minha Loja",
      icon: Store,
      roles: ["owner", "produtor", "nomade"],
      content: (
        <div className="space-y-8">
          <MeusProdutos />
          <EditorPaginaVendas />
        </div>
      ),
    },
  ], []);

  // Resolve current user's effective role key for tab filtering
  const userRoleKey = isOwner ? "owner" : isAdvogado ? "advogado" : isProdutor ? "produtor" : isNomade ? "nomade" : "other";

  const visibleTabs = useMemo(() => {
    return tabs.filter((tab) => {
      if (tab.roles.includes("all")) return true;
      if (isOwner || isAdmin) return true; // Proprietário/admin sees everything
      return tab.roles.includes(userRoleKey);
    });
  }, [tabs, isOwner, isAdmin, userRoleKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  if (isCliente) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Minha Conta</h1>
          <p className="text-muted-foreground text-sm">
            Perfil, plano e segurança da sua conta
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList
            className="bg-card border border-border w-full overflow-x-auto justify-start scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <TabsTrigger value="perfil" className="text-xs gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Meu Perfil
            </TabsTrigger>
            <TabsTrigger value="plano" className="text-xs gap-1.5">
              <Crown className="h-3.5 w-3.5" />
              Meu Plano
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <Suspense fallback={<TabFallback />}>
              <PerfilCliente />
            </Suspense>
          </TabsContent>

          <TabsContent value="plano">
            <Suspense fallback={<TabFallback />}>
              <PlanoUsuario />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-foreground">
          {isOwner ? "Comando Orion — Configurações" : "Meu Escritório & Configurações"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isOwner
            ? "Perfil, escritório, plano, integrações e controle total"
            : "Perfil, escritório, plano e integrações"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className="bg-card border border-border w-full overflow-x-auto justify-start scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1.5">
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <Suspense fallback={<TabFallback />}>
              {tab.content}
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
