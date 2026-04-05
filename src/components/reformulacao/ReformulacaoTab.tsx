import { useState, useRef, useCallback } from "react";
import { RefreshCw, Sparkles, Scale, FileText, Copy, Undo2, Settings2, ArrowRight, Loader2, GraduationCap, Shield, BookOpen, Scissors, Languages, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

type ReformulationMode = "reformular" | "melhorar" | "formalizar" | "simplificar" | "expandir" | "resumir" | "fundamentar" | "traduzir";

interface ModeConfig {
  label: string;
  description: string;
  icon: typeof RefreshCw;
  color: string;
}

const MODES: Record<ReformulationMode, ModeConfig> = {
  reformular: { label: "Reformular", description: "Reescrever mantendo o sentido, com mais clareza e fluidez", icon: RefreshCw, color: "text-primary" },
  melhorar: { label: "Melhorar", description: "Aprimorar linguagem jurídica, técnica e persuasão", icon: Sparkles, color: "text-amber-500" },
  formalizar: { label: "Formalizar", description: "Elevar o registro para tom jurídico formal", icon: GraduationCap, color: "text-indigo-500" },
  simplificar: { label: "Simplificar", description: "Linguagem clara sem perder a precisão técnica", icon: Scissors, color: "text-emerald-500" },
  expandir: { label: "Expandir", description: "Desenvolver argumentos e adicionar fundamentação", icon: BookOpen, color: "text-blue-500" },
  resumir: { label: "Resumir", description: "Síntese concisa dos pontos principais", icon: FileText, color: "text-violet-500" },
  fundamentar: { label: "Fundamentar", description: "Adicionar base legal, artigos e jurisprudência", icon: Scale, color: "text-amber-600" },
  traduzir: { label: "Traduzir", description: "Tradução jurídica para inglês e espanhol", icon: Languages, color: "text-teal-500" },
};

const DOC_TYPES = [
  { value: "peticao", label: "Petição" },
  { value: "contrato", label: "Contrato" },
  { value: "parecer", label: "Parecer" },
  { value: "recurso", label: "Recurso" },
  { value: "habeas-corpus", label: "Habeas Corpus" },
  { value: "sentenca", label: "Sentença" },
  { value: "acordao", label: "Acórdão" },
  { value: "notificacao", label: "Notificação" },
  { value: "outro", label: "Outro" },
];

const JUDICIAL_DOC_TYPES = new Set(["peticao", "recurso", "habeas-corpus", "sentenca", "acordao"]);

export function ReformulacaoTab() {
  const { toast } = useToast();
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [mode, setMode] = useState<ReformulationMode>("reformular");
  const [docType, setDocType] = useState("peticao");
  const [formality, setFormality] = useState([70]);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);

  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = inputText.length;

  const handleReformulate = useCallback(async () => {
    if (!inputText.trim() || inputText.trim().length < 5) {
      toast({ title: "Texto insuficiente", description: "Insira pelo menos 5 caracteres.", variant: "destructive" });
      return;
    }

    setProcessing(true);
    setHistory((h) => [...h, outputText]);

    const formalityLabel = formality[0] >= 80 ? "extremamente formal e erudito" : formality[0] >= 50 ? "formal e técnico" : "claro e acessível";
    const docLabel = DOC_TYPES.find((d) => d.value === docType)?.label || docType;
    const isJudicial = JUDICIAL_DOC_TYPES.has(docType);

    const modePrompts: Record<ReformulationMode, string> = {
      reformular: `Reformule o texto abaixo mantendo o mesmo sentido. Melhore clareza, coesão e fluidez. Tom: ${formalityLabel}. Tipo de documento: ${docLabel}. Retorne APENAS o texto reformulado.`,
      melhorar: `Melhore o texto abaixo com linguagem jurídica mais técnica e persuasiva. Tom: ${formalityLabel}. Tipo: ${docLabel}. Retorne APENAS o texto melhorado.`,
      formalizar: `Reescreva em tom jurídico ${formalityLabel} com terminologia processual adequada. Tipo: ${docLabel}. Retorne APENAS o texto formalizado.`,
      simplificar: `Simplifique a linguagem mantendo precisão técnica. Tipo: ${docLabel}. Retorne APENAS o texto simplificado.`,
      expandir: `Expanda com argumentos complementares e fundamentação. Tom: ${formalityLabel}. Tipo: ${docLabel}. Retorne APENAS o texto expandido.`,
      resumir: `Resuma os pontos principais em no máximo 3 parágrafos concisos. Tipo: ${docLabel}. Retorne APENAS o resumo.`,
      fundamentar: `Mantenha o texto e adicione ao final fundamentação legal: artigos de lei, súmulas e jurisprudência (STF/STJ) em formato ABNT. Tipo: ${docLabel}. Retorne o texto com a fundamentação.`,
      traduzir: `Traduza o texto jurídico abaixo para inglês e espanhol, com terminologia técnica precisa. Apresente ambas as traduções separadas por "---". Retorne APENAS as traduções.`,
    };

    const requestPrompt = `${modePrompts[mode]}\n\nTexto:\n"${inputText}"`;

    try {
      const { data, error } = await supabase.functions.invoke("aprimorar-documento", {
        body: {
          currentText: inputText,
          documentType: docLabel,
          documentTypeId: docType,
          query: requestPrompt,
          userQuery: requestPrompt,
          isJudicial,
          jurisdicao: "brasil",
          mode: "light",
          userInstruction: `REGRAS:\n1. Retorne SOMENTE o texto resultante, sem explicações, sem comentários, sem markdown.\n2. NÃO adicione prefixos como "Aqui está" ou "Texto reformulado:".\n3. Tom: ${formalityLabel}.\n4. Tipo de documento: ${docLabel}.\n5. NÃO use Markdown.`,
          directApply: true,
        },
      });

      if (error) throw error;
      const result = data?.enrichedText || data?.content || data?.chatResponse || "";
      if (result.trim()) {
        setOutputText(result.trim());
        toast({ title: `✅ ${MODES[mode].label} concluído` });
      } else {
        toast({ title: "Sem resultado", description: "A IA não retornou texto.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao processar", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }, [inputText, mode, docType, formality, outputText, toast]);

  const handleCopy = () => {
    if (outputText) {
      navigator.clipboard.writeText(outputText);
      toast({ title: "📋 Copiado!" });
    }
  };

  const handleUndo = () => {
    if (history.length > 0) {
      setOutputText(history[history.length - 1]);
      setHistory((h) => h.slice(0, -1));
    }
  };

  const handleUseAsInput = () => {
    if (outputText) {
      setInputText(outputText);
      setOutputText("");
    }
  };

  const currentMode = MODES[mode];
  const ModeIcon = currentMode.icon;

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Modo</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 min-w-[160px] justify-between">
                <span className="flex items-center gap-2">
                  <ModeIcon className={`h-3.5 w-3.5 ${currentMode.color}`} />
                  {currentMode.label}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[280px]">
              <div className="px-2 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Escrita</div>
              {(["reformular", "melhorar", "formalizar", "simplificar"] as ReformulationMode[]).map((m) => {
                const cfg = MODES[m];
                const Icon = cfg.icon;
                return (
                  <DropdownMenuItem key={m} className="text-xs gap-2.5 py-2" onClick={() => setMode(m)}>
                    <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    <div className="flex flex-col">
                      <span className="font-medium">{cfg.label}</span>
                      <span className="text-[10px] text-muted-foreground">{cfg.description}</span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Análise</div>
              {(["expandir", "resumir", "fundamentar", "traduzir"] as ReformulationMode[]).map((m) => {
                const cfg = MODES[m];
                const Icon = cfg.icon;
                return (
                  <DropdownMenuItem key={m} className="text-xs gap-2.5 py-2" onClick={() => setMode(m)}>
                    <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    <div className="flex flex-col">
                      <span className="font-medium">{cfg.label}</span>
                      <span className="text-[10px] text-muted-foreground">{cfg.description}</span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator orientation="vertical" className="h-10" />

        <div className="flex flex-col gap-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo de documento</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="h-9 text-xs w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-10" />

        <div className="flex flex-col gap-1.5 min-w-[180px]">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
            <span>Formalidade</span>
            <span className="text-primary font-bold">{formality[0]}%</span>
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground">Claro</span>
            <Slider value={formality} onValueChange={setFormality} min={10} max={100} step={10} className="flex-1" />
            <span className="text-[9px] text-muted-foreground">Erudito</span>
          </div>
        </div>
      </div>

      {/* Editor Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Texto Original</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{wordCount} palavras</span>
              <span>•</span>
              <span>{charCount} caracteres</span>
            </div>
          </div>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={"Cole ou digite o texto jurídico que deseja reformular...\n\nExemplos:\n• Trechos de petições, contratos, pareceres\n• Cláusulas contratuais\n• Argumentação jurídica\n• Títulos e ementas"}
            className="flex-1 min-h-[400px] border-0 rounded-none resize-none focus-visible:ring-0 text-sm leading-relaxed p-4 bg-transparent"
          />
        </div>

        <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <ModeIcon className={`h-3.5 w-3.5 ${currentMode.color}`} />
              <span className="text-xs font-semibold text-foreground">Resultado — {currentMode.label}</span>
            </div>
            <div className="flex items-center gap-1">
              {history.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleUndo}>
                  <Undo2 className="h-3 w-3" />Desfazer
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleCopy} disabled={!outputText}>
                <Copy className="h-3 w-3" />Copiar
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleUseAsInput} disabled={!outputText}>
                <ArrowRight className="h-3 w-3" />Usar como entrada
              </Button>
            </div>
          </div>
          <div ref={outputRef} className="flex-1 min-h-[400px] p-4 overflow-auto">
            {processing ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <div className="relative">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <Sparkles className="h-3 w-3 text-primary absolute -top-1 -right-1 animate-pulse" />
                </div>
                <p className="text-xs font-medium">Processando com IA neural...</p>
                <p className="text-[10px] text-muted-foreground/70">{currentMode.description}</p>
              </div>
            ) : outputText ? (
              <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{outputText}</div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground/50">
                <ModeIcon className="h-10 w-10" />
                <p className="text-xs">O resultado aparecerá aqui</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          className="gap-2 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
          onClick={handleReformulate}
          disabled={processing || !inputText.trim()}
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ModeIcon className="h-4 w-4" />}
          {processing ? "Processando..." : currentMode.label}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: Shield, title: "Preservação Legal", desc: "Termos técnicos, citações e referências legais são preservados automaticamente." },
          { icon: GraduationCap, title: "Base Neural", desc: "Treinado com milhares de documentos jurídicos brasileiros para máxima precisão." },
          { icon: Settings2, title: "Iterativo", desc: "Use 'Usar como entrada' para refinar o resultado em múltiplas passagens." },
        ].map((tip) => (
          <div key={tip.title} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/50">
            <tip.icon className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">{tip.title}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
