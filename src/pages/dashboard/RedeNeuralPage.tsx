import { Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function RedeNeuralPage() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Rede Neural</h1>
      </div>
      <Card className="bg-card/80 border-border/30">
        <CardContent className="p-8 text-center">
          <Brain className="h-12 w-12 text-primary/40 mx-auto mb-4" />
          <p className="text-muted-foreground">
            O sistema neural está sendo reimplementado com a nova arquitetura Gemini.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            Visão, voz e raciocínio serão reativados em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
