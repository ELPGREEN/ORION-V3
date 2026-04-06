import { IconNeuralAI, IconDocuments, IconCRM, IconAutomation, IconShield, IconDashboard } from "@/components/icons/SumerianTronIcons";

const stats = [
  { Icon: IconNeuralAI, value: "IA", label: "Inteligência Artificial", desc: "Motor proprietário multicamada" },
  { Icon: IconDocuments, value: "100+", label: "Tipos de Documentos", desc: "Geração e análise automática" },
  { Icon: IconCRM, value: "CRM", label: "Gestão de Clientes", desc: "Pipeline completo e automatizado" },
  { Icon: IconAutomation, value: "24/7", label: "Assistente Virtual", desc: "Disponível a qualquer momento" },
  { Icon: IconShield, value: "LGPD", label: "Conformidade Total", desc: "Orion Shield + LGPD/GDPR" },
  { Icon: IconDashboard, value: "360°", label: "Métricas & Analytics", desc: "Dashboard com visão completa" },
];

export function ImpactStatsSection() {
  return (
    <section className="py-16 sm:py-20 bg-muted/10 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">RECURSOS</p>
          <h2 className="font-serif text-2xl sm:text-3xl text-foreground tracking-wide">
            Tudo que sua empresa precisa
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group relative text-center p-5 border border-border/20 bg-card/20 hover:border-primary/30 transition-all duration-500"
            >
              <div className="absolute bottom-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/50 transition-all duration-500" />
              <stat.Icon className="h-7 w-7 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
              <p className="text-xl sm:text-2xl font-bold text-primary mb-1">{stat.value}</p>
              <p className="text-[10px] text-foreground font-medium uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-[9px] text-muted-foreground">{stat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
