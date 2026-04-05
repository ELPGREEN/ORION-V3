import { cn } from "@/lib/utils";
import { Pencil, Search, BarChart3 } from "lucide-react";

export type ChatMode = "edicao" | "pesquisa" | "analise";

interface ModeConfig {
  label: string;
  icon: React.ReactNode;
  promptSuffix: string;
}

export const MODES: Record<ChatMode, ModeConfig> = {
  edicao: {
    label: "Edição",
    icon: <Pencil className="h-3 w-3" />,
    promptSuffix: "", // default behavior
  },
  pesquisa: {
    label: "Pesquisa",
    icon: <Search className="h-3 w-3" />,
    promptSuffix: `\n═══ MODO: PESQUISA ═══\nNÃO edite o documento. NÃO use blocos <<<EDIT>>>, <<<INSERT>>>, <<<CLAUSE>>>.\nApenas responda, pesquise e forneça informações. Cite fontes e fundamentos legais sem alterar o texto.`,
  },
  analise: {
    label: "Análise",
    icon: <BarChart3 className="h-3 w-3" />,
    promptSuffix: `\n═══ MODO: ANÁLISE ═══\nNÃO edite o documento. NÃO use blocos <<<EDIT>>>, <<<INSERT>>>, <<<CLAUSE>>>.\nAnalise lacunas, riscos, pontos fracos e pontos fortes. Forneça um diagnóstico detalhado sem modificar o texto.`,
  },
};

interface ModeSelectorProps {
  value: ChatMode;
  onChange: (mode: ChatMode) => void;
}

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 bg-muted/40 rounded-md p-0.5">
      {(Object.entries(MODES) as [ChatMode, ModeConfig][]).map(([key, cfg]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-colors",
            value === key
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {cfg.icon}
          {cfg.label}
        </button>
      ))}
    </div>
  );
}
