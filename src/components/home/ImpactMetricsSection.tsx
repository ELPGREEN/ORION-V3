import { useRef, useEffect, useState } from "react";
import { IconTrending, IconClock, IconNeuralAI, IconGlobe, IconShield, IconSparkles } from "@/components/icons/SumerianTronIcons";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

function CountUp({ end, suffix = "", prefix = "", duration = 2000 }: { end: number; suffix?: string; prefix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = performance.now();
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
  }, [end, duration]);

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

const impactStats = [
  { icon: IconTrending, value: 70, suffix: "%", label: "Redução de Custos", desc: "Automação elimina tarefas manuais" },
  { icon: IconClock, value: 60, suffix: "x", label: "Mais Rápido", desc: "Documentos gerados em minutos" },
  { icon: IconNeuralAI, value: 17, suffix: "+", label: "Módulos IA", desc: "Ecossistema all-in-one completo" },
  { icon: IconGlobe, value: 5, suffix: "", label: "Idiomas Nativos", desc: "Operação multilíngue global" },
  { icon: IconShield, value: 99, suffix: ".9%", label: "Disponibilidade", desc: "Infraestrutura enterprise-grade" },
  { icon: IconSparkles, value: 100, suffix: "+", label: "Tipos de Docs", desc: "Geração automática com IA" },
];

export function ImpactMetricsSection() {
  return (
    <section className="py-12 sm:py-16 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container px-4 sm:px-6 relative z-10">
        <div className="text-center mb-10">
          <ScrollReveal direction="fade">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">IMPACTO REAL</p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-foreground mb-4 tracking-wide">
              Números que <span className="text-primary">Transformam</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-4" />
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.3}>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              O ORION entrega resultados mensuráveis desde o primeiro dia de uso.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
          {impactStats.map((stat, i) => (
            <ScrollReveal key={stat.label} direction="up" delay={i * 0.06}>
              <div className="group text-center p-4 sm:p-5 border border-border/20 bg-card/20 hover:border-primary/30 transition-all duration-500 h-full">
                <stat.icon className="h-6 w-6 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                <div className="text-2xl sm:text-3xl font-bold text-primary tabular-nums mb-1">
                  <CountUp end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs font-semibold text-foreground mb-1">{stat.label}</div>
                <div className="text-[10px] text-muted-foreground">{stat.desc}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
