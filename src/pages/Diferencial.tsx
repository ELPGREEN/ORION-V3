import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ParticleBackground } from "@/components/ui/ParticleBackground";
import { TechLine, GlassCard, TechGridOverlay, TechSectionLabel } from "@/components/ui/TechElements";
import { useTranslation } from "@/contexts/LanguageContext";
import heroBg from "@/assets/bg-carbon-hero.jpg";
import { 
  Shield, 
  Globe, 
  GraduationCap, 
  Heart, 
  Scale, 
  Brain,
  Lock,
  FileCheck,
  ArrowRight,
  Award,
  Users,
  BookOpen,
} from "lucide-react";

const itemIcons = [GraduationCap, Globe, Brain, Lock, Heart, FileCheck];
const itemKeys = ["education", "countries", "technology", "security", "proBono", "personalized"] as const;

export default function Diferencial() {
  const { t } = useTranslation();
  const d = t.diferencial;

  const diferenciais = itemKeys.map((key, idx) => ({
    icon: itemIcons[idx],
    titulo: d.items[key].title,
    descricao: d.items[key].desc,
  }));

  const numeros = [
    { valor: "8+", label: d.numbers.yearsExp },
    { valor: "8+", label: d.numbers.countries },
    { valor: "Harvard", label: d.numbers.harvardBerkeley },
    { valor: "Global", label: "Plataforma" },
  ];

  const techItems = [
    { icon: Lock, ...d.techItems.tls },
    { icon: Shield, ...d.techItems.rls },
    { icon: Scale, ...d.techItems.lgpd },
    { icon: Award, ...d.techItems.secrecy },
  ];

  return (
    <MainLayout>
      <SEO 
        title={`${d.heroTitle} ${d.heroTitleHighlight} | ORION IA by ELP® Green Technology`}
        description={d.heroDescription}
        image="https://www.iasofthub.com/og-images/og-diferencial.jpg"
        keywords="diferencial, IA empresarial, tecnologia, inovação, segurança"
      />

      {/* Hero */}
      <section 
        className="min-h-[60vh] flex items-center relative"
        style={{
          backgroundImage: `linear-gradient(to right, hsl(220 20% 4% / 0.95), hsl(220 15% 6% / 0.85)), url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="container py-16 sm:py-24 px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="gold-line w-20 mb-8 animate-fade-in" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground leading-tight mb-6 animate-slide-right delay-100">
              {d.heroTitle} <span className="text-gold-shine">{d.heroTitleHighlight}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed animate-slide-right delay-200 text-justify">
              {d.heroDescription}
            </p>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in delay-500">
          <span className="text-xs text-muted-foreground tracking-[0.2em] uppercase">{d.explore}</span>
          <div className="w-px h-12 bg-gradient-to-b from-primary/50 to-transparent" />
        </div>
      </section>

      <TechLine />

      {/* Números */}
      <section className="py-12 sm:py-16 bg-secondary relative overflow-hidden">
        <TechGridOverlay />
        <div className="container px-4 sm:px-6 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {numeros.map((num, index) => (
              <div key={num.label} className="text-center animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                <p className="text-3xl md:text-4xl font-serif text-gold-shine mb-2">
                  {num.valor}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-[0.15em]">{num.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* Diferenciais */}
      <section className="py-16 sm:py-24 bg-background relative overflow-hidden">
        <ParticleBackground />
        <TechGridOverlay variant="dots" />
        <div className="container px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-6 animate-fade-in">
              {d.whyChooseUs}
            </p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4 animate-slide-up delay-100">
              {d.excellenceTitle}
            </h2>
            <div className="gold-line w-16 mx-auto animate-fade-in delay-200" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {diferenciais.map((item, index) => (
              <div 
                key={item.titulo} 
                className="group bg-card border border-border p-8 hover-lift hover-gold-glow transition-all animate-fade-in-up"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <div className="h-14 w-14 border border-primary/40 flex items-center justify-center mb-6 group-hover:border-primary transition-colors">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-serif text-foreground mb-3 tracking-wide group-hover:text-primary transition-colors">
                  {item.titulo}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed text-justify">
                  {item.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* Tecnologia e Segurança */}
      <section className="py-16 sm:py-24 bg-muted relative overflow-hidden">
        <TechGridOverlay />
        <div className="container max-w-4xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-serif text-foreground mb-4">
              {d.techSecurityTitle} <span className="text-gold-shine">{d.techSecurityHighlight}</span>
            </h2>
            <div className="gold-line w-16 mx-auto mb-6" />
            <p className="text-muted-foreground text-sm max-w-2xl mx-auto text-justify">
              {d.techSecurityDesc}
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-6">
            {techItems.map((item, index) => (
              <div 
                key={item.title} 
                className="flex items-start gap-4 p-6 bg-card border border-border hover-gold-glow transition-all animate-fade-in-up"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <div className="h-10 w-10 border border-primary/40 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-foreground font-medium text-sm mb-1">{item.title}</h4>
                  <p className="text-muted-foreground text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] border border-primary" style={{ transform: 'translate(-50%, -50%) rotate(45deg)' }} />
        </div>
        
        <div className="container relative px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="gold-line w-16 mx-auto mb-8" />
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6 animate-fade-in">
              {d.ctaTitle}
            </h2>
            <p className="text-muted-foreground mb-10 animate-fade-in delay-100 text-justify">
              {d.ctaDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-200">
              <Button asChild className="btn-gold px-10 shimmer">
                <a href="https://wa.me/393501021359" target="_blank" rel="noopener noreferrer">
                  {t.cta.whatsapp}
                </a>
              </Button>
              <Button asChild className="btn-outline-gold px-10">
                <a href="https://www.iasofthub.com/" target="_blank" rel="noopener noreferrer">
                  {t.cta.contact}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
