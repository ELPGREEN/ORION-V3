import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicMeta } from "@/components/DynamicMeta";
import {
  MapPin, Phone, Mail, Globe, Scale, Award, Calendar,
  ExternalLink, MessageCircle, UserPlus, Linkedin, Instagram,
  BookOpen, ArrowRight, Share2, Briefcase, MessageSquare, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdvogadoSite() {
  const { advogadoId } = useParams<{ advogadoId: string }>();
  const [activeSection, setActiveSection] = useState("sobre");
  const [contactForm, setContactForm] = useState({ nome: "", email: "", telefone: "", mensagem: "" });
  const [sending, setSending] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  // Fetch lawyer config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["advogado-site-config", advogadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escritorio_public_view" as any)
        .select("*")
        .eq("user_id", advogadoId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!advogadoId,
  });

  // Fetch lawyer profile
  const { data: profile } = useQuery({
    queryKey: ["advogado-site-profile", advogadoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", advogadoId!)
        .single();
      return data;
    },
    enabled: !!advogadoId,
  });

  // Fetch published articles
  const { data: publicacoes } = useQuery({
    queryKey: ["advogado-site-publicacoes", advogadoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("publicacoes")
        .select("*")
        .eq("user_id", advogadoId!)
        .eq("publicado", true)
        .order("data_publicacao", { ascending: false })
        .limit(6);
      return data || [];
    },
    enabled: !!advogadoId,
  });

  // Fetch approved reviews
  const { data: avaliacoes } = useQuery({
    queryKey: ["advogado-site-avaliacoes", advogadoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("avaliacoes")
        .select("id, nome, nota, depoimento, foto_url, created_at")
        .eq("user_id", advogadoId!)
        .eq("aprovado", true)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!advogadoId,
  });

  // Scroll spy via IntersectionObserver
  useEffect(() => {
    const sections = ["sobre", "areas", "publicacoes", "avaliacoes", "contato"];
    const observers: IntersectionObserver[] = [];

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: "-30% 0px -60% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [config]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.nome || !contactForm.email || !contactForm.mensagem) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from("contacts").insert({
        name: contactForm.nome,
        email: contactForm.email,
        message: contactForm.mensagem,
        subject: `Contato via site do advogado`,
        user_id: advogadoId,
        channel: "website",
        status: "novo",
      });
      if (error) throw error;
      setContactSuccess(true);
      toast.success("Mensagem enviada com sucesso!");
      setContactForm({ nome: "", email: "", telefone: "", mensagem: "" });
    } catch {
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    }
    setSending(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copiado!");
  };

  if (configLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Scale className="h-16 w-16 text-muted-foreground/30" />
        <h1 className="text-xl font-serif text-foreground">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">Este advogado ainda não ativou seu site público.</p>
        <Link to="/">
          <Button variant="outline">Voltar ao início</Button>
        </Link>
      </div>
    );
  }

  const lawyerName = config.nome_escritorio || profile?.full_name || "Advogado";
  const areas = (config as any).areas_atuacao || [];
  const bio = (config as any).bio || "";
  const bannerUrl = (config as any).banner_url;
  const linkedinUrl = (config as any).linkedin_url;
  const instagramUrl = (config as any).instagram_url;
  const whatsapp = (config as any).whatsapp as string | undefined;
  const fraseImpacto = (config as any).frase_impacto as string | undefined;
  const experienciaAnos = (config as any).experiencia_anos as number | undefined;
  const metaDesc = (config as any).meta_description as string | undefined;

  const seoDescription = metaDesc || bio?.substring(0, 160) || `Advogado ${lawyerName} | OAB ${config.oab} | Assessoria jurídica especializada`;
  const canonicalUrl = `${window.location.origin}/advogado/${advogadoId}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    name: lawyerName,
    description: seoDescription,
    url: canonicalUrl,
    telephone: config.telefone,
    email: config.email_contato,
    address: config.endereco ? { "@type": "PostalAddress", streetAddress: config.endereco } : undefined,
    areaServed: "Brasil",
    serviceType: areas,
    provider: {
      "@type": "Person",
      name: lawyerName,
      jobTitle: "Advogado",
      sameAs: [linkedinUrl, instagramUrl].filter(Boolean),
      image: config.logo_url || profile?.avatar_url,
    },
  };

  const navItems = [
    { id: "sobre", label: "Sobre" },
    { id: "areas", label: "Áreas de Atuação" },
    { id: "publicacoes", label: "Publicações" },
    { id: "avaliacoes", label: "Avaliações" },
    { id: "contato", label: "Contato" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* SEO */}
      <DynamicMeta
        title={`${lawyerName} | Advogado | OAB ${config.oab || ""}`}
        description={seoDescription}
        image={config.logo_url || profile?.avatar_url || undefined}
        canonical={canonicalUrl}
        jsonLd={jsonLd}
      />

      {/* ═══════════════ HERO BANNER ═══════════════ */}
      <div className="relative overflow-hidden">
        <div
          className="h-72 md:h-96 bg-cover bg-center"
          style={{
            backgroundImage: bannerUrl
              ? `url(${bannerUrl})`
              : `linear-gradient(135deg, hsl(220 60% 12%), hsl(220 40% 8%))`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-black/40" />
        </div>

        {/* Hero content overlay */}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-5xl w-full mx-auto px-4 pb-8 md:pb-12">
            <div className="flex flex-col md:flex-row gap-6 items-end md:items-end">
              {/* Avatar */}
              <div className="h-28 w-28 md:h-36 md:w-36 rounded-2xl border-4 border-background bg-card overflow-hidden shadow-2xl flex-shrink-0 ring-2 ring-primary/20">
                {(config.logo_url || profile?.avatar_url) ? (
                  <img
                    src={config.logo_url || profile?.avatar_url || ""}
                    alt={`Foto de ${lawyerName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <Scale className="h-12 w-12 text-primary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  {config.oab && (
                    <Badge className="bg-primary/90 text-primary-foreground border-0 gap-1.5 text-xs font-semibold">
                      <Award className="h-3.5 w-3.5" />
                      OAB {config.oab}
                    </Badge>
                  )}
                  {experienciaAnos && experienciaAnos > 0 && (
                    <Badge variant="outline" className="border-primary/40 text-primary gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      +{experienciaAnos} anos de experiência
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground drop-shadow-sm">
                  {lawyerName}
                </h1>

                <p className="text-base md:text-lg text-muted-foreground max-w-xl">
                  {fraseImpacto || "Defendendo seus direitos com excelência"}
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-sm px-6"
                    onClick={() => document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Falar agora
                  </Button>
                  {whatsapp && (
                    <a
                      href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="gap-2 border-green-500/40 text-green-500 hover:bg-green-500/10">
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp
                      </Button>
                    </a>
                  )}
                  <Button variant="outline" size="icon" onClick={handleShare} className="border-border/50">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ STICKY NAV ═══════════════ */}
      <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                }}
                className={cn(
                  "px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeSection === item.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ═══════════════ CONTENT ═══════════════ */}
      <div className="max-w-5xl mx-auto px-4">

        {/* ──── SOBRE ──── */}
        <section id="sobre" className="py-12 space-y-8">
          <h2 className="text-xl font-serif text-foreground flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Sobre o Profissional
          </h2>

          {bio ? (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap max-w-3xl">
              {bio}
            </p>
          ) : (
            <p className="text-muted-foreground italic">
              Este profissional ainda não adicionou uma descrição.
            </p>
          )}

          {/* Quick contact badges */}
          <div className="flex flex-wrap gap-2">
            {config.telefone && (
              <a href={`tel:${config.telefone}`}>
                <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-primary/10 py-1.5">
                  <Phone className="h-3 w-3" /> {config.telefone}
                </Badge>
              </a>
            )}
            {config.email_contato && (
              <a href={`mailto:${config.email_contato}`}>
                <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-primary/10 py-1.5">
                  <Mail className="h-3 w-3" /> {config.email_contato}
                </Badge>
              </a>
            )}
            {config.endereco && (
              <Badge variant="outline" className="gap-1.5 py-1.5">
                <MapPin className="h-3 w-3" /> {config.endereco}
              </Badge>
            )}
            {config.website && (
              <a href={config.website.startsWith("http") ? config.website : `https://${config.website}`} target="_blank" rel="noopener noreferrer">
                <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-primary/10 py-1.5">
                  <Globe className="h-3 w-3" /> Website
                </Badge>
              </a>
            )}
            {linkedinUrl && (
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-primary/10 py-1.5">
                  <Linkedin className="h-3 w-3" /> LinkedIn
                </Badge>
              </a>
            )}
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-primary/10 py-1.5">
                  <Instagram className="h-3 w-3" /> Instagram
                </Badge>
              </a>
            )}
          </div>

          {/* CTA card */}
          <Card className="bg-gradient-to-r from-primary/10 to-background border-primary/20">
            <CardContent className="p-6 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1">
                <h3 className="font-serif text-foreground">Precisa de assessoria jurídica?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Entre em contato e agende uma consulta com {lawyerName}.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                  onClick={() => document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <MessageCircle className="h-4 w-4" />
                  Falar com o Advogado
                </Button>
                <Link to={`/cadastro?ref=${advogadoId}`}>
                  <Button variant="outline" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Cadastrar-se
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ──── ÁREAS ──── */}
        <section id="areas" className="py-12 space-y-6 border-t border-border/30">
          <h2 className="text-xl font-serif text-foreground flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Áreas de Atuação
          </h2>
          {areas.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {areas.map((area: string) => (
                <Card key={area} className="bg-card/80 border-border/40 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Scale className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium text-foreground text-sm">{area}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Áreas de atuação ainda não foram configuradas.
            </p>
          )}
        </section>

        {/* ──── PUBLICAÇÕES ──── */}
        <section id="publicacoes" className="py-12 space-y-6 border-t border-border/30">
          <h2 className="text-xl font-serif text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Publicações
          </h2>
          {publicacoes && publicacoes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {publicacoes.map((pub: any) => (
                <Card key={pub.id} className="overflow-hidden bg-card/80 border-border/40 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
                  {pub.imagem_capa && (
                    <div className="h-44 overflow-hidden">
                      <img
                        src={pub.imagem_capa}
                        alt={pub.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <CardContent className="p-5 space-y-2">
                    <Badge variant="outline" className="text-[10px]">{pub.categoria}</Badge>
                    <h3 className="font-semibold text-foreground text-sm line-clamp-2">{pub.titulo}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-3">{pub.resumo}</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {pub.data_publicacao ? new Date(pub.data_publicacao).toLocaleDateString("pt-BR") : ""}
                      </span>
                      <Link to={`/publicacoes/${pub.slug}`}>
                        <Button variant="ghost" size="sm" className="text-xs text-primary gap-1">
                          Ler mais <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Nenhuma publicação disponível ainda.
            </p>
          )}
        </section>

        {/* ──── AVALIAÇÕES ──── */}
        <section id="avaliacoes" className="py-12 space-y-6 border-t border-border/30">
          <h2 className="text-xl font-serif text-foreground flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Avaliações de Clientes
          </h2>
          {avaliacoes && avaliacoes.length > 0 ? (
            <>
              {/* Average rating */}
              <div className="flex items-center gap-3">
                <div className="flex">
                  {[...Array(5)].map((_, i) => {
                    const avg = avaliacoes.reduce((s, a: any) => s + a.nota, 0) / avaliacoes.length;
                    return (
                      <Star
                        key={i}
                        className={cn(
                          "h-5 w-5",
                          i < Math.round(avg) ? "fill-primary text-primary" : "text-muted-foreground/30"
                        )}
                      />
                    );
                  })}
                </div>
                <span className="text-sm text-muted-foreground">
                  {(avaliacoes.reduce((s, a: any) => s + a.nota, 0) / avaliacoes.length).toFixed(1)} — {avaliacoes.length} avaliação(ões)
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {avaliacoes.map((av: any) => (
                  <Card key={av.id} className="bg-card/80 border-border/40">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        {av.foto_url ? (
                          <img src={av.foto_url} alt={av.nome || "Cliente"} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                            {(av.nome || "C")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{av.nome || "Cliente"}</p>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={cn("h-3.5 w-3.5", i < av.nota ? "fill-primary text-primary" : "text-muted-foreground/20")} />
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(av.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {av.depoimento && (
                        <p className="text-sm text-muted-foreground leading-relaxed italic">
                          "{av.depoimento}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Nenhuma avaliação disponível ainda.
            </p>
          )}
        </section>

        {/* ──── CONTATO ──── */}
        <section id="contato" className="py-12 space-y-6 border-t border-border/30">
          <h2 className="text-xl font-serif text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Entre em Contato
          </h2>

          <div className="grid md:grid-cols-5 gap-8">
            {/* Form */}
            <div className="md:col-span-3">
              {contactSuccess ? (
                <Card className="bg-emerald-500/10 border-emerald-500/30">
                  <CardContent className="p-8 text-center space-y-3">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                      <MessageCircle className="h-8 w-8 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-serif text-foreground">Mensagem enviada!</h3>
                    <p className="text-sm text-muted-foreground">
                      O advogado entrará em contato em breve.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setContactSuccess(false)}
                      className="mt-2"
                    >
                      Enviar outra mensagem
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">Nome *</label>
                      <Input
                        value={contactForm.nome}
                        onChange={(e) => setContactForm((f) => ({ ...f, nome: e.target.value }))}
                        placeholder="Seu nome completo"
                        className="bg-card border-border"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">E-mail *</label>
                      <Input
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="seu@email.com"
                        className="bg-card border-border"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Telefone</label>
                    <Input
                      value={contactForm.telefone}
                      onChange={(e) => setContactForm((f) => ({ ...f, telefone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                      className="bg-card border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Mensagem *</label>
                    <Textarea
                      value={contactForm.mensagem}
                      onChange={(e) => setContactForm((f) => ({ ...f, mensagem: e.target.value }))}
                      placeholder="Descreva brevemente o que precisa..."
                      rows={4}
                      className="bg-card border-border"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto px-10 bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={sending}
                  >
                    {sending ? "Enviando..." : "Enviar Mensagem"}
                  </Button>
                </form>
              )}
            </div>

            {/* Contact sidebar */}
            <div className="md:col-span-2 space-y-4">
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/15 transition-colors"
                >
                  <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">{whatsapp}</p>
                  </div>
                </a>
              )}

              <Card className="bg-card/80 border-border/40">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-serif text-foreground text-sm">Informações de Contato</h3>
                  {config.telefone && (
                    <a href={`tel:${config.telefone}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="text-foreground">{config.telefone}</p>
                      </div>
                    </a>
                  )}
                  {config.email_contato && (
                    <a href={`mailto:${config.email_contato}`} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">E-mail</p>
                        <p className="text-foreground">{config.email_contato}</p>
                      </div>
                    </a>
                  )}
                  {config.endereco && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Endereço</p>
                        <p className="text-foreground">{config.endereco}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Register CTA */}
              <Card className="bg-gradient-to-br from-primary/15 to-primary/5 border-primary/20">
                <CardContent className="p-6 text-center space-y-3">
                  <UserPlus className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="font-serif text-foreground text-sm">Seja um cliente</h3>
                  <p className="text-xs text-muted-foreground">
                    Cadastre-se para acompanhar processos, documentos e consultas online.
                  </p>
                  <Link to={`/cadastro?ref=${advogadoId}`}>
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                      <UserPlus className="h-4 w-4" />
                      Criar Minha Conta
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-border/30 bg-card/50 mt-4">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <p className="text-xs text-muted-foreground">
            {lawyerName} {config.oab ? `• OAB ${config.oab}` : ""} • Powered by{" "}
            <span className="text-primary font-medium">ELP ORION Platform</span>
          </p>
        </div>
      </footer>

      {/* ═══════════════ FLOATING WHATSAPP ═══════════════ */}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Contato via WhatsApp"
        >
          <div className="relative h-14 w-14 flex items-center justify-center border border-primary/40 bg-background/80 backdrop-blur-sm hover:border-primary hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all duration-500">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/60" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/60" />
            <MessageSquare className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
          </div>
        </a>
      )}
    </div>
  );
}
