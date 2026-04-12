import { SEO } from "@/components/SEO";
import { Package, Construction } from "lucide-react";

export default function MarketplaceModules() {
  return (
    <div className="space-y-6">
      <SEO title="Marketplace — ORION" description="Marketplace de módulos" />
      <div>
        <h1 className="text-2xl font-serif text-foreground flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          Marketplace de Módulos
        </h1>
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 border border-dashed border-border rounded-lg">
        <Construction className="h-12 w-12" />
        <p className="text-sm font-medium">Em breve</p>
      </div>
    </div>
  );
}
