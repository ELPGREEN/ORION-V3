import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TechLine } from "@/components/ui/TechElements";
import { useTranslation } from "@/contexts/LanguageContext";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { GatewayBackground } from "@/components/ui/GatewayBackground";
import { 
  Gavel, Globe, Heart, Briefcase, Shield, Scale,
  ArrowRight, CheckCircle2, MessageSquare,
} from "lucide-react";

const areaIcons = [Gavel, Globe, Heart, Briefcase, Shield, Scale];
const areaKeys = ["criminal", "international", "humanRights", "labor", "business", "civil"] as const;

export default function Escritorio() {
  const { t } = useTranslation();
  const s = t.escritorio;

  const areasAtuacao = areaKeys.map((key, idx) => ({
    icon: areaIcons[idx],
    titulo: s.areas[key].title,
    descricao: s.areas[key].desc,
    servicos: s.areas[key].items,
  }));

  return (
    <MainLayout>
      <SEO 
        title={`${s.heroTitle} ${s.heroTitleHighlight} | ELP Advocacia`}
        description={s.heroDescription}
      />

      <style>{`
        .tron-grid-bg-e {
          background-image:
            linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .tron-scanline-e::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 212, 255, 0.008) 2px, rgba(0, 212, 255, 0.008) 4px);
          pointer-events: none;
        }
      `}</style>

      {/* Hero */}
      <section 
        className="min-h-[60vh] flex items-center relative overflow-hidden"
        style={{ background: "hsl(var(--background))" }}
      >
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/70 z-[1]" />
        <div className="container py-16 sm:py-24 px-4 sm:px-6 relative" style={{ zIndex: 2 }}>
          <div className="max-w-3xl">
            <div className="gold-line w-20 mb-8 animate-fade-in" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground leading-tight mb-6 animate-slide-right delay-100">
              {s.heroTitle} <span className="text-gold-shine">{s.heroTitleHighlight}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed animate-slide-right delay-200 text-justify">
              {s.heroDescription}
            </p>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in delay-500" style={{ zIndex: 2 }}>
          <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase">{s.explore}</span>
          <div className="w-px h-12 bg-gradient-to-b from-primary/50 to-transparent" />
        </div>
      </section>

      <TechLine />

      {/* Áreas de Atuação */}
      <section className="py-16 sm:py-24 relative overflow-hidden tron-scanline-e" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="absolute inset-0 tron-grid-bg-e opacity-30 pointer-events-none" />
        <GatewayBackground opacity={0.2} />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="grid lg:grid-cols-2 gap-8">
            {areasAtuacao.map((area, index) => (
              <div 
                key={area.titulo} 
                className="group bg-card border border-border p-8 hover-lift hover-gold-glow animate-fade-in-up"
                style={{ animationDelay: `${(index % 4 + 1) * 100}ms` }}
              >
                <div className="flex items-start gap-6">
                  <div className="h-14 w-14 border border-primary/40 flex items-center justify-center flex-shrink-0 group-hover:border-primary transition-all">
                    <area.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-serif text-foreground mb-3 tracking-wide group-hover:text-primary transition-colors">
                      {area.titulo}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-6 text-justify">
                      {area.descricao}
                    </p>
                    <ul className="space-y-2">
                      {area.servicos.map((servico: string) => (
                        <li key={servico} className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="h-1.5 w-1.5 bg-primary flex-shrink-0" />
                          {servico}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* Diferenciais */}
      <section className="py-16 sm:py-24 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="absolute inset-0 tron-grid-bg-e opacity-20 pointer-events-none" />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="animate-slide-right delay-100">
              <div className="gold-line w-16 mb-6" />
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                {s.whyChoose} <span className="text-gold-shine">{s.whyChooseHighlight}</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8 text-justify">
                {s.whyChooseDescription}
              </p>
              <Button asChild className="btn-gold">
                <a href="https://wa.me/393501021359" target="_blank" rel="noopener noreferrer">
                  {s.scheduleConsultation}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 animate-slide-left delay-200">
              {s.differentials.map((item: string, index: number) => (
                <div 
                  key={item} 
                  className="flex items-center gap-3 p-4 bg-card border border-border hover-gold-glow transition-all animate-fade-in"
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 relative overflow-hidden tron-scanline-e" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-background/60 z-[1]" />
        <div className="container relative px-4 sm:px-6" style={{ zIndex: 2 }}>
          <div className="max-w-2xl mx-auto text-center">
            <div className="gold-line w-16 mx-auto mb-8" />
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6 animate-fade-in">
              {s.notFoundTitle}
            </h2>
            <p className="text-muted-foreground mb-10 animate-fade-in delay-100 text-justify">
              {s.notFoundDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-200">
              <Button asChild className="btn-gold px-10 shimmer">
                <a href="https://wa.me/393501021359" target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t.cta.whatsapp}
                </a>
              </Button>
              <Button asChild className="btn-outline-gold px-10">
                <Link to="/sobre">
                  {s.meetOffice}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
