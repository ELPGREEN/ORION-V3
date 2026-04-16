import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ArrowRight } from "lucide-react";
import { IconBot, IconCpu, IconZap, IconSettings } from "@/components/icons/SumerianTronIcons";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import videoOtrAsset from "@/assets/video-smart-otr-v3.mp4.asset.json";

const features = [
  { icon: IconBot, title: "Smart Robotic Line", desc: "Linha robótica inteligente que processa pneus OTR gigantes de 57'' a 63'' — até 10 toneladas/hora por planta, com corte hidráulico, trituração e separação automatizada." },
  { icon: IconCpu, title: "IA & Visão Computacional", desc: "Sistema Orion integrado com machine learning para classificação de borracha, detecção de aço e otimização contínua do processo de reciclagem." },
  { icon: IconZap, title: "Escala Global", desc: "Meta de 17-18 fábricas até 2030 em parceria com TOPS Recycling — capacidade global de 1 milhão de toneladas/ano e 175 t/h combinadas." },
  { icon: IconSettings, title: "Net Zero & ESG", desc: "Alinhamento com metas Net Zero 2040 e zero waste. Créditos de carbono, economia circular e geração de empregos locais em cada planta." },
];

export function SmartOtrSection() {
  return (
    <section className="py-12 sm:py-16 bg-background relative overflow-hidden tron-ambient">
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[300px] bg-secondary/[0.025] rounded-full blur-[180px] pointer-events-none" />
      <div className="container relative px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <ScrollReveal direction="fade">
            <p className="text-primary uppercase tracking-[0.3em] text-xs font-medium mb-4">ELP GREEN TECHNOLOGY</p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-foreground tracking-wide mb-4 sm:mb-6">
              Smart Robotic OTR Line
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="gold-line w-20 mx-auto mb-6" />
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.3}>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              A primeira linha robótica inteligente do mundo para reciclagem de pneus OTR gigantes da mineração.
              Tecnologia patenteada pela ELP Green Technology em parceria com TOPS Recycling Group —
              processamento de até <strong className="text-foreground">10 toneladas/hora</strong> por planta.
            </p>
          </ScrollReveal>
        </div>

        {/* Vídeo da Smart OTR Line */}
        <ScrollReveal direction="up" delay={0.2}>
          <div className="max-w-4xl mx-auto mb-12">
            <VideoPlayer
              src={videoOtrAsset.url}
              title="Smart OTR — Processamento de Pneus Gigantes"
              desc="Corte hidráulico, trituração e separação de materiais (borracha, aço, fibra têxtil) com tecnologia robótica automatizada."
            />
          </div>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, i) => (
            <ScrollReveal key={feat.title} direction="up" delay={i * 0.1}>
              <div className="group p-6 sm:p-8 border border-border bg-card hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-500">
                <feat.icon className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-medium text-foreground mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* KPIs reais */}
        <ScrollReveal direction="up" delay={0.3}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 max-w-4xl mx-auto">
            {[
              { value: "10 t/h", label: "por planta" },
              { value: "17-18", label: "fábricas até 2030" },
              { value: "1M ton", label: "capacidade/ano global" },
              { value: "99.8%", label: "taxa de recuperação" },
            ].map((kpi) => (
              <div key={kpi.label} className="text-center p-4 border border-border/30 bg-card/50">
                <p className="text-2xl font-bold text-primary">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.5}>
          <div className="text-center mt-10">
            <Button className="btn-outline-gold" asChild>
              <Link to="/solucoes/industria">
                Conheça Nossa Tecnologia <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
