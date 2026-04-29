/**
 * ─── KnowledgeHarvesterPanel ───
 * UI Component for the Knowledge Harvester.
 * Displays prompts, topics, progress, and results.
 */

import { useState } from "react";
import { useKnowledgeHarvester } from "@/hooks/useKnowledgeHarvester";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brain, Zap, Target, Shield, Wrench, Eye, Search, Database, FileText, Repeat, Loader2, X } from "lucide-react";

const PROMPT_ICONS: Record<string, typeof Brain> = {
  master_study: Brain,
  probability_uncertainty: Target,
  multi_llm_consensus: Zap,
  anti_hallucination: Shield,
  agent_builder: Wrench,
  scenario_simulation: Eye,
  meta_learning: Search,
  memory_evolution: Database,
  self_test: FileText,
  evolution_loop: Repeat,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  foundational: "bg-green-500/20 text-green-400",
  intermediate: "bg-yellow-500/20 text-yellow-400",
  advanced: "bg-orange-500/20 text-orange-400",
  expert: "bg-red-500/20 text-red-400",
};

export function KnowledgeHarvesterPanel() {
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [customTopic, setCustomTopic] = useState("");

  const {
    prompts,
    topics,
    topicCount,
    status,
    progress,
    totalSteps,
    results,
    currentSession,
    error,
    isRunning,
    run,
    runQuick,
    runFull,
    runRandom,
    cancel,
    clearResults,
  } = useKnowledgeHarvester();

  const filteredTopics = selectedCategory
    ? topics.find((t) => t.category === selectedCategory)?.topics || []
    : [];

  const activeTopic = customTopic || selectedTopic;

  const handleRun = async (mode: "quick" | "full" | "single" | "random") => {
    const topic = mode === "random" ? "" : activeTopic;
    if (!topic && mode !== "random") return;

    try {
      switch (mode) {
        case "quick":
          await runQuick(topic);
          break;
        case "full":
          await runFull(topic);
          break;
        case "random":
          await runRandom();
          break;
      }
    } catch (err) {
      console.error("[Harvester] Run failed:", err);
    }
  };

  return (
    <Card className="w-full bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Brain className="w-5 h-5 text-cyan-400" />
          Knowledge Harvester
          <Badge variant="outline" className="text-xs ml-2">
            {topicCount} tópicos
          </Badge>
        </CardTitle>
        <CardDescription>
          Sistema autocognitivo de evolução contínua — 10 prompts estruturados
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-zinc-400">
              <span>
                {progress}/{totalSteps} steps
              </span>
              <span className="capitalize">{status}</span>
            </div>
            <Progress value={(progress / totalSteps) * 100} className="h-2" />
            <div className="text-xs text-zinc-500">
              Executando: {results[results.length - 1]?.promptId || "..."}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <Tabs defaultValue="run">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="run">Executar</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
          </TabsList>

          {/* Run Tab */}
          <TabsContent value="run" className="space-y-4">
            {/* Topic Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Tópico</label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((t) => (
                      <SelectItem key={t.category} value={t.category}>
                        {t.category} ({t.topics.length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {filteredTopics.length > 0 && (
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tópico" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTopics.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.slice(0, 50)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Textarea
                placeholder="Ou digite um tópico personalizado..."
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  setSelectedTopic("");
                }}
                className="bg-zinc-800 border-zinc-700 text-sm resize-none"
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleRun("quick")}
                disabled={isRunning || !activeTopic}
                className="bg-cyan-600 hover:bg-cyan-500"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Quick (2 prompts)
              </Button>

              <Button
                onClick={() => handleRun("full")}
                disabled={isRunning || !activeTopic}
                variant="outline"
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
              >
                Full (10 prompts)
              </Button>

              <Button
                onClick={() => handleRun("random")}
                disabled={isRunning}
                variant="outline"
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              >
                <Brain className="w-4 h-4" />
                Tópico Aleatório
              </Button>

              {isRunning ? (
                <Button
                  onClick={cancel}
                  variant="destructive"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              ) : (
                <Button
                  onClick={clearResults}
                  variant="outline"
                  disabled={results.length === 0}
                >
                  Limpar
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Prompts Tab */}
          <TabsContent value="prompts">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {prompts.map((p) => {
                  const Icon = PROMPT_ICONS[p.id] || Brain;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedPrompt === p.id
                          ? "bg-cyan-500/10 border-cyan-500/30"
                          : "bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800"
                      }`}
                      onClick={() => setSelectedPrompt(p.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-cyan-400" />
                        <span className="font-medium text-sm">{p.emoji} {p.name}</span>
                        <Badge
                          variant="outline"
                          className={`ml-auto text-[10px] ${DIFFICULTY_COLORS[p.difficulty]}`}
                        >
                          {p.difficulty}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">{p.description}</p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            {results.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                Nenhum resultado ainda. Execute uma colheita de conhecimento.
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {results.map((r, i) => (
                    <div key={i} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {r.promptId}
                        </Badge>
                        <span className="text-xs text-zinc-500">{r.model}</span>
                        <div className="ml-auto flex gap-2 text-xs">
                          <span className="text-green-400">C:{(r.confidence * 100).toFixed(0)}%</span>
                          <span className="text-blue-400">D:{(r.depth * 100).toFixed(0)}%</span>
                          <span className="text-yellow-400">{(r.executionTimeMs / 1000).toFixed(1)}s</span>
                        </div>
                      </div>
                      <pre className="text-xs text-zinc-400 whitespace-pre-wrap max-h-32 overflow-hidden line-clamp-4 font-sans">
                        {r.content.slice(0, 500)}...
                      </pre>
                    </div>
                  ))}

                  {currentSession && (
                    <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                      <div className="text-sm font-medium text-cyan-400">
                        Sessão: {currentSession.topic}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Confiança geral: {(currentSession.overallConfidence * 100).toFixed(1)}% |
                        Resultados: {currentSession.results.length} |
                        Duração: {((currentSession.completedAt - currentSession.startedAt) / 1000).toFixed(1)}s
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
