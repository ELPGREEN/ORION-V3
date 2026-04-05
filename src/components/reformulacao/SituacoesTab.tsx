import { useState, useCallback } from "react";
import {
  Lightbulb, Plus, Search, Loader2, Copy, Save, Trash2,
  SlidersHorizontal, Wand2, FolderOpen, Filter, Tag, ChevronDown, Eye, Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Situacao {
  id: string;
  titulo: string;
  descricao: string;
  contexto: string;
  categoria: string;
  complexidade: number;
  partes: string;
  tags: string[];
  createdAt: Date;
}

const CATEGORIAS = [
  { value: "civil", label: "Civil" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "penal", label: "Penal" },
  { value: "tributario", label: "Tributário" },
  { value: "administrativo", label: "Administrativo" },
  { value: "constitucional", label: "Constitucional" },
  { value: "empresarial", label: "Empresarial" },
  { value: "ambiental", label: "Ambiental" },
  { value: "consumidor", label: "Consumidor" },
  { value: "familia", label: "Família" },
  { value: "outro", label: "Outro" },
];

const AJUSTE_TIPOS = [
  { value: "aumentar-complexidade", label: "Aumentar complexidade", desc: "Adicionar nuances e camadas ao cenário" },
  { value: "simplificar", label: "Simplificar", desc: "Reduzir complexidade mantendo essência" },
  { value: "adicionar-partes", label: "Adicionar partes", desc: "Incluir novos envolvidos no cenário" },
  { value: "mudar-jurisdicao", label: "Mudar jurisdição", desc: "Adaptar para outro foro ou instância" },
  { value: "atualizar-legislacao", label: "Atualizar legislação", desc: "Adequar à legislação mais recente" },
  { value: "gerar-variacao", label: "Gerar variação", desc: "Criar cenário alternativo similar" },
];

export function SituacoesTab() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Creation state
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("civil");
  const [complexidade, setComplexidade] = useState([50]);
  const [partesEnvolvidas, setPartesEnvolvidas] = useState("");
  const [contextoAdicional, setContextoAdicional] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState("");

  // Saved situations
  const [situacoes, setSituacoes] = useState<Situacao[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("todas");
  const [selectedSituacao, setSelectedSituacao] = useState<Situacao | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Adjustment state
  const [adjusting, setAdjusting] = useState(false);
  const [ajusteTipo, setAjusteTipo] = useState("aumentar-complexidade");
  const [ajusteInstrucao, setAjusteInstrucao] = useState("");
  const [showAjusteDialog, setShowAjusteDialog] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!descricao.trim() && !contextoAdicional.trim()) {
      toast({ title: "Descreva a situação", description: "Insira uma descrição ou contexto.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    const catLabel = CATEGORIAS.find((c) => c.value === categoria)?.label || categoria;
    const compLabel = complexidade[0] >= 70 ? "alta complexidade" : complexidade[0] >= 40 ? "média complexidade" : "baixa complexidade";

    const prompt = `Você é um especialista em Direito brasileiro. Gere uma SITUAÇÃO JURÍDICA detalhada e realista com base nas informações abaixo.

ÁREA: ${catLabel}
COMPLEXIDADE: ${compLabel} (${complexidade[0]}%)
${partesEnvolvidas ? `PARTES ENVOLVIDAS: ${partesEnvolvidas}` : ""}
${descricao ? `DESCRIÇÃO DO USUÁRIO: ${descricao}` : ""}
${contextoAdicional ? `CONTEXTO ADICIONAL: ${contextoAdicional}` : ""}

Estruture assim:
1. **TÍTULO**: Um título descritivo curto
2. **FATOS**: Narrativa detalhada dos fatos (3-5 parágrafos)
3. **PARTES**: Identificação das partes envolvidas e seus papéis
4. **QUESTÕES JURÍDICAS**: Pontos jurídicos relevantes a serem analisados
5. **LEGISLAÇÃO APLICÁVEL**: Artigos de lei, súmulas e jurisprudência pertinentes
6. **POSSÍVEIS TESES**: Argumentos para cada parte

Retorne APENAS o conteúdo estruturado, sem comentários extras.`;

    try {
      const { data, error } = await supabase.functions.invoke("aprimorar-documento", {
        body: {
          currentText: descricao || contextoAdicional,
          documentType: "situação jurídica",
          mode: "light",
          userQuery: prompt,
          userInstruction: "Gere a situação jurídica completa e detalhada conforme solicitado. Use formatação com **negrito** para títulos de seção.",
          directApply: true,
        },
      });

      if (error) throw error;
      const result = data?.enrichedText || data?.content || "";
      if (result.trim()) {
        setGeneratedResult(result.trim());
        toast({ title: "✅ Situação gerada com sucesso" });
      } else {
        toast({ title: "Sem resultado", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [descricao, categoria, complexidade, partesEnvolvidas, contextoAdicional, toast]);

  const handleSave = () => {
    if (!generatedResult.trim()) return;

    const titleMatch = generatedResult.match(/\*\*TÍTULO\*\*[:\s]*(.+?)(?:\n|$)/i) ||
                       generatedResult.match(/^#?\s*(.+?)(?:\n|$)/);
    const titulo = titleMatch?.[1]?.replace(/\*\*/g, "").trim() || "Situação sem título";

    const newSituacao: Situacao = {
      id: crypto.randomUUID(),
      titulo,
      descricao: generatedResult,
      contexto: contextoAdicional,
      categoria,
      complexidade: complexidade[0],
      partes: partesEnvolvidas,
      tags: [CATEGORIAS.find((c) => c.value === categoria)?.label || categoria],
      createdAt: new Date(),
    };

    setSituacoes((prev) => [newSituacao, ...prev]);
    toast({ title: "💾 Situação salva!" });
  };

  const handleAjuste = useCallback(async () => {
    if (!selectedSituacao) return;
    setAdjusting(true);

    const ajusteConfig = AJUSTE_TIPOS.find((a) => a.value === ajusteTipo);
    const prompt = `Você é um especialista em Direito brasileiro. Ajuste a situação jurídica abaixo conforme instruído.

TIPO DE AJUSTE: ${ajusteConfig?.label} — ${ajusteConfig?.desc}
${ajusteInstrucao ? `INSTRUÇÃO ADICIONAL: ${ajusteInstrucao}` : ""}

SITUAÇÃO ORIGINAL:
${selectedSituacao.descricao}

Retorne a situação ajustada completa, mantendo a mesma estrutura (TÍTULO, FATOS, PARTES, QUESTÕES, LEGISLAÇÃO, TESES). Aplique as modificações solicitadas de forma coerente.`;

    try {
      const { data, error } = await supabase.functions.invoke("aprimorar-documento", {
        body: {
          currentText: selectedSituacao.descricao,
          documentType: "situação jurídica",
          mode: "light",
          userQuery: prompt,
          userInstruction: "Ajuste a situação conforme solicitado. Mantenha a estrutura organizada.",
          directApply: true,
        },
      });

      if (error) throw error;
      const result = data?.enrichedText || data?.content || "";
      if (result.trim()) {
        const updated = { ...selectedSituacao, descricao: result.trim() };
        setSituacoes((prev) => prev.map((s) => (s.id === selectedSituacao.id ? updated : s)));
        setSelectedSituacao(updated);
        setGeneratedResult(result.trim());
        toast({ title: "✅ Situação ajustada" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao ajustar", description: err.message, variant: "destructive" });
    } finally {
      setAdjusting(false);
      setShowAjusteDialog(false);
    }
  }, [selectedSituacao, ajusteTipo, ajusteInstrucao, toast]);

  const handleDelete = (id: string) => {
    setSituacoes((prev) => prev.filter((s) => s.id !== id));
    if (selectedSituacao?.id === id) {
      setSelectedSituacao(null);
      setGeneratedResult("");
    }
    toast({ title: "🗑️ Situação removida" });
  };

  const handleCopy = () => {
    if (generatedResult) {
      navigator.clipboard.writeText(generatedResult);
      toast({ title: "📋 Copiado!" });
    }
  };

  const filteredSituacoes = situacoes.filter((s) => {
    const matchSearch = !searchTerm || s.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || s.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = filterCategoria === "todas" || s.categoria === filterCategoria;
    return matchSearch && matchCategoria;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Creation Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Criar Situação</span>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Descrição / Tema</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Disputa contratual entre empresa de tecnologia e fornecedor..."
                  className="mt-1 min-h-[80px] text-xs resize-none"
                />
              </div>

              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Área do Direito</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
                  <span>Complexidade</span>
                  <span className="text-primary font-bold">{complexidade[0]}%</span>
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-muted-foreground">Simples</span>
                  <Slider value={complexidade} onValueChange={setComplexidade} min={10} max={100} step={10} className="flex-1" />
                  <span className="text-[9px] text-muted-foreground">Complexa</span>
                </div>
              </div>

              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Partes envolvidas</Label>
                <Input
                  value={partesEnvolvidas}
                  onChange={(e) => setPartesEnvolvidas(e.target.value)}
                  placeholder="Ex: Empresa A, Funcionário B, Sindicato..."
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Contexto adicional</Label>
                <Textarea
                  value={contextoAdicional}
                  onChange={(e) => setContextoAdicional(e.target.value)}
                  placeholder="Detalhes específicos, legislação a considerar, etc."
                  className="mt-1 min-h-[60px] text-xs resize-none"
                />
              </div>
            </div>

            <Button
              className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleGenerate}
              disabled={generating || (!descricao.trim() && !contextoAdicional.trim())}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {generating ? "Gerando..." : "Gerar Situação"}
            </Button>
          </div>

          {/* Saved Situations List */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Salvas ({situacoes.length})</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1">
                    <Filter className="h-3 w-3" />
                    {filterCategoria === "todas" ? "Todas" : CATEGORIAS.find((c) => c.value === filterCategoria)?.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-xs" onClick={() => setFilterCategoria("todas")}>Todas</DropdownMenuItem>
                  {CATEGORIAS.map((c) => (
                    <DropdownMenuItem key={c.value} className="text-xs" onClick={() => setFilterCategoria(c.value)}>{c.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="p-2">
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar situações..."
                  className="h-7 text-[10px] pl-7"
                />
              </div>

              <ScrollArea className="h-[250px]">
                {filteredSituacoes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
                    <Lightbulb className="h-6 w-6 mb-2" />
                    <p className="text-[10px]">{situacoes.length === 0 ? "Nenhuma situação salva" : "Nenhum resultado"}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredSituacoes.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedSituacao(s);
                          setGeneratedResult(s.descricao);
                        }}
                        className={`w-full text-left p-2 rounded-lg transition-colors text-xs ${
                          selectedSituacao?.id === s.id
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <p className="font-medium text-foreground truncate">{s.titulo}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5">{CATEGORIAS.find((c) => c.value === s.categoria)?.label}</Badge>
                          <span className="text-[9px] text-muted-foreground">{s.complexidade}%</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Right: Result Panel */}
        <div className="lg:col-span-2 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">
                {selectedSituacao ? selectedSituacao.titulo : "Resultado"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {generatedResult && (
                <>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleCopy}>
                    <Copy className="h-3 w-3" />Copiar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1" onClick={handleSave}>
                    <Save className="h-3 w-3" />Salvar
                  </Button>
                  {selectedSituacao && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] gap-1"
                        onClick={() => setShowAjusteDialog(true)}
                      >
                        <SlidersHorizontal className="h-3 w-3" />Ajustar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(selectedSituacao.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-[500px]">
            <div className="p-5">
              {generating ? (
                <div className="flex flex-col items-center justify-center h-[400px] gap-3 text-muted-foreground">
                  <div className="relative">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <Wand2 className="h-3 w-3 text-primary absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <p className="text-xs font-medium">Gerando situação jurídica...</p>
                  <p className="text-[10px] text-muted-foreground/70">Analisando contexto e legislação aplicável</p>
                </div>
              ) : generatedResult ? (
                <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{generatedResult}</div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] gap-3 text-muted-foreground/50">
                  <Lightbulb className="h-12 w-12" />
                  <p className="text-xs">Gere ou selecione uma situação jurídica</p>
                  <p className="text-[10px] max-w-sm text-center">
                    Descreva o cenário desejado, defina a área e complexidade, e clique em "Gerar Situação"
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Adjustment Dialog */}
      <Dialog open={showAjusteDialog} onOpenChange={setShowAjusteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Ajustar Situação
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Tipo de ajuste</Label>
              <Select value={ajusteTipo} onValueChange={setAjusteTipo}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AJUSTE_TIPOS.map((a) => (
                    <SelectItem key={a.value} value={a.value} className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium">{a.label}</span>
                        <span className="text-[10px] text-muted-foreground">{a.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Instruções adicionais (opcional)</Label>
              <Textarea
                value={ajusteInstrucao}
                onChange={(e) => setAjusteInstrucao(e.target.value)}
                placeholder="Ex: Focar na questão da responsabilidade civil..."
                className="mt-1 min-h-[80px] text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAjusteDialog(false)}>Cancelar</Button>
            <Button
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleAjuste}
              disabled={adjusting}
            >
              {adjusting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              {adjusting ? "Ajustando..." : "Aplicar Ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
