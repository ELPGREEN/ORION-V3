import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { IconAutomation, IconShield, IconGlobe, IconNeuralAI } from "@/components/icons/SumerianTronIcons";
import { Button } from "@/components/ui/button";
import { HeroThreeBackground } from "./HeroThreeBackground";
import { PlasmaCore } from "./PlasmaCore";

interface HeroSectionProps {
  t: any;
}

export function HeroSection({ t }: HeroSectionProps) {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  };

  const heroOpacity = Math.max(0, 1 - scrollY / 600);
  const heroTranslateY = scrollY * 0.15;

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
      <HeroThreeBackground />

      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background z-[1]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.5)_70%,hsl(var(--background))_100%)] z-[1]" />

      <div
        className="container relative z-10 py-16 sm:py-20 px-4 sm:px-6"
        style={{
          opacity: heroOpacity,
          transform: `translate3d(0, ${heroTranslateY}px, 0)`,
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="mb-6 sm:mb-8"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0) scale(1)' : 'translate3d(0, 30px, 0) scale(0.7)',
              transition: 'opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.1s, transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.1s',
            }}
          >
            <div className="flex items-center justify-center">
              <PlasmaCore className="w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 lg:w-72 lg:h-72" />
            </div>
          </div>

          <div
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0)' : 'translate3d(0, 20px, 0)',
              transition: 'opacity 0.8s ease 0.4s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.4s',
            }}
          >
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-foreground tracking-[0.15em] mb-2">
              ORION
            </h1>
          </div>

          <div
            className="w-16 sm:w-24 h-1 bg-primary mx-auto mb-4 sm:mb-6"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'scaleX(1)' : 'scaleX(0)',
              transition: 'opacity 0.8s ease 0.5s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.5s',
            }}
          />

          <p
            className="text-primary uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs sm:text-sm md:text-base mb-6 sm:mb-8"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0)' : 'translate3d(0, 30px, 0)',
              transition: 'opacity 0.8s ease 0.6s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.6s',
            }}
          >
            INTELIGÊNCIA ARTIFICIAL EMPRESARIAL
          </p>

          <div
            className="flex flex-wrap justify-center gap-3 mb-8 sm:mb-10"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0)' : 'translate3d(0, 20px, 0)',
              transition: 'opacity 0.8s ease 0.7s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.7s',
            }}
          >
            {[
              { Icon: IconAutomation, label: "Automação Inteligente" },
              { Icon: IconShield, label: "Orion Shield" },
              { Icon: IconGlobe, label: "Multi-idioma" },
              { Icon: IconNeuralAI, label: "IA Avançada" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 px-4 py-2 border border-primary/20 bg-primary/5 text-xs text-muted-foreground backdrop-blur-sm">
                <item.Icon className="h-4 w-4 text-primary" />
                {item.label}
              </div>
            ))}
          </div>

          <p
            className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed font-light text-center px-2"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0)' : 'translate3d(0, 30px, 0)',
              transition: 'opacity 0.8s ease 0.8s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.8s',
            }}
          >
            Plataforma de IA empresarial para automação de processos, 
            gestão de documentos, clientes e equipes com 
            inteligência artificial de última geração.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0)' : 'translate3d(0, 40px, 0)',
              transition: 'opacity 0.8s ease 1.1s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 1.1s',
            }}
          >
            <Button size="lg" className="btn-gold px-8 sm:px-10 py-5 sm:py-6 text-xs shimmer w-full sm:w-auto" asChild>
              <Link to="/cadastro">
                Começar Agora
                <ArrowRight className="ml-3 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" className="btn-outline-gold px-8 sm:px-10 py-5 sm:py-6 text-xs w-full sm:w-auto" asChild>
              <Link to="/plataforma">
                Conhecer a Plataforma
              </Link>
            </Button>
          </div>

          <p
            className="mt-8 text-[10px] text-muted-foreground/50 tracking-[0.2em] uppercase"
            style={{
              opacity: loaded ? 1 : 0,
              transition: 'opacity 1s ease 1.4s',
            }}
          >
            Desenvolvido por ELP® Green Technology
          </p>
        </div>
      </div>

      <button
        onClick={scrollToContent}
        className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 text-primary/60 hover:text-primary transition-colors z-10"
        style={{
          opacity: heroOpacity,
          animation: 'heroScrollBounce 2s ease-in-out infinite',
        }}
      >
        <ChevronDown className="h-6 w-6 sm:h-8 sm:w-8" />
      </button>
    </section>
  );
}
