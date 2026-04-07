import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { TechLine, TechGridOverlay } from "@/components/ui/TechElements";
import { Star, ArrowRight, ExternalLink, Loader2, Quote } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHero } from "@/components/ui/PageHero";
import bgCarbonCard from "@/assets/bg-carbon-card.jpg";

interface Avaliacao {
  id: string;
  nome: string;
  foto_url: string | null;
  nota: number;
  depoimento: string;
  created_at: string;
}

function getAvatarUrl(nome: string): string {
  const encoded = encodeURIComponent(nome || "U");
  return `https://ui-avatars.com/api/?name=${encoded}&background=random&color=fff&size=128&bold=true&format=svg`;
}

export default function Depoimentos() {
  const { t } = useTranslation();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvaliacoes = async () => {
      try {
        const { data, error } = await supabase
          .from("avaliacoes")
          .select("id, nome, foto_url, nota, depoimento, created_at")
          .eq("aprovado", true)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setAvaliacoes(data || []);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    fetchAvaliacoes();
  }, []);

  const estatisticas = [
    { valor: "8+", label: t.testimonials.stats.yearsExperience },
    { valor: "8+", label: t.testimonials.stats.countriesExperience },
    { valor: "100%", label: t.testimonials.stats.ethicalCommitment },
  ];

  return (
    <MainLayout>
      <SEO 
        title="Depoimentos | ORION IA by ELP Green Technology" 
        description="Veja o que nossos clientes dizem sobre a plataforma ORION. Avaliações reais de usuários da plataforma de IA empresarial."
        image="https://www.elpgreen.com/og-images/og-depoimentos.jpg"
      />
      <PageHero
        label={t.testimonials.title}
        labelIcon={<Star className="h-4 w-4" />}
        title={t.testimonials.title}
        subtitle={t.testimonials.description}
        align="left"
        minHeight="55vh"
      />

      <TechLine />

      <section className="py-16 bg-background relative overflow-hidden">
        <TechGridOverlay variant="dots" />
        <div className="container relative">
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            {estatisticas.map((stat, index) => (
              <div 
                key={stat.label}
                className="text-center p-6 border border-border hover-gold-glow transition-all animate-fade-in-up"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <p className="text-4xl font-serif text-gold-shine mb-2">{stat.valor}</p>
                <p className="text-xs text-muted-foreground tracking-wider uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      <section className="py-24 bg-secondary relative overflow-hidden">
        <TechGridOverlay />
        <div className="container relative">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-6 animate-fade-in">
                {t.testimonials.sectionTitle}
              </p>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                {t.testimonials.title}
              </h2>
              <div className="gold-line w-16 mx-auto mb-8" />
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : avaliacoes.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {avaliacoes.map((avaliacao, index) => (
                  <div
                    key={avaliacao.id}
                    className="bg-card border border-border p-6 hover-gold-glow transition-all animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <img
                        src={avaliacao.foto_url || getAvatarUrl(avaliacao.nome)}
                        alt={avaliacao.nome}
                        loading="lazy"
                        decoding="async"
                        className="h-12 w-12 rounded-full object-cover border border-primary/30"
                      />
                      <div>
                        <h4 className="font-medium text-foreground">{avaliacao.nome}</h4>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= avaliacao.nota
                                  ? "text-primary fill-primary"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <Quote className="h-5 w-5 text-primary/30 mb-2" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {avaliacao.depoimento}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border p-12 hover-gold-glow transition-all animate-fade-in-up text-center">
                <Star className="h-12 w-12 text-primary mx-auto mb-6 opacity-50" />
                <p className="text-xl text-foreground mb-4 font-serif">
                  {t.testimonials.comingSoon}
                </p>
                <p className="text-muted-foreground mb-8">
                  {t.testimonials.seeGoogleReviews}
                </p>
                <Button asChild className="btn-gold">
                  <a href="https://www.elpgreen.com/" target="_blank" rel="noopener noreferrer">
                    {t.testimonials.viewGoogleReviews}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative animate-slide-right">
              <div className="absolute -top-4 -left-4 w-full h-full border border-primary/30" />
              <div className="relative overflow-hidden">
                <OptimizedImage src={bgCarbonCard} alt="ORION IA Platform" className="w-full h-auto object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-6">
                  <h3 className="text-xl font-serif text-foreground">ORION IA</h3>
                  <p className="text-primary text-sm">by ELP Green Technology</p>
                </div>
              </div>
            </div>
            <div className="space-y-6 animate-slide-left delay-200">
              <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium">Sobre a Plataforma</p>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground">
                Compromisso com a <span className="text-gold-shine">Excelência</span>
              </h2>
              <div className="gold-line w-20" />
              <p className="text-muted-foreground leading-relaxed">
                A plataforma ORION combina inteligência artificial avançada com tecnologia de ponta para oferecer soluções empresariais completas e integradas.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-5 tracking-wide">
            Pronto para Transformar seu Negócio?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-sm leading-relaxed">
            Descubra como a plataforma ORION pode revolucionar seus processos empresariais.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="btn-gold shimmer" asChild>
              <Link to="/cadastro">Começar Agora</Link>
            </Button>
            <Button size="lg" className="btn-outline-gold" asChild>
              <a href="https://www.elpgreen.com/" target="_blank" rel="noopener noreferrer">
                Fale Conosco
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
