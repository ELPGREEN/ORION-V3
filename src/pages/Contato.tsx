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
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import {
  CheckCircle2, Star, ArrowRight, MessageCircle, Shield, Zap, Crown, Rocket,
  Mail, Phone, MapPin, Clock
} from "lucide-react";
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
    preco: "Sob consulta",
    periodo: "",
    icon: Crown,
    destaque: false,
    features: [
      "Tudo do Business +",
      "Tokens IA ilimitados",
      "Rede Neural completa",
      "API + Webhooks + ROS2",
      "Automação robótica industrial",
      "Smart OTR & Linhas modulares",
      "SCADA / IoT integrado com IA",
      "Consultoria Indústria 4.0",
      "SLA dedicado + Onboarding",
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

      {/* ═══ HERO — Planos ═══ */}
      <section className="relative py-20 sm:py-28 overflow-hidden" style={{ background: "hsl(var(--background))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--background))]/50 via-transparent to-[hsl(var(--background))]/80 z-[1]" />
        <div className="container relative z-10 text-center">
          <ScrollReveal direction="fade">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5 backdrop-blur-sm">
              Plano Starter gratuito para sempre
            </Badge>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              Escolha o plano <span className="text-primary">ideal</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
              Transforme seu negócio com IA. Comece grátis e escale conforme cresce.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ PLANOS ═══ */}
      <section className="py-16 sm:py-20 relative" style={{ background: "hsl(var(--background))" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(hsl(var(--primary),0.02) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary),0.02) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="container relative z-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {planos.map((plano, i) => {
              const Icon = plano.icon;
              return (
                <ScrollReveal key={plano.id} direction="up" delay={i * 0.08}>
                  <Card
                    className={`relative overflow-hidden transition-all duration-500 h-full bg-card/20 backdrop-blur-sm hover:border-primary/30 ${
                      plano.destaque ? "border-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.1)] scale-[1.02]" : "border-border/20"
                    }`}
                  >
                    {plano.destaque && (
                      <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center text-[10px] py-1.5 font-medium tracking-[0.2em] uppercase">
                        Mais Popular
                      </div>
                    )}
                    <CardHeader className={plano.destaque ? "pt-10" : ""}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 border border-primary/20 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="font-serif text-lg">{plano.nome}</CardTitle>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-bold text-foreground">{plano.preco}</span>
                        <span className="text-muted-foreground text-sm">{plano.periodo}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2.5 mb-6">
                        {plano.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full text-[11px] tracking-[0.1em] uppercase ${plano.destaque ? "" : ""}`}
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
                        {plano.cta} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ GARANTIAS ═══ */}
      <section className="py-6 border-y border-border/10" style={{ background: "hsl(var(--background))" }}>
        <div className="container">
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Shield className="h-4 w-4 text-primary" />
              Dados criptografados (LGPD)
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Starter gratuito para sempre
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Zap className="h-4 w-4 text-primary" />
              Cancele quando quiser
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-16 sm:py-20" style={{ background: "hsl(var(--background))" }}>
        <div className="container max-w-3xl">
          <ScrollReveal direction="fade">
            <div className="text-center mb-10">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">DÚVIDAS</p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                Perguntas <span className="text-primary">Frequentes</span>
              </h2>
            </div>
          </ScrollReveal>
          <Accordion type="single" collapsible className="space-y-2">
            {faq.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border/20 rounded-none px-4 bg-card/10">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:text-primary">{item.pergunta}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{item.resposta}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ═══ CONTATO — Formulário + Info ═══ */}
      <section id="contato-form" className="py-16 sm:py-24 scroll-mt-20 relative" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--primary),0.1)" }}>
        <div className="container">
          <ScrollReveal direction="fade">
            <div className="text-center mb-12">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">CONTATO</p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-3">
                Fale com nossa <span className="text-primary">equipe</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Preencha o formulário e nossa equipe retorna em até 24h.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Info lateral */}
            <div className="space-y-6">
              <ScrollReveal direction="up" delay={0.1}>
                <div className="p-5 border border-border/20 bg-card/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 border border-primary/20 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Email</p>
                      <p className="text-sm text-foreground">contato@iasofthub.com</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.15}>
                <div className="p-5 border border-border/20 bg-card/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 border border-primary/20 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">WhatsApp</p>
                      <p className="text-sm text-foreground">+39 350 102 1359</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.2}>
                <div className="p-5 border border-border/20 bg-card/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 border border-primary/20 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Sede</p>
                      <p className="text-sm text-foreground">Itália — ELP Green Technology S.R.L.</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.25}>
                <div className="p-5 border border-border/20 bg-card/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 border border-primary/20 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Resposta</p>
                      <p className="text-sm text-foreground">Em até 24 horas úteis</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Formulário */}
            <div className="lg:col-span-2">
              <ScrollReveal direction="up" delay={0.1}>
                {isSubmitted ? (
                  <div className="border border-primary/30 bg-card/10 p-8 text-center">
                    <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">Mensagem Enviada!</h3>
                    <p className="text-muted-foreground mb-6">Nossa equipe entrará em contato em breve.</p>
                    <Button onClick={() => navigate("/cadastro")}>Criar Conta Grátis</Button>
                  </div>
                ) : (
                  <div className="border border-border/20 bg-card/10 p-6">
                    <form onSubmit={onSubmit} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Nome completo</Label>
                          <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="Seu nome" className="bg-background/50 border-border/30" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</Label>
                          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="seu@email.com" className="bg-background/50 border-border/30" />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">Telefone / WhatsApp</Label>
                          <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" className="bg-background/50 border-border/30" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Plano de interesse</Label>
                          <Select value={planoSelecionado} onValueChange={setPlanoSelecionado}>
                            <SelectTrigger className="bg-background/50 border-border/30"><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
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
                        <Label htmlFor="message" className="text-xs uppercase tracking-wider text-muted-foreground">Mensagem</Label>
                        <Textarea id="message" name="message" value={formData.message} onChange={handleChange} rows={4} placeholder="Como podemos ajudar?" className="bg-background/50 border-border/30" />
                      </div>
                      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? "Enviando..." : "Enviar Mensagem"}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </form>
                  </div>
                )}
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Float */}
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