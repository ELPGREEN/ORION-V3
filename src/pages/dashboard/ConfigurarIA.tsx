import { SEO } from "@/components/SEO";
import { Settings, Construction } from "lucide-react";

export default function ConfigurarIA() {
  return (
    <div className="space-y-6">
      <SEO title="Configurar IA — ORION" description="Configurações da inteligência artificial" />
      <div>
        <h1 className="text-2xl font-serif text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Configurar IA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Configurações de voz, visão e comportamento do Orion</p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 border border-dashed border-border rounded-lg">
        <Construction className="h-12 w-12" />
        <p className="text-sm font-medium">Em reimplementação com Gemini API</p>
      </div>
    </div>
  );
}
