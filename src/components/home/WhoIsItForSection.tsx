import { Link } from "react-router-dom";
import { Scale, Building2, ShoppingBag, Briefcase, ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const profiles = [
  {
    icon: Scale,
    title: "Advogados",
    desc: "Pesquisa jurisprudencial com IA, geração de petições, gestão de processos e prazos.",
    href: "/clientes?perfil=advogados",
    highlight: "IA Jurídica",
  },
  {
    icon: Building2,
    title: "Escritórios & Empresas",
    desc: "CRM, gestão de equipe, faturamento, dashboard de métricas e multi-usuários.",
    href: "/clientes?perfil=escritorios",
    highlight: "Gestão Completa",
  },
  {
    icon: ShoppingBag,
    title: "Produtores Digitais",
    desc: "Loja própria, checkout integrado, gestão de produtos e dashboard de vendas.",
    href: "/clientes?perfil=produtores",
    highlight: "E-commerce IA",
  },
  {
    icon: Briefcase,
    title: "Afiliados",
    desc: "Links rastreáveis, comissões automáticas, dashboard de performance e marketplace.",
    href: "/clientes?perfil=afiliados",
    highlight: "Renda Passiva",
  },
];

export function WhoIsItForSection() {
  return (
    <section className="py-16 sm:py-24 bg-background relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container px-4 sm:px-6">
        <div className="text-center mb-12">
          <ScrollReveal direction="fade">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
              SOLUÇÕES POR PERFIL
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-foreground mb-4 tracking-wide">
              Para quem é o <span className="text-primary">ORION</span>?
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {profiles.map((profile, i) => {
            const Icon = profile.icon;
            return (
              <ScrollReveal key={profile.title} direction="up" delay={i * 0.08}>
                <Link
                  to={profile.href}
                  className="group relative flex flex-col h-full p-6 border border-border/20 bg-card/20 hover:border-primary/40 transition-all duration-500"
                >
                  <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/30 group-hover:border-primary/60 transition-colors" />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-primary/30 group-hover:border-primary/60 transition-colors" />
                  <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/50 transition-all duration-500" />

                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[9px] uppercase tracking-[0.15em] font-medium mb-4 self-start">
                    {profile.highlight}
                  </div>

                  <div className="h-10 w-10 border border-primary/20 flex items-center justify-center mb-4 group-hover:border-primary/50 transition-colors">
                    <Icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>

                  <h3 className="text-sm font-semibold text-foreground mb-2">{profile.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-4 flex-1">{profile.desc}</p>

                  <div className="flex items-center gap-1.5 text-[10px] text-primary uppercase tracking-[0.15em] font-medium group-hover:gap-2.5 transition-all">
                    Saiba mais <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}