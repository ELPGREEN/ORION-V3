import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Bot, Cpu, Zap, Settings, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const features = [
  { icon: Bot, title: "Robótica Autônoma", desc: "Linha robótica inteligente que processa pneus OTR gigantes de 57'' a 63'' com precisão milimétrica." },
  { icon: Cpu, title: "IA Integrada", desc: "Sistema de visão computacional e machine learning para otimização contínua do processo." },
  { icon: Zap, title: "Alta Performance", desc: "Capacidade de processamento de até 4 pneus OTR por hora com eficiência energética superior." },
  { icon: Settings, title: "Modular & Escalável", desc: "Plantas modulares adaptáveis a diferentes volumes e tipos de pneus fora-de-estrada." },
];

export function SmartOtrSection() {
  return (
    <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
      <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-primary/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="container relative px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <ScrollReveal direction="fade">
            <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-4">TECNOLOGIA</p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-foreground tracking-wide mb-4 sm:mb-6">
              Smart Robotic OTR Line
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="gold-line w-20 mx-auto mb-6" />
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.3}>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              A primeira linha robótica do mundo projetada exclusivamente para reciclagem de pneus OTR gigantes da mineração, com tecnologia proprietária e patenteada.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, i) => (
            <ScrollReveal key={feat.title} direction="up" delay={i * 0.1}>
              <div className="group p-6 sm:p-8 border border-border bg-card hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-500">
                <feat.icon className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-medium text-foreground mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal direction="up" delay={0.5}>
          <div className="text-center mt-10">
            <Button className="btn-outline-gold" asChild>
              <Link to="/sobre">
                Conheça Nossa Tecnologia <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
