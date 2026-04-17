/**
 * ARC-AGI-3 Agent Panel — joga, aprende, evolui o próprio código do Orion.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Brain, GitPullRequest, RefreshCw, Trophy } from "lucide-react";

interface Game { game_id: string; title: string | null; total_attempts: number; wins: number; best_score: number | null; }
interface Scorecard { scorecard_id: string; game_id: string; won: boolean; score: number | null; total_actions: number | null; strategy_summary: string | null; created_at: string; }
interface Proposal { id: string; title: string; rationale: string; status: string; jules_pr_url: string | null; created_at: string; }

export default function ARCAgentPanel() {
  const [games, setGames] = useState<Game[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string>("");
  const [version, setVersion] = useState<"2" | "3">("3");

  const refresh = async () => {
    const [g, s, p] = await Promise.all([
      supabase.from("arc_games").select("*").order("wins", { ascending: false }).limit(30),
      supabase.from("arc_scorecards").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("arc_evolution_proposals").select("*").order("created_at", { ascending: false }).limit(15),
    ]);
    if (g.data) setGames(g.data as Game[]);
    if (s.data) setScorecards(s.data as Scorecard[]);
    if (p.data) setProposals(p.data as Proposal[]);
  };

  useEffect(() => { refresh(); const i = setInterval(refresh, 15000); return () => clearInterval(i); }, []);

  const call = async (fn: string, body: Record<string, unknown>, label: string) => {
    setBusy(label); setLog("");
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      setLog(JSON.stringify(data, null, 2).slice(0, 2000));
      await refresh();
    } catch (e) {
      setLog(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(null); }
  };

  return (
    <div className="p-4 tron-panel space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[hsl(var(--tron-neon))]">🎮 ARC-AGI v{version} — Auto-Evolução</h3>
        <div className="flex items-center gap-2">
          <div className="flex border border-[hsl(var(--tron-neon)/0.3)] rounded overflow-hidden text-xs">
            <button onClick={() => setVersion("2")} className={`px-2 py-1 ${version === "2" ? "bg-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]" : "text-[hsl(var(--tron-muted))]"}`}>v2</button>
            <button onClick={() => setVersion("3")} className={`px-2 py-1 ${version === "3" ? "bg-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]" : "text-[hsl(var(--tron-muted))]"}`}>v3</button>
          </div>
          <Button size="sm" variant="ghost" onClick={refresh}><RefreshCw className="w-3 h-3" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] p-2 rounded">
          <div className="text-[hsl(var(--tron-muted))]">Jogos descobertos</div>
          <div className="text-xl font-mono text-[hsl(var(--tron-neon))]">{games.length}</div>
        </div>
        <div className="bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] p-2 rounded">
          <div className="text-[hsl(var(--tron-muted))]">Vitórias totais</div>
          <div className="text-xl font-mono text-[hsl(var(--tron-warn))]">{games.reduce((s, g) => s + g.wins, 0)}</div>
        </div>
        <div className="bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] p-2 rounded">
          <div className="text-[hsl(var(--tron-muted))]">Propostas pendentes</div>
          <div className="text-xl font-mono text-[hsl(var(--tron-info))]">{proposals.filter((p) => p.status === "pending").length}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" disabled={!!busy} onClick={() => call("arc-agent", { action: "list_games", version }, "list")}>
          {busy === "list" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Descobrir jogos
        </Button>
        <Button size="sm" disabled={!!busy} onClick={() => call("arc-self-study", { max_games: 1, version }, "study")}>
          {busy === "study" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Estudar 1 jogo
        </Button>
        <Button size="sm" disabled={!!busy} onClick={() => call("arc-self-study", { max_games: 3, version }, "study3")}>
          {busy === "study3" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Maratona (3)
        </Button>
        <Button size="sm" disabled={!!busy} onClick={() => call("arc-code-evolver", { mode: "propose" }, "propose")}>
          {busy === "propose" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />} Propor melhoria
        </Button>
      </div>

      {log && (
        <pre className="bg-[hsl(var(--tron-bg-deep))] p-2 rounded text-xs text-[hsl(var(--tron-neon))] overflow-x-auto max-h-32">{log}</pre>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-[hsl(var(--tron-muted))]">Top jogos</h4>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {games.slice(0, 10).map((g) => (
              <div key={g.game_id} className="text-xs bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] px-2 py-1 rounded flex justify-between">
                <span className="font-mono">{g.game_id}</span>
                <span className="text-[hsl(var(--tron-warn))]"><Trophy className="w-3 h-3 inline" /> {g.wins}/{g.total_attempts}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="text-xs font-bold text-[hsl(var(--tron-muted))]">Partidas recentes</h4>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {scorecards.map((s) => (
              <div key={s.scorecard_id} className="text-xs bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] px-2 py-1 rounded">
                <div className="flex justify-between">
                  <span className="font-mono">{s.game_id}</span>
                  <span className={s.won ? "text-[hsl(var(--tron-neon))]" : "text-[hsl(var(--tron-danger))]"}>
                    {s.won ? "WIN" : "LOSS"} • {s.score ?? 0} pts • {s.total_actions ?? 0} actions
                  </span>
                </div>
                {s.strategy_summary && <div className="text-[hsl(var(--tron-muted))] mt-1 italic">{s.strategy_summary}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-bold text-[hsl(var(--tron-muted))]">Propostas de auto-evolução</h4>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {proposals.map((p) => (
            <div key={p.id} className="text-xs bg-[hsl(var(--tron-surface))] border border-[hsl(var(--tron-neon)/0.12)] px-2 py-2 rounded">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-bold text-[hsl(var(--tron-neon))]">{p.title}</div>
                  <div className="text-[hsl(var(--tron-muted))] mt-1">{p.rationale}</div>
                </div>
                <span className="ml-2 px-2 py-0.5 rounded bg-[hsl(var(--tron-bg-deep))]">{p.status}</span>
              </div>
              <div className="flex gap-2 mt-2">
                {p.status === "pending" && (
                  <Button size="sm" variant="outline" disabled={!!busy}
                    onClick={() => call("arc-code-evolver", { mode: "submit_to_jules", proposal_id: p.id }, `jules-${p.id}`)}>
                    <GitPullRequest className="w-3 h-3 mr-1" /> Enviar ao Jules
                  </Button>
                )}
                {p.jules_pr_url && (
                  <a href={p.jules_pr_url} target="_blank" rel="noreferrer" className="text-[hsl(var(--tron-info))] underline">Ver PR</a>
                )}
              </div>
            </div>
          ))}
          {proposals.length === 0 && <div className="text-xs text-[hsl(var(--tron-muted))]">Nenhuma proposta ainda.</div>}
        </div>
      </div>
    </div>
  );
}
