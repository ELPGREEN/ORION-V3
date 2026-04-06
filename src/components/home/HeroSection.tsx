import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { IconAutomation, IconShield, IconGlobe, IconNeuralAI } from "@/components/icons/SumerianTronIcons";
import { Button } from "@/components/ui/button";
import { HeroThreeBackground } from "./HeroThreeBackground";
import { PlasmaCore } from "./PlasmaCore";
import orionTitle from "@/assets/orion-title-metallic.png";
import hudElement from "@/assets/hud-element.png";
import neuralBg from "@/assets/neural-bg.png";

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

      {/* Neural network background image */}
      <img
        src={neuralBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover z-[1] opacity-[0.07] mix-blend-screen pointer-events-none"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background z-[2]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.5)_70%,hsl(var(--background))_100%)] z-[2]" />

      {/* Holographic HUD element — right side, like the OG image */}
      <img
        src={hudElement}
        alt=""
        className="absolute right-[-5%] top-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] lg:w-[500px] opacity-[0.08] z-[2] pointer-events-none"
        style={{
          transform: `translate3d(0, calc(-50% + ${scrollY * 0.05}px), 0)`,
          filter: 'hue-rotate(-10deg)',
        }}
      />

      {/* HUD element — left side, mirrored and smaller */}
      <img
        src={hudElement}
        alt=""
        className="absolute left-[-8%] top-[30%] w-[200px] sm:w-[280px] opacity-[0.04] z-[2] pointer-events-none"
        style={{
          transform: `scaleX(-1) translate3d(0, ${scrollY * 0.03}px, 0)`,
        }}
      />

      <div
        className="container relative z-10 py-16 sm:py-20 px-4 sm:px-6"
        style={{
          opacity: heroOpacity,
          transform: `translate3d(0, ${heroTranslateY}px, 0)`,
        }}
      >
        <div className="max-w-5xl mx-auto text-center">
          {/* Plasma orb — tighter spacing */}
          <div
            className="mb-2 sm:mb-3"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0) scale(1)' : 'translate3d(0, 30px, 0) scale(0.7)',
              transition: 'opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.1s, transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.1s',
            }}
          >
            <div className="flex items-center justify-center">
              <PlasmaCore className="w-44 h-44 sm:w-56 sm:h-56 md:w-72 md:h-72 lg:w-80 lg:h-80" />
            </div>
          </div>

          {/* Metallic 3D ORION title — BIG with gold reflection */}
          <div
            className="relative"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0)' : 'translate3d(0, 20px, 0)',
              transition: 'opacity 0.8s ease 0.4s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.4s',
            }}
          >
            {/* Main title */}
            <img
              src={orionTitle}
              alt="ORION"
              className="h-32 sm:h-44 md:h-56 lg:h-72 xl:h-80 mx-auto drop-shadow-[0_0_40px_hsl(var(--primary)/0.5)]"
              style={{
                filter: 'drop-shadow(0 0 80px hsl(30 85% 52% / 0.4)) drop-shadow(0 0 120px hsl(30 85% 52% / 0.2))',
              }}
            />
            {/* Gold reflection below */}
            <img
              src={orionTitle}
              alt=""
              aria-hidden="true"
              className="h-32 sm:h-44 md:h-56 lg:h-72 xl:h-80 mx-auto pointer-events-none select-none"
              style={{
                transform: 'scaleY(-1) translateY(8px)',
                opacity: 0.15,
                filter: 'blur(4px) drop-shadow(0 0 40px hsl(30 85% 52% / 0.3))',
                maskImage: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)',
              }}
            />
          </div>

          <div
            className="w-20 sm:w-32 h-1 bg-primary mx-auto mb-3 sm:mb-4 plasma-glow"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'scaleX(1)' : 'scaleX(0)',
              transition: 'opacity 0.8s ease 0.5s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.5s',
              boxShadow: '0 0 20px hsl(30 85% 52% / 0.6), 0 4px 30px hsl(30 85% 52% / 0.3)',
            }}
          />

          <p
            className="text-primary uppercase tracking-[0.2em] sm:tracking-[0.3em] text-xs sm:text-sm md:text-base mb-4 sm:mb-6"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translate3d(0,0,0)' : 'translate3d(0, 30px, 0)',
              transition: 'opacity 0.8s ease 0.6s, transform 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.6s',
              textShadow: '0 0 20px hsl(30 85% 52% / 0.4)',
            }}
          >
            ENTERPRISE AI PLATFORM
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
              { Icon: IconAutomation, label: "Neural Automation" },
              { Icon: IconShield, label: "Cyber Shield" },
              { Icon: IconGlobe, label: "Multi-Language" },
              { Icon: IconNeuralAI, label: "Advanced AI" },
            ].map((item) => (
              <div key={item.label} className="hud-frame flex items-center gap-2 px-4 py-2 border border-primary/20 bg-primary/5 text-xs text-muted-foreground backdrop-blur-sm">
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
            Enterprise AI platform for process automation, 
            document management, teams and clients — powered by 
            next-generation neural intelligence.
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
                Get Started
                <ArrowRight className="ml-3 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" className="btn-outline-gold px-8 sm:px-10 py-5 sm:py-6 text-xs w-full sm:w-auto" asChild>
              <Link to="/plataforma">
                Explore Platform
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
            Powered by ELP® Green Technology
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
