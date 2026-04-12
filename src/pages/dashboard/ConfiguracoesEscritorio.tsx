import { useState, useEffect, useCallback } from "react";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  Save,
  Upload,
  Mail,
  Building2,
  Palette,
  Loader2,
  Eye,
  ImageIcon,
  Brain,
  Database,
  Sparkles,
  Search,
  ArrowRight,
  Share2,
  Globe,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StripeConnectCard } from "@/components/dashboard/settings/StripeConnectCard";

interface EscritorioConfig {
  nome_escritorio: string;
  oab: string;
  telefone: string;
  endereco: string;
  email_contato: string;
  website: string;
  logo_url: string;
  timbre_url: string;
  timbre_endereco: string;
  timbre_contatos: string;
  email_remetente_nome: string;
  email_cor_primaria: string;
  email_cor_fundo: string;
  email_rodape_texto: string;
  email_assinatura_texto: string;
  bio: string;
  areas_atuacao: string[];
  banner_url: string;
  site_ativo: boolean;
  linkedin_url: string;
  instagram_url: string;
  whatsapp: string;
  frase_impacto: string;
  experiencia_anos: number;
  meta_description: string;
}

const defaultConfig: EscritorioConfig = {
  nome_escritorio: "",
  oab: "",
  telefone: "",
  endereco: "",
  email_contato: "",
  website: "",
  logo_url: "",
  timbre_url: "",
  timbre_endereco: "",
  timbre_contatos: "",
  email_remetente_nome: "",
  email_cor_primaria: "#d4a418",
  email_cor_fundo: "#0a0a0a",
  email_rodape_texto: "Provimento 205/2021 e LGPD aplicáveis.",
  email_assinatura_texto: "",
  bio: "",
  areas_atuacao: [],
  banner_url: "",
  site_ativo: true,
  linkedin_url: "",
  instagram_url: "",
  whatsapp: "",
  frase_impacto: "",
  experiencia_anos: 0,
  meta_description: "",
};

export default function ConfiguracoesEscritorio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<EscritorioConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadConfig();
  }, [user]);

  useRefreshOnFocus(useCallback(() => { if (user) loadConfig(); }, [user]));

  const loadConfig = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("escritorio_config")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setExistingId(data.id);
      setConfig({
        nome_escritorio: data.nome_escritorio || defaultConfig.nome_escritorio,
        oab: data.oab || defaultConfig.oab,
        telefone: data.telefone || "",
        endereco: data.endereco || "",
        email_contato: data.email_contato || "",
        website: data.website || "",
        logo_url: data.logo_url || "",
        timbre_url: (data as any).timbre_url || "",
        timbre_endereco: data.timbre_endereco || "",
        timbre_contatos: data.timbre_contatos || "",
        email_remetente_nome: data.email_remetente_nome || defaultConfig.email_remetente_nome,
        email_cor_primaria: data.email_cor_primaria || defaultConfig.email_cor_primaria,
        email_cor_fundo: data.email_cor_fundo || defaultConfig.email_cor_fundo,
        email_rodape_texto: data.email_rodape_texto || defaultConfig.email_rodape_texto,
        email_assinatura_texto: data.email_assinatura_texto || "",
        bio: (data as any).bio || "",
        areas_atuacao: (data as any).areas_atuacao || [],
        banner_url: (data as any).banner_url || "",
        site_ativo: (data as any).site_ativo !== false,
        linkedin_url: (data as any).linkedin_url || "",
        instagram_url: (data as any).instagram_url || "",
        whatsapp: (data as any).whatsapp || "",
        frase_impacto: (data as any).frase_impacto || "",
        experiencia_anos: (data as any).experiencia_anos || 0,
        meta_description: (data as any).meta_description || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      ...config,
    };

    let error;
    if (existingId) {
      const res = await supabase
        .from("escritorio_config")
        .update(payload)
        .eq("id", existingId);
      error = res.error;
    } else {
      const res = await supabase
        .from("escritorio_config")
        .insert(payload)
        .select()
        .single();
      error = res.error;
      if (res.data) setExistingId(res.data.id);
    }

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Invalidate PDF config cache so next export picks up changes
      try {
        const { invalidateEscritorioCache } = await import("@/lib/generators/pdf-generator");
        invalidateEscritorioCache();
      } catch { /* non-critical */ }

      toast({
        title: "Configurações salvas!",
        description: "As alterações serão aplicadas nos próximos documentos e e-mails.",
      });

      // 🧠 Neural: configuração salva = sinal administrativo de personalização
    }
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/logo.${ext}`;

    // Use bucket público 'avatars' para logos
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({
        title: "Erro no upload",
        description: uploadError.message,
        variant: "destructive",
      });
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    setConfig({ ...config, logo_url: urlData.publicUrl });
    toast({ title: "Logo carregada!", description: "Salve para aplicar." });
  };

  const handleTimbreUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/timbre.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setConfig({ ...config, timbre_url: urlData.publicUrl });
    toast({ title: "Timbre carregado!", description: "Salve para aplicar nos documentos PDF." });
  };

  const handleRemoveTimbre = () => {
    setConfig({ ...config, timbre_url: "" });
    toast({ title: "Timbre removido", description: "Documentos usarão formato limpo ABNT. Salve para confirmar." });
  };

  const updateField = (field: keyof EscritorioConfig, value: string) => {
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
            <Settings className="h-6 w-6 text-primary" />
            Configurações do Escritório
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personalize nome, logo e informações exibidas nos e-mails e documentos.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="btn-gold text-[10px] h-9"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Save className="h-3.5 w-3.5 mr-1" />
              SALVAR
            </>
          )}
        </Button>
      </div>

      {/* Meu Site Público */}
      <Card className="bg-gradient-to-r from-emerald-500/10 via-primary/5 to-background border-emerald-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-500" />
            Meu Site Público
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Seu site profissional público. Compartilhe o link com seus clientes para que acessem suas informações e publicações.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="btn-gold gap-2 flex-1"
              onClick={() => {
                const url = `${window.location.origin}/advogado/${user?.id}`;
                navigator.clipboard.writeText(url);
                toast({ title: "Link copiado!", description: url });
              }}
            >
              <Share2 className="h-4 w-4" />
              Copiar Link do Meu Site
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open(`/advogado/${user?.id}`, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              Visualizar
            </Button>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">Biografia / Apresentação</label>
            <Textarea
              value={config.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              className="bg-background border-border min-h-[80px]"
              placeholder="Descreva sua trajetória, formação e experiência profissional..."
              maxLength={2000}
            />
          </div>

          {/* Areas de atuação */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Áreas de Atuação (separadas por vírgula)
            </label>
            <Input
              value={config.areas_atuacao.join(", ")}
              onChange={(e) => setConfig(c => ({ ...c, areas_atuacao: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
              className="bg-background border-border h-10"
              placeholder="Direito Civil, Direito Penal, Trabalhista..."
            />
          </div>

          {/* Social links */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground tracking-wider uppercase">LinkedIn</label>
              <Input
                value={config.linkedin_url}
                onChange={(e) => updateField("linkedin_url", e.target.value)}
                className="bg-background border-border h-10"
                placeholder="https://linkedin.com/in/seu-perfil"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground tracking-wider uppercase">Instagram</label>
              <Input
                value={config.instagram_url}
                onChange={(e) => updateField("instagram_url", e.target.value)}
                className="bg-background border-border h-10"
                placeholder="https://instagram.com/seu-perfil"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">WhatsApp (com DDD)</label>
            <Input
              value={config.whatsapp}
              onChange={(e) => updateField("whatsapp", e.target.value)}
              className="bg-background border-border h-10"
              placeholder="(11) 98765-4321"
              maxLength={20}
            />
          </div>

          {/* Frase de Impacto */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">Frase de Impacto (Tagline)</label>
            <Input
              value={config.frase_impacto}
              onChange={(e) => updateField("frase_impacto", e.target.value)}
              className="bg-background border-border h-10"
              placeholder="Sua justiça, nossa missão"
              maxLength={120}
            />
          </div>

          {/* Anos de experiência + Meta Description */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground tracking-wider uppercase">Anos de Experiência</label>
              <Input
                type="number"
                value={config.experiencia_anos || ""}
                onChange={(e) => setConfig(c => ({ ...c, experiencia_anos: parseInt(e.target.value) || 0 }))}
                className="bg-background border-border h-10"
                placeholder="15"
                min={0}
                max={80}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground tracking-wider uppercase">Descrição SEO (máx 160 chars)</label>
              <Input
                value={config.meta_description}
                onChange={(e) => updateField("meta_description", e.target.value)}
                className="bg-background border-border h-10"
                placeholder="Breve descrição para Google e redes sociais..."
                maxLength={160}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Painel Administrativo IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Gerencie a rede neural, ingestão de dados, provedores de IA e documentação técnica.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center gap-2 hover:border-primary"
              onClick={() => navigate("/dashboard/rede-neural")}
            >
              <Brain className="h-5 w-5 text-primary" />
              <span className="text-xs">Rede Neural</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center gap-2 hover:border-primary"
              onClick={() => navigate("/dashboard/rede-neural?tab=ingestion")}
            >
              <Database className="h-5 w-5 text-primary" />
              <span className="text-xs">Ingestão DataJud</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center gap-2 hover:border-primary"
              onClick={() => navigate("/dashboard/gerar-documento")}
            >
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-xs">Gerar Documento</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center gap-2 hover:border-primary"
              onClick={() => navigate("/dashboard/pesquisa")}
            >
              <Search className="h-5 w-5 text-primary" />
              <span className="text-xs">Pesquisa IA</span>
            </Button>
          </div>
          <Button
            className="w-full mt-4 btn-gold"
            onClick={() => navigate("/dashboard/rede-neural")}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Acessar Painel Completo
          </Button>
        </CardContent>
      </Card>

      {/* Dados do Escritório */}
      <div className="bg-card border border-border p-6 space-y-4">
        <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Dados do Escritório
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Nome do Escritório
            </label>
            <Input
              value={config.nome_escritorio}
              onChange={(e) => updateField("nome_escritorio", e.target.value)}
              className="bg-background border-border h-10"
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              OAB
            </label>
            <Input
              value={config.oab}
              onChange={(e) => updateField("oab", e.target.value)}
              className="bg-background border-border h-10"
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Telefone
            </label>
            <Input
              value={config.telefone}
              onChange={(e) => updateField("telefone", e.target.value)}
              className="bg-background border-border h-10"
              maxLength={30}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              E-mail de Contato
            </label>
            <Input
              type="email"
              value={config.email_contato}
              onChange={(e) => updateField("email_contato", e.target.value)}
              className="bg-background border-border h-10"
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Endereço
            </label>
            <Input
              value={config.endereco}
              onChange={(e) => updateField("endereco", e.target.value)}
              className="bg-background border-border h-10"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Website
            </label>
            <Input
              value={config.website}
              onChange={(e) => updateField("website", e.target.value)}
              className="bg-background border-border h-10"
              placeholder="https://www.seusite.com.br"
              maxLength={200}
            />
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-card border border-border p-6 space-y-4">
        <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          Logo do Escritório
        </h2>
        <p className="text-[10px] text-muted-foreground">
          A logo será exibida nos e-mails de notificação e no cabeçalho dos documentos.
        </p>
        <div className="flex items-center gap-6">
          {config.logo_url ? (
            <div className="h-20 w-20 border border-border flex items-center justify-center bg-background overflow-hidden">
              <img
                src={config.logo_url}
                alt="Logo do escritório"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="h-20 w-20 border border-dashed border-border flex items-center justify-center bg-background">
              <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
          <div>
            <label htmlFor="logo-upload">
              <Button
                variant="outline"
                className="btn-outline-gold text-[10px] h-9 cursor-pointer"
                asChild
              >
                <span>
                  <Upload className="h-3.5 w-3.5 mr-2" />
                  {config.logo_url ? "Trocar Logo" : "Upload Logo"}
                </span>
              </Button>
            </label>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <p className="text-[9px] text-muted-foreground mt-1.5">
              PNG, JPG ou SVG. Recomendado: 200×200px.
            </p>
          </div>
        </div>
      </div>

      {/* Timbre */}
      <div className="bg-card border border-border p-6 space-y-4">
        <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          Timbre de Documentos (Cabeçalho PDF)
        </h2>
        <p className="text-[10px] text-muted-foreground">
          Envie uma imagem de timbre para o cabeçalho dos seus documentos PDF. Sem timbre, os documentos serão gerados no formato limpo ABNT.
        </p>

        {/* Upload + Preview */}
        <div className="flex items-start gap-4">
          <div className="space-y-2">
            <label htmlFor="timbre-upload">
              <Button variant="outline" size="sm" asChild className="cursor-pointer">
                <span>
                  <Upload className="h-3 w-3 mr-1.5" />
                  {config.timbre_url ? "Trocar Timbre" : "Enviar Timbre"}
                </span>
              </Button>
            </label>
            <input
              id="timbre-upload"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={handleTimbreUpload}
            />
            <p className="text-[9px] text-muted-foreground">PNG ou JPG. Largura recomendada: 210mm (A4).</p>
            {config.timbre_url && (
              <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive/80" onClick={handleRemoveTimbre}>
                Remover Timbre
              </Button>
            )}
          </div>
          {config.timbre_url && (
            <div className="border border-border rounded overflow-hidden max-w-[200px]">
              <img src={config.timbre_url} alt="Preview do timbre" className="w-full h-auto" />
            </div>
          )}
          {!config.timbre_url && (
            <div className="border border-dashed border-border rounded p-4 text-center text-[10px] text-muted-foreground max-w-[200px]">
              Sem timbre — documentos usarão formato ABNT limpo
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Endereço (Rodapé do Timbre)
            </label>
            <Input
              value={config.timbre_endereco}
              onChange={(e) => updateField("timbre_endereco", e.target.value)}
              className="bg-background border-border h-10"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Contatos (Rodapé do Timbre)
            </label>
            <Input
              value={config.timbre_contatos}
              onChange={(e) => updateField("timbre_contatos", e.target.value)}
              className="bg-background border-border h-10"
              maxLength={200}
            />
          </div>
        </div>
      </div>

      {/* Email Customization */}
      <div className="bg-card border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Personalização de E-mails
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary hover:text-primary/80"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-3 w-3 mr-1" />
            {showPreview ? "Ocultar Preview" : "Preview"}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Personalize a aparência dos e-mails automáticos (assinatura concluída, consulta confirmada, etc.).
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Nome do Remetente
            </label>
            <Input
              value={config.email_remetente_nome}
              onChange={(e) => updateField("email_remetente_nome", e.target.value)}
              className="bg-background border-border h-10"
              maxLength={100}
            />
          </div>
          <div className="flex gap-4">
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
                Cor Primária
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.email_cor_primaria}
                  onChange={(e) => updateField("email_cor_primaria", e.target.value)}
                  className="h-10 w-10 cursor-pointer border border-border bg-background"
                />
                <Input
                  value={config.email_cor_primaria}
                  onChange={(e) => updateField("email_cor_primaria", e.target.value)}
                  className="bg-background border-border h-10 font-mono text-xs"
                  maxLength={7}
                />
              </div>
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
                Cor de Fundo
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.email_cor_fundo}
                  onChange={(e) => updateField("email_cor_fundo", e.target.value)}
                  className="h-10 w-10 cursor-pointer border border-border bg-background"
                />
                <Input
                  value={config.email_cor_fundo}
                  onChange={(e) => updateField("email_cor_fundo", e.target.value)}
                  className="bg-background border-border h-10 font-mono text-xs"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Texto do Rodapé do E-mail
            </label>
            <Input
              value={config.email_rodape_texto}
              onChange={(e) => updateField("email_rodape_texto", e.target.value)}
              className="bg-background border-border h-10"
              maxLength={300}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Assinatura Personalizada (opcional)
            </label>
            <Textarea
              value={config.email_assinatura_texto}
              onChange={(e) => updateField("email_assinatura_texto", e.target.value)}
              className="bg-background border-border min-h-[80px] text-sm"
              placeholder="Ex: Atenciosamente, [Seu Nome] - [OAB]"
              maxLength={500}
            />
          </div>
        </div>

        {/* Email Preview */}
        {showPreview && (
          <div className="mt-4 border border-border overflow-hidden">
            <div className="px-3 py-2 bg-muted border-b border-border">
              <p className="text-[10px] text-muted-foreground tracking-wider uppercase flex items-center gap-1">
                <Palette className="h-3 w-3" />
                Preview do E-mail
              </p>
            </div>
            <div
              style={{
                fontFamily: "Georgia, serif",
                maxWidth: "100%",
                background: config.email_cor_fundo,
                color: "#e5e5e5",
                padding: "32px",
              }}
            >
              <div
                style={{
                  borderBottom: `2px solid ${config.email_cor_primaria}`,
                  paddingBottom: "16px",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {config.logo_url && (
                  <img
                    src={config.logo_url}
                    alt="Logo"
                    style={{ height: "40px", width: "40px", objectFit: "contain" }}
                  />
                )}
                <div>
                  <h1
                    style={{
                      color: config.email_cor_primaria,
                      fontSize: "20px",
                      margin: 0,
                    }}
                  >
                    {config.nome_escritorio}
                  </h1>
                  <p
                    style={{
                      color: "#888",
                      fontSize: "11px",
                      margin: "2px 0 0",
                      textTransform: "uppercase",
                      letterSpacing: "2px",
                    }}
                  >
                    {config.oab}
                  </p>
                </div>
              </div>

              <h2
                style={{
                  color: config.email_cor_primaria,
                  fontSize: "16px",
                }}
              >
                Documento Assinado com Sucesso
              </h2>

              <p style={{ lineHeight: 1.6, fontSize: "14px" }}>
                O documento{" "}
                <strong style={{ color: "#fff" }}>
                  "Contrato de Serviços — Exemplo"
                </strong>{" "}
                foi assinado por todas as partes.
              </p>

              <div
                style={{
                  background: "#111",
                  border: "1px solid #222",
                  padding: "16px",
                  margin: "20px 0",
                }}
              >
                <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                  📄 Documento:{" "}
                  <span style={{ color: "#e5e5e5" }}>
                    Contrato de Serviços — Exemplo
                  </span>
                </p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "12px",
                    color: "#888",
                  }}
                >
                  ✅ Status:{" "}
                  <span style={{ color: "#4ade80" }}>
                    Todas as assinaturas concluídas
                  </span>
                </p>
              </div>

              <a
                href="#"
                style={{
                  display: "inline-block",
                  background: config.email_cor_primaria,
                  color: "#000",
                  padding: "10px 24px",
                  textDecoration: "none",
                  fontWeight: "bold",
                  fontSize: "12px",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                Ver no Painel
              </a>

              {config.email_assinatura_texto && (
                <p
                  style={{
                    marginTop: "24px",
                    fontSize: "12px",
                    color: "#aaa",
                    whiteSpace: "pre-line",
                  }}
                >
                  {config.email_assinatura_texto}
                </p>
              )}

              <div
                style={{
                  borderTop: "1px solid #222",
                  marginTop: "32px",
                  paddingTop: "16px",
                }}
              >
                <p style={{ fontSize: "10px", color: "#555", margin: 0 }}>
                  Este e-mail foi enviado automaticamente pelo sistema{" "}
                  {config.nome_escritorio}.
                </p>
                <p
                  style={{ fontSize: "10px", color: "#555", margin: "4px 0 0" }}
                >
                  {config.email_rodape_texto}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stripe Connect */}
      <StripeConnectCard />

      <div className="bg-card border border-border p-4">
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          <strong className="text-muted-foreground/80">LGPD:</strong> Seus dados
          são protegidos conforme a Lei Geral de Proteção de Dados (Lei
          13.709/2018). Conformidade OAB Provimento 205/2021.
        </p>
      </div>
    </div>
  );
}
