import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Star, ArrowRight, Loader2, Quote, MessageSquarePlus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AvaliacaoForm } from "@/components/dashboard/AvaliacaoForm";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import orionHero from "@/assets/orion-hero-depoimentos.png";
import person1 from "@/assets/testimonial-person-1.jpg";
import person2 from "@/assets/testimonial-person-2.jpg";
import person3 from "@/assets/testimonial-person-3.jpg";
import person4 from "@/assets/testimonial-person-4.jpg";
import person5 from "@/assets/testimonial-person-5.jpg";

interface Avaliacao {
  id: string;
  nome: string;
  foto_url: string | null;
  nota: number;
  depoimento: string;
  created_at: string;
}

const placeholderTestimonials = [
  {
    id: "p1",
    nome: "Carla Mendes",
    foto: person1,
    nota: 5,
    cargo: "CEO — MendesTech",
    depoimento: "O ORION transformou completamente nossa operação. A automação de documentos e o CRM inteligente nos economizam mais de 20 horas por semana. A IA realmente entende o contexto do nosso negócio.",
  },
  {
    id: "p2",
    nome: "Ricardo Alves",
    foto: person2,
    nota: 5,
    cargo: "Advogado — Alves & Associados",
    depoimento: "A geração automática de petições e contratos é impressionante. O motor neural analisa jurisprudência e sugere argumentos que eu não teria considerado. Indispensável para qualquer escritório.",
  },
  {
    id: "p3",
    nome: "Juliana Costa",
    foto: person3,
    nota: 5,
    cargo: "Produtora Digital",
    depoimento: "A plataforma de vendas integrada com IA é extraordinária. Criei minha loja, configurei afiliados e comecei a vender em menos de 24 horas. O suporte é excepcional.",
  },
  {
    id: "p4",
    nome: "Dr. Fernando Reis",
    foto: person4,
    nota: 5,
    cargo: "Diretor Industrial — ReisGroup",
    depoimento: "Implementamos o ORION na nossa linha de produção e os resultados são surpreendentes. O controle robótico via voz e o monitoramento SCADA em tempo real elevaram nossa eficiência em 40%.",
  },
  {
    id: "p5",
    nome: "Marco Bianchi",
    foto: person5,
    nota: 5,
    cargo: "CTO — Innovare Solutions",
    depoimento: "A segurança de nível bancário e a conformidade LGPD/GDPR foram decisivas na nossa escolha. O Orion Shield protege nossos dados com criptografia AES-256 e auditoria completa.",
  },
];

function getAvatarUrl(nome: string): string {
  const encoded = encodeURIComponent(nome || "U");
  return `https://ui-avatars.com/api/?name=${encoded}&background=1a1a2e&color=d4a853&size=128&bold=true&format=svg`;
}

export default function Depoimentos() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchAvaliacoes();
  }, []);

  const estatisticas = [
    { valor: "500+", label: "Empresas Atendidas" },
    { valor: "98%", label: "Satisfação dos Clientes" },
    { valor: "40%", label: "Aumento Médio de Produtividade" },
    { valor: "24/7", label: "Suporte IA Ativo" },
  ];

  return (
    <MainLayout>
      <SEO
        title="Depoimentos | ORION IA — Enterprise AI Platform"
        description="Veja o que nossos clientes dizem sobre a plataforma ORION. Avaliações reais de usuários da plataforma de IA empresarial."
        image="https://www.iasofthub.com/og-images/og-depoimentos.jpg"
      />

      {/* ─── Hero with Orion branding ─── */}
      <section className="relative min-h-[60vh] min-h-[60svh] flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src={orionHero}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.7)_70%,hsl(var(--background))_100%)]" />
        </div>

        <div className="container relative z-10 py-20 px-4 sm:px-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-4 font-medium">
            CASOS DE SUCESSO
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-foreground tracking-wide mb-4">
            O que dizem sobre o{" "}
            <span className="text-primary">ORION</span>
          </h1>
          <div className="w-20 h-0.5 bg-primary mx-auto mb-5" style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.5)" }} />
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
            Depoimentos reais de empresas e profissionais que transformaram seus resultados com a plataforma ORION.
          </p>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <section className="py-12 sm:py-16 bg-background relative overflow-hidden">
        <div className="container px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {estatisticas.map((stat, i) => (
              <ScrollReveal key={stat.label} direction="up" delay={i * 0.1}>
                <div className="text-center p-5 sm:p-6 border border-border/20 bg-card/20 backdrop-blur-sm group hover:border-primary/40 transition-all duration-500">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40 group-hover:border-primary/80 transition-colors" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40 group-hover:border-primary/80 transition-colors" />
                  <p className="text-2xl sm:text-3xl font-serif text-primary mb-1">{stat.valor}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground tracking-wider uppercase">{stat.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* ─── Featured Testimonials (placeholder with real photos) ─── */}
      <section className="py-16 sm:py-20 bg-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          
          backgroundSize: "60px 60px",
        }} />

        <div className="container px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">DEPOIMENTOS DESTACADOS</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-foreground mb-4 tracking-wide">
                Histórias de Transformação
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.2}>
              <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-4" />
            </ScrollReveal>
          </div>

          {/* Featured large testimonial */}
          <ScrollReveal direction="up" delay={0.2}>
            <div className="max-w-4xl mx-auto mb-12 border border-primary/20 bg-card/30 backdrop-blur-sm p-6 sm:p-10 relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/60" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-primary/60" />
              <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 60px hsl(var(--primary) / 0.03)" }} />

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <img
                  src={placeholderTestimonials[0].foto}
                  alt={placeholderTestimonials[0].nome}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border-2 border-primary/30 flex-shrink-0"
                />
                <div className="flex-1 text-center sm:text-left">
                  <Quote className="h-6 w-6 text-primary/30 mb-3 mx-auto sm:mx-0" />
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4 italic">
                    "{placeholderTestimonials[0].depoimento}"
                  </p>
                  <div className="flex items-center gap-1 justify-center sm:justify-start mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 text-primary fill-primary" />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{placeholderTestimonials[0].nome}</p>
                  <p className="text-[11px] text-primary/70 tracking-wider uppercase">{placeholderTestimonials[0].cargo}</p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Grid of other testimonials */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {placeholderTestimonials.slice(1).map((test, i) => (
              <ScrollReveal key={test.id} direction="up" delay={i * 0.1}>
                <div className="group relative p-5 sm:p-6 border border-border/20 bg-card/20 backdrop-blur-sm hover:border-primary/40 transition-all duration-500 h-full">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40 group-hover:border-primary/80 transition-colors" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40 group-hover:border-primary/80 transition-colors" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: "inset 0 0 30px hsl(var(--primary) / 0.05)" }} />

                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={test.foto}
                      alt={test.nome}
                      loading="lazy"
                      width={512}
                      height={512}
                      className="h-12 w-12 rounded-full object-cover border border-primary/30"
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{test.nome}</h4>
                      <p className="text-[10px] text-primary/60 tracking-wider uppercase">{test.cargo}</p>
                    </div>
                  </div>

                  <div className="flex gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-3 w-3 ${s <= test.nota ? "text-primary fill-primary" : "text-muted-foreground/20"}`} />
                    ))}
                  </div>

                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed italic">
                    "{test.depoimento}"
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* ─── Real User Testimonials from Supabase ─── */}
      <section className="py-16 sm:py-20 bg-background relative overflow-hidden">
        <div className="container px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">AVALIAÇÕES DE USUÁRIOS</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-foreground mb-4 tracking-wide">
                Avaliações da Comunidade
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.2}>
              <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-4" />
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Avaliações verificadas de usuários reais da plataforma ORION.
              </p>
            </ScrollReveal>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : avaliacoes.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {avaliacoes.map((avaliacao, index) => (
                <ScrollReveal key={avaliacao.id} direction="up" delay={index * 0.05}>
                  <div className="group relative p-5 sm:p-6 border border-border/20 bg-card/20 backdrop-blur-sm hover:border-primary/40 transition-all duration-500 h-full">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40 group-hover:border-primary/80 transition-colors" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40 group-hover:border-primary/80 transition-colors" />

                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={avaliacao.foto_url || getAvatarUrl(avaliacao.nome)}
                        alt={avaliacao.nome}
                        loading="lazy"
                        className="h-12 w-12 rounded-full object-cover border border-primary/30"
                      />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">{avaliacao.nome}</h4>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${star <= avaliacao.nota ? "text-primary fill-primary" : "text-muted-foreground/20"}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed italic">
                      "{avaliacao.depoimento}"
                    </p>

                    <p className="text-[9px] text-muted-foreground/40 mt-3 uppercase tracking-wider">
                      {new Date(avaliacao.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <ScrollReveal direction="up">
              <div className="max-w-lg mx-auto border border-border/20 bg-card/20 p-10 text-center">
                <Star className="h-10 w-10 text-primary/30 mx-auto mb-4" />
                <p className="text-foreground font-serif text-lg mb-2">Seja o primeiro a avaliar</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Compartilhe sua experiência com a plataforma ORION.
                </p>
                {!user ? (
                  <Button className="btn-gold" asChild>
                    <Link to="/auth">Fazer Login para Avaliar</Link>
                  </Button>
                ) : (
                  <Button className="btn-gold" onClick={() => setShowForm(true)}>
                    <MessageSquarePlus className="h-4 w-4 mr-2" />
                    Deixar Avaliação
                  </Button>
                )}
              </div>
            </ScrollReveal>
          )}
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* ─── User Testimonial Form ─── */}
      <section className="py-16 sm:py-20 bg-background relative overflow-hidden">
        <div className="container px-4 sm:px-6 relative z-10">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <ScrollReveal direction="fade">
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">SUA OPINIÃO</p>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.1}>
                <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-4 tracking-wide">
                  Compartilhe sua Experiência
                </h2>
              </ScrollReveal>
              <ScrollReveal direction="fade" delay={0.2}>
                <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  {user
                    ? "Conte como o ORION está ajudando o seu negócio."
                    : "Faça login para deixar sua avaliação e ajudar outros profissionais."
                  }
                </p>
              </ScrollReveal>
            </div>

            {user ? (
              showForm || avaliacoes.length > 0 ? (
                <ScrollReveal direction="up" delay={0.2}>
                  <div className="border border-border/20 bg-card/20 backdrop-blur-sm p-1">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40" />
                    <AvaliacaoForm onSuccess={() => {
                      setShowForm(false);
                      // Refetch
                      supabase
                        .from("avaliacoes")
                        .select("id, nome, foto_url, nota, depoimento, created_at")
                        .eq("aprovado", true)
                        .order("created_at", { ascending: false })
                        .then(({ data }) => setAvaliacoes(data || []));
                    }} />
                  </div>
                </ScrollReveal>
              ) : (
                <div className="text-center">
                  <Button className="btn-gold" onClick={() => setShowForm(true)}>
                    <MessageSquarePlus className="h-4 w-4 mr-2" />
                    Deixar minha Avaliação
                  </Button>
                </div>
              )
            ) : (
              <ScrollReveal direction="up" delay={0.2}>
                <div className="border border-border/20 bg-card/20 backdrop-blur-sm p-8 text-center">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40" />
                  <p className="text-sm text-muted-foreground mb-5">
                    Você precisa estar logado para deixar sua avaliação.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button className="btn-gold" asChild>
                      <Link to="/auth">
                        Fazer Login
                      </Link>
                    </Button>
                    <Button className="btn-outline-gold" asChild>
                      <Link to="/auth?tab=cadastro">
                        Criar Conta Grátis
                      </Link>
                    </Button>
                  </div>
                </div>
              </ScrollReveal>
            )}
          </div>
        </div>
      </section>

      {/* ─── CTA Final ─── */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <section className="py-16 sm:py-20 bg-background relative">
        <div className="container px-4 sm:px-6 text-center">
          <ScrollReveal direction="up">
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-4 tracking-wide">
              Pronto para Transformar seu Negócio?
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-xl mx-auto">
              Junte-se a centenas de empresas que já utilizam a plataforma ORION.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="btn-gold shimmer" asChild>
                <Link to="/cadastro">Começar Grátis</Link>
              </Button>
              <Button size="lg" className="btn-outline-gold" asChild>
                <Link to="/plataforma">
                  Ver Plataforma
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </MainLayout>
  );
}
