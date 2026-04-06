import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { IconNeuralAI, IconCRM, IconDocuments, IconAutomation } from "@/components/icons/SumerianTronIcons";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const socialProof = [
  { Icon: IconCRM, value: "Empresas", label: "de 8+ países" },
  { Icon: IconDocuments, value: "100+", label: "tipos de documentos" },
  { Icon: IconAutomation, value: "40+", label: "automações ativas" },
];

export function CtaSection() {
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-muted/10 to-background relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="container px-4 sm:px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <ScrollReveal direction="fade">
            <div className="relative inline-flex items-center justify-center h-16 w-16 border border-primary/30 bg-primary/5 mb-6">
              <IconNeuralAI className="h-8 w-8 text-primary" />
              <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-primary/60" />
              <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-primary/60" />
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-foreground mb-4 tracking-wide">
              Pronto para transformar sua empresa?
            </h2>
          </ScrollReveal>
          
          <ScrollReveal direction="fade" delay={0.2}>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-lg mx-auto">
              Comece a usar o ORION hoje. Crie sua conta gratuitamente e descubra como a IA pode 
              revolucionar seus processos em minutos.
            </p>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.3}>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-8">
              {socialProof.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <item.Icon className="h-4 w-4 text-primary/60" />
                  <span className="text-foreground font-semibold">{item.value}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={0.4}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="btn-gold px-8 sm:px-10 py-5 sm:py-6 text-xs shimmer w-full sm:w-auto" asChild>
                <Link to="/cadastro">
                  Criar Conta Grátis
                  <ArrowRight className="ml-3 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" className="btn-outline-gold px-8 sm:px-10 py-5 sm:py-6 text-xs w-full sm:w-auto" asChild>
                <Link to="/plataforma">
                  Ver Demonstração
                </Link>
              </Button>
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="fade" delay={0.5}>
            <p className="mt-6 text-[10px] text-muted-foreground/50 tracking-wider">
              SEM CARTÃO DE CRÉDITO • SETUP EM 2 MINUTOS • SUPORTE 24/7
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
