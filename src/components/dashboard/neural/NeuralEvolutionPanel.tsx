import { useState, useEffect } from "react";
import { 
  GitBranch, Loader2, CheckCircle2, XCircle, Clock, 
  Sparkles, AlertTriangle, Lightbulb, Wrench, Sliders, Code,
  RefreshCw, ThumbsUp, ThumbsDown, FlaskConical, History, Play,
  GraduationCap, Pencil, Save, X, CheckSquare, Square, ListChecks
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { callEvolution } from "@/lib/neural/ai-service";
import { useAuth } from "@/contexts/AuthContext";

interface Proposal {
  id: string;
  proposal_type: string;
  scope: string;
  title: string;
  description: string;
  current_value: string | null;
  proposed_value: string;
  reasoning: string;
  impact_estimate: string | null;
  evidence: any;
  status: string;
  approved_at: string | null;
  applied_at: string | null;
  created_at: string;
}

interface ABExperiment {
  id: string;
  name: string;
  scope: string;
  status: string;
  traffic_split: number;
  winner: string | null;
  started_at: string;
  ended_at: string | null;
  variant_a: { id: string; key: string; version_label: string; score_avg: number | null; score_count: number | null } | null;
  variant_b: { id: string; key: string; version_label: string; score_avg: number | null; score_count: number | null } | null;
}

interface PromptVersion {
  id: string;
  key: string;
  scope: string;
  version_label: string;
  content: string;
  is_active: boolean;
  score_avg: number | null;
  score_count: number | null;
  created_at: string;
}

interface SpecEditData {
  name: string;
  category: string;
  description: string;
  system: string;
  enhancement: string;
}

const typeIcons: Record<string, typeof Sparkles> = {
  prompt_rewrite: Lightbulb,
  config_change: Sliders,
  code_fix: Code,
  weight_tune: Wrench,
  new_specialization: GraduationCap,
  update_specialization: Pencil,
};

const typeLabels: Record<string, string> = {
  prompt_rewrite: "Otimização de Prompt",
  config_change: "Ajuste de Configuração",
  code_fix: "Correção de Código",
  weight_tune: "Calibração de Pesos",
  new_specialization: "Nova Especialização",
  update_specialization: "Atualizar Especialização",
};

const statusColors: Record<string, string> = {
  pending: "text-yellow-600 border-yellow-600",
  approved: "text-blue-600 border-blue-600",
  applied: "text-green-600 border-green-600",
  rejected: "text-red-600 border-red-600",
  reverted: "text-muted-foreground border-border",
};

const statusLabels: Record<string, string> = {
  pending: "Aguardando Aprovação",
  approved: "Aprovado",
  applied: "Aplicado",
  rejected: "Rejeitado",
  reverted: "Revertido",
};

export function NeuralEvolutionPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [experiments, setExperiments] = useState<ABExperiment[]>([]);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [evaluatingAB, setEvaluatingAB] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [stats, setStats] = useState({ pending: 0, approved: 0, applied: 0, rejected: 0 });
  const [versionStats, setVersionStats] = useState({ active: 0, inactive: 0, total: 0 });
  const [editingSpec, setEditingSpec] = useState<string | null>(null);
  const [specEditData, setSpecEditData] = useState<SpecEditData>({ name: "", category: "", description: "", system: "", enhancement: "" });
  
  // Selection & filter state
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(new Set());
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [scopeFilter, setScopeFilter] = useState<string>("all");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadProposals(), loadExperiments(), loadPromptVersions()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadProposals() {
    // Fetch recent proposals for display
    const { data, error } = await supabase
      .from("neural_evolution_proposals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) { console.error("Error loading proposals:", error); return; }
    const typed = (data || []) as unknown as Proposal[];
    setProposals(typed);
    setSelectedProposals(new Set());

    // Fetch real total counts from DB (not just from limited results)
    const statuses = ["pending", "approved", "applied", "rejected"] as const;
    const counts = await Promise.all(
      statuses.map(async (status) => {
        const { count } = await supabase
          .from("neural_evolution_proposals")
          .select("*", { count: "exact", head: true })
          .eq("status", status);
        return { status, count: count || 0 };
      })
    );
    const s = { pending: 0, approved: 0, applied: 0, rejected: 0 };
    for (const c of counts) s[c.status] = c.count;
    setStats(s);
  }

  async function loadExperiments() {
    try {
      const data = await callEvolution("get_ab_experiments");
      if (data?.experiments) {
        setExperiments(data.experiments as ABExperiment[]);
      }
    } catch (e) { console.warn("[NeuralEvolution] Failed to load AB experiments:", e); }
  }

  async function loadPromptVersions() {
    try {
      // Fetch versions for display
      const { data: versions } = await supabase
        .from("neural_prompt_versions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      // Fetch exact total counts separately
      const { count: totalCount } = await supabase
        .from("neural_prompt_versions")
        .select("*", { count: "exact", head: true });

      const { count: activeCount } = await supabase
        .from("neural_prompt_versions")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (versions) {
        setPromptVersions(versions as unknown as PromptVersion[]);
      }
      const total = totalCount || 0;
      const active = activeCount || 0;
      setVersionStats({ active, inactive: total - active, total });
      setSelectedVersions(new Set());
    } catch (e) { console.warn("[NeuralEvolution] Failed to load prompt versions:", e); }
  }

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const data = await callEvolution("analyze_and_propose");
      if (error) {
        console.error("[NeuralEvolution] analyze_and_propose error:", error);
        const errorMsg = error instanceof Error ? error.message : typeof error === "object" ? JSON.stringify(error) : String(error);
        throw new Error(errorMsg);
      }
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Análise concluída",
        description: `${data?.proposals?.length || 0} novas propostas geradas.`,
      });
      loadAll();
    } catch (err: any) {
      const msg = err?.message || "Erro desconhecido";
      console.error("[NeuralEvolution] runAnalysis failed:", msg);
      toast({ title: "Erro na análise", description: msg.includes("401") ? "Sessão expirada. Faça login novamente." : msg, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  }

  function startEditSpec(proposal: Proposal) {
    try {
      const parsed = JSON.parse(proposal.proposed_value);
      setSpecEditData({
        name: parsed.name || "",
        category: parsed.category || "",
        description: parsed.description || "",
        system: parsed.prompts?.system || "",
        enhancement: parsed.prompts?.enhancement || "",
      });
    } catch {
      setSpecEditData({ name: "", category: proposal.scope, description: "", system: "", enhancement: "" });
    }
    setEditingSpec(proposal.id);
  }

  async function handleApproveSpec(proposalId: string, withEdit: boolean) {
    setActionLoading(proposalId);
    try {
      const editedData = withEdit ? {
        name: specEditData.name,
        category: specEditData.category,
        description: specEditData.description,
        prompts: { system: specEditData.system, enhancement: specEditData.enhancement },
      } : undefined;

      if (withEdit) {
        const proposal = proposals.find(p => p.id === proposalId);
        if (proposal?.proposal_type === "update_specialization" && proposal.current_value) {
          try {
            const current = JSON.parse(proposal.current_value);
            if (current.id && editedData) {
              (editedData as Record<string, unknown>).id = current.id;
            }
          } catch { /* ignore */ }
        }
      }

      const data = await callEvolution("approve_specialization_proposal", { proposalId, userId: user?.id, editedData });

      toast({
        title: data?.applied ? "Especialização aplicada ✅" : "Proposta aprovada",
        description: data?.applied ? "A especialização foi criada/atualizada com sucesso." : "Proposta aprovada.",
      });
      setEditingSpec(null);
      loadAll();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApprove(proposalId: string) {
    const proposal = proposals.find(p => p.id === proposalId);
    if (proposal && (proposal.proposal_type === "new_specialization" || proposal.proposal_type === "update_specialization")) {
      return handleApproveSpec(proposalId, editingSpec === proposalId);
    }

    setActionLoading(proposalId);
    try {
      // For prompt_rewrite, capture edited text from the uncontrolled textarea
      let editedProposedValue: string | undefined;
      if (proposal?.proposal_type === "prompt_rewrite") {
        const textarea = document.getElementById(`prompt-edit-${proposalId}`) as HTMLTextAreaElement | null;
        if (textarea) {
          editedProposedValue = textarea.value;
        }
      }

      const data = await callEvolution("approve_proposal", { proposalId, userId: user?.id, editedProposedValue });

      let description = "Proposta aprovada com sucesso.";
      if (data?.promptVersionId) description += " Nova versão de prompt criada.";
      if (data?.abExperimentId) description += " Experimento A/B iniciado.";
      if (data?.applied) description += " Mudança aplicada automaticamente.";

      toast({ title: "Proposta aprovada ✅", description });
      loadAll();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(proposalId: string) {
    setActionLoading(proposalId);
    try {
      await callEvolution("reject_proposal", { proposalId });
      toast({ title: "Proposta rejeitada" });
      loadAll();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  // Bulk actions for proposals
  const pendingProposals = proposals.filter(p => p.status === "pending");
  const allPendingSelected = pendingProposals.length > 0 && pendingProposals.every(p => selectedProposals.has(p.id));

  function toggleProposalSelection(id: string) {
    setSelectedProposals(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllPendingProposals() {
    if (allPendingSelected) {
      setSelectedProposals(new Set());
    } else {
      setSelectedProposals(new Set(pendingProposals.map(p => p.id)));
    }
  }

  async function bulkApproveProposals() {
    if (selectedProposals.size === 0) return;
    setBulkLoading(true);
    let successCount = 0;
    let errorCount = 0;
    for (const id of selectedProposals) {
      try {
        const proposal = proposals.find(p => p.id === id);
        if (!proposal || proposal.status !== "pending") continue;
        const isSpec = proposal.proposal_type === "new_specialization" || proposal.proposal_type === "update_specialization";
        const action = isSpec ? "approve_specialization_proposal" : "approve_proposal";
        await callEvolution("unknown", { action, proposalId: id, userId: user?.id });
        successCount++;
      } catch {
        errorCount++;
      }
    }
    toast({
      title: `${successCount} proposta(s) aprovada(s)`,
      description: errorCount > 0 ? `${errorCount} erro(s) encontrado(s).` : "Todas aprovadas com sucesso.",
    });
    setBulkLoading(false);
    await loadAll();
  }

  async function bulkRejectProposals() {
    if (selectedProposals.size === 0) return;
    setBulkLoading(true);
    let successCount = 0;
    for (const id of selectedProposals) {
      try {
        await callEvolution("reject_proposal", { proposalId: id });
        if (!error) successCount++;
      } catch (e) { console.warn("[NeuralEvolution] Failed to reject proposal:", e); }
    }
    toast({ title: `${successCount} proposta(s) rejeitada(s)` });
    setBulkLoading(false);
    await loadAll();
  }

  // Scope filter & bulk actions for prompt versions
  const uniqueScopes = [...new Set(promptVersions.map(v => v.scope))].sort();
  const filteredVersions = scopeFilter === "all" ? promptVersions : promptVersions.filter(v => v.scope === scopeFilter);
  const inactiveVersions = filteredVersions.filter(v => !v.is_active);
  const allInactiveSelected = inactiveVersions.length > 0 && inactiveVersions.every(v => selectedVersions.has(v.id));

  function toggleVersionSelection(id: string) {
    setSelectedVersions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllInactiveVersions() {
    if (allInactiveSelected) {
      setSelectedVersions(new Set());
    } else {
      setSelectedVersions(new Set(inactiveVersions.map(v => v.id)));
    }
  }

  async function bulkActivateVersions() {
    if (selectedVersions.size === 0) return;
    setBulkLoading(true);
    
    // Group selected versions by scope — only activate the LATEST per scope
    const selectedList = promptVersions.filter(v => selectedVersions.has(v.id));
    const byScope: Record<string, PromptVersion> = {};
    for (const v of selectedList) {
      // Keep the one with latest created_at per scope
      if (!byScope[v.scope] || new Date(v.created_at) > new Date(byScope[v.scope].created_at)) {
        byScope[v.scope] = v;
      }
    }

    const toActivate = Object.values(byScope);
    let successCount = 0;
    const skipped = selectedVersions.size - toActivate.length;

    for (const version of toActivate) {
      try {
        await callEvolution("apply_prompt_version", { versionId: version.id });
        if (!error) successCount++;
      } catch (e) { console.warn("[NeuralEvolution] Failed to activate version:", e); }
    }
    
    const desc = successCount > 0
      ? `${successCount} versão(ões) ativada(s) com sucesso.`
      : "Nenhuma versão nova para ativar.";
    
    toast({ title: "Ativação concluída ✅", description: desc });
    setBulkLoading(false);
    await loadAll();
  }

  async function handleEvaluateAB() {
    setEvaluatingAB(true);
    try {
      const data = await callEvolution("evaluate_ab");
      const results = data?.results || [];
      const completed = results.filter((r: any) => r.winner);
      toast({
        title: "Avaliação A/B concluída",
        description: completed.length > 0
          ? `${completed.length} experimento(s) concluído(s) com vencedor.`
          : `${results.length} experimento(s) avaliados, aguardando mais amostras.`,
      });
      loadAll();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setEvaluatingAB(false);
    }
  }

  async function handleActivateVersion(versionId: string) {
    setActionLoading(versionId);
    try {
      await callEvolution("apply_prompt_version", { versionId });
      toast({ title: "Versão ativada ✅" });
      loadAll();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  function isSpecProposal(p: Proposal) {
    return p.proposal_type === "new_specialization" || p.proposal_type === "update_specialization";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const runningExperiments = experiments.filter(e => e.status === "running");

  return (
    <div className="space-y-4">
      {/* Header + Stats */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                Auto-Evolução Neural
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                O sistema analisa feedbacks, métricas e erros para propor melhorias automáticas
              </CardDescription>
            </div>
            <Button onClick={runAnalysis} disabled={analyzing} size="sm" className="btn-gold">
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              {analyzing ? "Analisando..." : "Analisar Agora"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
           <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="text-center p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-lg font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-[10px] text-muted-foreground">Pendentes</p>
            </div>
            <div className="text-center p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-lg font-bold text-blue-600">{stats.approved}</p>
              <p className="text-[10px] text-muted-foreground">Aprovadas</p>
            </div>
            <div className="text-center p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-lg font-bold text-green-600">{stats.applied}</p>
              <p className="text-[10px] text-muted-foreground">Aplicadas</p>
            </div>
            <div className="text-center p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-lg font-bold text-red-600">{stats.rejected}</p>
              <p className="text-[10px] text-muted-foreground">Rejeitadas</p>
            </div>
          </div>
          {versionStats.total > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-lg font-bold text-green-600">{versionStats.active}</p>
                <p className="text-[10px] text-muted-foreground">Prompts Ativos</p>
              </div>
              <div className="text-center p-2 bg-muted/50 border border-border rounded-lg">
                <p className="text-lg font-bold text-muted-foreground">{versionStats.inactive}</p>
                <p className="text-[10px] text-muted-foreground">Prompts Inativos</p>
              </div>
              <div className="text-center p-2 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-lg font-bold text-primary">{versionStats.total}</p>
                <p className="text-[10px] text-muted-foreground">Total Versões</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* A/B Experiments Section */}
      {experiments.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                Experimentos A/B ({runningExperiments.length} ativo{runningExperiments.length !== 1 ? 's' : ''})
              </CardTitle>
              {runningExperiments.length > 0 && (
                <Button onClick={handleEvaluateAB} disabled={evaluatingAB} size="sm" variant="outline">
                  {evaluatingAB ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                  Avaliar Agora
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {experiments.map(exp => (
              <div key={exp.id} className="p-3 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">{exp.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                    exp.status === "running" ? "text-blue-600 border-blue-600" :
                    exp.status === "completed" ? "text-green-600 border-green-600" : "text-muted-foreground border-border"
                  }`}>
                    {exp.status === "running" ? "Em andamento" : exp.status === "completed" ? `Vencedor: ${exp.winner}` : exp.status}
                  </span>
                </div>
                {/* Progress indicator */}
                {exp.status === "running" && (() => {
                  const countA = exp.variant_a?.score_count || 0;
                  const countB = exp.variant_b?.score_count || 0;
                  const totalSamples = countA + countB;
                  const targetSamples = 40; // 20 per variant
                  const progress = Math.min((totalSamples / targetSamples) * 100, 100);
                  return (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-muted-foreground">Progresso: {totalSamples}/{targetSamples} amostras</span>
                        <span className="text-[9px] font-medium text-primary">{progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {progress >= 100 && (
                        <p className="text-[8px] text-green-500 mt-0.5 font-medium">✓ Amostras suficientes — pronto para avaliar</p>
                      )}
                    </div>
                  );
                })()}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2 rounded text-center ${exp.winner === "A" ? "bg-green-500/10 border border-green-500/30" : "bg-muted/50"}`}>
                    <p className="text-[10px] text-muted-foreground">Variante A</p>
                    <p className="text-xs font-medium">{exp.variant_a?.version_label || "—"}</p>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        Score: {exp.variant_a?.score_avg?.toFixed(3) || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500/70 rounded-full transition-all"
                          style={{ width: `${Math.min(((exp.variant_a?.score_count || 0) / 20) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap">{exp.variant_a?.score_count || 0}/20</span>
                    </div>
                  </div>
                  <div className={`p-2 rounded text-center ${exp.winner === "B" ? "bg-green-500/10 border border-green-500/30" : "bg-muted/50"}`}>
                    <p className="text-[10px] text-muted-foreground">Variante B</p>
                    <p className="text-xs font-medium">{exp.variant_b?.version_label || "—"}</p>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        Score: {exp.variant_b?.score_avg?.toFixed(3) || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500/70 rounded-full transition-all"
                          style={{ width: `${Math.min(((exp.variant_b?.score_count || 0) / 20) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap">{exp.variant_b?.score_count || 0}/20</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Prompt Versions Section */}
      {promptVersions.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Versões de Prompt ({filteredVersions.length}{scopeFilter !== "all" ? ` de ${promptVersions.length}` : ""})
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={scopeFilter}
                  onChange={(e) => { setScopeFilter(e.target.value); setSelectedVersions(new Set()); }}
                  className="h-7 text-[10px] rounded border border-border bg-background px-2 text-foreground"
                >
                  <option value="all">Todos os escopos</option>
                  {uniqueScopes.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {inactiveVersions.length > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] gap-1"
                      onClick={toggleAllInactiveVersions}
                    >
                      {allInactiveSelected ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                      {allInactiveSelected ? "Desmarcar" : "Selecionar tudo"}
                    </Button>
                    {selectedVersions.size > 0 && (
                      <Button
                        size="sm"
                        className="h-7 text-[10px] bg-green-600 hover:bg-green-700 text-primary-foreground gap-1"
                        onClick={bulkActivateVersions}
                        disabled={bulkLoading}
                      >
                        {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        Ativar ({selectedVersions.size})
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredVersions.map(v => (
              <div key={v.id} className="flex items-center justify-between p-2 bg-muted/30 rounded border border-border">
                {!v.is_active && (
                  <Checkbox
                    checked={selectedVersions.has(v.id)}
                    onCheckedChange={() => toggleVersionSelection(v.id)}
                    className="mr-2 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{v.version_label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{v.scope}</span>
                    {v.is_active && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-600 text-primary-foreground">Ativa</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{v.content.substring(0, 100)}...</p>
                  {v.score_avg !== null && (
                    <p className="text-[10px] text-primary mt-0.5">
                      Score: {v.score_avg.toFixed(3)} ({v.score_count || 0} amostras)
                    </p>
                  )}
                </div>
                {!v.is_active && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] ml-2"
                    onClick={() => handleActivateVersion(v.id)}
                    disabled={actionLoading === v.id}
                  >
                    {actionLoading === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ativar"}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Proposals List */}
      {proposals.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma proposta de evolução ainda. Clique em "Analisar Agora" para iniciar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Bulk actions bar for proposals */}
          {pendingProposals.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="py-2 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allPendingSelected}
                      onCheckedChange={toggleAllPendingProposals}
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedProposals.size > 0
                        ? `${selectedProposals.size} de ${pendingProposals.length} selecionada(s)`
                        : `${pendingProposals.length} proposta(s) pendente(s)`}
                    </span>
                  </div>
                  {selectedProposals.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-[10px] bg-green-600 hover:bg-green-700 text-primary-foreground gap-1"
                        onClick={bulkApproveProposals}
                        disabled={bulkLoading}
                      >
                        {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />}
                        Aprovar ({selectedProposals.size})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] text-red-600 border-red-600 hover:bg-red-500/10 gap-1"
                        onClick={bulkRejectProposals}
                        disabled={bulkLoading}
                      >
                        {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsDown className="h-3 w-3" />}
                        Rejeitar ({selectedProposals.size})
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {proposals.map((proposal) => {
            const Icon = typeIcons[proposal.proposal_type] || Sparkles;
            const isSpec = isSpecProposal(proposal);
            const isEditing = editingSpec === proposal.id;
            const isPending = proposal.status === "pending";

            return (
              <Card key={proposal.id} className={`bg-card border-border ${isSpec ? "border-l-4 border-l-primary" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {isPending && (
                        <Checkbox
                          checked={selectedProposals.has(proposal.id)}
                          onCheckedChange={() => toggleProposalSelection(proposal.id)}
                          className="mt-1 shrink-0"
                        />
                      )}
                      <div className="mt-0.5 p-1.5 bg-primary/10 rounded">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-medium">{proposal.title}</h4>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${statusColors[proposal.status]}`}>
                            {statusLabels[proposal.status] || proposal.status}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                            {typeLabels[proposal.proposal_type] || proposal.proposal_type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{proposal.description}</p>
                        
                        {/* Specialization edit form */}
                        {isSpec && isEditing && isPending && (
                          <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                            <p className="text-[11px] font-medium text-primary flex items-center gap-1">
                              <Pencil className="h-3 w-3" /> Editar antes de aprovar
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground">Nome</label>
                                <Input
                                  value={specEditData.name}
                                  onChange={e => setSpecEditData(d => ({ ...d, name: e.target.value }))}
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground">Categoria</label>
                                <Input
                                  value={specEditData.category}
                                  onChange={e => setSpecEditData(d => ({ ...d, category: e.target.value }))}
                                  className="h-7 text-xs"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Descrição</label>
                              <Textarea
                                value={specEditData.description}
                                onChange={e => setSpecEditData(d => ({ ...d, description: e.target.value }))}
                                className="text-xs min-h-[40px]"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Prompt do Sistema</label>
                              <Textarea
                                value={specEditData.system}
                                onChange={e => setSpecEditData(d => ({ ...d, system: e.target.value }))}
                                className="text-xs min-h-[50px]"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Prompt de Enhancement</label>
                              <Textarea
                                value={specEditData.enhancement}
                                onChange={e => setSpecEditData(d => ({ ...d, enhancement: e.target.value }))}
                                className="text-xs min-h-[50px]"
                                rows={2}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-7 text-[10px] bg-green-600 hover:bg-green-700 text-primary-foreground"
                                onClick={() => handleApproveSpec(proposal.id, true)}
                                disabled={actionLoading === proposal.id}
                              >
                                {actionLoading === proposal.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                                Salvar e Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[10px]"
                                onClick={() => setEditingSpec(null)}
                              >
                                <X className="h-3 w-3 mr-1" /> Cancelar
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Prompt rewrite: show proposed_value pre-filled in editable field */}
                        {proposal.proposal_type === "prompt_rewrite" && isPending && !isEditing && (
                          <div className="mt-2 space-y-1">
                            {proposal.current_value && (
                              <div className="p-2 bg-red-500/5 border border-red-500/10 rounded text-[11px]">
                                <span className="font-medium text-red-600">Atual:</span> {proposal.current_value}
                              </div>
                            )}
                            <div className="p-2 bg-green-500/5 border border-green-500/10 rounded text-[11px]">
                              <span className="font-medium text-green-600">Sugestão (editável):</span>
                              <Textarea
                                defaultValue={proposal.proposed_value}
                                className="text-xs mt-1 min-h-[60px] bg-background"
                                rows={3}
                                id={`prompt-edit-${proposal.id}`}
                              />
                            </div>
                          </div>
                        )}

                        {/* Non-prompt_rewrite proposals: show current/proposed as before */}
                        {proposal.proposal_type !== "prompt_rewrite" && !isEditing && proposal.current_value && (
                          <div className="mt-2 p-2 bg-red-500/5 border border-red-500/10 rounded text-[11px]">
                            <span className="font-medium text-red-600">Atual:</span>{" "}
                            {isSpec ? tryFormatSpecJson(proposal.current_value) : proposal.current_value}
                          </div>
                        )}
                        {proposal.proposal_type !== "prompt_rewrite" && !isEditing && (
                          <div className="mt-1 p-2 bg-green-500/5 border border-green-500/10 rounded text-[11px]">
                            <span className="font-medium text-green-600">Proposta:</span>{" "}
                            {isSpec ? tryFormatSpecJson(proposal.proposed_value) : proposal.proposed_value}
                          </div>
                        )}
                        
                        {proposal.reasoning && !isEditing && (
                          <details className="mt-2">
                            <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                              Ver raciocínio e evidências
                            </summary>
                            <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-line">{proposal.reasoning}</p>
                          </details>
                        )}

                        {proposal.impact_estimate && !isEditing && (
                          <div className="mt-2 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-primary" />
                            <span className="text-[10px] text-primary font-medium">
                              Impacto estimado: {proposal.impact_estimate}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isPending && !isEditing && (
                      <div className="flex gap-1.5 shrink-0">
                        {isSpec && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-primary border-primary hover:bg-primary/10"
                            onClick={() => startEditSpec(proposal)}
                            title="Editar antes de aprovar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-green-600 border-green-600 hover:bg-green-500/10"
                          onClick={() => handleApprove(proposal.id)}
                          disabled={actionLoading === proposal.id}
                        >
                          {actionLoading === proposal.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ThumbsUp className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-red-600 border-red-600 hover:bg-red-500/10"
                          onClick={() => handleReject(proposal.id)}
                          disabled={actionLoading === proposal.id}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    {proposal.status === "applied" && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    )}
                    {proposal.status === "rejected" && (
                      <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(proposal.created_at).toLocaleString("pt-BR")}
                    </span>
                    {proposal.applied_at && (
                      <>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-green-600">
                          Aplicado em {new Date(proposal.applied_at).toLocaleString("pt-BR")}
                        </span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function tryFormatSpecJson(value: string): string {
  try {
    const parsed = JSON.parse(value);
    const parts: string[] = [];
    if (parsed.name) parts.push(parsed.name);
    if (parsed.category) parts.push(`[${parsed.category}]`);
    if (parsed.description) parts.push(`— ${parsed.description}`);
    if (parsed.prompts?.system) parts.push(`\nSystem: "${parsed.prompts.system.substring(0, 80)}..."`);
    if (parsed.suggestion) parts.push(`\n💡 ${parsed.suggestion}`);
    return parts.join(" ") || value;
  } catch {
    return value;
  }
}
