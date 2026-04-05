import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Sparkles, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReformulacaoTab } from "@/components/reformulacao/ReformulacaoTab";
import { SituacoesTab } from "@/components/reformulacao/SituacoesTab";

export default function ReformulacaoJuridica() {
  const [activeTab, setActiveTab] = useState("reformulacao");

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-foreground mb-1 flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-primary" />
            Reformulação Jurídica
          </h1>
          <p className="text-sm text-muted-foreground">
            Reformule textos e gere situações jurídicas com IA neural especializada.
          </p>
        </div>
        <Badge variant="outline" className="text-xs border-primary/30 text-primary shrink-0">
          <Sparkles className="h-3 w-3 mr-1" />
          Neural IA
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="reformulacao" className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:text-primary">
            <RefreshCw className="h-3.5 w-3.5" />
            Reformulação
          </TabsTrigger>
          <TabsTrigger value="situacoes" className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:text-primary">
            <Lightbulb className="h-3.5 w-3.5" />
            Situações Jurídicas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reformulacao" className="mt-0">
          <ReformulacaoTab />
        </TabsContent>

        <TabsContent value="situacoes" className="mt-0">
          <SituacoesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
