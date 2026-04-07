import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEO } from "@/components/SEO";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

import { SectionDivider } from "@/components/ui/SectionDivider";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Calendar, User, Tag, Share2, BookOpen, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import DOMPurify from "dompurify";
import { ImageCarousel } from "@/components/publicacoes/ImageCarousel";

const isHtmlContent = (content: string) => /<(?:p|h[1-6]|div|ul|ol|li|blockquote|table|br|hr|strong|em)\b/i.test(content);

interface Publicacao {
  id: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  imagem_capa: string | null;
  categoria: string;
  autor: string;
  data_publicacao: string | null;
  carousel_images?: string[] | null;
}

const categoryLabels: Record<string, string> = {
  geral: "Geral",
  direito_penal: "Direito Penal",
  direitos_humanos: "Direitos Humanos",
  direito_internacional: "Direito Internacional",
  direito_trabalhista: "Direito Trabalhista",
};

function estimateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default function PublicacaoDetalhe() {
  const { slug } = useParams<{ slug: string }>();
  const [publicacao, setPublicacao] = useState<Publicacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchPublicacao();
  }, [slug]);

  const fetchPublicacao = async () => {
    if (!slug) return;

    try {
      let query = supabase
        .from("publicacoes")
        .select("*")
        .eq("publicado", true);

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      
      if (isUUID) {
        query = query.eq("id", slug);
      } else {
        query = query.eq("slug", slug);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        setNotFound(true);
        return;
      }

      setPublicacao(data as unknown as Publicacao);
    } catch (error) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && publicacao) {
      try {
        await navigator.share({
          title: publicacao.titulo,
          text: publicacao.resumo,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center pt-20">
          <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (notFound || !publicacao) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center pt-20">
          <div className="glass-card p-12 text-center max-w-md mx-4">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-6" />
            <h1 className="text-3xl font-serif text-foreground mb-4">Artigo não encontrado</h1>
            <p className="text-muted-foreground mb-8">
              O artigo que você procura não existe ou foi removido.
            </p>
            <Link to="/publicacoes">
              <Button className="btn-gold shimmer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Publicações
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const formattedDate = publicacao.data_publicacao
    ? format(new Date(publicacao.data_publicacao), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null;

  const readTime = estimateReadTime(publicacao.conteudo);

  return (
    <MainLayout>
      <SEO
        title={`${publicacao.titulo} | ORION IA by ELP Green Technology`}
        description={publicacao.resumo}
        image={publicacao.imagem_capa || undefined}
        ogType="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: publicacao.titulo,
          description: publicacao.resumo,
          author: { "@type": "Person", name: publicacao.autor },
          ...(publicacao.data_publicacao ? { datePublished: publicacao.data_publicacao } : {}),
          ...(publicacao.imagem_capa ? { image: publicacao.imagem_capa } : {}),
        }}
      />

      {/* Tron Hero with WebGL */}
      <section className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: "50vh", background: "hsl(var(--background))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--background))]/40 via-transparent to-[hsl(var(--background))]/70 z-[1]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,15,0.5)_70%,rgba(10,10,15,0.9)_100%)] z-[1]" />

        <div className="container relative z-10 py-16 sm:py-24 px-4 sm:px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 text-primary mb-5 text-xs sm:text-sm tracking-[0.3em] uppercase animate-fade-in">
              <Tag className="h-4 w-4" />
              {categoryLabels[publicacao.categoria] || publicacao.categoria}
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-foreground tracking-wide mb-6 animate-slide-right">
              {publicacao.titulo}
            </h1>
            <div className="w-24 h-1 bg-primary mb-6 mx-auto animate-fade-in" />
            {publicacao.resumo && (
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed font-light max-w-3xl mx-auto text-justify px-2 animate-fade-in delay-200">
                {publicacao.resumo}
              </p>
            )}
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
          <span className="text-[10px] text-muted-foreground/60 tracking-[0.2em] uppercase">scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-primary/40 to-transparent" />
        </div>
      </section>

      <SectionDivider variant="beam" />

      {/* Content Section */}
      <section className="py-16 sm:py-24 relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(hsl(var(--primary),0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary),0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", opacity: 0.2 }} />
        {/* Decorative elements */}
        <div className="absolute -right-20 top-20 w-96 h-96 border rotate-45 opacity-50 hidden sm:block" style={{ borderColor: "hsl(var(--primary),0.05)" }} />
        <div className="absolute -left-32 bottom-0 w-64 h-64 rounded-full blur-3xl hidden sm:block" style={{ background: "rgba(201,168,76,0.04)" }} />

        <div className="container max-w-4xl px-4 sm:px-6 relative">
          {/* Back Link */}
          <ScrollReveal direction="fade">
            <Link 
              to="/publicacoes"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-300 mb-8 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
              Voltar para Publicações
            </Link>
          </ScrollReveal>

          {/* Cover Image Card */}
          {/* Carousel or Cover Image */}
          {(() => {
            const carouselImages = [
              ...(publicacao.imagem_capa ? [publicacao.imagem_capa] : []),
              ...(publicacao.carousel_images || []),
            ].filter(Boolean);
            
            if (carouselImages.length === 0) return null;
            
            return (
              <ScrollReveal direction="up" delay={0.1}>
                <ImageCarousel images={carouselImages} title={publicacao.titulo} />
              </ScrollReveal>
            );
          })()}

          {/* Meta Card */}
          <ScrollReveal direction="up" delay={0.15}>
            <div className="glass-card p-5 sm:p-6 mb-8">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary/60" />
                  {publicacao.autor}
                </span>
                {formattedDate && (
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary/60" />
                    {formattedDate}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary/60" />
                  {readTime} min de leitura
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs text-primary uppercase tracking-[0.15em] border border-primary/20 bg-primary/5">
                  <Tag className="h-3 w-3" />
                  {categoryLabels[publicacao.categoria] || publicacao.categoria}
                </span>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-2 hover:text-primary transition-colors duration-300 ml-auto glass-card-subtle px-3 py-1.5 text-xs"
                  aria-label="Compartilhar artigo"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Compartilhar
                </button>
              </div>
            </div>
          </ScrollReveal>

          {/* Article Content Card */}
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="glass-card p-6 sm:p-8 md:p-10 mb-8">
              <article className="publicacao-article">
                {isHtmlContent(publicacao.conteudo) ? (
                  <div
                    className="publicacao-html-content prose prose-invert max-w-none
                      [&_h1]:text-2xl [&_h1]:md:text-3xl [&_h1]:font-serif [&_h1]:text-foreground [&_h1]:mt-10 [&_h1]:mb-5 [&_h1]:leading-tight
                      [&_h2]:text-xl [&_h2]:md:text-2xl [&_h2]:font-serif [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:leading-tight
                      [&_h3]:text-lg [&_h3]:font-serif [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:leading-tight
                      [&_p]:text-base [&_p]:text-muted-foreground [&_p]:leading-[1.85] [&_p]:mb-5
                      [&_strong]:text-foreground [&_strong]:font-semibold
                      [&_em]:text-muted-foreground [&_em]:italic
                      [&_ul]:space-y-2 [&_ul]:my-6 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:text-muted-foreground
                      [&_ol]:space-y-2 [&_ol]:my-6 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:text-muted-foreground
                      [&_li]:text-base [&_li]:text-muted-foreground [&_li]:leading-relaxed
                      [&_blockquote]:my-8 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-5 [&_blockquote]:py-3 [&_blockquote]:bg-primary/5 [&_blockquote]:rounded-r
                      [&_a]:text-primary [&_a]:hover:underline [&_a]:transition-colors
                      [&_hr]:my-10 [&_hr]:border-border/30"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(publicacao.conteudo, {
                        ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','hr','strong','b','em','i','u','a','ul','ol','li','blockquote','table','thead','tbody','tr','th','td','img','span','div','sub','sup','s','del','mark','code','pre'],
                        ALLOWED_ATTR: ['href','src','alt','title','target','rel','class','style'],
                      }),
                    }}
                  />
                ) : (
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h2 className="text-2xl md:text-3xl font-serif text-foreground mt-10 mb-5 leading-tight">
                        {children}
                      </h2>
                    ),
                    h2: ({ children }) => (
                      <div className="mt-10 mb-4">
                        <h2 className="text-xl md:text-2xl font-serif text-foreground mb-2 leading-tight">
                          {children}
                        </h2>
                        <div className="h-px w-16 bg-primary/40" />
                      </div>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-serif text-foreground mt-8 mb-3 leading-tight">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-base text-muted-foreground leading-[1.85] mb-5">
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="text-foreground font-semibold">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="text-muted-foreground italic">{children}</em>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-3 my-6 ml-1">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="flex items-start gap-3 text-base text-muted-foreground leading-relaxed">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                        <span>{children}</span>
                      </li>
                    ),
                    hr: () => (
                      <div className="my-10 flex items-center gap-4">
                        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/30" />
                        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                      </div>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="my-8 border-l-2 border-primary/40 pl-5 py-3 bg-primary/5 rounded-r">
                        {children}
                      </blockquote>
                    ),
                    a: ({ href, children }) => (
                      <a href={href} className="text-primary hover:underline transition-colors" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {publicacao.conteudo}
                </ReactMarkdown>
                )}
              </article>
            </div>
          </ScrollReveal>

          {/* Author Card */}
          <ScrollReveal direction="up" delay={0.1}>
            <div className="glass-card p-6 sm:p-8 flex items-center gap-5 mb-8">
              <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-xs text-primary uppercase tracking-[0.2em] mb-1">Autor</p>
                <p className="font-serif text-foreground text-lg">{publicacao.autor}</p>
                <p className="text-sm text-muted-foreground mt-0.5">Departamento de Desenvolvimento de Negócio e Integração de Sistemas</p>
              </div>
            </div>
          </ScrollReveal>

          {/* Share CTA Card */}
          <ScrollReveal direction="up" delay={0.15}>
            <div className="glass-card p-6 sm:p-8 text-center">
              <p className="text-sm text-muted-foreground mb-5">
                Gostou deste artigo? Compartilhe com colegas!
              </p>
              <Button onClick={handleShare} className="btn-gold shimmer px-8">
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar Artigo
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </MainLayout>
  );
}
