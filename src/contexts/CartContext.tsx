import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { toast } from "sonner";

export type CartItem = {
  id: string;
  title: string;
  price_cents: number;
  image_url?: string | null;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (product: { id: string; title: string; price_cents: number; image_url?: string | null }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalValue: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "elp-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback((product: { id: string; title: string; price_cents: number; image_url?: string | null }) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        toast.success("Quantidade atualizada no carrinho!");
        return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      toast.success(`${product.title} adicionado ao carrinho!`);
      return [...prev, { id: product.id, title: product.title, price_cents: product.price_cents, image_url: product.image_url, quantity: 1 }];
    });
    setIsOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity } : i));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    toast.success("Carrinho limpo!");
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalValue = items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalValue, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
