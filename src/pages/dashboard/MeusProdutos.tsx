import { useState, useRef } from "react";
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
import { Plus, Package, Edit, Archive, Eye, Trash2, Save, Brain, Loader2, Sparkles, ImagePlus, X } from "lucide-react";
import { ProductFileManager } from "@/components/dashboard/product/ProductFileManager";
import { ProductModuleManager } from "@/components/dashboard/product/ProductModuleManager";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const emptyForm = { title: "", description: "", price: "", commission: "10", category: "", product_type: "digital_download", image_url: "" };

const productTypes = [
  { value: "digital_download", label: "Download Digital" },
  { value: "course", label: "Curso Online" },
  { value: "ebook", label: "E-book" },
  { value: "template", label: "Template" },
  { value: "membership", label: "Assinatura" },
];

export default function MeusProdutos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
        product_type: form.product_type,
        image_url: form.image_url || null,
        slug: slugify(form.title) + "-" + Date.now().toString(36),
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products"] });
      closeDialog();
      toast.success("Produto criado com sucesso!");
    },
    onError: () => toast.error("Erro ao criar produto"),
  });

  const updateProduct = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { error } = await supabase
        .from("products")
        .update({
          title: form.title,
          description: form.description,
          price_cents: Math.round(parseFloat(form.price) * 100),
          commission_percent: parseFloat(form.commission),
          category: form.category || null,
          product_type: form.product_type,
          image_url: form.image_url || null,
        })
        .eq("id", editingId)
        .eq("creator_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products"] });
      closeDialog();
      toast.success("Produto atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar produto"),
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

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id).eq("creator_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products"] });
      toast.success("Produto removido!");
    },
    onError: () => toast.error("Erro ao remover produto"),
  });

  const closeDialog = () => { setOpen(false); setEditingId(null); setForm(emptyForm); };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      title: p.title || "",
      description: p.description || "",
      price: (p.price_cents / 100).toFixed(2),
      commission: String(p.commission_percent || 10),
      category: p.category || "",
      product_type: p.product_type || "digital_download",
      image_url: p.image_url || "",
    });
    setOpen(true);
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const handleSave = () => {
    if (editingId) {
      updateProduct.mutate();
    } else {
      createProduct.mutate();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("product-files")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("product-files").getPublicUrl(path);
      setForm(f => ({ ...f, image_url: urlData.publicUrl }));
      toast.success("Imagem enviada!");
    } catch {
      toast.error("Erro ao enviar imagem");
    }
    setUploadingImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const callOrion = async (action: string) => {
    setAiLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("orion-produtor-ai", {
        body: {
          action,
          product_title: form.title,
          product_description: form.description,
          product_category: form.category,
          product_type: form.product_type,
        },
      });
      if (error) throw error;
      if (action === "generate_description") {
        setForm((f) => ({ ...f, description: data.result }));
      } else {
        toast.info(data.result, { duration: 10000 });
      }
    } catch {
      toast.error("Erro ao consultar Orion");
    } finally {
      setAiLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-emerald-500/20 text-emerald-400",
    archived: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Produtos</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus produtos digitais</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else openCreate(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Produto" : "Criar Produto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Título do produto" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

              {/* Image upload */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Imagem do Produto</label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {form.image_url ? (
                  <div className="relative group">
                    <img
                      src={form.image_url}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-md border border-border/50"
                    />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image_url: "" }))}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute bottom-2 right-2 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <ImagePlus className="h-3 w-3" /> Trocar
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-32 border-dashed border-2 gap-2 flex-col"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Clique para enviar uma imagem</span>
                        <span className="text-[10px] text-muted-foreground/60">Qualquer tamanho — será ajustada automaticamente</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              <Select value={form.product_type} onValueChange={(v) => setForm(f => ({ ...f, product_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Tipo de produto" /></SelectTrigger>
                <SelectContent>
                  {productTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-1">
                <Textarea placeholder="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} />
                <div className="flex gap-1">
                  <Button
                    type="button" size="sm" variant="ghost"
                    onClick={() => callOrion("generate_description")}
                    disabled={!form.title || !!aiLoading}
                    className="text-xs gap-1"
                  >
                    {aiLoading === "generate_description" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                    Orion: Gerar Descrição
                  </Button>
                  <Button
                    type="button" size="sm" variant="ghost"
                    onClick={() => callOrion("suggest_price")}
                    disabled={!form.title || !!aiLoading}
                    className="text-xs gap-1"
                  >
                    {aiLoading === "suggest_price" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Sugerir Preço
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Preço (R$)" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                <Input placeholder="Comissão (%)" type="number" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} />
              </div>
              <Input placeholder="Categoria" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />

              {/* File manager for existing products */}
              {editingId && <ProductFileManager productId={editingId} />}

              {/* Module manager for courses */}
              {editingId && form.product_type === "course" && (
                <>
                  <ProductModuleManager productId={editingId} />
                  <Button
                    type="button" size="sm" variant="ghost"
                    onClick={() => callOrion("generate_modules")}
                    disabled={!form.title || !!aiLoading}
                    className="text-xs gap-1"
                  >
                    {aiLoading === "generate_modules" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                    Orion: Sugerir Módulos
                  </Button>
                </>
              )}

              <Button
                onClick={handleSave}
                disabled={!form.title || !form.price || createProduct.isPending || updateProduct.isPending}
                className="w-full gap-2"
              >
                <Save className="h-4 w-4" />
                {editingId ? "Salvar Alterações" : "Criar Produto"}
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
            <Button variant="outline" onClick={openCreate}>Criar primeiro produto</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p: any) => (
            <Card key={p.id} className="bg-card/80 backdrop-blur-sm border-border/40">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">{p.title}</CardTitle>
                    <Badge variant="outline" className="text-xs mt-1">
                      {productTypes.find(t => t.value === p.product_type)?.label || p.product_type}
                    </Badge>
                  </div>
                  <Badge className={statusColors[p.status] || ""}>{p.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-primary font-bold">R$ {(p.price_cents / 100).toFixed(2)}</span>
                  <span className="text-muted-foreground">{p.commission_percent}% comissão</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="gap-1">
                    <Edit className="h-3 w-3" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleStatus.mutate({ id: p.id, status: p.status })}>
                    {p.status === "active" ? <><Archive className="h-3 w-3 mr-1" /> Arquivar</> : <><Eye className="h-3 w-3 mr-1" /> Ativar</>}
                  </Button>
                  {p.status === "draft" && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteProduct.mutate(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
