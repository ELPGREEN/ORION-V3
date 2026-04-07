import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { IconDollarSign, IconHandshake, IconShield, IconTrending } from "@/components/icons/SumerianTronIcons";

const benefits = [
  { icon: IconDollarSign, title: "Zero Investimento Inicial", desc: "Modelo de parceria sem custos de instalação. A ELP fornece toda a infraestrutura e tecnologia." },
  { icon: IconHandshake, title: "Revenue Sharing", desc: "Divisão de receita justa baseada nos materiais reciclados e subprodutos gerados." },
  { icon: IconShield, title: "Compliance Garantido", desc: "Conformidade total com regulamentações ambientais locais e internacionais." },
  { icon: IconTrending, title: "ROI Comprovado", desc: "Retorno sobre investimento demonstrado em todas as operações ativas globalmente." },
];

export function PartnershipModelSection() {
  return (
    <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/[0.03] rounded-full blur-[100px] pointer-events-none" />
      <div className="container relative px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <ScrollReveal direction="fade">
            <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-4">MODELO DE NEGÓCIO</p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl text-foreground tracking-wide mb-4 sm:mb-6">
              Parceria Sem Risco
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="gold-line w-20 mx-auto mb-6" />
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.3}>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Nosso modelo exclusivo elimina barreiras de entrada. Mineradoras podem reciclar seus pneus OTR sem nenhum investimento inicial.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {benefits.map((b, i) => (
            <ScrollReveal key={b.title} direction="up" delay={i * 0.1}>
              <div className="group flex gap-4 p-6 border border-border bg-card hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-500">
                <div className="w-12 h-12 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:border-primary/50 transition-colors">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-foreground mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
