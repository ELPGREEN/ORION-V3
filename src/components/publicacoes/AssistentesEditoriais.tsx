import { useState, useRef } from "react";
import {
  Sparkles,
  Lightbulb,
  PenTool,
  Wand2,
  FileText,
  BarChart3,
  Brain,
  Loader2,
  ChevronDown,
  ChevronRight,
  Zap,
  Target,
  TrendingUp,
  BookOpen,
  Star,
  Clock,
  Hash,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cleanAIResponse } from "@/lib/document/cleanAIResponse";
import { sanitizeHTML } from "@/lib/sanitize";

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

interface AssistentesEditoriaisProps {
  publicacoes: Publicacao[];
  onArticleGenerated: (data: { titulo: string; resumo: string; conteudo: string; slug: string }) => void;
  onThemesGenerated: (data: { titulo: string; resumo: string; conteudo: string }) => void;
  onImproveApplied: (pubId: string, data: { conteudo: string }) => void;
  onSeoGenerated: (pubId: string, data: { resumo: string; slug: string; keywords?: string[] }) => void;
  onTemplateApplied: (data: { titulo: string; resumo: string; conteudo: string }) => void;
  currentCategoria: string;
  draftPublicacao?: {
    id?: string | null;
    titulo: string;
    resumo: string;
    conteudo: string;
    imagem_capa?: string | null;
    categoria: string;
    autor: string;
    slug?: string;
    carousel_images?: string[];
  };
  isEditorOpen?: boolean;
  onPublishDraft?: () => Promise<void> | void;
}

const ARTICLE_TYPES = [
  { value: "opiniao", label: "Artigo de Opinião", icon: BookOpen },
  { value: "analise_caso", label: "Análise de Caso", icon: Target },
  { value: "parecer", label: "Parecer Técnico", icon: FileText },
  { value: "noticia", label: "Notícia Jurisprudencial", icon: TrendingUp },
];

const TEMPLATES = [
  { id: "opiniao_reforma", name: "Artigo sobre Reforma Legislativa", icon: "📜" },
  { id: "analise_acordao", name: "Análise de Acórdão", icon: "⚖️" },
  { id: "parecer_lgpd", name: "Parecer sobre LGPD", icon: "🔒" },
  { id: "noticia_stj", name: "Notícia de Jurisprudência", icon: "📰" },
  { id: "thread_linkedin", name: "Thread LinkedIn (5 posts)", icon: "💼" },
  { id: "artigo_constitucional", name: "Artigo Constitucional", icon: "🏛️" },
  { id: "comentario_legislacao", name: "Comentário de Legislação", icon: "📋" },
  { id: "guia_pratico", name: "Guia Prático para Leigos", icon: "📖" },
];

const THEME_FILTERS = [
  { value: "", label: "Todos os Temas" },
  { value: "stf", label: "🔥 Hot no STF" },
  { value: "trabalhista", label: "📋 Trabalhista em Alta" },
  { value: "reforma", label: "⚡ Reformas 2026" },
  { value: "digital", label: "💻 Direito Digital" },
  { value: "penal", label: "⚖️ Penal Atual" },
];

function generateSlug(titulo: string) {
  return titulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function AssistentesEditoriais({
  publicacoes,
  onArticleGenerated,
  onThemesGenerated,
  onImproveApplied,
  onSeoGenerated,
  onTemplateApplied,
  currentCategoria,
  draftPublicacao,
  isEditorOpen = false,
  onPublishDraft,
}: AssistentesEditoriaisProps) {
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [xaiMode, setXaiMode] = useState(true);
  const [publishingDraft, setPublishingDraft] = useState(false);

  // Dialog states
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("");
  const [generateType, setGenerateType] = useState("opiniao");

  const [themesOpen, setThemesOpen] = useState(false);
  const [themesFilter, setThemesFilter] = useState("");
  const [themesResult, setThemesResult] = useState<any[]>([]);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState<"full" | "grok">("full");
  const [reviewResult, setReviewResult] = useState<any>(null);

  const [seoOpen, setSeoOpen] = useState(false);
  const [seoResult, setSeoResult] = useState<any>(null);

  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateTopic, setTemplateTopic] = useState("");

  const [engagementOpen, setEngagementOpen] = useState(false);
  const [engagementResult, setEngagementResult] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const normalizeRichContent = (value: string) => {
    const cleaned = cleanAIResponse(value || "");
    return sanitizeHTML(cleaned);
  };

  const hasDraftContext = Boolean(
    draftPublicacao?.titulo?.trim() ||
    draftPublicacao?.resumo?.trim() ||
    stripHtml(draftPublicacao?.conteudo || "").length > 0,
  );

  const activePublication = hasDraftContext
    ? {
        id: draftPublicacao?.id || "draft",
        titulo: draftPublicacao?.titulo || "",
        resumo: draftPublicacao?.resumo || "",
        conteudo: draftPublicacao?.conteudo || "",
      }
    : publicacoes[0]
      ? {
          id: publicacoes[0].id,
          titulo: publicacoes[0].titulo,
          resumo: publicacoes[0].resumo,
          conteudo: publicacoes[0].conteudo,
        }
      : null;

  const activePublicationLabel = hasDraftContext ? "rascunho atual" : "publicação mais recente";
  const canAnalyzeActivePublication = stripHtml(activePublication?.conteudo || "").length >= 50;
  const canPublishDraft = Boolean(
    isEditorOpen &&
    draftPublicacao?.titulo?.trim() &&
    draftPublicacao?.resumo?.trim() &&
    stripHtml(draftPublicacao?.conteudo || "").length > 0,
  );

  // ═══ API CALLS ═══

  const callEditorial = async (action: string, extraBody: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("editorial-orchestrator", {
      body: { action, xaiMode, categoria: currentCategoria, ...extraBody },
    });
    if (error) throw error;
    return data;
  };

  // 1. Generate Article
  const handleGenerate = async () => {
    setAiLoading("generate");
    try {
      const data = await callEditorial("generate", {
        topic: generateTopic || undefined,
        articleType: generateType,
      });
      const conteudoFormatado = normalizeRichContent(data.conteudo || data.content || "");
      onArticleGenerated({
        titulo: (data.titulo || "").trim(),
        resumo: (data.resumo || "").trim(),
        conteudo: conteudoFormatado,
        slug: generateSlug(data.titulo || ""),
      });
      setGenerateOpen(false);
      setGenerateTopic("");
      toast.success("Artigo gerado com sucesso!");
      if (data.fontes?.length) {
        toast.info(`Fontes citadas: ${data.fontes.slice(0, 3).join(", ")}`, { duration: 5000 });
      }
    } catch {
      toast.error("Erro ao gerar artigo");
    } finally {
      setAiLoading(null);
    }
  };

  // 2. Explore Themes
  const handleThemes = async () => {
    setAiLoading("themes");
    try {
      const data = await callEditorial("themes", { filter: themesFilter });
      setThemesResult(data?.temas || []);
      if (!data?.temas?.length) toast.error("Nenhum tema sugerido");
    } catch {
      toast.error("Erro ao sugerir temas");
    } finally {
      setAiLoading(null);
    }
  };

  const selectTheme = (tema: any) => {
    onThemesGenerated({
      titulo: tema.titulo,
      resumo: tema.resumo,
      conteudo: sanitizeHTML(`
        <article>
          <h2>${tema.titulo}</h2>
          <p>${tema.resumo || ""}</p>
          <h3>Por que este tema importa</h3>
          <p>${tema.justificativa || ""}</p>
          <h3>Direção editorial sugerida</h3>
          <ul>
            <li><strong>Formato:</strong> ${tema.tipo_sugerido || "Artigo de opinião"}</li>
            <li><strong>Relevância:</strong> ${tema.relevancia || "Média"}</li>
            <li><strong>Gancho:</strong> ${tema.gancho || "Conectar o tema à dor prática do leitor e aos impactos jurídicos atuais."}</li>
          </ul>
          ${(tema.keywords || []).length > 0 ? `<h3>Palavras-chave estratégicas</h3><p>${tema.keywords.join(", ")}</p>` : ""}
        </article>
      `),
    });
    setThemesOpen(false);
    setThemesResult([]);
    toast.success("Tema selecionado! Edite o conteúdo.");
  };

  // 3. Review
  const handleReview = async () => {
    if (!activePublication) {
      toast.error("Crie ou abra uma publicação primeiro");
      return;
    }
    if (!canAnalyzeActivePublication) {
      toast.error(`Conteúdo insuficiente no ${activePublicationLabel} para revisão`);
      return;
    }
    setAiLoading("review");
    try {
      const data = await callEditorial("review", {
        conteudo: activePublication.conteudo,
        titulo: activePublication.titulo,
        reviewMode: reviewMode === "grok" ? "grok" : undefined,
      });
      if (data.conteudo) {
        setReviewResult({
          ...data,
          conteudo: normalizeRichContent(data.conteudo),
        });
      } else {
        toast.error("Nenhum resultado de revisão");
      }
    } catch {
      toast.error("Erro ao revisar texto");
    } finally {
      setAiLoading(null);
    }
  };

  const applyReview = () => {
    if (!reviewResult?.conteudo || !activePublication) return;
    onImproveApplied(activePublication.id, { conteudo: reviewResult.conteudo });
    setReviewOpen(false);
    setReviewResult(null);
    toast.success("Revisão aplicada!");
  };

  // 4. SEO
  const handleSeo = async () => {
    if (!activePublication) {
      toast.error("Crie ou abra uma publicação primeiro");
      return;
    }
    if (!canAnalyzeActivePublication) {
      toast.error(`Conteúdo insuficiente no ${activePublicationLabel}`);
      return;
    }
    setAiLoading("seo");
    try {
      const data = await callEditorial("seo", { conteudo: activePublication.conteudo, titulo: activePublication.titulo });
      setSeoResult(data);
    } catch {
      toast.error("Erro ao analisar SEO");
    } finally {
      setAiLoading(null);
    }
  };

  const applySeo = () => {
    if (!seoResult || !activePublication) return;
    onSeoGenerated(activePublication.id, {
      resumo: seoResult.resumo_otimizado || seoResult.meta_description || "",
      slug: seoResult.slug || "",
      keywords: [...(seoResult.keywords_primary || []), ...(seoResult.keywords_secondary || [])],
    });
    setSeoOpen(false);
    setSeoResult(null);
    toast.success("SEO aplicado!");
  };

  // 5. Template
  const handleTemplate = async (templateId: string) => {
    setAiLoading("template");
    try {
      const data = await callEditorial("template", { templateId, topic: templateTopic || undefined });
      onTemplateApplied({
        titulo: (data.titulo || "").trim(),
        resumo: (data.resumo || "").trim(),
        conteudo: normalizeRichContent(data.conteudo || data.content || ""),
      });
      setTemplateOpen(false);
      setTemplateTopic("");
      toast.success("Template aplicado!");
    } catch {
      toast.error("Erro ao gerar template");
    } finally {
      setAiLoading(null);
    }
  };

  // 6. Engagement
  const handleEngagement = async () => {
    if (!activePublication) {
      toast.error("Crie ou abra uma publicação primeiro");
      return;
    }
    if (!canAnalyzeActivePublication) {
      toast.error(`Conteúdo insuficiente no ${activePublicationLabel}`);
      return;
    }
    setAiLoading("engagement");
    try {
      const data = await callEditorial("engagement", {
        titulo: activePublication.titulo,
        resumo: activePublication.resumo,
        conteudo: activePublication.conteudo,
      });
      setEngagementResult(data);
    } catch {
      toast.error("Erro ao analisar engajamento");
    } finally {
      setAiLoading(null);
    }
  };

  const handlePublishClick = async () => {
    if (!onPublishDraft) return;
    setPublishingDraft(true);
    try {
      await onPublishDraft();
    } finally {
      setPublishingDraft(false);
    }
  };

  // ═══ AGENT CARDS CONFIG ═══
  const agents = [
    {
      icon: Sparkles,
      id: "generate",
      title: "Gerar Artigo Completo",
      desc: "Pipeline de 7 agentes: pesquisa → estrutura → redação → revisão → SEO → formatação",
      action: () => setGenerateOpen(true),
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
      accent: "group-hover:border-primary/40",
    },
    {
      icon: Lightbulb,
      id: "themes",
      title: "Explorar Temas",
      desc: "10 pautas com justificativa, relevância, keywords e tipo sugerido",
      action: () => { setThemesResult([]); setThemesOpen(true); },
      color: "text-amber-400",
      bg: "bg-amber-400/10 border-amber-500/20",
      accent: "group-hover:border-amber-400/40",
    },
    {
      icon: PenTool,
      id: "review",
      title: "Refinar & Revisar",
      desc: "Revisão de 8 camadas com scores ou reescrita no estilo Grok",
      action: () => { setReviewResult(null); setReviewOpen(true); },
      color: "text-emerald-400",
      bg: "bg-emerald-400/10 border-emerald-400/20",
      accent: "group-hover:border-emerald-400/40",
    },
    {
      icon: Wand2,
      id: "seo",
      title: "SEO Jurídico Avançado",
      desc: "Meta title, description, 15 keywords, schema.org e score 0-100",
      action: () => { setSeoResult(null); setSeoOpen(true); },
      color: "text-primary",
      bg: "bg-primary/5 border-primary/15",
      accent: "group-hover:border-primary/30",
    },
    {
      icon: FileText,
      id: "template",
      title: "Templates Jurídicos",
      desc: "8 modelos prontos — opinião, acórdão, LGPD, thread LinkedIn e mais",
      action: () => { setTemplateTopic(""); setTemplateOpen(true); },
      color: "text-secondary-foreground/70",
      bg: "bg-secondary/50 border-border",
      accent: "group-hover:border-primary/20",
    },
    {
      icon: BarChart3,
      id: "engagement",
      title: "Análise de Engajamento",
      desc: "Score, melhor horário, canais recomendados e hashtags",
      action: () => { setEngagementResult(null); setEngagementOpen(true); },
      color: "text-blue-400",
      bg: "bg-blue-400/10 border-blue-400/20",
      accent: "group-hover:border-blue-400/40",
    },
  ];

  const ScoreBadge = ({ score, label }: { score: number; label: string }) => (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-destructive"}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`font-mono font-medium ${score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-destructive"}`}>
          {score}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <div className="xl:w-80 flex-shrink-0">
        <div className="xl:sticky xl:top-4 relative">
          <div
            ref={scrollRef}
            className="space-y-2.5 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 pb-8"
            style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--primary) / 0.3) transparent" }}
          >
            {/* Header */}
            <div className="bg-card border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center shadow-sm">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground tracking-tight">Equipe Editorial IA</h3>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">Multi-provider • xAI Grok DNA</p>
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-primary/20 via-border/50 to-transparent mb-3" />
              {/* xAI Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className={`h-3.5 w-3.5 ${xaiMode ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-[11px] text-muted-foreground">Modo xAI Analysis</span>
                </div>
                <Switch checked={xaiMode} onCheckedChange={setXaiMode} className="scale-75" />
              </div>
            </div>

            {/* Agent Cards */}
            {agents.map((agent, i) => (
              <button
                key={i}
                onClick={agent.action}
                disabled={aiLoading === agent.id}
                className={`w-full bg-card border rounded-lg p-3.5 text-left transition-all duration-200 group ${
                  aiLoading === agent.id ? "opacity-40 cursor-not-allowed" : "hover:shadow-md hover:shadow-primary/5 active:scale-[0.98]"
                } ${agent.accent}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-lg ${agent.bg} border flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}>
                    {aiLoading === agent.id ? (
                      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                    ) : (
                      <agent.icon className={`h-3.5 w-3.5 ${agent.color}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-medium text-foreground mb-0.5 flex items-center gap-2">
                      {agent.title}
                      {aiLoading === agent.id && (
                        <span className="text-[8px] text-primary font-normal bg-primary/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          gerando...
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed line-clamp-2">{agent.desc}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 flex-shrink-0 group-hover:text-primary/60 transition-colors" />
                </div>
              </button>
            ))}

            <div className="bg-card border border-border rounded-lg p-3 space-y-3">
              <div>
                <h4 className="text-xs font-medium text-foreground">Publicação</h4>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  {canPublishDraft
                    ? "Seu rascunho atual já pode ser publicado diretamente."
                    : "Abra o editor e preencha título, resumo e conteúdo para liberar a publicação."}
                </p>
              </div>
              <Button
                onClick={handlePublishClick}
                disabled={!canPublishDraft || publishingDraft}
                className="w-full gap-2"
              >
                {publishingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {publishingDraft ? "Publicando..." : "Publicar agora"}
              </Button>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-0 left-0 right-1 h-12 pointer-events-none rounded-b-lg" style={{ background: "linear-gradient(to top, hsl(var(--background)), transparent)" }}>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
              <ChevronDown className="h-4 w-4 text-primary/40 animate-bounce" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ DIALOG: Gerar Artigo ═══ */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Gerar Artigo Completo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Tipo de Artigo</label>
              <div className="grid grid-cols-2 gap-2">
                {ARTICLE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setGenerateType(type.value)}
                    className={`p-3 rounded-lg border text-left transition-all text-xs ${
                      generateType === type.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <type.icon className={`h-4 w-4 mb-1.5 ${generateType === type.value ? "text-primary" : "text-muted-foreground/60"}`} />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Tema (opcional — IA escolhe se vazio)</label>
              <Input
                value={generateTopic}
                onChange={(e) => setGenerateTopic(e.target.value)}
                placeholder="Ex: Impacto da IA no Direito Penal"
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Zap className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                O pipeline de 7 agentes irá pesquisar, estruturar, redigir, revisar, otimizar SEO e formatar o artigo completo.
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={aiLoading === "generate"} className="w-full gap-2">
              {aiLoading === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiLoading === "generate" ? "Gerando artigo..." : "Gerar Artigo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ DIALOG: Explorar Temas ═══ */}
      <Dialog open={themesOpen} onOpenChange={setThemesOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              Explorar Temas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2">
              <Select value={themesFilter} onValueChange={setThemesFilter}>
                <SelectTrigger className="flex-1 text-xs h-9">
                  <SelectValue placeholder="Filtro de temas" />
                </SelectTrigger>
                <SelectContent>
                  {THEME_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleThemes} disabled={aiLoading === "themes"} size="sm" className="gap-1.5">
                {aiLoading === "themes" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
                Buscar
              </Button>
            </div>

            {themesResult.length > 0 && (
              <ScrollArea className="max-h-[55vh]">
                <div className="space-y-2 pr-2">
                  {themesResult.map((tema: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-all group cursor-pointer"
                      onClick={() => selectTheme(tema)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                              tema.relevancia === "urgente" ? "border-destructive/30 text-destructive bg-destructive/10" :
                              tema.relevancia === "alta" ? "border-primary/30 text-primary bg-primary/10" :
                              "border-border text-muted-foreground"
                            } uppercase tracking-wider`}>
                              {tema.relevancia || "media"}
                            </span>
                            {tema.tipo_sugerido && (
                              <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">{tema.tipo_sugerido}</span>
                            )}
                          </div>
                          <h4 className="text-xs font-medium text-foreground mb-1 group-hover:text-primary transition-colors">{tema.titulo}</h4>
                          <p className="text-[10px] text-muted-foreground leading-relaxed mb-1.5">{tema.resumo}</p>
                          <p className="text-[10px] text-muted-foreground/70 italic">{tema.justificativa}</p>
                          {tema.keywords?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tema.keywords.map((kw: string, j: number) => (
                                <span key={j} className="text-[8px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                  <Hash className="h-2 w-2 inline mr-0.5" />{kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Sparkles className="h-3 w-3" /> Usar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ DIALOG: Refinar & Revisar ═══ */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <PenTool className="h-4 w-4 text-emerald-400" />
              Refinar & Revisar
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2 min-h-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReviewMode("full")}
                className={`flex-1 p-3 rounded-lg border text-xs text-left transition-all ${
                  reviewMode === "full" ? "border-emerald-400 bg-emerald-400/10" : "border-border bg-card"
                }`}
              >
                <CheckCircle2 className={`h-4 w-4 mb-1 ${reviewMode === "full" ? "text-emerald-400" : "text-muted-foreground/50"}`} />
                <div className="font-medium text-foreground">Revisão Completa</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">8 camadas com scores detalhados</div>
              </button>
              <button
                onClick={() => setReviewMode("grok")}
                className={`flex-1 p-3 rounded-lg border text-xs text-left transition-all ${
                  reviewMode === "grok" ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <Zap className={`h-4 w-4 mb-1 ${reviewMode === "grok" ? "text-primary" : "text-muted-foreground/50"}`} />
                <div className="font-medium text-foreground">Modo Grok</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Reescrita direta e impactante</div>
              </button>
            </div>

            <Button onClick={handleReview} disabled={aiLoading === "review"} className="w-full gap-2">
              {aiLoading === "review" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />}
              {aiLoading === "review" ? "Revisando..." : `Revisar ${hasDraftContext ? "Rascunho Atual" : "Publicação Mais Recente"}`}
            </Button>

            {reviewResult && (
              <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: "55vh" }}>
                <div className="space-y-3 pr-2">
                  {reviewResult.scores && (
                    <div className="p-3 rounded-lg border border-border bg-card space-y-2">
                      <h4 className="text-xs font-medium text-foreground mb-2">Scores da Revisão</h4>
                      {reviewResult.scores.gramatica != null && <ScoreBadge score={reviewResult.scores.gramatica} label="Gramática" />}
                      {reviewResult.scores.precisao_juridica != null && <ScoreBadge score={reviewResult.scores.precisao_juridica} label="Precisão Jurídica" />}
                      {reviewResult.scores.clareza != null && <ScoreBadge score={reviewResult.scores.clareza} label="Clareza" />}
                      {reviewResult.scores.estrutura != null && <ScoreBadge score={reviewResult.scores.estrutura} label="Estrutura" />}
                      {reviewResult.scores.seo != null && <ScoreBadge score={reviewResult.scores.seo} label="SEO" />}
                      {reviewResult.scores.geral != null && (
                        <div className="pt-2 border-t border-border">
                          <ScoreBadge score={reviewResult.scores.geral} label="Score Geral" />
                        </div>
                      )}
                    </div>
                  )}

                  {reviewResult.notas?.length > 0 && (
                    <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                      <h4 className="text-xs font-medium text-foreground mb-2">Notas da Revisão</h4>
                      {reviewResult.notas.map((nota: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-[10px]">
                          {nota.tipo === "correcao" ? <CheckCircle2 className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" /> :
                           nota.tipo === "alerta" ? <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" /> :
                           <Star className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />}
                          <span className="text-muted-foreground">{nota.descricao}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {reviewResult.conteudo && (
                    <div className="p-3 rounded-lg border border-border bg-card">
                      <h4 className="text-xs font-medium text-foreground mb-2">Prévia revisada</h4>
                      <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: sanitizeHTML(reviewResult.conteudo) }} />
                    </div>
                  )}

                  <Button onClick={applyReview} className="w-full gap-2" variant="default">
                    <CheckCircle2 className="h-4 w-4" /> Aplicar Revisão
                  </Button>
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ DIALOG: SEO Avançado ═══ */}
      <Dialog open={seoOpen} onOpenChange={setSeoOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Wand2 className="h-4 w-4 text-primary" />
              SEO Jurídico Avançado
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2 min-h-0 flex-1">
            <Button onClick={handleSeo} disabled={aiLoading === "seo"} className="w-full gap-2 flex-shrink-0">
              {aiLoading === "seo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {aiLoading === "seo" ? "Analisando SEO..." : `Analisar SEO do ${hasDraftContext ? "Rascunho Atual" : "Conteúdo Mais Recente"}`}
            </Button>

            {seoResult && (
              <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: '55vh' }}>
                <div className="space-y-3 pr-2">
                  {seoResult.score_seo != null && (
                    <div className="p-4 rounded-lg border border-border bg-card text-center">
                      <div className={`text-3xl font-mono font-bold ${seoResult.score_seo >= 80 ? "text-emerald-400" : seoResult.score_seo >= 60 ? "text-amber-400" : "text-destructive"}`}>
                        {seoResult.score_seo}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">Score SEO</div>
                    </div>
                  )}

                  {seoResult.meta_title && (
                    <div className="p-3 rounded-lg border border-border bg-card">
                      <div className="text-[10px] text-muted-foreground mb-1">Meta Title</div>
                      <div className="text-xs text-foreground font-medium">{seoResult.meta_title}</div>
                      <div className="text-[9px] text-muted-foreground/60 mt-1">{seoResult.meta_title.length}/60 chars</div>
                    </div>
                  )}

                  {(seoResult.resumo_otimizado || seoResult.meta_description) && (
                    <div className="p-3 rounded-lg border border-border bg-card">
                      <div className="text-[10px] text-muted-foreground mb-1">Meta Description</div>
                      <div className="text-xs text-muted-foreground">{seoResult.resumo_otimizado || seoResult.meta_description}</div>
                    </div>
                  )}

                  {seoResult.slug && (
                    <div className="p-3 rounded-lg border border-border bg-card">
                      <div className="text-[10px] text-muted-foreground mb-1">Slug</div>
                      <code className="text-xs text-primary">/{seoResult.slug}</code>
                    </div>
                  )}

                  {(seoResult.keywords_primary?.length > 0 || seoResult.keywords_secondary?.length > 0) && (
                    <div className="p-3 rounded-lg border border-border bg-card">
                      <div className="text-[10px] text-muted-foreground mb-2">Keywords</div>
                      {seoResult.keywords_primary?.length > 0 && (
                        <div className="mb-2">
                          <div className="text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-1">Primárias</div>
                          <div className="flex flex-wrap gap-1">
                            {seoResult.keywords_primary.map((kw: string, i: number) => (
                              <span key={i} className="text-[9px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded">{kw}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {seoResult.keywords_secondary?.length > 0 && (
                        <div className="mb-2">
                          <div className="text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-1">Secundárias</div>
                          <div className="flex flex-wrap gap-1">
                            {seoResult.keywords_secondary.map((kw: string, i: number) => (
                              <span key={i} className="text-[9px] px-2 py-0.5 bg-muted text-muted-foreground rounded">{kw}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {seoResult.keywords_longtail?.length > 0 && (
                        <div>
                          <div className="text-[9px] text-muted-foreground/60 uppercase tracking-wider mb-1">Long-tail</div>
                          <div className="flex flex-wrap gap-1">
                            {seoResult.keywords_longtail.map((kw: string, i: number) => (
                              <span key={i} className="text-[9px] px-2 py-0.5 bg-muted/50 text-muted-foreground/80 rounded">{kw}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {seoResult.analise && (
                    <div className="p-3 rounded-lg border border-border bg-card space-y-2">
                      <div className="text-[10px] text-muted-foreground mb-2">Análise Detalhada</div>
                      {Object.entries(seoResult.analise).map(([key, val]: [string, any]) => (
                        <ScoreBadge key={key} score={val} label={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} />
                      ))}
                    </div>
                  )}

                  {seoResult.sugestoes?.length > 0 && (
                    <div className="p-3 rounded-lg border border-border bg-card">
                      <div className="text-[10px] text-muted-foreground mb-2">Sugestões</div>
                      {seoResult.sugestoes.map((s: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-[10px] text-muted-foreground mb-1.5">
                          <ChevronRight className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                          {s}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button onClick={applySeo} className="w-full gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Aplicar SEO
                  </Button>
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ DIALOG: Templates ═══ */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Templates Jurídicos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Tema específico (opcional)</label>
              <Input
                value={templateTopic}
                onChange={(e) => setTemplateTopic(e.target.value)}
                placeholder="IA escolhe se vazio"
                className="text-sm"
              />
            </div>
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-2 pr-2">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleTemplate(tmpl.id)}
                    disabled={aiLoading === "template"}
                    className="w-full p-3 rounded-lg border border-border bg-card hover:border-primary/30 text-left transition-all group flex items-center gap-3 active:scale-[0.98]"
                  >
                    <span className="text-lg">{tmpl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{tmpl.name}</div>
                    </div>
                    {aiLoading === "template" ? (
                      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/60 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ DIALOG: Engajamento ═══ */}
      <Dialog open={engagementOpen} onOpenChange={setEngagementOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              Análise de Engajamento
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2 min-h-0 flex-1">
            <Button onClick={handleEngagement} disabled={aiLoading === "engagement"} className="w-full gap-2 flex-shrink-0">
              {aiLoading === "engagement" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              {aiLoading === "engagement" ? "Analisando..." : `Analisar ${hasDraftContext ? "Rascunho Atual" : "Publicação Mais Recente"}`}
            </Button>

            {engagementResult && (
              <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: '55vh' }}>
                <div className="space-y-3 pr-2">
                  {/* Score */}
                  {engagementResult.score_engajamento != null && (
                    <div className="p-4 rounded-lg border border-border bg-card text-center">
                      <div className={`text-3xl font-mono font-bold ${
                        engagementResult.score_engajamento >= 80 ? "text-emerald-400" :
                        engagementResult.score_engajamento >= 60 ? "text-amber-400" : "text-destructive"
                      }`}>
                        {engagementResult.score_engajamento}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">Score de Engajamento</div>
                    </div>
                  )}

                  {/* Info row */}
                  <div className="grid grid-cols-2 gap-2">
                    {engagementResult.tempo_leitura_min && (
                      <div className="p-3 rounded-lg border border-border bg-card">
                        <Clock className="h-4 w-4 text-muted-foreground/50 mb-1" />
                        <div className="text-sm font-medium text-foreground">{engagementResult.tempo_leitura_min} min</div>
                        <div className="text-[9px] text-muted-foreground">Tempo de leitura</div>
                      </div>
                    )}
                    {engagementResult.melhor_horario && (
                      <div className="p-3 rounded-lg border border-border bg-card">
                        <TrendingUp className="h-4 w-4 text-muted-foreground/50 mb-1" />
                        <div className="text-xs font-medium text-foreground">{engagementResult.melhor_horario}</div>
                        <div className="text-[9px] text-muted-foreground">Melhor horário</div>
                      </div>
                    )}
                  </div>

                  {/* Channels */}
                  {engagementResult.canais_recomendados?.length > 0 && (
                    <div className="p-3 rounded-lg border border-border bg-card">
                      <div className="text-[10px] text-muted-foreground mb-2">Canais Recomendados</div>
                      <div className="space-y-2">
                        {engagementResult.canais_recomendados.map((canal: any, i: number) => (
                          <div key={i}>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-foreground font-medium">{canal.canal}</span>
                              <span className={`font-mono ${canal.score >= 80 ? "text-emerald-400" : canal.score >= 60 ? "text-amber-400" : "text-muted-foreground"}`}>
                                {canal.score}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${canal.score >= 80 ? "bg-emerald-500" : canal.score >= 60 ? "bg-amber-500" : "bg-muted-foreground"}`}
                                style={{ width: `${canal.score}%` }}
                              />
                            </div>
                            <p className="text-[9px] text-muted-foreground/70 mt-0.5">{canal.motivo}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths / Weaknesses */}
                  {(engagementResult.pontos_fortes?.length > 0 || engagementResult.pontos_fracos?.length > 0) && (
                    <div className="grid grid-cols-2 gap-2">
                      {engagementResult.pontos_fortes?.length > 0 && (
                        <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                          <div className="text-[10px] text-emerald-400 font-medium mb-1.5">Pontos Fortes</div>
                          {engagementResult.pontos_fortes.map((p: string, i: number) => (
                            <div key={i} className="text-[10px] text-muted-foreground flex items-start gap-1 mb-1">
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 mt-0.5 flex-shrink-0" /> {p}
                            </div>
                          ))}
                        </div>
                      )}
                      {engagementResult.pontos_fracos?.length > 0 && (
                        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                          <div className="text-[10px] text-amber-400 font-medium mb-1.5">A Melhorar</div>
                          {engagementResult.pontos_fracos.map((p: string, i: number) => (
                            <div key={i} className="text-[10px] text-muted-foreground flex items-start gap-1 mb-1">
                              <AlertTriangle className="h-2.5 w-2.5 text-amber-400 mt-0.5 flex-shrink-0" /> {p}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CTA & Alt Title */}
                  {engagementResult.cta_sugerido && (
                    <div className="p-3 rounded-lg border border-border bg-card">
                      <div className="text-[10px] text-muted-foreground mb-1">CTA Sugerido</div>
                      <div className="text-xs text-foreground">{engagementResult.cta_sugerido}</div>
                    </div>
                  )}

                  {engagementResult.titulo_alternativo && (
                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <div className="text-[10px] text-primary mb-1">Título Alternativo</div>
                      <div className="text-xs text-foreground font-medium">{engagementResult.titulo_alternativo}</div>
                    </div>
                  )}

                  {/* Hashtags */}
                  {engagementResult.hashtags?.length > 0 && (
                    <div className="p-3 rounded-lg border border-border bg-card">
                      <div className="text-[10px] text-muted-foreground mb-2">Hashtags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {engagementResult.hashtags.map((tag: string, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
