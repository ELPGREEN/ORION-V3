import { useState, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTodo, Calendar, Loader2 } from "lucide-react";

const TarefasContent = lazy(() => import("./TarefasContent"));
const PrazosCalculadora = lazy(() => import("./PrazosCalculadora"));

const TabFallback = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

export default function TarefasPage() {
  const [activeTab, setActiveTab] = useState("tarefas");

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
          <ListTodo className="h-6 w-6 text-primary" />
          Tarefas & Prazos
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gerencie tarefas do escritório e calcule prazos processuais.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="tarefas" className="text-xs gap-1.5">
            <ListTodo className="h-3.5 w-3.5" />
            Tarefas
          </TabsTrigger>
          <TabsTrigger value="prazos" className="text-xs gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Prazos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tarefas">
          <Suspense fallback={<TabFallback />}>
            <TarefasContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="prazos">
          <Suspense fallback={<TabFallback />}>
            <PrazosCalculadora />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
