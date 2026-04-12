import { Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function MarketplaceModules() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Módulos do Marketplace</h1>
      </div>
      <Card className="bg-card/80 border-border/30">
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 text-primary/40 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Marketplace de módulos será reimplementado em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
