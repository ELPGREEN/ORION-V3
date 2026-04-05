import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, Zap, Crown, Rocket } from "lucide-react";

const planos = [
  {
    nome: "Starter",
    descricao: "Para quem quer começar gratuitamente",
    preco: "Grátis",
    periodo: "",
    icon: Zap,
    destaque: false,
    recursos: [
      "Chat IA básico (10 msgs/mês)",
      "3 documentos/mês",
      "1 usuário",
      "Suporte por email",
    ],
    limitacoes: [
      "Sem pesquisa IA avançada",
      "Sem CRM",
    ],
  },
  {
    nome: "Professional",
    descricao: "Para profissionais e produtores",
    preco: "R$ 97",
    periodo: "/mês",
    icon: Rocket,
    destaque: false,
    recursos: [
      "100 msgs IA/mês",
      "Documentos ilimitados",
      "Pesquisa IA / Jurisprudência",
      "Loja digital (5 produtos)",
      "3 usuários",
      "Suporte por email",
    ],
    limitacoes: [],
  },
  {
    nome: "Business",
    descricao: "Para equipes e escritórios",
    preco: "R$ 297",
    periodo: "/mês",
    icon: Star,
    destaque: true,
    recursos: [
      "500 msgs IA/mês",
      "CRM completo + Pipeline",
      "Assinatura digital (50/mês)",
      "Loja + Afiliados ilimitados",
      "10 usuários",
      "Gestão de processos",
      "Dashboard métricas",
      "Suporte prioritário",
    ],
    limitacoes: [],
  },
  {
    nome: "Enterprise",
    descricao: "Para grandes operações",
    preco: "R$ 497",
    periodo: "/mês",
    icon: Crown,
    destaque: false,
    recursos: [
      "Tokens IA ilimitados",
      "Rede Neural completa",
      "API + Webhooks",
      "Usuários ilimitados",
      "Deals internacionais",
      "Onboarding dedicado",
      "SLA garantido",
    ],
    limitacoes: [],
  },
];

export default function Associado() {
  return (
    <MainLayout>
      <SEO title="Planos | ORION IA by ELP® Green Technology" description="Planos ORION IA: Starter gratuito, Professional, Business e Enterprise — para advogados, produtores, afiliados e empresas. ELP® Green Technology." image="https://www.iasofthub.com/og-images/og-associado.jpg" keywords="planos, preços, starter, professional, enterprise, ORION IA" />
      <section className="py-16 bg-gradient-to-b from-secondary to-background">
        <div className="container text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Escolha seu <span className="text-primary">Plano</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Planos para advogados, produtores digitais, afiliados e empresas de qualquer setor
          </p>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {planos.map((plano) => (
              <Card 
                key={plano.nome}
                className={`relative ${plano.destaque ? "border-primary shadow-elegant scale-105" : "border-border"}`}
              >
                {plano.destaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Mais Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div className={`h-12 w-12 rounded-full mx-auto mb-4 flex items-center justify-center ${plano.destaque ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <plano.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="font-serif text-2xl">{plano.nome}</CardTitle>
                  <CardDescription>{plano.descricao}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plano.preco}</span>
                    <span className="text-muted-foreground">{plano.periodo}</span>
                  </div>
                  <ul className="space-y-3 text-left mb-6">
                    {plano.recursos.map((recurso) => (
                      <li key={recurso} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        {recurso}
                      </li>
                    ))}
                    {plano.limitacoes.map((limitacao) => (
                      <li key={limitacao} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="h-4 w-4 flex items-center justify-center flex-shrink-0">-</span>
                        {limitacao}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plano.destaque ? "default" : "outline"} asChild>
                    <Link to="/cadastro">
                      {plano.preco === "Grátis" ? "Começar Grátis" : "Começar Agora"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted">
        <div className="container max-w-3xl">
          <h2 className="font-serif text-3xl font-bold text-center mb-8">Perguntas Frequentes</h2>
          <div className="space-y-4">
            {[
              { pergunta: "Posso cancelar a qualquer momento?", resposta: "Sim, você pode cancelar sua assinatura a qualquer momento. Não há fidelidade." },
              { pergunta: "A plataforma é só para advogados?", resposta: "Não! A ORION atende produtores digitais, afiliados, escritórios e empresas de qualquer setor." },
              { pergunta: "Posso fazer upgrade do plano?", resposta: "Sim, você pode fazer upgrade a qualquer momento. O valor é calculado proporcionalmente." },
              { pergunta: "As peças e conteúdos gerados são revisados?", resposta: "A IA gera conteúdo de alta qualidade, mas recomendamos sempre uma revisão profissional antes de publicar." },
            ].map((faq) => (
              <Card key={faq.pergunta}>
                <CardHeader className="pb-2"><CardTitle className="text-base font-medium">{faq.pergunta}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{faq.resposta}</p></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
