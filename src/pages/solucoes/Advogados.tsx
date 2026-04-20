import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TechLine } from "@/components/ui/TechElements";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { GatewayBackground } from "@/components/ui/GatewayBackground";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  Scale, ArrowRight, CheckCircle2, Sparkles,
  FileText, Search, Users, BarChart3, Clock, Shield,
  Gavel, BookOpen, PenTool, Globe,
} from "lucide-react";

const features = [
  { icon: FileText, title: "Geração de Petições com IA", desc: "Crie petições com DeepSeek R1 e RAG Consciousness — análise jurídica profunda, precedentes e fundamentação automática." },
  { icon: Search, title: "Pesquisa Jurisprudencial", desc: "Busca semântica em STF, STJ, TST e tribunais com Quantum Router para selecionar o melhor modelo de análise." },
  { icon: Clock, title: "Gestão de Processos e Prazos", desc: "Controle de andamentos, alertas automáticos de prazos, timeline visual e integração com tribunais." },
  { icon: Users, title: "Portal do Cliente", desc: "Área exclusiva com IA jurídica integrada. Clientes conversam com Orion IA para tirar dúvidas sobre seus processos." },
  { icon: BarChart3, title: "Dashboard de Métricas", desc: "Faturamento, produtividade, processos ganhos/perdidos, tempo médio por tarefa — tudo em tempo real." },
  { icon: Shield, title: "Assinatura Digital", desc: "Assine documentos com validade jurídica diretamente na plataforma, com certificado e rastreabilidade." },
  { icon: PenTool, title: "Editor de Documentos", desc: "Editor rich-text com modelos bilíngues, variáveis automáticas e exportação em PDF profissional." },
  { icon: Globe, title: "Site Profissional", desc: "Seu site com IA de atendimento. Chatbot jurídico 24/7 responde dúvidas e agenda consultas automaticamente." },
  { icon: BookOpen, title: "Blog Jurídico", desc: "Publique artigos com IA auxiliar. Orion IA sugere títulos, résumos e otimização SEO para maior alcance." },
];

const differentials = [
  "DeepSeek R1 + RAG Consciousness para raciocínio jurídico",
  "Quantum Router seleciona melhor modelo por tipo de consulta",
  "11 Agentes jurídicos especializados",
  "Pesquisa em STF, STJ, TST e tribunais",
  "Gestão completa de processos e clientes",
  "Assinatura digital com validade jurídica",
  "Portal do cliente com IA de atendimento 24/7",
  "Site profissional com chatbot jurídico",
  "Dashboard de métricas em tempo real",
  "100% compatível com LGPD e OAB",
];

export default function SolucoesAdvogados() {
  return (
    <MainLayout>
      <SEO
        title="ORION para Advogados | IA Jurídica, Petições e Gestão"
        description="Plataforma de IA jurídica: gere petições, pesquise jurisprudência, gerencie processos e tenha seu site profissional. Tudo integrado no ORION."
      />


      {/* Hero */}
      <section className="min-h-[45vh] flex items-center relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/80" style={{ zIndex: 1 }} />
        <div className="container py-14 sm:py-20 px-4 sm:px-6 relative" style={{ zIndex: 5 }}>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-primary" />
              <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">IA JURÍDICA</p>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground leading-tight mb-6">
              Para <span className="text-primary">Advogados</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Revolucione sua advocacia com IA. Gere petições, pesquise jurisprudência em segundos, 
              gerencie processos e tenha seu próprio site profissional — tudo na plataforma ORION.
            </p>
          </div>
        </div>
      </section>

      <TechLine />

      {/* Features Grid */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <GatewayBackground opacity={0.15} />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">FERRAMENTAS</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                Seu <span className="text-primary">arsenal jurídico</span> completo
              </h2>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <ScrollReveal key={feat.title} direction="up" delay={i * 0.05}>
                  <div className="group p-6 border border-border/20 bg-card/30 hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-500 h-full">
                    <div className="h-10 w-10 border border-primary/20 flex items-center justify-center mb-4 group-hover:border-primary/50 transition-colors">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{feat.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{feat.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <TechLine />

      {/* Differentials */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="up">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px w-8 bg-primary" />
                  <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">DIFERENCIAIS</p>
                </div>
                <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                  Por que advogados escolhem o <span className="text-primary">ORION?</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8 text-sm">
                  A plataforma foi projetada por profissionais do Direito e engenheiros de IA para entregar 
                  exatamente o que o advogado moderno precisa: velocidade, precisão e conformidade.
                </p>
                <Button asChild className="btn-gold">
                  <Link to="/cadastro">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Criar Conta como Advogado
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.1}>
              <div className="grid sm:grid-cols-2 gap-3">
                {differentials.map((item) => (
                  <div key={item} className="flex items-center gap-3 p-4 bg-card/30 border border-border/20 hover:border-primary/30 transition-all">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-xs text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-background/60 z-[1]" />
        <div className="container relative px-4 sm:px-6" style={{ zIndex: 2 }}>
          <div className="max-w-2xl mx-auto text-center">
            <Scale className="h-10 w-10 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
              Pronto para modernizar sua <span className="text-primary">advocacia?</span>
            </h2>
            <p className="text-muted-foreground mb-8 text-sm">
              Comece gratuitamente e explore todas as ferramentas. Sem compromisso.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="btn-gold px-10 shimmer">
                <Link to="/cadastro">COMEÇAR GRÁTIS</Link>
              </Button>
              <Button asChild className="btn-outline-gold px-10">
                <Link to="/servicos">VER TODAS AS SOLUÇÕES</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
