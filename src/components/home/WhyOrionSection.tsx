import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ArrowRight } from "lucide-react";
import { IconNeuralAI, IconClock, IconTrending, IconShield, IconCRM, IconSparkles, IconAutomation } from "@/components/icons/SumerianTronIcons";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const reasons = [
  {
    Icon: IconNeuralAI,
    title: "IA de Verdade, Não Marketing",
    desc: "Motor neural proprietário com múltiplas camadas de inteligência artificial. Se uma camada falhar, outra assume em milissegundos — sem interrupções.",
    highlight: "99.9% uptime",
  },
  {
    Icon: IconClock,
    title: "De 4 Horas para 4 Minutos",
    desc: "Documentos que levavam horas para criar são gerados automaticamente. Contratos, relatórios e propostas prontos em minutos.",
    highlight: "60x mais rápido",
  },
  {
    Icon: IconTrending,
    title: "ROI Comprovado",
    desc: "Empresas que usam ORION reduzem custos operacionais em até 70% com automação de processos, documentos e atendimento.",
    highlight: "70% economia",
  },
  {
    Icon: IconShield,
    title: "Blindagem Total",
    desc: "Orion Shield com múltiplas camadas de defesa proprietária. Proteção de nível bancário com monitoramento contínuo e conformidade regulatória.",
    highlight: "Nível bancário",
  },
  {
    Icon: IconCRM,
    title: "Feito para Equipes Reais",
    desc: "CRM, chat ao vivo, gestão de processos, pipeline de vendas e dashboard de métricas. Tudo integrado, sem precisar de 10 ferramentas.",
    highlight: "Tudo-em-um",
  },
  {
    Icon: IconSparkles,
    title: "Evolui Sozinho",
    desc: "O Orion aprende com cada interação. Rede neural adaptativa que melhora respostas, sugere ações e antecipa necessidades.",
    highlight: "Auto-evolução",
  },
];

export function WhyOrionSection() {
  return (
    <section className="py-12 sm:py-16 section-cinematic relative overflow-hidden neural-ambient">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-primary/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-primary/[0.02] rounded-full blur-[120px]" />
      </div>
      <div className="absolute top-0 inset-x-0 cinematic-divider" />

      <div className="container px-4 sm:px-6 relative">
        <div className="text-center mb-8 sm:mb-10">
          <ScrollReveal direction="fade">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3 font-medium">
              POR QUE ESCOLHER O ORION
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-foreground mb-4 tracking-wide">
              Não é só mais uma plataforma de IA
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-4" />
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.3}>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              O ORION foi construído para resolver problemas reais de empresas reais. 
              Não é um chatbot com interface bonita — é um sistema inteligente completo que transforma operações.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-6xl mx-auto">
          {reasons.map((reason, i) => (
            <ScrollReveal key={reason.title} direction="up" delay={i * 0.08}>
              <div className="group relative h-full p-5 sm:p-6 border border-border/20 bg-card/20 hover:border-primary/30 transition-all duration-500 holo-card hud-frame">
                <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/30 group-hover:border-primary/60 transition-colors" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-primary/30 group-hover:border-primary/60 transition-colors" />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ boxShadow: "inset 0 0 25px hsl(var(--primary) / 0.04)" }}
                />
                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[9px] uppercase tracking-[0.15em] font-medium mb-4">
                  <IconAutomation className="h-3 w-3" />
                  {reason.highlight}
                </div>
                <reason.Icon className="h-7 w-7 text-primary mb-3 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-sm font-semibold text-foreground mb-2">{reason.title}</h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">{reason.desc}</p>
                <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/40 transition-all duration-500" />
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal direction="up" delay={0.5}>
          <div className="text-center mt-10 sm:mt-14">
            <Button size="lg" className="btn-gold px-8 sm:px-10 py-5 sm:py-6 text-xs shimmer" asChild>
              <Link to="/plataforma">
                Ver Todas as Capacidades
                <ArrowRight className="ml-3 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
