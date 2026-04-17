import { useNavigate } from "react-router-dom";
import { FileText, Search, MessageSquare, Sparkles, Gavel, ScrollText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickActionsPanel() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Gerar Petição Inicial",
      description: "Crie petições com jurisprudência automaticamente",
      icon: Gavel,
      path: "/dashboard/gerar-documento?tipo=peticao-inicial",
      variant: "gold" as const,
    },
    {
      title: "Gerar Contrato",
      description: "Contratos personalizados com cláusulas inteligentes",
      icon: ScrollText,
      path: "/dashboard/gerar-documento?tipo=contrato-servicos",
      variant: "gold" as const,
    },
    {
      title: "Pesquisar Jurisprudência",
      description: "Busca híbrida em 19 tribunais + bases públicas",
      icon: Search,
      path: "/dashboard/pesquisa",
      variant: "outline" as const,
    },
    {
      title: "Chat IA no Editor",
      description: "Converse com a IA enquanto edita documentos",
      icon: MessageSquare,
      path: "/dashboard/gerar-documento",
      variant: "outline" as const,
    },
    {
      title: "Meus Documentos",
      description: "Gerencie documentos gerados e enviados",
      icon: FileText,
      path: "/dashboard/documentos",
      variant: "outline" as const,
    },
    {
      title: "Base de Conhecimento",
      description: "Adicione jurisprudência e doutrina à rede neural",
      icon: BookOpen,
      path: "/dashboard/rede-neural",
      variant: "outline" as const,
    },
  ];

  return (
    <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((action, i) => (
            <Button
              key={i}
              variant={action.variant === "gold" ? "default" : "outline"}
              className={`h-auto p-4 flex flex-col items-start gap-2 ${
                action.variant === "gold" ? "btn-gold" : ""
              }`}
              onClick={() => navigate(action.path)}
            >
              <div className="flex items-center gap-2 w-full">
                <action.icon className="h-5 w-5" />
                <span className="font-semibold text-sm">{action.title}</span>
              </div>
              <p className="text-xs opacity-80 text-left">{action.description}</p>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
