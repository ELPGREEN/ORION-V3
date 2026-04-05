import { useState, lazy, Suspense, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, BookUser, BarChart3 } from "lucide-react";
import { Loader2 } from "lucide-react";

const CRMPipeline = lazy(() => import("./CRMPipeline"));
const ClientesPage = lazy(() => import("./ClientesPage"));
const ContatosPage = lazy(() => import("./ContatosPage"));

const TabFallback = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

export default function CRMClientes() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("pipeline");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["pipeline", "clientes", "contatos"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-foreground">CRM & Clientes</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie pipeline, cadastros e contatos em um só lugar
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="pipeline" className="text-xs gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="clientes" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="contatos" className="text-xs gap-1.5">
            <BookUser className="h-3.5 w-3.5" />
            Contatos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <Suspense fallback={<TabFallback />}>
            <CRMPipeline />
          </Suspense>
        </TabsContent>

        <TabsContent value="clientes">
          <Suspense fallback={<TabFallback />}>
            <ClientesPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="contatos">
          <Suspense fallback={<TabFallback />}>
            <ContatosPage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
