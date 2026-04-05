import {
  Loader2, PlusCircle, ShieldCheck, AlertTriangle,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefinementPanel } from "@/components/dashboard/RefinementPanel";

interface StrategicAnalysis {
  positionamento: string;
  resumoEstrategico: string;
  pontosFortesDoc: string[];
  riscosIdentificados: string[];
  alertaContraCliente: boolean;
  descricaoAlerta: string;
}

interface EditorBottomPanelsProps {
  suggestedQuestions: string[];
  onRefine: (responses: Record<string, string>) => void;
  onSkipRefinement: () => void;
  isRefining: boolean;
  strategicAnalysis: StrategicAnalysis | null;
  onClearAnalysis: () => void;
  gapQuestions: string[];
  isAddingContent: boolean;
  onAggregateContent: (responses: Record<string, string>) => void;
  onClearGaps: () => void;
}

export function EditorBottomPanels({
  suggestedQuestions, onRefine, onSkipRefinement, isRefining,
  strategicAnalysis, onClearAnalysis,
  gapQuestions, isAddingContent, onAggregateContent, onClearGaps,
}: EditorBottomPanelsProps) {
  return (
    <>
      {/* Refinement Panel */}
      {suggestedQuestions.length > 0 && (
        <RefinementPanel questions={suggestedQuestions} onRefine={onRefine} onSkip={onSkipRefinement} isRefining={isRefining} />
      )}

      {/* Strategic Analysis Panel */}
      {strategicAnalysis && (
        <div className="border border-border overflow-hidden">
          <div className={`flex items-center gap-2 px-4 py-2 text-xs font-medium ${
            strategicAnalysis.alertaContraCliente ? "bg-destructive/10 border-b border-destructive/20 text-destructive"
              : strategicAnalysis.positionamento === "favoravel" ? "bg-primary/5 border-b border-primary/20 text-primary"
              : "bg-destructive/5 border-b border-destructive/10 text-destructive/70"
          }`}>
            {strategicAnalysis.alertaContraCliente ? <><AlertTriangle className="h-3.5 w-3.5" /> Alerta: Conteúdo pode prejudicar o cliente</>
              : strategicAnalysis.positionamento === "favoravel" ? <><TrendingUp className="h-3.5 w-3.5" /> Posicionamento Favorável</>
              : strategicAnalysis.positionamento === "desfavoravel" ? <><TrendingDown className="h-3.5 w-3.5" /> Requer fortalecimento</>
              : <><Minus className="h-3.5 w-3.5" /> Posicionamento Neutro</>}
            <button className="ml-auto text-[10px] opacity-60 hover:opacity-100" onClick={onClearAnalysis}>✕</button>
          </div>
          <div className="p-4 space-y-3">
            {strategicAnalysis.alertaContraCliente && strategicAnalysis.descricaoAlerta && (
              <div className="flex gap-2 bg-destructive/5 border border-destructive/20 p-3"><AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" /><p className="text-xs text-destructive">{strategicAnalysis.descricaoAlerta}</p></div>
            )}
            {strategicAnalysis.resumoEstrategico && <p className="text-xs text-muted-foreground">{strategicAnalysis.resumoEstrategico}</p>}
            <div className="grid grid-cols-2 gap-3">
              {strategicAnalysis.pontosFortesDoc.length > 0 && (
                <div className="space-y-1"><p className="text-[10px] font-medium text-primary flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Pontos Fortes</p>{strategicAnalysis.pontosFortesDoc.slice(0, 3).map((p, i) => (<p key={i} className="text-[10px] text-muted-foreground pl-2 border-l border-primary/30">• {p}</p>))}</div>
              )}
              {strategicAnalysis.riscosIdentificados.length > 0 && (
                <div className="space-y-1"><p className="text-[10px] font-medium text-destructive/70 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Riscos</p>{strategicAnalysis.riscosIdentificados.slice(0, 3).map((r, i) => (<p key={i} className="text-[10px] text-muted-foreground pl-2 border-l border-destructive/20">• {r}</p>))}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gap Aggregation Panel */}
      {gapQuestions.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Fortalecer a Defesa</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClearGaps} disabled={isAddingContent}><span className="text-xs">✕</span></Button>
          </div>
          <p className="text-xs text-muted-foreground">Responda o que souber — a IA transforma em <strong>argumentos favoráveis</strong>.</p>
          <div className="space-y-3">
            {gapQuestions.map((q, idx) => (
              <div key={idx} className="space-y-1">
                <label className="text-xs text-foreground font-medium">{q}</label>
                <input id={`gap-q-${idx}`} className="w-full h-8 px-3 text-xs border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Opcional..." disabled={isAddingContent} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" className="text-xs btn-gold" disabled={isAddingContent} onClick={() => {
              const responses: Record<string, string> = {};
              gapQuestions.forEach((q, idx) => { const el = document.getElementById(`gap-q-${idx}`) as HTMLInputElement | null; if (el && el.value.trim()) responses[q] = el.value.trim(); });
              onAggregateContent(responses);
            }}>
              {isAddingContent ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Aplicando...</> : <><ShieldCheck className="h-3 w-3 mr-1" />Agregar ao Documento</>}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onClearGaps} disabled={isAddingContent}>Pular</Button>
          </div>
        </div>
      )}
    </>
  );
}
