import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { DynamicMeta } from "@/components/DynamicMeta";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AffiliateTracker } from "@/components/AffiliateTracker";
import { Search, Filter, ShoppingCart, Share2, ArrowRight, Tag, Star, Package, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
// [REMOVED] import { OrionStoreAssistant } from "@/components/store/OrionStoreAssistant";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800",
];

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const getInstallments = (cents: number) => {
  if (cents < 1000) return null;
  const months = cents >= 30000 ? 12 : 6;
  const installment = cents / months / 100;
  return `${months}x de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(installment)}`;
};

export default function Loja() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const { addToCart, totalItems, setIsOpen } = useCart();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  const { data: creator } = useQuery({
    queryKey: ["store-creator", creatorId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", creatorId!).single();
      return data;
    },
    enabled: !!creatorId,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["store-products", creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("creator_id", creatorId!)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!creatorId,
  });

  const categories = useMemo(() => {
    if (!products) return [];
    const cats = products.map((p) => p.category).filter(Boolean) as string[];
    return [...new Set(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let result = [...products];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(s) || (p.description && p.description.toLowerCase().includes(s)));
    }
    if (categoryFilter !== "all") result = result.filter((p) => p.category === categoryFilter);
    if (sortBy === "price-asc") result.sort((a, b) => a.price_cents - b.price_cents);
    else if (sortBy === "price-desc") result.sort((a, b) => b.price_cents - a.price_cents);
    return result;
  }, [products, search, categoryFilter, sortBy]);

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/loja/${creatorId}`);
    toast.success("Link da loja copiado!");
  };

  const storeName = creator?.full_name || "Loja";

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060610, #0a0a18, #060610)" }}>
      <DynamicMeta
        title={`Loja de ${storeName} | Produtos Digitais`}
        description={`Cursos, e-books e ferramentas profissionais de ${storeName}. Acesse agora!`}
        ogType="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Loja de ${storeName}`,
          numberOfItems: filteredProducts.length,
          itemListElement: filteredProducts.slice(0, 10).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Product",
              name: p.title,
              description: p.description,
              offers: { "@type": "Offer", price: (p.price_cents / 100).toFixed(2), priceCurrency: "BRL" },
            },
          })),
        }}
      />

      <AffiliateTracker />
      <CartDrawer />

      {/* Hero - Orion Futuristic */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, hsl(var(--primary),0.05) 0%, transparent 50%)"
        }} />
        {/* Grid lines */}
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(212,175,55,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
        {/* Scanlines */}
        <div className="absolute inset-0" style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary),0.01) 2px, hsl(var(--primary),0.01) 4px)"
        }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-10 text-center">
          <Badge className="mb-4 gap-1.5 text-xs font-mono tracking-widest uppercase"
            style={{ background: "rgba(212,175,55,0.1)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.25)" }}>
            <Tag className="h-3 w-3" />
            PRODUTOS EXCLUSIVOS
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-3" style={{ color: "#D4AF37", textShadow: "0 0 30px rgba(212,175,55,0.2)" }}>
            Loja de Produtos{" "}
            <span style={{ color: "#3B82F6", textShadow: "0 0 25px hsl(var(--primary),0.3)" }}>Digitais</span>
          </h1>
          <p className="max-w-2xl mx-auto text-sm md:text-base" style={{ color: "rgba(255,255,255,0.45)" }}>
            Cursos, e-books e ferramentas profissionais de{" "}
            <span className="font-medium" style={{ color: "#D4AF37" }}>{storeName}</span> para impulsionar seus resultados.
          </p>

          {/* Floating cart button */}
          {totalItems > 0 && (
            <Button className="mt-6 gap-2" onClick={() => setIsOpen(true)}
              style={{ background: "linear-gradient(135deg, #D4AF37, #B8962E)", color: "#000" }}>
              <ShoppingCart className="h-4 w-4" />
              Carrinho ({totalItems})
            </Button>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3B82F6]/20 to-transparent" />
      </div>

      {/* Filters Bar */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar produtos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-border/50" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] bg-card border-border/50">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todos os Tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] bg-card border-border/50">
                <SelectValue placeholder="Mais Recentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais Recentes</SelectItem>
                <SelectItem value="price-asc">Menor Preço</SelectItem>
                <SelectItem value="price-desc">Maior Preço</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} encontrado{filteredProducts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse bg-card border-border/30">
                <div className="h-48 bg-muted" />
                <CardContent className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-6 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="border-dashed border-2 border-border/40">
            <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
              <Package className="h-16 w-16 text-muted-foreground/30" />
              <p className="text-muted-foreground text-lg">Nenhum produto encontrado</p>
              {search && (
                <Button variant="outline" size="sm" onClick={() => setSearch("")}>Limpar busca</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product, idx) => (
              <Card
                key={product.id}
                className="group overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{
                  backgroundColor: "rgba(10,10,18,0.8)",
                  border: "1px solid rgba(212,175,55,0.1)",
                  boxShadow: "0 0 15px rgba(0,0,0,0.3)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.border = "1px solid rgba(212,175,55,0.3)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(212,175,55,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.border = "1px solid rgba(212,175,55,0.1)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 15px rgba(0,0,0,0.3)";
                }}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => navigate(`/loja/${creatorId}/produto/${product.id}`)}>
                  <img
                    src={product.image_url || PLACEHOLDER_IMAGES[idx % PLACEHOLDER_IMAGES.length]}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {product.category && (
                    <Badge className="absolute top-3 left-3 text-[10px] gap-1"
                      style={{ background: "rgba(10,10,15,0.8)", border: "1px solid rgba(212,175,55,0.3)", color: "#D4AF37" }}>
                      <Package className="h-3 w-3" />
                      {product.category}
                    </Badge>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShare(); }}
                    className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(10,10,15,0.8)", border: "1px solid hsl(var(--primary),0.2)" }}
                  >
                    <Share2 className="h-3.5 w-3.5" style={{ color: "#3B82F6" }} />
                  </button>
                </div>

                {/* Content */}
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2" style={{ color: "rgba(255,255,255,0.9)" }}>{product.title}</h3>
                  {product.description && (
                    <p className="text-xs line-clamp-2" style={{ color: "rgba(255,255,255,0.35)" }}>{product.description}</p>
                  )}

                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3 w-3" style={{ fill: "#D4AF37", color: "#D4AF37" }} />
                    ))}
                    <span className="text-[10px] ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>4.9</span>
                  </div>

                  {/* Price */}
                  <div className="space-y-0.5">
                    <p className="text-xl font-bold font-mono" style={{ color: "#D4AF37", textShadow: "0 0 10px rgba(212,175,55,0.2)" }}>{formatPrice(product.price_cents)}</p>
                    {getInstallments(product.price_cents) && (
                      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>ou {getInstallments(product.price_cents)}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-1">
                    <Button className="w-full gap-2 text-xs h-9" size="sm" onClick={() => addToCart(product)}
                      style={{ background: "linear-gradient(135deg, #D4AF37, #B8962E)", color: "#000", fontWeight: 600 }}>
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Adicionar ao Carrinho
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full gap-2 text-xs h-8"
                      size="sm"
                      style={{ color: "hsl(var(--primary),0.7)" }}
                      onClick={() => navigate(`/loja/${creatorId}/produto/${product.id}`)}
                    >
                      Ver Detalhes
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>


      {/* Footer */}
      <div className="border-t border-border/30 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Loja de <span className="text-foreground">{storeName}</span> • Powered by{" "}
            <span className="text-primary font-medium">ELP Platform</span>
          </p>
        </div>
      </div>

      {/* Floating cart button */}
      {totalItems > 0 && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-2xl hover:scale-110 transition-transform flex items-center justify-center z-50"
        >
          <ShoppingBag className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {totalItems}
          </span>
        </button>
      )}
    </div>
  );
}
