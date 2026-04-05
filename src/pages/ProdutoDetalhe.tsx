import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { DynamicMeta } from "@/components/DynamicMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, Star, Package, Shield, Zap } from "lucide-react";

const PLACEHOLDER = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const getInstallments = (cents: number) => {
  if (cents < 1000) return null;
  const months = cents >= 30000 ? 12 : 6;
  const installment = cents / months / 100;
  return `ou ${months}x de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(installment)} sem juros`;
};

export default function ProdutoDetalhe() {
  const { creatorId, productId } = useParams<{ creatorId: string; productId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const { data: creator } = useQuery({
    queryKey: ["store-creator", creatorId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", creatorId!).single();
      return data;
    },
    enabled: !!creatorId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando produto...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Package className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-muted-foreground text-lg">Produto não encontrado</p>
        <Button variant="outline" onClick={() => navigate(`/loja/${creatorId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar à loja
        </Button>
      </div>
    );
  }

  const storeName = creator?.full_name || "Loja";

  return (
    <div className="min-h-screen bg-background">
      <DynamicMeta
        title={`${product.title} | ${storeName}`}
        description={product.description || `${product.title} - Produto digital exclusivo`}
        image={product.image_url || PLACEHOLDER}
        ogType="product"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          description: product.description,
          image: product.image_url || PLACEHOLDER,
          offers: {
            "@type": "Offer",
            price: (product.price_cents / 100).toFixed(2),
            priceCurrency: "BRL",
            availability: "https://schema.org/InStock",
          },
        }}
      />

      {/* Top bar */}
      <div className="border-b border-border/30 bg-card/50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => navigate(`/loja/${creatorId}`)}>
            <ArrowLeft className="h-4 w-4" /> Voltar à loja de {storeName}
          </Button>
        </div>
      </div>

      {/* Product content */}
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden bg-card border border-border/30">
            <img
              src={product.image_url || PLACEHOLDER}
              alt={product.title}
              className="w-full aspect-square object-cover"
            />
            {product.category && (
              <Badge className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm text-foreground border-border/50 gap-1">
                <Package className="h-3 w-3" />
                {product.category}
              </Badge>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            {product.category && (
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{product.category}</p>
            )}

            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
              {product.title}
            </h1>

            {/* Rating decorativo */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">(4.9) • Produto digital</span>
            </div>

            {/* Price */}
            <div className="space-y-1">
              <p className="text-4xl font-bold text-primary">{formatPrice(product.price_cents)}</p>
              {getInstallments(product.price_cents) && (
                <p className="text-sm text-muted-foreground">{getInstallments(product.price_cents)}</p>
              )}
            </div>

            {/* CTA */}
            <Button
              size="lg"
              className="w-full md:w-auto px-12 h-14 text-base gap-2"
              onClick={() => addToCart(product)}
            >
              <ShoppingCart className="h-5 w-5" />
              Adicionar ao Carrinho
            </Button>

            {/* Trust signals */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-4 w-4 text-primary" />
                Acesso imediato
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                Garantia 7 dias
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <Card className="border-border/30">
                <CardContent className="p-5">
                  <h2 className="font-semibold text-foreground mb-2">Descrição</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/30 bg-card/50 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Loja de <span className="text-foreground">{storeName}</span> • Powered by{" "}
            <span className="text-primary font-medium">ELP Platform</span>
          </p>
        </div>
      </div>
    </div>
  );
}
