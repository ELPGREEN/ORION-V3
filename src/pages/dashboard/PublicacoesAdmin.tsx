import { useState, useEffect, useCallback } from "react";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Calendar,
  Tag,
  Search,
  X,
  Save,
  Image as ImageIcon,
  LayoutGrid,
  LayoutList,
  SplitSquareHorizontal,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
import MaestroEditorialAssistant from "@/components/publicacoes/MaestroEditorialAssistant";
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { PublicacaoEditor } from "@/components/publicacoes/PublicacaoEditor";
import { AssistentesEditoriais } from "@/components/publicacoes/AssistentesEditoriais";
import { MarkdownPreview } from "@/components/publicacoes/MarkdownPreview";

interface Publicacao {
  id: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  imagem_capa: string | null;
  categoria: string;
  autor: string;
  data_publicacao: string | null;
  slug: string | null;
  publicado: boolean;
  created_at: string;
  carousel_images?: string[] | null;
}

const categorias = [
  { value: "geral", label: "Geral" },
  { value: "direito_penal", label: "Direito Penal" },
  { value: "direitos_humanos", label: "Direitos Humanos" },
  { value: "direito_internacional", label: "Direito Internacional" },
  { value: "direito_trabalhista", label: "Direito Trabalhista" },
];

const emptyPublicacao = {
  titulo: "",
  resumo: "",
  conteudo: "",
  imagem_capa: "",
  categoria: "geral",
  autor: "ORION IA",
  slug: "",
  carousel_images: [] as string[],
  scheduled_at: "",
};

export default function PublicacoesAdmin() {
  const { user } = useAuth();
  const { logNeural } = useNeuralFeedback();
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyPublicacao);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showPreview, setShowPreview] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPublicacoes();
  }, []);

  useRefreshOnFocus(useCallback(() => { fetchPublicacoes(); }, []));

  const fetchPublicacoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("publicacoes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar publicações");
    } else {
      setPublicacoes((data || []) as unknown as Publicacao[]);
    }
    setLoading(false);
  };

  const generateSlug = (titulo: string) => {
    return titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTituloChange = (titulo: string) => {
    setFormData({
      ...formData,
      titulo,
      slug: generateSlug(titulo),
    });
    if (titulo.trim()) setFormErrors(prev => ({ ...prev, titulo: false }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `publicacoes/${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      setFormData({ ...formData, imagem_capa: urlData.publicUrl });
      toast.success("Imagem carregada!");
    } catch (error) {
      toast.error("Erro ao carregar imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCarouselImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploadingImage(true);
    try {
      const newImages: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const fileName = `publicacoes/${user.id}/carousel-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
        newImages.push(urlData.publicUrl);
      }
      setFormData({ ...formData, carousel_images: [...formData.carousel_images, ...newImages] });
      toast.success(`${newImages.length} imagem(ns) adicionada(s)!`);
    } catch (error) {
      toast.error("Erro ao carregar imagens");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeCarouselImage = (index: number) => {
    setFormData({
      ...formData,
      carousel_images: formData.carousel_images.filter((_, i) => i !== index),
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, boolean> = {};
    if (!formData.titulo.trim()) errors.titulo = true;
    if (!formData.resumo.trim()) errors.resumo = true;
    if (!formData.conteudo.trim() || formData.conteudo.replace(/<[^>]*>/g, "").trim().length === 0) errors.conteudo = true;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (publishNow = false) => {
    if (!user) return;

    if (!validateForm()) {
      toast.error("Preencha os campos obrigatórios destacados em vermelho");
      return;
    }

    setSaving(true);

    const payload = {
      titulo: formData.titulo,
      resumo: formData.resumo,
      conteudo: formData.conteudo,
      imagem_capa: formData.imagem_capa,
      categoria: formData.categoria,
      autor: formData.autor,
      carousel_images: formData.carousel_images,
      user_id: user.id,
      slug: formData.slug || generateSlug(formData.titulo),
      data_publicacao: formData.scheduled_at || new Date().toISOString(),
      publicado: publishNow && !formData.scheduled_at,
    };

    let error;
    if (editingId) {
      const { error: updateError } = await supabase
        .from("publicacoes")
        .update(payload as any)
        .eq("id", editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("publicacoes")
        .insert([payload] as any);
      error = insertError;
    }

    if (error) {
      toast.error("Erro ao salvar publicação");
    } else {
      const isScheduled = Boolean(formData.scheduled_at);
      toast.success(
        isScheduled
          ? `Publicação agendada para ${format(new Date(formData.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`
          : publishNow
            ? (editingId ? "Publicação atualizada e publicada!" : "Publicação criada e publicada!")
            : (editingId ? "Publicação atualizada!" : "Publicação criada!"),
      );
      logNeural({
        interaction_type: "document_generation",
        input_text: `Publicação ${editingId ? "atualizada" : "criada"}: ${formData.titulo}`,
        output_text: `${formData.resumo}\n\n${formData.conteudo.substring(0, 2000)}`,
        quality_score: 0.82,
        user_id: user.id,
        metadata: {
          categoria: formData.categoria,
          autor: formData.autor,
          editingId,
          source: "publicacoes_admin_save",
        },
      });
      setDialogOpen(false);
      setEditingId(null);
      setFormData(emptyPublicacao);
      setFormErrors({});
      fetchPublicacoes();
    }
    setSaving(false);
  };

  const handleEdit = (pub: Publicacao) => {
    setEditingId(pub.id);
    setFormData({
      titulo: pub.titulo,
      resumo: pub.resumo,
      conteudo: pub.conteudo,
      imagem_capa: pub.imagem_capa || "",
      categoria: pub.categoria,
      autor: pub.autor,
      slug: pub.slug || "",
      carousel_images: pub.carousel_images || [],
      scheduled_at: "",
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta publicação?")) return;

    const { error } = await supabase.from("publicacoes").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Publicação excluída!");
      fetchPublicacoes();
    }
  };

  const togglePublish = async (pub: Publicacao) => {
    const { error } = await supabase
      .from("publicacoes")
      .update({ publicado: !pub.publicado })
      .eq("id", pub.id);

    if (error) {
      toast.error("Erro ao alterar status");
    } else {
      toast.success(pub.publicado ? "Publicação ocultada" : "Publicação publicada!");
      fetchPublicacoes();
    }
  };

  const filteredPublicacoes = publicacoes.filter(
    (p) =>
      p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoriaLabel = (cat: string) => {
    return categorias.find((c) => c.value === cat)?.label || cat;
  };

  return (
    <main className="space-y-6 animate-fade-in" role="main" aria-label="Gerenciamento de Publicações">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
            Gerenciar Publicações
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Crie e gerencie artigos e publicações do site
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-md overflow-hidden" role="group" aria-label="Modo de visualização">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-none ${viewMode === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
              onClick={() => setViewMode("list")}
              aria-label="Visualização em lista"
              aria-pressed={viewMode === "list"}
            >
              <LayoutList className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-none ${viewMode === "grid" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
              onClick={() => setViewMode("grid")}
              aria-label="Visualização em grade"
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            className="btn-gold text-[10px] h-9"
            onClick={() => {
              setEditingId(null);
              setFormData(emptyPublicacao);
              setFormErrors({});
              setDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            NOVA PUBLICAÇÃO
          </Button>
        </div>
      </header>

      {/* Main layout: content + AI sidebar on large screens */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left: Publications list */}
        <section className="flex-1 min-w-0 space-y-4" aria-label="Lista de publicações">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título ou categoria..."
              className="pl-10 bg-card border-border"
              aria-label="Buscar publicações"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3" role="group" aria-label="Estatísticas de publicações">
            <div className="bg-card border border-border p-3 text-center" role="status" aria-label={`${publicacoes.length} publicações no total`}>
              <div className="text-lg font-serif text-primary">{publicacoes.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
            </div>
            <div className="bg-card border border-border p-3 text-center" role="status" aria-label={`${publicacoes.filter(p => p.publicado).length} publicadas`}>
              <div className="text-lg font-serif text-green-500">{publicacoes.filter(p => p.publicado).length}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Publicados</div>
            </div>
            <div className="bg-card border border-border p-3 text-center" role="status" aria-label={`${publicacoes.filter(p => !p.publicado).length} rascunhos`}>
              <div className="text-lg font-serif text-warning">{publicacoes.filter(p => !p.publicado).length}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Rascunhos</div>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-12" role="status" aria-label="Carregando publicações">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <span className="sr-only">Carregando publicações...</span>
            </div>
          ) : filteredPublicacoes.length === 0 ? (
            <div className="bg-card border border-border p-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" aria-hidden="true" />
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Nenhuma publicação encontrada" : "Nenhuma publicação criada"}
              </p>
              <Button
                className="btn-gold"
                onClick={() => {
                  setEditingId(null);
                  setFormData(emptyPublicacao);
                  setFormErrors({});
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Publicação
              </Button>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-3"} role="list">
              {filteredPublicacoes.map((pub) => (
                viewMode === "grid" ? (
                  /* Grid Card */
                  <article key={pub.id} className="bg-card border border-border hover-gold-glow transition-all group overflow-hidden" role="listitem">
                    {pub.imagem_capa ? (
                      <img src={pub.imagem_capa} alt={`Capa: ${pub.titulo}`} className="w-full h-32 object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-32 bg-muted flex items-center justify-center" aria-hidden="true">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-medium text-foreground text-sm truncate flex-1">{pub.titulo}</h3>
                        <span className={`text-[8px] px-1.5 py-0.5 border flex-shrink-0 ${pub.publicado ? "border-green-500/30 text-green-500 bg-green-500/10" : "border-warning/30 text-warning bg-warning/10"}`}>
                          {pub.publicado ? "PUB" : "RASC"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{pub.resumo}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Tag className="h-3 w-3" aria-hidden="true" />{getCategoriaLabel(pub.categoria)}
                        </span>
                        <div className="flex items-center gap-1" role="group" aria-label="Ações da publicação">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePublish(pub)} aria-label={pub.publicado ? "Ocultar publicação" : "Publicar"}>
                            {pub.publicado ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(pub)} aria-label="Editar publicação">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(pub.id)} aria-label="Excluir publicação">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ) : (
                  /* List Row — botões sempre visíveis para acessibilidade */
                  <article key={pub.id} className="bg-card border border-border p-4 flex items-center gap-4 hover-gold-glow transition-all group" role="listitem">
                    {pub.imagem_capa ? (
                      <img src={pub.imagem_capa} alt={`Capa: ${pub.titulo}`} className="h-16 w-24 object-cover border border-border flex-shrink-0" loading="lazy" />
                    ) : (
                      <div className="h-16 w-24 bg-muted border border-border flex items-center justify-center flex-shrink-0" aria-hidden="true">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">{pub.titulo}</h3>
                        <span className={`text-[9px] px-2 py-0.5 border ${pub.publicado ? "border-green-500/30 text-green-500 bg-green-500/10" : "border-warning/30 text-warning bg-warning/10"}`}>
                          {pub.publicado ? "PUBLICADO" : "RASCUNHO"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{pub.resumo}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Tag className="h-3 w-3" aria-hidden="true" />{getCategoriaLabel(pub.categoria)}</span>
                        {pub.data_publicacao && (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" aria-hidden="true" />{format(new Date(pub.data_publicacao), "dd MMM yyyy", { locale: ptBR })}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity" role="group" aria-label="Ações da publicação">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublish(pub)} aria-label={pub.publicado ? "Ocultar publicação" : "Publicar"}>
                        {pub.publicado ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(pub)} aria-label="Editar publicação">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(pub.id)} aria-label="Excluir publicação">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                )
              ))}
            </div>
          )}
        </section>

        {/* Right: AI Agent sidebar */}
        <AssistentesEditoriais
          publicacoes={publicacoes}
          currentCategoria={formData.categoria}
          draftPublicacao={{
            id: editingId,
            titulo: formData.titulo,
            resumo: formData.resumo,
            conteudo: formData.conteudo,
            imagem_capa: formData.imagem_capa,
            categoria: formData.categoria,
            autor: formData.autor,
            slug: formData.slug,
            carousel_images: formData.carousel_images,
          }}
          isEditorOpen={dialogOpen}
          onPublishDraft={async () => {
            await handleSave(true);
          }}
          onArticleGenerated={(data) => {
            setEditingId(null);
            setFormData({ ...emptyPublicacao, ...data });
            setFormErrors({});
            setDialogOpen(true);
          }}
          onThemesGenerated={(data) => {
            setEditingId(null);
            setFormData({ ...emptyPublicacao, ...data });
            setFormErrors({});
            setDialogOpen(true);
          }}
          onImproveApplied={(pubId, data) => {
            if (pubId === "draft") {
              setFormData((prev) => ({ ...prev, conteudo: data.conteudo }));
              setDialogOpen(true);
              return;
            }
            const pub = publicacoes.find(p => p.id === pubId);
            if (pub) {
              setEditingId(pubId);
              setFormData({
                titulo: pub.titulo,
                resumo: pub.resumo,
                conteudo: data.conteudo,
                imagem_capa: pub.imagem_capa || "",
                categoria: pub.categoria,
                autor: pub.autor,
                slug: pub.slug || "",
                carousel_images: pub.carousel_images || [],
                scheduled_at: "",
              });
              setFormErrors({});
              setDialogOpen(true);
            }
          }}
          onSeoGenerated={(pubId, data) => {
            if (pubId === "draft") {
              setFormData((prev) => ({
                ...prev,
                resumo: data.resumo || prev.resumo,
                slug: data.slug || prev.slug || "",
              }));
              setDialogOpen(true);
              if (data.keywords?.length) {
                toast.info(`Palavras-chave: ${data.keywords.join(", ")}`, { duration: 5000 });
              }
              return;
            }
            const pub = publicacoes.find(p => p.id === pubId);
            if (pub) {
              setEditingId(pubId);
              setFormData({
                titulo: pub.titulo,
                resumo: data.resumo || pub.resumo,
                conteudo: pub.conteudo,
                imagem_capa: pub.imagem_capa || "",
                categoria: pub.categoria,
                autor: pub.autor,
                slug: data.slug || pub.slug || "",
                carousel_images: pub.carousel_images || [],
                scheduled_at: "",
              });
              setFormErrors({});
              setDialogOpen(true);
              if (data.keywords?.length) {
                toast.info(`Palavras-chave: ${data.keywords.join(", ")}`, { duration: 5000 });
              }
            }
          }}
          onTemplateApplied={(data) => {
            setEditingId(null);
            setFormData({ ...emptyPublicacao, ...data });
            setFormErrors({});
            setDialogOpen(true);
          }}
        />
      </div>

      {/* Dialog — Editor de publicação */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormErrors({}); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingId ? "Editar Publicação" : "Nova Publicação"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            className="space-y-4 mt-4"
            noValidate
          >
            <div className="space-y-1.5">
              <label htmlFor="pub-titulo" className="text-xs text-muted-foreground">
                Título <span className="text-destructive">*</span>
              </label>
              <Input
                id="pub-titulo"
                value={formData.titulo}
                onChange={(e) => handleTituloChange(e.target.value)}
                placeholder="Título da publicação"
                maxLength={200}
                className={formErrors.titulo ? "border-destructive focus-visible:ring-destructive" : ""}
                aria-required="true"
                aria-invalid={formErrors.titulo}
              />
              {formErrors.titulo && <p className="text-[10px] text-destructive">Título é obrigatório</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pub-slug" className="text-xs text-muted-foreground">Slug (URL)</label>
              <Input
                id="pub-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="slug-da-publicacao"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="pub-categoria" className="text-xs text-muted-foreground">Categoria</label>
                <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                  <SelectTrigger id="pub-categoria"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="pub-autor" className="text-xs text-muted-foreground">Autor</label>
                <Input id="pub-autor" value={formData.autor} onChange={(e) => setFormData({ ...formData, autor: e.target.value })} maxLength={100} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Imagem de Capa</label>
              <div className="flex items-center gap-4">
                {formData.imagem_capa ? (
                  <img src={formData.imagem_capa} alt="Capa" className="h-20 w-32 object-cover border border-border" />
                ) : (
                  <div className="h-20 w-32 bg-muted border border-dashed border-border flex items-center justify-center" aria-hidden="true">
                    <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                )}
                <div>
                  <label htmlFor="cover-upload">
                    <Button variant="outline" size="sm" className="cursor-pointer" disabled={uploadingImage} asChild>
                      <span>{uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload Imagem"}</span>
                    </Button>
                  </label>
                  <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
              </div>
            </div>

            {/* Carousel Images */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Imagens do Carrossel</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.carousel_images.map((url, i) => (
                  <div key={i} className="relative group/img">
                    <img src={url} alt={`Slide ${i + 1}`} className="h-16 w-24 object-cover border border-border" loading="lazy" />
                    <button
                      type="button"
                      onClick={() => removeCarouselImage(i)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs opacity-0 group-hover/img:opacity-100 transition-opacity"
                      aria-label={`Remover imagem ${i + 1}`}
                    >
                      ×
                    </button>
                    <span className="absolute bottom-0 left-0 bg-background/80 text-[9px] px-1 text-foreground">{i + 1}</span>
                  </div>
                ))}
                {formData.carousel_images.length === 0 && (
                  <div className="h-16 w-24 bg-muted border border-dashed border-border flex items-center justify-center" aria-hidden="true">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="carousel-upload">
                  <Button variant="outline" size="sm" className="cursor-pointer" disabled={uploadingImage} asChild>
                    <span>{uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar Imagens"}</span>
                  </Button>
                </label>
                <input id="carousel-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleCarouselImageUpload} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Adicione múltiplas imagens para exibir em carrossel na publicação
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pub-resumo" className="text-xs text-muted-foreground">
                Resumo <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="pub-resumo"
                value={formData.resumo}
                onChange={(e) => {
                  setFormData({ ...formData, resumo: e.target.value });
                  if (e.target.value.trim()) setFormErrors(prev => ({ ...prev, resumo: false }));
                }}
                placeholder="Breve descrição que aparecerá na listagem"
                rows={2}
                maxLength={500}
                className={formErrors.resumo ? "border-destructive focus-visible:ring-destructive" : ""}
                aria-required="true"
                aria-invalid={formErrors.resumo}
              />
              {formErrors.resumo && <p className="text-[10px] text-destructive">Resumo é obrigatório</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">
                  Conteúdo <span className="text-destructive">*</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] gap-1.5"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <SplitSquareHorizontal className="h-3 w-3" />
                  {showPreview ? "Ocultar Preview" : "Preview ao Vivo"}
                </Button>
              </div>

              {formErrors.conteudo && <p className="text-[10px] text-destructive">Conteúdo é obrigatório</p>}

              {showPreview ? (
                <div className="grid grid-cols-2 gap-3 min-h-[350px]">
                  <div className={formErrors.conteudo ? "ring-1 ring-destructive rounded-md" : ""}>
                    <PublicacaoEditor
                      content={formData.conteudo}
                      onChange={(html) => {
                        setFormData({ ...formData, conteudo: html });
                        if (html.replace(/<[^>]*>/g, "").trim()) setFormErrors(prev => ({ ...prev, conteudo: false }));
                      }}
                    />
                  </div>
                  <div className="border border-border rounded-md bg-card overflow-hidden">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider px-3 py-1.5 border-b border-border bg-muted/50">
                      Preview
                    </div>
                    <MarkdownPreview content={formData.conteudo} />
                  </div>
                </div>
              ) : (
                <div className={formErrors.conteudo ? "ring-1 ring-destructive rounded-md" : ""}>
                  <PublicacaoEditor
                    content={formData.conteudo}
                    onChange={(html) => {
                      setFormData({ ...formData, conteudo: html });
                      if (html.replace(/<[^>]*>/g, "").trim()) setFormErrors(prev => ({ ...prev, conteudo: false }));
                    }}
                  />
                </div>
              )}
            </div>

            {/* Agendamento */}
            <div className="space-y-1.5">
              <label htmlFor="pub-schedule" className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Agendar publicação (opcional)
              </label>
              <Input
                id="pub-schedule"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                className="w-auto"
                min={new Date().toISOString().slice(0, 16)}
              />
              {formData.scheduled_at && (
                <p className="text-[10px] text-primary flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Será publicado automaticamente em {format(new Date(formData.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="button" variant="outline" onClick={() => handleSave(true)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Eye className="h-4 w-4 mr-2" />Salvar e Publicar</>}
              </Button>
              <Button type="submit" className="btn-gold" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" />Salvar</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
