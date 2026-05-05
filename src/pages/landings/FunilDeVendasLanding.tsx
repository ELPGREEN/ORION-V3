import { Link } from "react-router-dom";
import { ArrowRight, Rocket, Target, Zap, CheckCircle2, Sparkles, Star, Quote } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const BENEFITS = [
  { icon: Target, title: "Avatar + Big Idea", desc: "Orion mapeia dor, desejo e objeção do seu público antes de escrever uma linha." },
  { icon: Zap, title: "5 etapas prontas", desc: "Topo, meio e fundo de funil com headline, copy, CTA e métrica de cada estágio." },
  { icon: Rocket, title: "Automação incluída", desc: "Triggers e ferramentas (e-mail, WhatsApp, ads) sugeridos para cada etapa." },
  { icon: CheckCircle2, title: "Pronto para colar", desc: "Copy estruturada para landing, anúncio, e-mail e remarketing — sem reescrever." },
];

const TESTIMONIALS = [
  {
    name: "Marina Costa",
    role: "Produtora digital · Curso de finanças",
    text: "Em 4 minutos saí de planilha em branco para um funil completo com sequência de e-mails. Faturei R$ 38k no primeiro lançamento usando a estrutura que o Orion gerou.",
    stars: 5,
  },
  {
    name: "Rafael Mendes",
    role: "Agência de tráfego",
    text: "Uso para todo cliente novo. Entrego o briefing estratégico em 1 reunião e fecho contrato 2x mais rápido. Pago por si só.",
    stars: 5,
  },
  {
    name: "Juliana Albuquerque",
    role: "Coach de carreira",
    text: "Não sou marketeira. O funil que o Orion entregou tinha objeções que eu nem tinha pensado — e foram exatamente as que meus alunos levantaram.",
    stars: 5,
  },
];

const FAQ = [
  { q: "Preciso saber de marketing?", a: "Não. Você descreve o produto e o público em 30 segundos — Orion entrega a estratégia já estruturada." },
  { q: "Funciona para qualquer nicho?", a: "Sim. Infoprodutos, serviços, SaaS, e-commerce, consultoria. Quanto mais específico for o avatar, melhor o resultado." },
  { q: "Vou conseguir editar?", a: "Tudo é texto editável. Copie para Notion, Docs, Mailchimp, Active Campaign, Manychat — onde quiser." },
  { q: "Quantos funis posso gerar?", a: "Conta grátis dá 1.000 tokens (≈10 funis). Plano Pro tem geração ilimitada." },
];

export default function FunilDeVendasLanding() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Funil de Vendas com IA em 4 minutos | Orion para produtores digitais"
        description="Crie seu funil completo de vendas em 4 minutos: avatar, big idea, 5 etapas com copy pronta, automações e métricas. Grátis para começar."
        canonical="https://www.iasofthub.com/funil-de-vendas"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Funil de Vendas com IA — Orion",
          description: "Gerador de funis de vendas estruturados com copy, automações e métricas em 4 minutos.",
          brand: { "@type": "Brand", name: "Orion Intelligence Platform" },
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL", availability: "https://schema.org/InStock" },
          aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "127" },
        }}
      />
      <Header />

      <main>
        {/* HERO */}
        <section className="container mx-auto px-4 sm:px-6 pt-28 pb-16 max-w-5xl text-center">
          <Badge variant="outline" className="mb-5 border-primary/30 text-primary">
            <Sparkles className="h-3 w-3 mr-1.5" /> Template · Produtores Digitais
          </Badge>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-foreground mb-5 tracking-wide leading-tight">
            Seu funil de vendas <span className="text-primary">em 4 minutos</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Avatar, big idea, 5 etapas com copy pronta, automação e métricas — Orion entrega a estratégia inteira para você só executar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button asChild size="lg" className="btn-gold px-8">
              <Link to="/templates/funil-de-vendas">
                <Rocket className="h-4 w-4 mr-2" /> Gerar meu funil grátis
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/plataforma">
                Ver planos <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-5">
            Cadastro grátis · 1.000 tokens · sem cartão · ≈10 funis completos
          </p>
        </section>

        {/* BENEFITS */}
        <section className="container mx-auto px-4 sm:px-6 pb-16 max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS.map((b) => (
              <Card key={b.title} className="p-6 border-border/40 bg-card/40 hover:border-primary/40 transition-colors">
                <b.icon className="h-6 w-6 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-1.5">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="container mx-auto px-4 sm:px-6 py-16 max-w-4xl">
          <h2 className="font-serif text-3xl sm:text-4xl text-center text-foreground mb-10 tracking-wide">
            Como funciona
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Descreva o produto", d: "Nome, oferta, ticket, público em 1 minuto." },
              { n: "02", t: "Orion estrutura", d: "Avatar, big idea, 5 etapas, copy e automação." },
              { n: "03", t: "Copie e execute", d: "Cole nas suas ferramentas — está pronto para rodar." },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="text-5xl font-serif text-primary/30 mb-2">{s.n}</div>
                <h3 className="font-semibold text-foreground mb-1.5">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="container mx-auto px-4 sm:px-6 py-16 max-w-6xl">
          <h2 className="font-serif text-3xl sm:text-4xl text-center text-foreground mb-3 tracking-wide">
            Quem já usa
          </h2>
          <p className="text-center text-muted-foreground mb-10">+127 produtores digitais geraram seus funis no último mês</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="p-6 border-border/40 bg-card/40">
                <Quote className="h-5 w-5 text-primary/40 mb-3" />
                <p className="text-sm text-foreground/85 mb-4 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <div className="text-sm font-semibold text-foreground">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto px-4 sm:px-6 py-16 max-w-3xl">
          <h2 className="font-serif text-3xl sm:text-4xl text-center text-foreground mb-10 tracking-wide">
            Perguntas frequentes
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* FINAL CTA */}
        <section className="container mx-auto px-4 sm:px-6 pb-24 max-w-4xl">
          <Card className="p-10 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-background text-center">
            <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-3 tracking-wide">
              Comece pelo seu primeiro funil — grátis
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Em 4 minutos você sai daqui com a estrutura que normalmente custa R$ 2k de consultoria.
            </p>
            <Button asChild size="lg" className="btn-gold px-10">
              <Link to="/templates/funil-de-vendas">
                <Rocket className="h-4 w-4 mr-2" /> Gerar meu funil agora
              </Link>
            </Button>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}
