import { SEO } from "@/components/SEO";
import { Brain, Construction } from "lucide-react";

export default function RedeNeuralPage() {
  return (
    <div className="space-y-6">
      <SEO title="Rede Neural — ORION" description="Painel da rede neural do Orion" />
      <div>
        <h1 className="text-2xl font-serif text-foreground flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          Rede Neural
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Módulo em reimplementação com Gemini API oficial.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 border border-dashed border-border rounded-lg">
        <Construction className="h-12 w-12" />
        <p className="text-sm font-medium">Em breve — Nova arquitetura Gemini</p>
        <p className="text-xs max-w-md text-center">
          A rede neural está sendo reimplementada do zero usando a API oficial do Google Gemini 2.5 Flash
          para visão, voz e raciocínio.
        </p>
      </div>
    </div>
  );
}
