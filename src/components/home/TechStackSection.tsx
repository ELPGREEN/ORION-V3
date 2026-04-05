import { Brain, Shield, Zap, Globe, Lock, BarChart3 } from "lucide-react";

const stacks = [
  { icon: Brain, name: "Orion Neural Engine", category: "INTELIGÊNCIA", desc: "Motor de IA proprietário com 4 camadas de raciocínio, aprendizado contínuo e auto-evolução." },
  { icon: Zap, name: "Automação Empresarial", category: "PRODUTIVIDADE", desc: "Geração de documentos, fluxos automatizados, agendamentos e notificações inteligentes." },
  { icon: Globe, name: "Plataforma Global", category: "ALCANCE", desc: "Interface em 5 idiomas, operação em múltiplos países e conformidade regulatória internacional." },
  { icon: BarChart3, name: "Análise Preditiva", category: "INSIGHTS", desc: "Dashboard com KPIs em tempo real, relatórios automatizados e inteligência de negócios." },
  { icon: Lock, name: "Infraestrutura Segura", category: "CONFIABILIDADE", desc: "Servidores de alta disponibilidade com criptografia avançada e backups automáticos." },
  { icon: Shield, name: "Orion Shield", category: "PROTEÇÃO", desc: "Sistema de defesa proprietário com múltiplas camadas de proteção, conformidade LGPD/GDPR e auditoria contínua." },
];

export function TechStackSection() {
  return (
    <section className="py-20 sm:py-28 bg-muted/10 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      
      <div className="container px-4 sm:px-6 relative z-10">
        <div className="text-center mb-14">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">TECNOLOGIA PROPRIETÁRIA</p>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-foreground mb-4 tracking-wide">
            Engenharia de Excelência
          </h2>
          <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-4" />
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Desenvolvido com tecnologia proprietária para garantir performance, 
            escalabilidade e segurança de nível empresarial.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto">
          {stacks.map((item) => (
            <div
              key={item.name}
              className="group relative p-6 border border-border/20 bg-card/20 backdrop-blur-sm hover:border-primary/30 transition-all duration-500"
            >
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/50 transition-all duration-500" />
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center border border-primary/20 bg-primary/5 group-hover:bg-primary/10 transition-colors">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.25em] text-primary/60 mb-1">{item.category}</p>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">{item.name}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
