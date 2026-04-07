import { IconShield, IconCheckMark, IconFingerprint, IconEye, IconGlobe, IconCompliance, IconActivity, IconSearch } from "@/components/icons/SumerianTronIcons";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const highlights = [
  { Icon: IconShield, name: "Defesa Multicamada", desc: "Múltiplas barreiras de proteção ativas 24/7 que detectam e neutralizam ameaças automaticamente." },
  { Icon: IconFingerprint, name: "Autenticação Avançada", desc: "Verificação de identidade inteligente que garante que apenas pessoas autorizadas acessem seus dados." },
  { Icon: IconSearch, name: "Criptografia de Ponta", desc: "Seus dados são protegidos com criptografia de nível bancário em trânsito e em repouso." },
  { Icon: IconEye, name: "Monitoramento Contínuo", desc: "Vigilância em tempo real que identifica comportamentos suspeitos antes que se tornem ameaças." },
  { Icon: IconGlobe, name: "Conformidade Global", desc: "Aderência completa a LGPD, GDPR e regulamentações internacionais de proteção de dados." },
  { Icon: IconCompliance, name: "Auditoria Completa", desc: "Registro detalhado de todas as ações para transparência total e rastreabilidade." },
  { Icon: IconActivity, name: "Análise de Risco", desc: "Motor inteligente que avalia riscos em tempo real e toma decisões automáticas de proteção." },
  { Icon: IconCheckMark, name: "Proteção Anti-Fraude", desc: "Detecção e bloqueio automático de tentativas de fraude, invasão e uso não autorizado." },
];

export function SecurityShieldSection() {
  return (
    <section className="py-12 sm:py-16 section-cinematic relative overflow-hidden neural-ambient">
      <div className="absolute top-0 inset-x-0 cinematic-divider" />

      <div className="container px-4 sm:px-6 relative z-10">
        <div className="text-center mb-14">
          <ScrollReveal direction="fade">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">SEGURANÇA</p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-foreground mb-4 tracking-wide">
              Orion Shield — Proteção de Nível Bancário
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.2}>
            <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-4" />
          </ScrollReveal>
          <ScrollReveal direction="fade" delay={0.3}>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Seu negócio protegido por um sistema de defesa proprietário com múltiplas camadas de segurança,
              monitoramento contínuo e conformidade regulatória total.
            </p>
          </ScrollReveal>
        </div>

        <ScrollReveal direction="up" delay={0.2}>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-12">
            <div className="flex items-center gap-3 px-5 py-3 border border-primary/30 bg-primary/5">
              <div className="relative">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <div className="absolute inset-0 h-3 w-3 rounded-full bg-primary animate-ping opacity-50" />
              </div>
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Shield Ativo</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 border border-border/20 bg-card/20">
              <IconSearch className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Criptografia <span className="text-primary font-bold">AES-256</span></span>
            </div>
            <div className="flex items-center gap-2 px-5 py-3 border border-border/20 bg-card/20">
              <IconGlobe className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Conformidade <span className="text-primary font-bold">LGPD/GDPR</span></span>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-6xl mx-auto">
          {highlights.map((layer, i) => (
            <ScrollReveal key={layer.name} direction="up" delay={i * 0.05}>
              <div className="group relative p-5 border border-border/20 bg-card/20 hover:border-primary/40 transition-all duration-500 h-full holo-card">
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40 group-hover:border-primary/80 transition-colors" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40 group-hover:border-primary/80 transition-colors" />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ boxShadow: "inset 0 0 30px hsl(var(--primary) / 0.05), 0 0 15px hsl(var(--primary) / 0.05)" }}
                />
                <layer.Icon className="h-6 w-6 text-primary mb-3 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-sm font-semibold text-foreground mb-1.5">{layer.name}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{layer.desc}</p>
                <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/50 transition-all duration-500" />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
