import { useState, useMemo, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BookMarked, Plus, Search, Trash2, Copy, FileText, Sparkles, Loader2 } from "lucide-react";
import {
  getAllClauses,
  searchClauses,
  addClause,
  deleteClause,
  incrementUsage,
  getCategories,
  DEFAULT_CATEGORIES,
  seedDefaultClauses,
  type SavedClause,
} from "@/lib/templates";
import { agenteConstrucao } from "@/lib/api";
import { toast } from "sonner";

interface ClauseLibraryPanelProps {
  onInsert?: (text: string) => void;
  selectedText?: string;
}

export function ClauseLibraryPanel({ onInsert, selectedText }: ClauseLibraryPanelProps) {
  useEffect(() => { seedDefaultClauses(); }, []);
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Contratual");
  const [newText, setNewText] = useState(selectedText || "");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiDialog, setShowAiDialog] = useState(false);

  const clauses = useMemo(() => {
    const all = query ? searchClauses(query) : getAllClauses();
    if (filterCategory && filterCategory !== "all") {
      return all.filter((c) => c.category === filterCategory);
    }
    return all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filterCategory, refreshKey]);

  const categories = useMemo(() => {
    const saved = getCategories();
    return [...new Set([...DEFAULT_CATEGORIES, ...saved])];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleAdd = () => {
    if (!newName.trim() || !newText.trim()) {
      toast.error("Preencha nome e texto da cláusula.");
      return;
    }
    addClause(newName.trim(), newCategory, newText.trim());
    setNewName("");
    setNewText("");
    setShowAdd(false);
    setRefreshKey((k) => k + 1);
    toast.success("Cláusula salva na biblioteca!");
  };

  const handleDelete = (id: string) => {
    deleteClause(id);
    setRefreshKey((k) => k + 1);
    toast.success("Cláusula removida.");
  };

  const handleInsert = (clause: SavedClause) => {
    incrementUsage(clause.id);
    onInsert?.(clause.text);
    setRefreshKey((k) => k + 1);
    toast.success(`Cláusula "${clause.name}" inserida.`);
  };

  // AI-powered clause generation
  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim() || aiGenerating) return;
    setAiGenerating(true);
    try {
      const result = await agenteConstrucao.generateDocument(
        "clausula",
        aiPrompt,
        `Gere uma cláusula contratual profissional sobre: ${aiPrompt}. Retorne APENAS o texto da cláusula, sem explicações adicionais. Use linguagem jurídica formal e completa.`
      );
      
      if (result.success && result.proposal?.code) {
        const clauseText = result.proposal.code.replace(/<[^>]*>/g, "").trim();
        setNewName(aiPrompt.substring(0, 60));
        setNewText(clauseText);
        setShowAiDialog(false);
        setShowAdd(true);
        toast.success("Cláusula gerada pela IA! Revise e salve.");
      } else if (result.analysis) {
        setNewName(aiPrompt.substring(0, 60));
        setNewText(result.analysis);
        setShowAiDialog(false);
        setShowAdd(true);
        toast.success("Cláusula gerada! Revise e salve.");
      } else {
        toast.error("Não foi possível gerar a cláusula.");
      }
    } catch (err) {
      toast.error("Erro ao gerar cláusula com IA.");
    } finally {
      setAiGenerating(false);
    }
  }, [aiPrompt, aiGenerating]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Biblioteca de Cláusulas</span>
          <Badge variant="secondary" className="text-[10px] h-5 ml-auto">{clauses.length}</Badge>
        </div>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-7 text-xs pl-7"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-7 w-[100px] text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1.5">
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setNewText(selectedText || "")}>
                <Plus className="h-3 w-3 mr-1" />Salvar Nova
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm">Nova Cláusula</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Cláusula de Confidencialidade" className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEFAULT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Texto da Cláusula</Label>
                  <Textarea value={newText} onChange={(e) => setNewText(e.target.value)} rows={6} className="text-xs" placeholder="Cole ou digite o texto da cláusula aqui..." />
                </div>
                <Button onClick={handleAdd} className="w-full text-xs">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1">
                <Sparkles className="h-3 w-3 text-primary" />Gerar com IA
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Gerar Cláusula com IA
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Descreva a cláusula desejada</Label>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    className="text-xs"
                    placeholder="Ex: Cláusula de não-concorrência com prazo de 2 anos e multa de 10x o salário..."
                  />
                </div>
                <Button
                  onClick={handleAIGenerate}
                  className="w-full text-xs gap-1.5"
                  disabled={aiGenerating || !aiPrompt.trim()}
                >
                  {aiGenerating ? (
                    <><Loader2 className="h-3 w-3 animate-spin" />Gerando...</>
                  ) : (
                    <><Sparkles className="h-3 w-3" />Gerar Cláusula</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {clauses.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {query ? "Nenhuma cláusula encontrada." : "Biblioteca vazia. Salve trechos para reutilizar!"}
              </p>
            </div>
          )}
          {clauses.map((clause) => (
            <div key={clause.id} className="p-2.5 rounded-lg border border-border bg-card hover:bg-accent/20 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate">{clause.name}</p>
                  <Badge variant="outline" className="text-[8px] h-3.5 mt-0.5">{clause.category}</Badge>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleInsert(clause)} title="Inserir no documento">
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive" onClick={() => handleDelete(clause.id)} title="Excluir">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-3 mt-1">{clause.text}</p>
              {clause.usageCount > 0 && (
                <p className="text-[8px] text-muted-foreground/60 mt-1">Usada {clause.usageCount}×</p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
