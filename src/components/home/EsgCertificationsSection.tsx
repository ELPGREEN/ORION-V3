import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Leaf, Award, FileCheck, Shield } from "lucide-react";

const certs = [
  { icon: FileCheck, title: "ISO 14001", desc: "Sistema de Gestão Ambiental certificado internacionalmente." },
  { icon: Award, title: "B-Corp Certified", desc: "Empresa certificada B-Corp por impacto social e ambiental positivo." },
  { icon: Leaf, title: "Carbon Neutral", desc: "Operações com neutralidade de carbono verificada e auditada." },
  { icon: Shield, title: "ESG Rating AA", desc: "Classificação ESG de alto nível por agências independentes." },
];

export function EsgCertificationsSection() {
  return (
    <section className="py-20 sm:py-28 bg-muted relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted to-background" />
      <div className="container relative px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <ScrollReveal direction="fade">
            <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-4">ESG & CERTIFICAÇÕES</p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl text-foreground tracking-wide mb-4 sm:mb-6">
              Compromisso com a Sustentabilidade
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="gold-line w-20 mx-auto mb-6" />
          </ScrollReveal>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {certs.map((cert, i) => (
            <ScrollReveal key={cert.title} direction="up" delay={i * 0.1}>
              <div className="group text-center p-6 sm:p-8 border border-border bg-card hover:border-primary/30 transition-all duration-500">
                <cert.icon className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="text-base font-medium text-foreground mb-2">{cert.title}</h3>
                <p className="text-sm text-muted-foreground">{cert.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
