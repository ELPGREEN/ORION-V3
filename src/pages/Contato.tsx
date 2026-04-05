import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DynamicMeta } from "@/components/DynamicMeta";
import { CheckCircle2, Star, ArrowRight, MessageCircle, Shield, Zap, Crown, Rocket } from "lucide-react";
import { useContactForm } from "@/hooks/useContactForm";
import { toast } from "sonner";

const planos = [
  {
    id: "starter",
    nome: "Starter",
    preco: "Grátis",
    periodo: "",
    icon: Zap,
    destaque: false,
    features: [
      "Chat IA básico (10 msgs/mês)",
      "3 documentos/mês",
      "1 usuário",
      "Suporte por email",
    ],
    cta: "Começar Grátis",
  },
  {
    id: "professional",
    nome: "Professional",
    preco: "R$ 97",
    periodo: "/mês",
    icon: Rocket,
    destaque: false,
    features: [
      "Tudo do Starter +",
      "100 msgs IA/mês",
      "Documentos ilimitados",
      "Pesquisa IA / Jurisprudência",
      "Loja digital (5 produtos)",
      "3 usuários",
    ],
    cta: "Escolher Professional",
  },
  {
    id: "business",
    nome: "Business",
    preco: "R$ 297",
    periodo: "/mês",
    icon: Star,
    destaque: true,
    features: [
      "Tudo do Professional +",
      "500 msgs IA/mês",
      "CRM completo + Pipeline",
      "Assinatura digital",
      "Loja + Afiliados ilimitados",
      "10 usuários",
      "Gestão de processos",
      "Suporte prioritário",
    ],
    cta: "Escolher Business",
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    preco: "R$ 497",
    periodo: "/mês",
    icon: Crown,
    destaque: false,
    features: [
      "Tudo do Business +",
      "Tokens IA ilimitados",
      "Rede Neural completa",
      "API + Webhooks",
      "Usuários ilimitados",
      "Deals internacionais",
      "Onboarding dedicado",
      "SLA garantido",
    ],
    cta: "Falar com Vendas",
  },
];

const faq = [
  { pergunta: "Posso testar grátis antes de assinar?", resposta: "Sim! O plano Starter é gratuito para sempre. Você pode fazer upgrade a qualquer momento." },
  { pergunta: "Posso mudar de plano a qualquer momento?", resposta: "Sim, você pode fazer upgrade ou downgrade a qualquer momento. A diferença de valor é calculada proporcionalmente." },
  { pergunta: "A plataforma é só para advogados?", resposta: "Não! A ORION atende advogados, produtores digitais, afiliados, escritórios e empresas de qualquer setor." },
  { pergunta: "Meus dados estão seguros?", resposta: "Utilizamos criptografia de ponta a ponta, servidores seguros e estamos em conformidade com a LGPD." },
  { pergunta: "Preciso instalar algum software?", resposta: "Não! A plataforma funciona 100% no navegador. Também temos app PWA para dispositivos móveis." },
];

export default function Contato() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planoInicial = searchParams.get("plano") || "";
  const [planoSelecionado, setPlanoSelecionado] = useState(planoInicial);
  const { formData, handleChange, handleSubmit, isSubmitting, isSubmitted } = useContactForm();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(e);
    toast.success("Mensagem enviada! Entraremos em contato em breve.");
  };

  return (
    <MainLayout>
      <DynamicMeta
        title="Planos e Contato | ORION IA by ELP® Green Technology"
        description="Escolha o plano ideal para seu negócio. Starter, Professional, Business ou Enterprise — IA neural, CRM, loja digital e mais. ELP® Green Technology."
        image="https://www.iasofthub.com/og-images/og-contato.jpg"
        keywords="planos, contato, preços, ORION IA, ELP Green Technology"
      />

      <section className="py-20 bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="container text-center">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            Plano Starter gratuito para sempre
          </Badge>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Escolha o plano <span className="text-primary">ideal</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Transforme seu negócio com IA. Comece grátis e escale conforme cresce.
          </p>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {planos.map((plano) => {
              const Icon = plano.icon;
              return (
                <Card
                  key={plano.id}
                  className={`relative overflow-hidden transition-all duration-300 hover:shadow-elegant ${
                    plano.destaque ? "border-primary/50 shadow-lg scale-[1.02]" : "border-border/50"
                  }`}
                >
                  {plano.destaque && (
                    <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center text-xs py-1 font-medium tracking-wider uppercase">
                      Mais Popular
                    </div>
                  )}
                  <CardHeader className={plano.destaque ? "pt-8" : ""}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="font-serif text-xl">{plano.nome}</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">{plano.preco}</span>
                      <span className="text-muted-foreground text-sm">{plano.periodo}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2.5 mb-6">
                      {plano.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plano.destaque ? "default" : "outline"}
                      onClick={() => {
                        if (plano.id === "starter") {
                          navigate("/cadastro");
                        } else {
                          setPlanoSelecionado(plano.id);
                          document.getElementById("contato-form")?.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                    >
                      {plano.cta} <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="contato-form" className="py-16 bg-secondary/20 scroll-mt-20">
        <div className="container max-w-2xl">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-center mb-2">Entre em contato</h2>
          <p className="text-muted-foreground text-center mb-8">Preencha o formulário e nossa equipe retorna em até 24h.</p>
          {isSubmitted ? (
            <Card className="border-primary/30">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Mensagem Enviada!</h3>
                <p className="text-muted-foreground mb-6">Nossa equipe entrará em contato em breve.</p>
                <Button onClick={() => navigate("/cadastro")}>Criar Conta Grátis</Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-6">
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo</Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="Seu nome" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="seu@email.com" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone / WhatsApp</Label>
                      <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Plano de interesse</Label>
                      <Select value={planoSelecionado} onValueChange={setPlanoSelecionado}>
                        <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">Starter — Grátis</SelectItem>
                          <SelectItem value="professional">Professional — R$ 97/mês</SelectItem>
                          <SelectItem value="business">Business — R$ 297/mês</SelectItem>
                          <SelectItem value="enterprise">Enterprise — R$ 497/mês</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem</Label>
                    <Textarea id="message" name="message" value={formData.message} onChange={handleChange} rows={4} placeholder="Como podemos ajudar?" />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Enviando..." : "Enviar Mensagem"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="py-10 bg-background border-y border-border/30">
        <div className="container">
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Shield className="h-5 w-5 text-primary" />Dados criptografados (LGPD)</div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><CheckCircle2 className="h-5 w-5 text-primary" />Starter gratuito para sempre</div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm"><Zap className="h-5 w-5 text-primary" />Cancele quando quiser</div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container max-w-3xl">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-center mb-8">Perguntas <span className="text-primary">Frequentes</span></h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faq.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border/50 rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:text-primary">{item.pergunta}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{item.resposta}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <a
        href="https://wa.me/393501021359?text=Olá! Gostaria de saber mais sobre a plataforma ORION."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="Falar no WhatsApp"
      >
        <div className="relative h-14 w-14 flex items-center justify-center border border-primary/40 bg-background/80 backdrop-blur-sm hover:border-primary hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all duration-500">
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/60" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/60" />
          <MessageCircle className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
        </div>
      </a>
    </MainLayout>
  );
}
