import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { IconAutomation, IconShield, IconGlobe, IconNeuralAI, IconEye, IconBot } from "@/components/icons/SumerianTronIcons";
import { Button } from "@/components/ui/button";
import { HeroThreeBackground } from "./HeroThreeBackground";
import { PlasmaCore } from "./PlasmaCore";
import orionTitle from "@/assets/orion-title-metallic.png";
import hudElement from "@/assets/hud-element.png";
import neuralBg from "@/assets/neural-bg.png";
import bgHdHero from "@/assets/bg-hd-hero.jpg";

interface HeroSectionProps {
  t: any;
}

// Animated counter for hero stats
function AnimatedStat({ end, suffix = "", prefix = "", label }: { end: number; suffix?: string; prefix?: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = performance.now();
        const duration = 1800;
        const step = (now: number) => {
          const progress = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * end));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return (
    <div ref={ref} className="text-center px-2">
      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary tabular-nums">
        {prefix}{count}{suffix}
      </div>
      <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">{label}</div>
    </div>
  );
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

  const heroOpacity = Math.max(0, 1 - scrollY / 900);
  const heroTranslateY = scrollY * 0.08;

  return (
    <section className="relative min-h-[70vh] min-h-[70svh] flex items-center justify-center overflow-visible">
      {/* HD photorealistic background */}
      <img
        src={bgHdHero}
        alt=""
        loading="eager"
        decoding="async"
        /* @ts-ignore */
        fetchpriority="high"
        className="absolute inset-0 w-full h-full object-cover z-[0] opacity-40"
        width={1920}
        height={1080}
      />

      <HeroThreeBackground />

      {/* Neural network background image */}
      <img
        src={neuralBg}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover z-[1] opacity-[0.05] mix-blend-screen pointer-events-none"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background z-[2]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_70%,hsl(var(--background))_100%)] z-[2]" />

      {/* Holographic HUD elements */}
      <img
        src={hudElement}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute right-[-5%] top-1/2 -translate-y-1/2 w-[250px] sm:w-[350px] lg:w-[420px] opacity-[0.08] z-[2] pointer-events-none"
        style={{
          transform: `translate3d(0, calc(-50% + ${scrollY * 0.05}px), 0)`,
          filter: 'hue-rotate(-10deg)',
        }}
      />
      <img
        src={hudElement}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute left-[-8%] top-[30%] w-[180px] sm:w-[240px] opacity-[0.04] z-[2] pointer-events-none"
        style={{
          transform: `scaleX(-1) translate3d(0, ${scrollY * 0.03}px, 0)`,
        }}
      />

      <div
        className="container relative z-[15] py-2 sm:py-4 px-4 sm:px-6 pt-20 sm:pt-24 md:pt-28"
        style={{
          opacity: heroOpacity,
          transform: `translate3d(0, ${heroTranslateY}px, 0)`,
        }}
      >
        <div className="max-w-5xl mx-auto text-center">
          {/* Plasma orb */}
          <div
            className="mb-0"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0) scale(1)' : 'translate3d(0, 30px, 0) scale(0.7)',
              transition: 'opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.1s, transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.1s',
            }}
          >
            <div className="flex items-center justify-center">
              <PlasmaCore className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28" />
            </div>
          </div>

          {/* Metallic 3D ORION title */}
          <div
            className="relative"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0)' : 'translate3d(0, 20px, 0)',
              transition: 'opacity 0.8s ease 0.4s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.4s',
            }}
          >
            <img
              src={orionTitle}
              alt="ORION"
              className="h-12 sm:h-16 md:h-20 lg:h-24 xl:h-28 mx-auto drop-shadow-[0_0_40px_hsl(var(--primary)/0.5)]"
              style={{
                filter: 'drop-shadow(0 0 80px hsl(30 85% 52% / 0.4)) drop-shadow(0 0 120px hsl(30 85% 52% / 0.2))',
              }}
            />
          </div>

          <div
            className="w-12 sm:w-20 h-0.5 bg-primary mx-auto mb-1.5 sm:mb-2 plasma-glow"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'scaleX(1)' : 'scaleX(0)',
              transition: 'opacity 0.8s ease 0.5s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.5s',
              boxShadow: '0 0 20px hsl(30 85% 52% / 0.6), 0 4px 30px hsl(30 85% 52% / 0.3)',
            }}
          />

          <p
            className="text-primary uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs md:text-sm mb-2 sm:mb-3"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0)' : 'translate3d(0, 30px, 0)',
              transition: 'opacity 0.8s ease 0.6s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.6s',
              textShadow: '0 0 20px hsl(30 85% 52% / 0.4)',
            }}
          >
            A IA QUE EVOLUI SOZINHA
          </p>

          <div
            className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-3 sm:mb-4"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0)' : 'translate3d(0, 20px, 0)',
              transition: 'opacity 0.8s ease 0.7s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.7s',
            }}
          >
            {[
              { Icon: IconNeuralAI, label: "Motor Neural" },
              { Icon: IconEye, label: "Visão Computacional" },
              { Icon: IconBot, label: "Voz Inteligente" },
              { Icon: IconShield, label: "Cyber Shield" },
              { Icon: IconGlobe, label: "5 Idiomas" },
              { Icon: IconAutomation, label: "Auto-Evolução" },
            ].map((item) => (
              <div key={item.label} className="hud-frame flex items-center gap-1.5 px-3 py-1.5 border border-primary/20 bg-primary/5 text-[10px] text-muted-foreground backdrop-blur-sm">
                <item.Icon className="h-3.5 w-3.5 text-primary" />
                {item.label}
              </div>
            ))}
          </div>

          <p
            className="text-sm sm:text-base md:text-lg text-muted-foreground mb-4 sm:mb-5 max-w-2xl mx-auto leading-relaxed font-light text-center px-2"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0)' : 'translate3d(0, 30px, 0)',
              transition: 'opacity 0.8s ease 0.8s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.8s',
            }}
          >
            Plataforma de IA empresarial com <span className="text-primary font-medium">17+ módulos integrados</span>,
            visão computacional, voz inteligente e auto-evolução — tudo em um ecossistema
            que substitui <span className="text-primary font-medium">8+ ferramentas</span>.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-3 justify-center px-4 sm:px-0"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0)' : 'translate3d(0, 40px, 0)',
              transition: 'opacity 0.8s ease 1.1s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 1.1s',
            }}
          >
            <Button size="lg" className="btn-gold px-8 py-4 sm:py-5 text-xs shimmer w-full sm:w-auto" asChild>
              <Link to="/cadastro">
                Começar Grátis
                <ArrowRight className="ml-3 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" className="btn-outline-gold px-8 py-4 sm:py-5 text-xs w-full sm:w-auto" asChild>
              <Link to="/plataforma">
                Ver Plataforma
              </Link>
            </Button>
          </div>

          {/* Animated Stats Bar */}
          <div
            className="mt-10 sm:mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0 max-w-3xl mx-auto"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0)' : 'translate3d(0, 30px, 0)',
              transition: 'opacity 1s ease 1.4s, transform 1s cubic-bezier(0.22, 1, 0.36, 1) 1.4s',
            }}
          >
            <AnimatedStat end={17} suffix="+" label="Módulos IA" />
            <AnimatedStat end={200} suffix="+" label="Padrões Visuais" />
            <AnimatedStat end={100} suffix="+" label="Tipos de Docs" />
            <AnimatedStat end={5} suffix="" label="Idiomas Nativos" />
          </div>

          <p
            className="mt-5 text-[9px] text-muted-foreground/50 tracking-[0.2em] uppercase"
            style={{
              opacity: loaded ? 1 : 0,
              transition: 'opacity 1s ease 1.6s',
            }}
          >
            Powered by ELP® Green Technology
          </p>
        </div>
      </div>

      <button
        onClick={scrollToContent}
        className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 text-primary/60 hover:text-primary transition-colors z-10"
        style={{
          opacity: heroOpacity,
          animation: 'heroScrollBounce 2s ease-in-out infinite',
        }}
      >
        <ChevronDown className="h-5 w-5 sm:h-7 sm:w-7" />
      </button>
    </section>
  );
}
