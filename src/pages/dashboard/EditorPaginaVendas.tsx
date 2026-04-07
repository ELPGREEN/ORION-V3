import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Loader2 } from "lucide-react";
import SalesPageEditor from "@/components/dashboard/BlockEditor/SalesPageEditor";

export default function EditorPaginaVendas() {
  const { user } = useAuth();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["my-products-for-editor", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, status")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!products?.length) {
    return (
      <Card className="border-dashed border-2 border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <Package className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Crie um produto antes de editar a página de vendas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Editor de Página de Vendas</h1>
        <p className="text-muted-foreground text-sm">Crie páginas de vendas profissionais com editor visual</p>
      </div>

      <div className="max-w-sm">
        <Select value={selectedProductId || ""} onValueChange={setSelectedProductId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um produto" />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title} ({p.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProductId && (
        <SalesPageEditor productId={selectedProductId} />
      )}
    </div>
  );
}
