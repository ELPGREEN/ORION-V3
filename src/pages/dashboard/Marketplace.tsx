import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingBag, Link2, ExternalLink } from "lucide-react";

export default function Marketplace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["marketplace-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: myLinks } = useQuery({
    queryKey: ["my-affiliate-links", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_links")
        .select("*")
        .eq("affiliate_user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createLink = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("affiliate_links").insert({
        affiliate_user_id: user!.id,
        product_id: productId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-affiliate-links"] });
      toast.success("Link de afiliado criado!");
    },
    onError: () => toast.error("Erro ao criar link"),
  });

  const linkedProductIds = new Set(myLinks?.map((l: any) => l.product_id) || []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
        <p className="text-muted-foreground text-sm">Encontre produtos para promover como afiliado</p>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : !products?.length ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum produto disponível no momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p: any) => {
            const isLinked = linkedProductIds.has(p.id);
            const link = myLinks?.find((l: any) => l.product_id === p.id);
            return (
              <Card key={p.id} className="bg-card/80 backdrop-blur-sm border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{p.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.description && <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary font-bold">R$ {(p.price_cents / 100).toFixed(2)}</span>
                    <Badge variant="outline">{p.commission_percent}% comissão</Badge>
                  </div>
                  {isLinked ? (
                    <div className="space-y-2">
                      <Badge className="bg-green-500/20 text-green-400">Vinculado</Badge>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        <Link2 className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">?ref={link?.hash}</span>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" className="w-full gap-2" onClick={() => createLink.mutate(p.id)} disabled={!user || p.creator_id === user.id}>
                      <ExternalLink className="h-3 w-3" /> Tornar-se Afiliado
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
