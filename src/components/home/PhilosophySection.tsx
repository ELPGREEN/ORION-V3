import { useState } from "react";
import { Scale, Shield, Heart } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionDivider } from "@/components/ui/SectionDivider";
import bgCarbonCard from "@/assets/bg-carbon-card.jpg";

interface PhilosophySectionProps {
  t: any;
}

export function PhilosophySection({ t }: PhilosophySectionProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleStatueMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    setMousePosition({ x: x * 20, y: y * 15 });
  };

  const handleStatueMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <>
      <SectionDivider variant="fade" />
      <section className="py-16 sm:py-24 lg:py-32 bg-muted overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted to-background" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="container relative px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <ScrollReveal direction="right">
                <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-4 sm:mb-6">
                  {t.philosophy.sectionTitle}
                </p>
              </ScrollReveal>
              <ScrollReveal direction="right" delay={0.1}>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 sm:mb-6 tracking-wide">
                  {t.philosophy.title}
                </h2>
              </ScrollReveal>
              <ScrollReveal direction="fade" delay={0.2}>
                <div className="gold-line w-20 mb-6 sm:mb-8" />
              </ScrollReveal>
              <ScrollReveal direction="right" delay={0.2}>
                <p className="text-muted-foreground leading-relaxed text-base sm:text-lg mb-4 sm:mb-6 text-justify">
                  {t.philosophy.description1}
                </p>
              </ScrollReveal>
              <ScrollReveal direction="right" delay={0.3}>
                <p className="text-muted-foreground/80 leading-relaxed text-sm sm:text-base mb-6 sm:mb-8 text-justify">
                  {t.philosophy.description2}
                </p>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.4}>
                <div className="flex gap-6 sm:gap-8 pt-6 sm:pt-8 border-t border-border">
                  {[
                    { icon: Scale, label: t.philosophy.ethics },
                    { icon: Shield, label: t.philosophy.excellence },
                    { icon: Heart, label: t.philosophy.results },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="group">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 border border-primary/20 flex items-center justify-center mb-3 sm:mb-4 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-500">
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary icon-gold-glow" />
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-[0.15em]">{label}</p>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal
              direction="left"
              delay={0.2}
              className="order-1 lg:order-2 relative flex justify-center"
            >
              <div
                onMouseMove={handleStatueMouseMove}
                onMouseLeave={handleStatueMouseLeave}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-60 h-60 sm:w-80 sm:h-80 bg-primary/10 rounded-full blur-3xl" />
                </div>

                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] border border-primary/20 rounded-full parallax-float"
                  style={{ transform: `translate(-50%, -50%) rotate(${mousePosition.x * 2}deg)` }}
                />

                <div
                  className="relative z-10 transition-transform duration-300 ease-out"
                  style={{ transform: `perspective(1000px) rotateY(${mousePosition.x}deg) rotateX(${-mousePosition.y}deg)` }}
                >
                  <OptimizedImage
                    src={bgCarbonCard}
                    alt="ORION IA Technology"
                    className="h-[300px] sm:h-[400px] md:h-[500px] w-auto object-cover drop-shadow-2xl rounded-lg"
                  />
                </div>

                <div className="absolute bottom-10 left-10 w-3 h-3 bg-primary/60 glow-pulse hidden sm:block" />
                <div className="absolute top-20 right-10 w-2 h-2 bg-primary/40 glow-pulse hidden sm:block" style={{ animationDelay: '0.5s' }} />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </>
  );
}
