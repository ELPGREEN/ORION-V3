import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Rocket, Scale, Factory, ArrowRight, Sparkles, Check } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserNiche, NICHE_TOOLS, type UserNiche } from "@/hooks/useUserNiche";
import { toast } from "@/hooks/use-toast";

const niches: Array<{
  id: UserNiche;
  icon: typeof Rocket;
  title: string;
  subtitle: string;
  description: string;
  href: string;
}> = [
  {
    id: "digital",
    icon: Rocket,
    title: "Empreendedor Digital",
    subtitle: "Infoprodutores, afiliados, criadores",
    description: "Funis, copy/VSL, lançamentos e tráfego pago — Orion executa o que faltava.",
    href: "/solucoes/produtores",
  },
  {
    id: "juridico",
    icon: Scale,
    title: "Escritório / Advogado",
    subtitle: "Petições, contratos, CRM jurídico",
    description: "Petição em 1 clique, contrato por IA e análise de processo padrão CNJ.",
    href: "/solucoes/advogados",
  },
  {
    id: "industria",
    icon: Factory,
    title: "Indústria / Robótica",
    subtitle: "Diagnóstico, ROS2, manutenção",
    description: "Diagnóstico de linha, OEE, ROI e plano de manutenção preventiva.",
    href: "/solucoes/industria",
  },
];

export default function Onboarding() {
  const { niche, setNiche } = useUserNiche();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");

  const choose = (id: UserNiche) => {
    setNiche(id);
    toast({ title: "Pronto!", description: "Mostrando só o que importa pra sua vertical." });
    const dest = next || niches.find(n => n.id === id)?.href || "/";
    setTimeout(() => navigate(dest), 400);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Comece pelo seu nicho | Orion"
        description="Escolha sua vertical — Digital, Jurídico ou Indústria — e o Orion entrega templates prontos e executáveis."
        canonical="https://www.iasofthub.com/onboarding"
      />
      <Header />
      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 max-w-6xl">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <Sparkles className="h-3 w-3 mr-1" /> Onboarding · 30 segundos
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-foreground mb-3 tracking-wide">
            Por onde você quer <span className="text-primary">começar?</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Escolha sua vertical. Orion mostra só o que importa pro seu contexto e entrega o primeiro resultado em minutos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {niches.map((n) => {
            const Icon = n.icon;
            const tools = NICHE_TOOLS[n.id];
            const selected = niche === n.id;
            return (
              <Card
                key={n.id}
                className={`p-6 border transition-all flex flex-col ${
                  selected ? "border-primary ring-2 ring-primary/30" : "border-border/40 hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  {selected && (
                    <Badge className="bg-primary/15 text-primary border-primary/40">
                      <Check className="h-3 w-3 mr-1" /> Selecionado
                    </Badge>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-1">{n.title}</h2>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{n.subtitle}</p>
                <p className="text-sm text-foreground/80 mb-5 flex-1">{n.description}</p>

                <div className="space-y-2 mb-5">
                  {tools.map((t) => (
                    <Link
                      key={t.to}
                      to={t.to}
                      className="flex items-center justify-between p-2.5 rounded-md border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm"
                    >
                      <div>
                        <div className="text-foreground/90">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                    </Link>
                  ))}
                </div>

                <button
                  onClick={() => choose(n.id)}
                  className="inline-flex items-center justify-center gap-2 w-full btn-gold py-2.5 rounded-md text-sm font-medium"
                >
                  {selected ? "Continuar" : "Escolher esta vertical"} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link to="/orion" className="text-xs text-muted-foreground hover:text-primary">
            Ainda não decidi — quero falar com o Orion primeiro →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
