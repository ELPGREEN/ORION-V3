import { Brain, FileText, Users, CreditCard, MessageSquare, Shield, Globe, Zap, BarChart3 } from "lucide-react";

const modules = [
  { icon: Brain, title: "Motor Neural", desc: "Inteligência artificial proprietária com raciocínio avançado, aprendizado contínuo e respostas precisas.", color: "text-primary" },
  { icon: FileText, title: "Documentos Inteligentes", desc: "Geração automática de 100+ tipos de documentos profissionais com revisão e formatação por IA.", color: "text-primary" },
  { icon: Users, title: "CRM & Pipeline", desc: "Gestão completa de clientes, leads e negócios com automação de follow-ups e scoring inteligente.", color: "text-primary" },
  { icon: CreditCard, title: "Faturamento Integrado", desc: "Cobranças automáticas, planos de assinatura, faturas e comissões — tudo em um só lugar.", color: "text-primary" },
  { icon: MessageSquare, title: "Comunicação em Tempo Real", desc: "Chat ao vivo com clientes, assistente IA 24/7, histórico completo e notificações instantâneas.", color: "text-primary" },
  { icon: Shield, title: "Segurança Empresarial", desc: "Proteção de nível bancário com criptografia avançada, conformidade LGPD/GDPR e auditoria completa.", color: "text-primary" },
  { icon: Zap, title: "Automação de Processos", desc: "Fluxos automatizados que eliminam tarefas repetitivas e aceleram a operação da sua empresa.", color: "text-primary" },
  { icon: BarChart3, title: "Analytics & Insights", desc: "Dashboard com métricas em tempo real, relatórios automatizados e inteligência de negócios.", color: "text-primary" },
  { icon: Globe, title: "Multi-idioma", desc: "Interface em 5 idiomas com detecção automática e tradução inteligente de documentos.", color: "text-primary" },
];

export function SystemArchitectureSection() {
  return (
    <section className="py-20 sm:py-28 bg-background relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="container px-4 sm:px-6 relative z-10">
        <div className="text-center mb-14">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">PLATAFORMA</p>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-foreground mb-4 tracking-wide">
            Ecossistema ORION
          </h2>
          <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-4" />
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Uma plataforma completa com 9 módulos integrados que trabalham juntos 
            para transformar a operação da sua empresa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-w-6xl mx-auto">
          {modules.map((mod, i) => (
            <div
              key={mod.title}
              className="group relative p-6 border border-border/20 bg-card/20 backdrop-blur-sm hover:border-primary/40 transition-all duration-500"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40 group-hover:border-primary/80 transition-colors" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40 group-hover:border-primary/80 transition-colors" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: "inset 0 0 30px hsl(var(--primary) / 0.05), 0 0 15px hsl(var(--primary) / 0.05)" }} />
              <mod.icon className={`h-7 w-7 ${mod.color} mb-4 group-hover:scale-110 transition-transform duration-300`} />
              <h3 className="text-sm font-semibold text-foreground mb-2 tracking-wide">{mod.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{mod.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
