import {
  IconNeuralAI, IconDocuments, IconCRM, IconChat, IconCalendar, IconPayment,
  IconSearch, IconSignature, IconDashboard, IconShield, IconGlobe, IconAutomation,
  IconCompliance, IconSaaS, IconNotification
} from "@/components/icons/SumerianTronIcons";

const benefits = [
  { icon: IconNeuralAI, title: "Assistente IA Neural", desc: "Chat com motor de IA proprietário multicamadas, respostas inteligentes e aprendizado contínuo." },
  { icon: IconDocuments, title: "Geração de Documentos", desc: "100+ tipos de documentos profissionais gerados automaticamente com modelos inteligentes e IA." },
  { icon: IconCRM, title: "CRM Completo", desc: "Gerencie clientes, leads e pipeline de vendas com scoring automático e follow-ups." },
  { icon: IconChat, title: "Chat ao Vivo", desc: "Comunicação em tempo real entre equipe e clientes com notificações push." },
  { icon: IconCalendar, title: "Agendamento", desc: "Sistema de consultas e reuniões integrado com pagamentos e confirmações automáticas." },
  { icon: IconPayment, title: "Pagamentos Integrados", desc: "Faturas automáticas, planos de assinatura, comissões de afiliados e checkout integrado." },
  { icon: IconSearch, title: "Pesquisa Inteligente", desc: "Busca avançada com IA em bases de dados, legislação e documentos internos." },
  { icon: IconSignature, title: "Assinatura Digital", desc: "Assine documentos digitalmente com validade jurídica e rastreamento completo." },
  { icon: IconDashboard, title: "Dashboard Analytics", desc: "Métricas em tempo real de performance, qualidade e KPIs de negócio." },
  { icon: IconShield, title: "Segurança Empresarial", desc: "Orion Shield com múltiplas camadas de proteção, criptografia avançada e conformidade LGPD/GDPR." },
  { icon: IconGlobe, title: "Multi-idioma", desc: "Interface completa em Português, English, Español, Italiano e 中文 com detecção automática." },
  { icon: IconAutomation, title: "Automação", desc: "Fluxos automatizados, notificações inteligentes e processos que rodam sozinhos." },
  { icon: IconCompliance, title: "Compliance", desc: "Verificação de conformidade com consulta a listas de sanções internacionais e PEPs." },
  { icon: IconSaaS, title: "Gestão SaaS", desc: "Planos de assinatura, trial, marketplace de serviços e painel de afiliados." },
  { icon: IconNotification, title: "Notificações Push", desc: "Alertas em tempo real via push, email e in-app com configuração granular." },
];

export function BenefitsSection() {
  return (
    <section className="py-16 sm:py-24 bg-background relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-14">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">FUNCIONALIDADES</p>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-foreground mb-4 tracking-wide">
            Plataforma completa de IA empresarial
          </h2>
          <div className="w-20 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-4" />
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            O ORION integra inteligência artificial avançada com ferramentas de gestão para transformar a produtividade da sua empresa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="group relative p-5 border border-border/20 bg-card/20 hover:border-primary/30 transition-all duration-500"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.06)" }} />
              <item.icon className="h-6 w-6 text-primary mb-3 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-sm font-semibold text-foreground mb-1.5">{item.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
              <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/40 transition-all duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
