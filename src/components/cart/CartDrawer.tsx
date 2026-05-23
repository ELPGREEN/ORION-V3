import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAffiliateRef } from "@/components/AffiliateTracker";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { toast } from "sonner";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function CartDrawer() {
  const { items, removeFromCart, updateQuantity, clearCart, totalItems, totalValue, isOpen, setIsOpen } = useCart();
  const { creatorId } = useParams<{ creatorId: string }>();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Faça login para finalizar a compra");
        setLoading(false);
        return;
      }

      const affiliateRef = getAffiliateRef();

      const { data, error } = await supabase.functions.invoke("stripe-api", {
        body: {
          action: "product_checkout",
          items: items.map(i => ({ id: i.id, quantity: i.quantity })),
          creator_id: creatorId,
          affiliate_ref: affiliateRef,
        },
      });

      if (error) throw error;
      if (data?.url) {
        clearCart();
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err.message || "Erro ao iniciar checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Carrinho ({totalItems})
          </SheetTitle>
          <SheetDescription>Seus produtos selecionados</SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <ShoppingBag className="h-16 w-16 opacity-20" />
            <p>Seu carrinho está vazio</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 rounded-xl bg-card border border-border/40">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.title} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-sm font-bold text-primary mt-1">{formatPrice(item.price_cents)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-7 w-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label="Diminuir quantidade"
                        title="Diminuir quantidade"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-7 w-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label="Aumentar quantidade"
                        title="Aumentar quantidade"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors self-start p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                    aria-label="Remover item"
                    title="Remover item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-border/40 pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-primary">{formatPrice(totalValue)}</span>
              </div>
              <Button className="w-full h-12 text-base gap-2" size="lg" onClick={handleCheckout} disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
                {loading ? "Processando..." : "Finalizar Compra"}
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={clearCart} disabled={loading}>
                Limpar carrinho
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
