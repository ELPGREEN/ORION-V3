import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { IconNeuralAI, IconCRM, IconDocuments, IconAutomation, IconTrending, IconShield } from "@/components/icons/SumerianTronIcons";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const socialProof = [
  { Icon: IconTrending, value: "70%", label: "redução de custos" },
  { Icon: IconDocuments, value: "100+", label: "tipos de documentos" },
  { Icon: IconAutomation, value: "17+", label: "módulos integrados" },
  { Icon: IconShield, value: "99.9%", label: "disponibilidade" },
];

export function CtaSection() {
  return (
    <section className="py-16 sm:py-24 section-cinematic relative overflow-hidden neural-ambient tron-energy">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 cinematic-divider" />
      
      <div className="container px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal direction="fade">
            <div className="relative inline-flex items-center justify-center h-16 w-16 border border-primary/30 bg-primary/5 mb-6">
              <IconNeuralAI className="h-8 w-8 text-primary" />
              <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-primary/60" />
              <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-primary/60" />
              {/* Pulse ring */}
              <div className="absolute inset-0 border border-primary/20 animate-ping" style={{ animationDuration: '3s' }} />
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4 tracking-wide">
              Pare de perder tempo com<br />
              <span className="text-primary">ferramentas fragmentadas</span>
            </h2>
          </ScrollReveal>
          
          <ScrollReveal direction="fade" delay={0.2}>
            <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
              O ORION substitui 8+ ferramentas por uma plataforma inteligente única.
              Comece grátis em 2 minutos — sem cartão de crédito, sem compromisso.
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.3}>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-10">
              {socialProof.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <item.Icon className="h-4 w-4 text-primary/60" />
                  <span className="text-foreground font-bold text-sm">{item.value}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={0.4}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="btn-gold px-10 sm:px-12 py-5 sm:py-6 text-xs shimmer w-full sm:w-auto" asChild>
                <Link to="/cadastro">
                  Criar Conta Grátis — 2 Minutos
                  <ArrowRight className="ml-3 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" className="btn-outline-gold px-8 sm:px-10 py-5 sm:py-6 text-xs w-full sm:w-auto" asChild>
                <Link to="/investidores">
                  Para Investidores
                </Link>
              </Button>
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="fade" delay={0.5}>
            <p className="mt-6 text-[10px] text-muted-foreground/50 tracking-wider">
              SEM CARTÃO DE CRÉDITO • SETUP EM 2 MINUTOS • SUPORTE 24/7 • GARANTIA DE SATISFAÇÃO
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
