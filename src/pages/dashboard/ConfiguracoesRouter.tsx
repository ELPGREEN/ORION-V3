import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, Settings, Building2, Crown, Webhook, ScanFace, Radio, ShoppingCart, Mic, Store } from "lucide-react";
import { lazy, Suspense, useState } from "react";
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

export default function ConfiguracoesRouter() {
  const { isCliente, loading } = useUserRole();
  const [activeTab, setActiveTab] = useState("perfil");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  if (isCliente) {
    return (
      <Suspense fallback={<TabFallback />}>
        <PerfilCliente />
      </Suspense>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-foreground">Meu Escritório & Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Perfil, escritório, plano e integrações
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border w-full overflow-x-auto justify-start scrollbar-hide"  style={{ WebkitOverflowScrolling: 'touch' }}>
          <TabsTrigger value="perfil" className="text-xs gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="escritorio" className="text-xs gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Escritório
          </TabsTrigger>
          <TabsTrigger value="plano" className="text-xs gap-1.5">
            <Crown className="h-3.5 w-3.5" />
            Meu Plano
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="text-xs gap-1.5">
            <Webhook className="h-3.5 w-3.5" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="biometria" className="text-xs gap-1.5">
            <ScanFace className="h-3.5 w-3.5" />
            Biometria
          </TabsTrigger>
          <TabsTrigger value="dispositivos" className="text-xs gap-1.5">
            <Radio className="h-3.5 w-3.5" />
            Dispositivos
          </TabsTrigger>
          <TabsTrigger value="amazon" className="text-xs gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" />
            Amazon
          </TabsTrigger>
          <TabsTrigger value="microfone" className="text-xs gap-1.5">
            <Mic className="h-3.5 w-3.5" />
            Microfone
          </TabsTrigger>
          <TabsTrigger value="loja" className="text-xs gap-1.5">
            <Store className="h-3.5 w-3.5" />
            Minha Loja
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <Suspense fallback={<TabFallback />}>
            <PerfilAdmin />
          </Suspense>
        </TabsContent>

        <TabsContent value="escritorio">
          <Suspense fallback={<TabFallback />}>
            <ConfiguracoesEscritorio />
          </Suspense>
        </TabsContent>

        <TabsContent value="plano">
          <Suspense fallback={<TabFallback />}>
            <PlanoUsuario />
          </Suspense>
        </TabsContent>

        <TabsContent value="webhooks">
          <Suspense fallback={<TabFallback />}>
            <WebhooksPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="biometria">
          <Suspense fallback={<TabFallback />}>
            <BiometriaConfigPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="dispositivos">
          <Suspense fallback={<TabFallback />}>
            <DispositivosConfigPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="amazon">
          <Suspense fallback={<TabFallback />}>
            <AmazonConfigPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="microfone">
          <Suspense fallback={<TabFallback />}>
            <MicrophoneHardwarePage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
