import { Check, X } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const rows = [
  { feature: "Assistente IA avançado com raciocínio multicamada", orion: true, others: false },
  { feature: "Geração automática de 100+ documentos", orion: true, others: false },
  { feature: "CRM completo + pipeline de vendas", orion: true, others: false },
  { feature: "Faturamento e cobranças integrados", orion: true, others: false },
  { feature: "Chat IA + Chat ao vivo com clientes", orion: true, others: false },
  { feature: "Screening de compliance internacional", orion: true, others: false },
  { feature: "Comando de voz e visão computacional", orion: true, others: false },
  { feature: "Dashboard analytics em tempo real", orion: true, others: false },
  { feature: "Multi-idioma nativo (5 idiomas)", orion: true, others: true },
  { feature: "Conformidade LGPD/GDPR completa", orion: true, others: true },
  { feature: "Automação de processos empresariais", orion: true, others: false },
  { feature: "Sistema de defesa proprietário multicamada", orion: true, others: false },
  { feature: "Assinatura digital com validade jurídica", orion: true, others: false },
];

export function ComparisonSection() {
  return (
    <section className="py-12 sm:py-16 bg-muted/10 relative overflow-hidden tron-ambient">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[300px] bg-secondary/[0.025] rounded-full blur-[180px] pointer-events-none" />
      <div className="container relative px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-10">
          <ScrollReveal direction="fade">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">COMPARATIVO</p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground tracking-wide mb-4">
              Por que empresas migram para o ORION
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-4" />
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.3}>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Enquanto outras plataformas oferecem ferramentas isoladas, o ORION integra tudo em um 
              sistema inteligente único com IA de verdade.
            </p>
          </ScrollReveal>
        </div>

        <ScrollReveal direction="up" delay={0.2}>
          <div className="max-w-2xl mx-auto border border-border/20 bg-card/20 backdrop-blur-sm overflow-hidden">
            <div className="grid grid-cols-[1fr,56px,56px] sm:grid-cols-[1fr,120px,120px] bg-primary/5 p-3 sm:p-4 text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/20">
              <span>Funcionalidade</span>
              <span className="text-center text-primary font-medium">ORION</span>
              <span className="text-center">Outros</span>
            </div>
            {rows.map((row) => (
              <div
                key={row.feature}
                className="group grid grid-cols-[1fr,56px,56px] sm:grid-cols-[1fr,120px,120px] p-3 sm:p-4 border-t border-border/10 text-xs sm:text-sm hover:bg-primary/[0.02] transition-colors"
              >
                <span className="text-foreground text-[11px] sm:text-xs leading-snug">{row.feature}</span>
                <span className="flex justify-center">
                  {row.orion ? <Check className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 text-muted-foreground/30" />}
                </span>
                <span className="flex justify-center">
                  {row.others ? <Check className="h-4 w-4 text-muted-foreground/50" /> : <X className="h-4 w-4 text-muted-foreground/30" />}
                </span>
              </div>
            ))}
            <div className="grid grid-cols-[1fr,56px,56px] sm:grid-cols-[1fr,120px,120px] p-3 sm:p-4 border-t border-primary/20 bg-primary/5">
              <span className="text-foreground text-[11px] sm:text-xs font-semibold">Total de funcionalidades</span>
              <span className="text-center text-primary font-bold text-sm">13/13</span>
              <span className="text-center text-muted-foreground/50 font-bold text-sm">2/13</span>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
