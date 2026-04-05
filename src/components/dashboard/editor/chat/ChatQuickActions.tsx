import { useState } from "react";
import { Wand2, Scale, AlertTriangle, FileText, Scissors, Lightbulb, ShieldCheck, Languages, Sparkles, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickAction {
  icon: LucideIcon;
  label: string;
  prompt: string;
  category: "escrita" | "juridico" | "ferramenta";
}

const QUICK_ACTIONS: QuickAction[] = [
  // Escrita
  { icon: Sparkles, label: "Melhorar texto", prompt: "Melhore o texto do documento, mantendo o sentido original, mas com linguagem jurídica mais técnica e persuasiva.", category: "escrita" },
  { icon: FileText, label: "Gerar ementa", prompt: "Gere uma ementa profissional para este documento jurídico.", category: "escrita" },
  { icon: Scissors, label: "Resumir", prompt: "Gere um resumo executivo conciso deste documento.", category: "escrita" },
  // Jurídico
  { icon: Scale, label: "Adicionar fundamentação", prompt: "Adicione fundamentação legal ao documento: artigos de lei, jurisprudência e doutrina relevante.", category: "juridico" },
  { icon: AlertTriangle, label: "Verificar lacunas", prompt: "Analise este documento e identifique lacunas argumentativas e teses não exploradas.", category: "juridico" },
  { icon: ShieldCheck, label: "Anonimizar (LGPD)", prompt: "Anonimize este documento substituindo todos os dados pessoais (CPF, CNPJ, nomes, e-mails, telefones) por pseudônimos consistentes — [PARTE_1], [CPF_1] etc. — conforme a LGPD.", category: "juridico" },
  // Ferramentas
  { icon: Lightbulb, label: "Formatar ABNT", prompt: "Formate este documento conforme o padrão ABNT.", category: "ferramenta" },
  { icon: Languages, label: "Traduzir EN/ES", prompt: "Traduza este documento jurídico para inglês e espanhol, mantendo a terminologia técnica precisa. Apresente ambas as traduções.", category: "ferramenta" },
  { icon: BookOpen, label: "Gerar glossário", prompt: "Gere um glossário dos termos jurídicos técnicos presentes neste documento, com definições claras e referências legais.", category: "ferramenta" },
];

const CATEGORY_LABELS: Record<string, string> = {
  escrita: "✍️ Escrita",
  juridico: "⚖️ Jurídico",
  ferramenta: "🔧 Ferramentas",
};

interface ChatQuickActionsProps {
  qualityHints: string[];
  onSendMessage: (prompt: string) => void;
}

export function ChatQuickActions({ qualityHints, onSendMessage }: ChatQuickActionsProps) {
  const [collapsed, setCollapsed] = useState(false);
  const categories = ["escrita", "juridico", "ferramenta"] as const;

  return (
    <div className="border-b border-border/60">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors"
      >
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5 text-primary" />
          Ações rápidas
        </p>
        {collapsed ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-2.5">
          {categories.map((cat) => {
            const actions = QUICK_ACTIONS.filter((a) => a.category === cat);
            return (
              <div key={cat}>
                <p className="text-[8px] text-muted-foreground/70 uppercase tracking-widest mb-1 font-medium">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      className="flex items-center gap-2 text-[10px] px-2.5 py-2 rounded-lg border border-border/50 bg-card/80 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm transition-all duration-200 text-left group"
                      onClick={() => onSendMessage(action.prompt)}
                    >
                      <action.icon className="h-3.5 w-3.5 shrink-0 text-primary/50 group-hover:text-primary transition-colors" />
                      <span className="line-clamp-1 font-medium">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {qualityHints.length > 0 && (
            <div className="mt-2 space-y-1 bg-destructive/5 border border-destructive/10 rounded-lg p-2">
              {qualityHints.slice(0, 2).map((hint, i) => (
                <p key={i} className="text-[9px] text-destructive/80 flex items-start gap-1">
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                  {hint}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
