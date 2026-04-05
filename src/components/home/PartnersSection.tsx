import { ScrollReveal } from "@/components/ui/ScrollReveal";

const partners = [
  "Vale S.A.", "BHP Group", "Rio Tinto", "Anglo American",
  "Glencore", "Freeport-McMoRan", "Teck Resources", "First Quantum",
];

export function PartnersSection() {
  return (
    <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
      <div className="container relative px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <ScrollReveal direction="fade">
            <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-4">PARCEIROS</p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl text-foreground tracking-wide mb-4 sm:mb-6">
              Empresas que Confiam na ELP
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="gold-line w-20 mx-auto mb-6" />
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {partners.map((partner, i) => (
            <ScrollReveal key={partner} direction="scale" delay={i * 0.05}>
              <div className="p-6 border border-border bg-card text-center hover:border-primary/30 transition-all duration-300">
                <p className="text-sm font-medium text-muted-foreground">{partner}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
