import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const news = [
  { date: "Mar 2026", title: "ELP expande operações para a Austrália", excerpt: "Nova planta robótica será instalada em parceria com a maior mineradora do país." },
  { date: "Fev 2026", title: "Certificação B-Corp renovada com nota máxima", excerpt: "ELP Green Technology mantém padrão de excelência em responsabilidade social." },
  { date: "Jan 2026", title: "Parceria estratégica com Vale S.A.", excerpt: "Acordo de reciclagem de pneus OTR para todas as operações na América Latina." },
];

export function NewsSection() {
  return (
    <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
      <div className="container relative px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <ScrollReveal direction="fade">
            <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-4">NOTÍCIAS</p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl text-foreground tracking-wide mb-4 sm:mb-6">
              Últimas Novidades
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="gold-line w-20 mx-auto mb-6" />
          </ScrollReveal>
        </div>

        <div className="max-w-3xl mx-auto space-y-0">
          {news.map((item, i) => (
            <ScrollReveal key={item.title} direction="up" delay={i * 0.1}>
              <div className="group flex gap-6 p-6 border-b border-border hover:bg-primary/[0.02] transition-all duration-300">
                <div className="flex-shrink-0 text-xs text-primary uppercase tracking-widest pt-1 w-20">
                  {item.date}
                </div>
                <div>
                  <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.excerpt}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal direction="up" delay={0.4}>
          <div className="text-center mt-8">
            <Button className="btn-outline-gold" asChild>
              <Link to="/publicacoes">
                Ver Todas as Notícias <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
