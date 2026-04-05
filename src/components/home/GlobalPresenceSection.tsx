import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Globe, MapPin } from "lucide-react";

const regions = [
  { name: "Europa", countries: "Itália, Alemanha, Espanha", flag: "🇪🇺" },
  { name: "América do Sul", countries: "Brasil, Chile, Peru, Colômbia", flag: "🌎" },
  { name: "África", countries: "África do Sul, Moçambique, Gana", flag: "🌍" },
  { name: "Ásia-Pacífico", countries: "Austrália, Índia, Indonésia", flag: "🌏" },
];

export function GlobalPresenceSection() {
  return (
    <section className="py-20 sm:py-28 bg-muted relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted to-background" />
      <div className="container relative px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <ScrollReveal direction="fade">
            <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-4">PRESENÇA GLOBAL</p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl text-foreground tracking-wide mb-4 sm:mb-6">
              Operações em 4 Continentes
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="gold-line w-20 mx-auto mb-6" />
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.3}>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              A ELP Green Technology leva soluções sustentáveis de reciclagem de pneus OTR para as maiores operações de mineração do mundo.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {regions.map((region, i) => (
            <ScrollReveal key={region.name} direction="up" delay={i * 0.1}>
              <div className="group text-center p-6 sm:p-8 border border-border bg-card hover:border-primary/30 transition-all duration-500">
                <span className="text-4xl mb-4 block">{region.flag}</span>
                <h3 className="text-lg font-medium text-foreground mb-2">{region.name}</h3>
                <p className="text-sm text-muted-foreground">{region.countries}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
