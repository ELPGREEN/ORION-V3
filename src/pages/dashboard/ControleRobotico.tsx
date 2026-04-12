import { Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ControleRobotico() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Controle Robótico</h1>
      </div>
      <Card className="bg-card/80 border-border/30">
        <CardContent className="p-8 text-center">
          <Bot className="h-12 w-12 text-primary/40 mx-auto mb-4" />
          <p className="text-muted-foreground">
            O controle robótico será reimplementado com a nova arquitetura.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
