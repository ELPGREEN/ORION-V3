import { SEO } from "@/components/SEO";
import { Bot, Construction } from "lucide-react";

export default function ControleRobotico() {
  return (
    <div className="space-y-6">
      <SEO title="Controle Robótico — ORION" description="Controle de robôs e automação" />
      <div>
        <h1 className="text-2xl font-serif text-foreground flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          Controle Robótico
        </h1>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 border border-dashed border-border rounded-lg">
        <Construction className="h-12 w-12" />
        <p className="text-sm font-medium">Módulo em reimplementação</p>
      </div>
    </div>
  );
}
