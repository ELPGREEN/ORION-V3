import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  BookOpen, Download, FileText, Play, Lock, Search, Brain, Loader2, Send,
} from "lucide-react";

export default function MeusAcessos() {
  const { user } = useAuth();
  const [orionQuestion, setOrionQuestion] = useState("");
  const [orionAnswer, setOrionAnswer] = useState<string | null>(null);
  const [orionLoading, setOrionLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const { data: accesses, isLoading } = useQuery({
    queryKey: ["customer-access", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_access")
        .select("*, products(*)")
        .eq("user_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: productFiles } = useQuery({
    queryKey: ["access-files", selectedProduct],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_files")
        .select("*")
        .eq("product_id", selectedProduct!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProduct,
  });

  const { data: productModules } = useQuery({
    queryKey: ["access-modules", selectedProduct],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_modules")
        .select("*")
        .eq("product_id", selectedProduct!)
        .eq("is_published", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProduct,
  });

  const selectedProductData = accesses?.find((a: any) => a.product_id === selectedProduct)?.products;

  const askOrion = async () => {
    if (!orionQuestion || !selectedProductData) return;
    setOrionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("orion-produtor-ai", {
        body: {
          action: "product_faq",
          product_title: selectedProductData.title,
          product_description: selectedProductData.description,
          context: orionQuestion,
        },
      });
      if (error) throw error;
      setOrionAnswer(data.result);
    } catch {
      toast.error("Erro ao consultar Orion");
    } finally {
      setOrionLoading(false);
    }
  };

  const typeIcons: Record<string, any> = {
    course: BookOpen,
    digital_download: Download,
    ebook: FileText,
    template: FileText,
    membership: Lock,
  };

  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meus Acessos</h1>
        <p className="text-muted-foreground text-sm">Produtos que você comprou</p>
      </div>

      {!accesses?.length ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Lock className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum produto adquirido ainda</p>
          </CardContent>
        </Card>
      ) : !selectedProduct ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accesses.map((access: any) => {
            const p = access.products;
            const Icon = typeIcons[p?.product_type] || FileText;
            return (
              <Card
                key={access.id}
                className="bg-card/80 border-border/40 hover:border-primary/40 cursor-pointer transition-all"
                onClick={() => setSelectedProduct(access.product_id)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{p?.title}</h3>
                      <Badge variant="outline" className="text-xs mt-1">{p?.product_type || "digital"}</Badge>
                    </div>
                  </div>
                  {p?.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  )}
                  <Button size="sm" variant="outline" className="w-full gap-1">
                    <Play className="h-3 w-3" /> Acessar Conteúdo
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedProduct(null); setOrionAnswer(null); }}>
            ← Voltar
          </Button>

          <div>
            <h2 className="text-xl font-bold text-foreground">{selectedProductData?.title}</h2>
            {selectedProductData?.description && (
              <p className="text-sm text-muted-foreground mt-1">{selectedProductData.description}</p>
            )}
          </div>

          {/* Files */}
          {productFiles && productFiles.length > 0 && (
            <Card className="bg-card/80 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" /> Arquivos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {productFiles.map((f: any) => (
                  <a
                    key={f.id}
                    href={f.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground flex-1 truncate">{f.file_name}</span>
                    <Download className="h-3 w-3 text-muted-foreground" />
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Modules */}
          {productModules && productModules.length > 0 && (
            <Card className="bg-card/80 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> Módulos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {productModules.map((m: any, i: number) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{m.title}</p>
                      {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                    </div>
                    {m.content_url && (
                      <a href={m.content_url} target="_blank" rel="noopener noreferrer">
                        <Play className="h-4 w-4 text-primary" />
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Orion FAQ */}
          <Card className="bg-card/80 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" /> Perguntar ao Orion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {orionAnswer && (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap p-3 rounded-lg bg-muted/50">
                  {orionAnswer}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Dúvida sobre o produto..."
                  value={orionQuestion}
                  onChange={(e) => setOrionQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askOrion()}
                />
                <Button size="sm" onClick={askOrion} disabled={orionLoading || !orionQuestion}>
                  {orionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
