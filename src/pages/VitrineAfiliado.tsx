import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicMeta } from "@/components/DynamicMeta";
import { Search, ShoppingBag, Star, Package, ExternalLink, Share2, Tag, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
];

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const getInstallments = (cents: number) => {
  if (cents < 1000) return null;
  const months = cents >= 30000 ? 12 : 6;
  const installment = cents / months / 100;
  return `${months}x de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(installment)}`;
};

export default function VitrineAfiliado() {
  const { affiliateId } = useParams<{ affiliateId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Get affiliate profile
  const { data: affiliate } = useQuery({
    queryKey: ["vitrine-affiliate", affiliateId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", affiliateId!)
        .single();
      return data;
    },
    enabled: !!affiliateId,
  });

  // Get affiliate links with product details
  const { data: affiliateProducts, isLoading } = useQuery({
    queryKey: ["vitrine-products", affiliateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_links")
        .select("*, products(*)")
        .eq("affiliate_user_id", affiliateId!);
      if (error) throw error;
      // Only show products that are active
      return (data || []).filter((l: any) => l.products?.status === "active");
    },
    enabled: !!affiliateId,
  });

  const filteredProducts = useMemo(() => {
    if (!affiliateProducts) return [];
    if (!search) return affiliateProducts;
    const s = search.toLowerCase();
    return affiliateProducts.filter((l: any) =>
      l.products?.title?.toLowerCase().includes(s) ||
      l.products?.description?.toLowerCase().includes(s)
    );
  }, [affiliateProducts, search]);

  const affiliateName = affiliate?.full_name || "Afiliado";

  const handleShareVitrine = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link da vitrine copiado!");
  };

  // Navigate to the product's store page with the affiliate ref
  const handleViewProduct = (link: any) => {
    const product = link.products;
    if (product) {
      navigate(`/loja/${product.creator_id}/produto/${product.id}?ref=${link.hash}`);
    }
  };

  const handleBuyNow = (link: any) => {
    const product = link.products;
    if (product) {
      navigate(`/loja/${product.creator_id}/produto/${product.id}?ref=${link.hash}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DynamicMeta
        title={`Vitrine de ${affiliateName} | Produtos Recomendados`}
        description={`Produtos digitais recomendados por ${affiliateName}. Cursos, e-books e ferramentas.`}
        ogType="website"
      />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-8 text-center">
          {/* Avatar */}
          <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
            {affiliate?.avatar_url ? (
              <img src={affiliate.avatar_url} alt={affiliateName} className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {affiliateName[0]?.toUpperCase()}
              </span>
            )}
          </div>

          <Badge className="mb-3 gap-1.5 text-xs" variant="outline">
            <Tag className="h-3 w-3" />
            PRODUTOS RECOMENDADOS
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Vitrine de{" "}
            <span className="text-primary">{affiliateName}</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Produtos digitais selecionados e recomendados. Todos os links incluem suporte e garantia do produtor original.
          </p>

          <div className="flex justify-center gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={handleShareVitrine} className="gap-1.5">
              <Share2 className="h-3.5 w-3.5" /> Compartilhar
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} disponíve{filteredProducts.length !== 1 ? "is" : "l"}
        </p>
      </div>

      {/* Products Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="h-44 bg-muted" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-6 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="border-dashed border-2 border-border/40">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <Package className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                {search ? "Nenhum produto encontrado" : "Nenhum produto na vitrine ainda"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((link: any, idx: number) => {
              const product = link.products;
              if (!product) return null;
              return (
                <Card
                  key={link.id}
                  className="overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5"
                >
                  {/* Image */}
                  <div
                    className="relative h-44 overflow-hidden cursor-pointer"
                    onClick={() => handleViewProduct(link)}
                  >
                    <img
                      src={product.image_url || PLACEHOLDER_IMAGES[idx % PLACEHOLDER_IMAGES.length]}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    {product.category && (
                      <Badge className="absolute top-3 left-3 text-[10px]" variant="secondary">
                        {product.category}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
                      {product.title}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                    )}

                    {/* Rating */}
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                      ))}
                      <span className="text-[10px] ml-1 text-muted-foreground">4.9</span>
                    </div>

                    {/* Price */}
                    <div>
                      <p className="text-xl font-bold text-primary">{formatPrice(product.price_cents)}</p>
                      {getInstallments(product.price_cents) && (
                        <p className="text-[11px] text-muted-foreground">
                          ou {getInstallments(product.price_cents)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-1">
                      <Button
                        className="w-full gap-2 text-xs h-9"
                        size="sm"
                        onClick={() => handleBuyNow(link)}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Comprar Agora
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full gap-2 text-xs h-8 text-muted-foreground"
                        size="sm"
                        onClick={() => handleViewProduct(link)}
                      >
                        Ver Detalhes
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/30 bg-card/50">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Vitrine de <span className="text-foreground">{affiliateName}</span> • Powered by{" "}
            <span className="text-primary font-medium">ORION Platform</span>
          </p>
        </div>
      </div>
    </div>
  );
}
