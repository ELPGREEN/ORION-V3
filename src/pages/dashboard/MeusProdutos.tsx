import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Package, Edit, Archive, Eye } from "lucide-react";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function MeusProdutos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "", commission: "10", category: "" });

  const { data: products, isLoading } = useQuery({
    queryKey: ["my-products", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").insert({
        creator_id: user!.id,
        title: form.title,
        description: form.description,
        price_cents: Math.round(parseFloat(form.price) * 100),
        commission_percent: parseFloat(form.commission),
        category: form.category || null,
        slug: slugify(form.title) + "-" + Date.now().toString(36),
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products"] });
      setOpen(false);
      setForm({ title: "", description: "", price: "", commission: "10", category: "" });
      toast.success("Produto criado com sucesso!");
    },
    onError: () => toast.error("Erro ao criar produto"),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "archived" : "active";
      const { error } = await supabase.from("products").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products"] });
      toast.success("Status atualizado!");
    },
  });

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-green-500/20 text-green-400",
    archived: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Produtos</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus produtos digitais</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Produto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Produto</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Título do produto" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <Textarea placeholder="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Preço (R$)" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                <Input placeholder="Comissão (%)" type="number" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} />
              </div>
              <Input placeholder="Categoria" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
              <Button onClick={() => createProduct.mutate()} disabled={!form.title || !form.price} className="w-full">
                Criar Produto
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : !products?.length ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum produto criado ainda</p>
            <Button variant="outline" onClick={() => setOpen(true)}>Criar primeiro produto</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p: any) => (
            <Card key={p.id} className="bg-card/80 backdrop-blur-sm border-border/40">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-semibold">{p.title}</CardTitle>
                  <Badge className={statusColors[p.status] || ""}>{p.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-primary font-bold">R$ {(p.price_cents / 100).toFixed(2)}</span>
                  <span className="text-muted-foreground">{p.commission_percent}% comissão</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleStatus.mutate({ id: p.id, status: p.status })}>
                    {p.status === "active" ? <><Archive className="h-3 w-3 mr-1" /> Arquivar</> : <><Eye className="h-3 w-3 mr-1" /> Ativar</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
