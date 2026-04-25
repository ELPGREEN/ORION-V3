import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Store, Search, ShoppingBag, Users, ChevronRight, Loader2, Sparkles, Brain, Filter,
} from "lucide-react";
import { toast } from "sonner";
import MaestroStoreExplorer from "@/components/dashboard/MaestroStoreExplorer";

interface StoreInfo {
  creator_id: string;
  creator_name: string;
  avatar_url: string | null;
  product_count: number;
  categories: string[];
}

interface AffiliateVitrine {
  affiliate_user_id: string;
  affiliate_name: string;
  avatar_url: string | null;
  product_count: number;
}

export default function ExplorarLojas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [vitrines, setVitrines] = useState<AffiliateVitrine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Fetch active products grouped by creator
    const { data: products } = await supabase
      .from("products")
      .select("id, creator_id, category, product_type, title")
      .eq("status", "active");

    if (products && products.length > 0) {
      // Group by creator
      const creatorMap = new Map<string, { count: number; categories: Set<string> }>();
      products.forEach((p) => {
        const existing = creatorMap.get(p.creator_id) || { count: 0, categories: new Set<string>() };
        existing.count++;
        if (p.category) existing.categories.add(p.category);
        creatorMap.set(p.creator_id, existing);
      });

      // Fetch creator profiles
      const creatorIds = Array.from(creatorMap.keys());
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", creatorIds);

      const storeList: StoreInfo[] = creatorIds.map((cid) => {
        const profile = profiles?.find((p) => p.user_id === cid);
        const info = creatorMap.get(cid)!;
        return {
          creator_id: cid,
          creator_name: profile?.full_name || "Produtor",
          avatar_url: profile?.avatar_url || null,
          product_count: info.count,
          categories: Array.from(info.categories),
        };
      });

      setStores(storeList.sort((a, b) => b.product_count - a.product_count));
    }

    // Fetch affiliate vitrines
    const { data: affLinks } = await supabase
      .from("affiliate_links")
      .select("affiliate_user_id, id");

    if (affLinks && affLinks.length > 0) {
      const affMap = new Map<string, number>();
      affLinks.forEach((l) => {
        affMap.set(l.affiliate_user_id, (affMap.get(l.affiliate_user_id) || 0) + 1);
      });

      const affIds = Array.from(affMap.keys());
      const { data: affProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", affIds);

      const vitrineList: AffiliateVitrine[] = affIds.map((aid) => {
        const profile = affProfiles?.find((p) => p.user_id === aid);
        return {
          affiliate_user_id: aid,
          affiliate_name: profile?.full_name || "Afiliado",
          avatar_url: profile?.avatar_url || null,
          product_count: affMap.get(aid) || 0,
        };
      });

      setVitrines(vitrineList.sort((a, b) => b.product_count - a.product_count));
    }

    setLoading(false);
  };

  const handleAiRecommend = async () => {
    if (!user) return;
    setLoadingAi(true);
    try {
      // Get user's purchase history
      const { data: access } = await supabase
        .from("customer_access")
        .select("product_id, products(title, category)")
        .eq("user_id", user.id)
        .eq("is_active", true);

      const history = access?.map((a: any) => `${a.products?.title} (${a.products?.category || "geral"})`).join(", ") || "Nenhuma compra anterior";
      const categories = stores.flatMap((s) => s.categories).filter((v, i, a) => a.indexOf(v) === i).join(", ");

      const { data, error } = await supabase.functions.invoke("orion-produtor-ai", {
        body: {
          action: "recommend_products",
          context: `Histórico de compras: ${history}\nCategorias disponíveis: ${categories}\nTotal de lojas: ${stores.length}`,
        },
      });
      if (error) throw error;
      setAiRecommendation(data.result);
    } catch (err: any) {
      toast.error("Erro ao gerar recomendações: " + err.message);
    } finally {
      setLoadingAi(false);
    }
  };

  const filteredStores = stores.filter((s) => {
    const matchesSearch = !search || s.creator_name.toLowerCase().includes(search.toLowerCase()) || s.categories.some((c) => c.toLowerCase().includes(search.toLowerCase()));
    const matchesType = !filterType || s.categories.includes(filterType);
    return matchesSearch && matchesType;
  });

  const filteredVitrines = vitrines.filter((v) => {
    return !search || v.affiliate_name.toLowerCase().includes(search.toLowerCase());
  });

  const allCategories = Array.from(new Set(stores.flatMap((s) => s.categories))).filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border border-primary/15 bg-gradient-to-br from-card via-card to-primary/5 p-6">
        <p className="text-[10px] tracking-[0.3em] uppercase text-primary/60 mb-1">MARKETPLACE ORION</p>
        <h1 className="text-2xl font-serif text-foreground">Explorar Lojas & Vitrines</h1>
        <p className="text-sm text-muted-foreground mt-1">Descubra produtores e afiliados com produtos digitais incríveis.</p>
      </div>

      {/* Search + Filter + AI */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {allCategories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterType === null ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setFilterType(null)}
            >
              Todas
            </Button>
            {allCategories.slice(0, 5).map((cat) => (
              <Button
                key={cat}
                variant={filterType === cat ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setFilterType(filterType === cat ? null : cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Orion AI Recommendation */}
      {stores && stores.length > 0 && <MaestroStoreExplorer stores={stores} />}
      <div className="bg-card border border-primary/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-sm font-serif text-foreground">Orion: Me ajude a escolher</h3>
              <p className="text-[10px] text-muted-foreground">Recomendações personalizadas baseadas no seu perfil</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleAiRecommend} disabled={loadingAi} className="gap-1">
            {loadingAi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Recomendar
          </Button>
        </div>
        {aiRecommendation && (
          <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground whitespace-pre-wrap">
            {aiRecommendation}
          </div>
        )}
      </div>

      {/* Stores */}
      <div>
        <h2 className="text-lg font-serif text-foreground mb-4 flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          Lojas de Produtores
          <Badge variant="secondary" className="text-[9px]">{filteredStores.length}</Badge>
        </h2>
        {filteredStores.length === 0 ? (
          <div className="bg-card border border-border p-8 text-center">
            <Store className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma loja encontrada.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStores.map((store) => (
              <button
                key={store.creator_id}
                onClick={() => navigate(`/loja/${store.creator_id}`)}
                className="bg-card border border-border p-4 text-left hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {store.avatar_url ? (
                      <img src={store.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {store.creator_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {store.product_count} produto{store.product_count !== 1 ? "s" : ""}
                    </p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {store.categories.slice(0, 2).map((c) => (
                        <Badge key={c} variant="secondary" className="text-[8px] px-1 py-0">{c}</Badge>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Affiliate Vitrines */}
      {filteredVitrines.length > 0 && (
        <div>
          <h2 className="text-lg font-serif text-foreground mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Vitrines de Afiliados
            <Badge variant="secondary" className="text-[9px]">{filteredVitrines.length}</Badge>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredVitrines.map((v) => (
              <button
                key={v.affiliate_user_id}
                onClick={() => navigate(`/vitrine/${v.affiliate_user_id}`)}
                className="bg-card border border-border p-4 text-left hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {v.avatar_url ? (
                      <img src={v.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {v.affiliate_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {v.product_count} produto{v.product_count !== 1 ? "s" : ""} promovido{v.product_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
