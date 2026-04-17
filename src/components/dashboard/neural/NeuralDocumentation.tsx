import { Brain, Database, Zap, GitBranch, Layers, Server, Bot, ArrowRight, CheckCircle, FileText, Target, Magnet, Workflow, Award, GraduationCap, HelpCircle, Mic, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function NeuralDocumentation() {
  return (
    <div className="space-y-6">
      {/* Visão Geral */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Visão Geral — Rede Neural Conexão v21.2
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            A Rede Neural "Conexão" v21.2 é uma plataforma de IA híbrida quântico-clássica 
            para direito brasileiro. Incorpora Quantum Hierarchical RL (QHRL) com VQC para 
            planejamento DAG, Mamba SSM para sequências longas O(n), Cross-Modal Embeddings 
            CLIP-like com InfoNCE loss, Temporal Binding STDP com oscilações gamma (PING/ING), 
            Framework Multi-Agentes com 10 agentes neuro-inspirados (A2A protocol, Swarms, DAG execution),
            LLM-as-Judge (6 dimensões), Document Versioning episódico,
            DPO/RLVR/PPO para RLHF avançado, e Auto-Evolução contínua via 5+ cron jobs.
            Score híbrido: 0.55 MHA + 0.25 QNN + 0.15 Mamba + 0.05 Entropia Von Neumann.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: Database, title: "60+ Tribunais", desc: "STF, STJ, TST, TSE, TJs, TRFs" },
              { icon: FileText, title: "68+ Edge Functions", desc: "Core IA, Agentes, Ingestão, Busca" },
              { icon: Brain, title: "QDL v21.2", desc: "QHRL + Mamba + Cross-Modal + STDP" },
              { icon: Bot, title: "5 Motores Neurais", desc: "Alpha, Beta, Gamma, Delta, Epsilon" },
              { icon: Server, title: "10 Agentes", desc: "Neuro-inspirados + A2A + Swarms" },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg">
                <item.icon className="h-6 w-6 text-primary mb-2" />
                <h4 className="text-sm font-semibold">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Arquitetura em Camadas */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Arquitetura do Sistema — 6 Camadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camada de Apresentação */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h4 className="font-bold text-blue-600 dark:text-[hsl(var(--tron-info))] text-xs mb-2">CAMADA DE APRESENTAÇÃO</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {["Chat IA Jurídico", "Pesquisa Unificada", "Geração Documentos", "Universo Neural 3D", "Painel Admin"].map((item, i) => (
                <div key={i} className="p-2 bg-background rounded border text-center text-xs font-medium">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>

          {/* Camada Neural Core */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <h4 className="font-bold text-emerald-600 dark:text-[hsl(var(--tron-neon))] text-xs mb-2">CAMADA NEURAL CORE v21.2</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                "MHA 7-Head Attention",
                "QNN 3-Layer (RX+RY+RZ)",
                "Mamba SSM O(n)",
                "QHRL + VQC Planner",
                "Cross-Modal CLIP",
                "STDP Gamma Binding",
                "Hopfield Memory",
                "Competitive WTA",
                "GNN Message Passing",
                "Cross-Result Self-Attention",
                "LLM-as-Judge (6 dim)",
                "Von Neumann Entropy",
              ].map((item, i) => (
                <div key={i} className="p-2 bg-background rounded border text-center text-xs font-medium">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>

          {/* Camada de Orquestração */}
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <h4 className="font-bold text-purple-600 dark:text-[hsl(var(--tron-neon-soft))] text-xs mb-2">CAMADA DE ORQUESTRAÇÃO</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {["AI Orchestrator", "RAG Pipeline", "Pipeline Orchestrator", "Provider Selector"].map((item, i) => (
                <div key={i} className="p-2 bg-background rounded border text-center text-xs font-medium">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>

          {/* Camada de Provedores */}
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <h4 className="font-bold text-green-600 dark:text-[hsl(var(--tron-neon))] text-xs mb-2">PROVEDORES DE IA</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { name: "ALPHA", model: "Velocidade", priority: "1" },
                { name: "BETA", model: "Multimodal", priority: "2" },
                { name: "GAMMA", model: "Raciocínio", priority: "3" },
                { name: "DELTA", model: "Profundidade", priority: "4" },
                { name: "EPSILON", model: "Revisão", priority: "5" },
              ].map((p, i) => (
                <div key={i} className="p-2 bg-background rounded border text-center">
                  <Badge variant="outline" className="mb-1 text-[10px]">P{p.priority}</Badge>
                  <div className="font-bold text-xs">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">{p.model}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>

          {/* Camada Google OAuth */}
          <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-lg">
            <h4 className="font-bold text-sky-600 dark:text-sky-400 text-xs mb-2">INTEGRAÇÕES GOOGLE (OAuth 2.0)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { name: "Contacts", scope: "contacts.readonly" },
                { name: "Gmail", scope: "gmail.readonly + send" },
                { name: "Calendar", scope: "calendar" },
                { name: "OCR + Translate", scope: "Vision API + Translate" },
              ].map((g, i) => (
                <div key={i} className="p-2 bg-background rounded border text-center">
                  <div className="font-bold text-xs">{g.name}</div>
                  <div className="text-[10px] text-muted-foreground">{g.scope}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>

          {/* Camada de Dados */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <h4 className="font-bold text-amber-600 dark:text-amber-400 text-xs mb-2">CAMADA DE DADOS (SUPABASE + pgvector) — 11 TABELAS NEURAIS</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-2 bg-background rounded border">
                <Database className="h-4 w-4 text-amber-500 mb-1" />
                <div className="font-semibold text-xs">Rede Neural</div>
                <ul className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                  <li>• neural_knowledge_base</li>
                  <li>• neural_specializations</li>
                  <li>• neural_learning_data</li>
                </ul>
              </div>
              <div className="p-2 bg-background rounded border">
                <Database className="h-4 w-4 text-amber-500 mb-1" />
                <div className="font-semibold text-xs">Jurisprudência</div>
                <ul className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                  <li>• legal_embeddings (63k+)</li>
                  <li>• api_cache</li>
                  <li>• catalogo_dados_senado</li>
                </ul>
              </div>
              <div className="p-2 bg-background rounded border">
                <Database className="h-4 w-4 text-amber-500 mb-1" />
                <div className="font-semibold text-xs">Auto-Evolução</div>
                <ul className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                  <li>• neural_evolution_proposals</li>
                  <li>• neural_prompt_versions</li>
                  <li>• neural_ab_experiments</li>
                </ul>
              </div>
              <div className="p-2 bg-background rounded border">
                <Database className="h-4 w-4 text-amber-500 mb-1" />
                <div className="font-semibold text-xs">CRM & Docs</div>
                <ul className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                  <li>• documents + processos</li>
                  <li>• client_profiles + invoices</li>
                  <li>• ai_metrics + chat_messages</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sistema de Fallback */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Sistema de Fallback Multi-Provider
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { name: "Motor Alpha", priority: 1, color: "bg-blue-500" },
              { name: "Motor Beta", priority: 2, color: "bg-purple-500" },
              { name: "Motor Gamma", priority: 3, color: "bg-amber-500" },
              { name: "Motor Delta", priority: 4, color: "bg-green-500" },
            ].map((provider, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${provider.color}`} />
                  <span className="text-sm font-medium">{provider.name}</span>
                  <Badge variant="secondary" className="text-[10px]">Prioridade {provider.priority}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Sucesso</span>
                  <ArrowRight className="h-3 w-3" />
                  <CheckCircle className="h-3 w-3 text-[hsl(var(--tron-neon))]" />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Se um provedor falhar, o sistema automaticamente tenta o próximo na ordem de prioridade
          </p>
        </CardContent>
      </Card>

      {/* Redes Clássicas — Hopfield & Competitiva */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Magnet className="h-5 w-5 text-primary" />
            Redes Clássicas Implementadas (Rauber UFES)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <h4 className="font-semibold text-xs mb-1">🧲 Rede de Hopfield (Seção IV)</h4>
              <p className="text-[10px] text-muted-foreground mb-2">
                Memória associativa com pesos simétricos (wij = wji). Recupera documentos/precedentes 
                completos a partir de padrões parciais via minimização de energia.
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px]">wij = (1/H)·Σ xpi·xpj</Badge>
                <Badge variant="outline" className="text-[9px]">E = -½·Σ wij·xi·xj</Badge>
                <Badge variant="outline" className="text-[9px]">Relaxação assíncrona</Badge>
                <Badge variant="outline" className="text-[9px]">ΔE ≤ 0</Badge>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <h4 className="font-semibold text-xs mb-1">🎯 Aprendizagem Competitiva (Seção V)</h4>
              <p className="text-[10px] text-muted-foreground mb-2">
                Winner-Takes-All para classificação neural de documentos. Substitui keywords fixas 
                por competição entre 8 neurônios de categoria que aprendem com o uso.
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px]">i* = argmax(wi^T·x)</Badge>
                <Badge variant="outline" className="text-[9px]">Δwij = η·yi·(xj - wij)</Badge>
                <Badge variant="outline" className="text-[9px]">8 categorias</Badge>
                <Badge variant="outline" className="text-[9px]">η = 0.01</Badge>
              </div>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
            <h4 className="font-semibold text-xs mb-1">📚 Fundamentos do Paper (Rauber, UFES)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {[
                { concept: "McCulloch-Pitts (§II.1)", status: "✅ neuronForward()" },
                { concept: "Sigmoid g(z) (§II.1)", status: "✅ sigmoid(v, a)" },
                { concept: "Regra de Hebb (§II.4.1)", status: "✅ hebbianUpdate()" },
                { concept: "Regra de Delta (§II.4.2)", status: "✅ deltaRuleUpdate()" },
                { concept: "Perceptron (§III.1)", status: "✅ trainSpecialization()" },
                { concept: "ADALINE (§III.2)", status: "✅ w^T·x linear" },
                { concept: "MLP Backprop (§III.3)", status: "✅ backpropagate()" },
                { concept: "Descida Gradiente (§III.2.3)", status: "✅ Adam Optimizer" },
                { concept: "Hopfield (§IV)", status: "✅ hopfieldNetwork()" },
                { concept: "Comp. Learning (§V)", status: "✅ competitiveLearning()" },
                { concept: "EQM (§III.2.1)", status: "✅ computeMSE()" },
                { concept: "Xavier/He Init", status: "✅ xavierInit() + heInit()" },
              ].map((item, i) => (
                <div key={i} className="p-1.5 bg-background rounded border text-[10px]">
                  <div className="font-semibold">{item.concept}</div>
                  <div className="text-muted-foreground">{item.status}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edge Functions */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Edge Functions — 68+ Funções
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                name: "neural-search",
                desc: "v21.2: MHA 7-head + QNN + Mamba SSM + Cross-Modal CLIP + STDP Gamma + Hopfield + WTA",
                features: ["MHA 7 Heads", "QNN 3-Layer", "Mamba SSM O(n)", "Cross-Modal CLIP", "STDP Gamma", "GNN", "Hopfield", "WTA", "SHAP", "Von Neumann"]
              },
              {
                name: "neural-training",
                desc: "MLP Backpropagation + Adam + Competitive + Hebb + Delta",
                features: ["Backprop", "Adam β₁=0.9", "Competitive Train", "Hebb Rule", "Delta Rule", "Xavier/He Init", "Early Stop"]
              },
              {
                name: "gerar-documento",
                desc: "Geração RAG + análise profunda 4 camadas + anti-alucinação",
                features: ["RAG Pipeline", "Deep Analysis", "Prompt Versioning", "Auto-Index", "Feedback Loop"]
              },
              {
                name: "analyze-reference-doc",
                desc: "Análise profunda: Feature Extract → Argumentative → Correlation → Strategy",
                features: ["L1 Regex", "L2 LLM Analysis", "L3 Neural Correlation", "L4 Strategy"]
              },
              {
                name: "neural-evolution",
                desc: "Auto-evolução + DPO + RLVR + A/B Testing + especializações",
                features: ["DPO", "RLVR", "A/B Test", "Propostas", "Prompt Versioning", "Specs"]
              },
              {
                name: "neural-pipeline-orchestrator",
                desc: "Ciclo completo: coleta feedback → confusion matrix → Adam → chain → watchdog",
                features: ["Confusion Matrix", "F1 por área", "Senado Sync", "Embedding Watchdog"]
              },
              {
                name: "ai-orchestrator",
                desc: "Roteamento multi-provider + context neural",
                features: ["Fallback Chain", "Context Neural", "Provider Select"]
              },
              {
                name: "pesquisa-unificada",
                desc: "Agregador multi-fonte com GNN + Cross-Attention + SHAP + PII filter",
                features: ["GNN", "Cross-Attn", "SHAP", "PII Filter", "DataJud", "LexML"]
              },
              {
                name: "smart-ingest",
                desc: "Ingestão inteligente de PDF/TXT/DOCX com chunking automático",
                features: ["Chunking", "Classificação Auto", "Embeddings", "Batch Processing"]
              },
              {
                name: "google-*",
                desc: "Gmail, Calendar, Contacts, OCR, Translate via OAuth 2.0",
                features: ["Gmail", "Calendar", "Contacts", "OCR Vision", "Translate"]
              },
            ].map((fn, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg">
                <code className="text-xs font-mono text-primary">{fn.name}</code>
                <p className="text-xs text-muted-foreground mt-1">{fn.desc}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {fn.features.map((f, j) => (
                    <Badge key={j} variant="outline" className="text-[9px]">{f}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline RAG v21.2 */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Pipeline RAG v21.2 — Scoring: 0.55 MHA + 0.25 QNN + 0.15 Mamba + 0.05 Entropia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-3 overflow-x-auto pb-2 flex-wrap">
            {[
              { step: "1", title: "Query", desc: "Input do usuário" },
              { step: "2", title: "Expansion", desc: "Sinônimos + termos" },
              { step: "3", title: "Embedding", desc: "Vetor 768d" },
              { step: "4", title: "Multi-Search", desc: "Semântico + keyword" },
              { step: "5", title: "API Enrich", desc: "DataJud/LexML/STF" },
              { step: "6", title: "MHA 7-Head", desc: "7 attention heads" },
              { step: "7", title: "QNN 3-Layer", desc: "Quantum scoring" },
              { step: "8", title: "GNN", desc: "Graph propagation" },
              { step: "9", title: "Cross-Attn", desc: "Q/K/V inter-result" },
              { step: "10", title: "WTA", desc: "Competitive classify" },
              { step: "11", title: "Hopfield", desc: "Associative recall" },
              { step: "12", title: "SHAP", desc: "Interpretability" },
              { step: "13", title: "LLM Gen", desc: "Resposta final" },
            ].map((item, i, arr) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex flex-col items-center min-w-[60px]">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </div>
                  <div className="mt-1 text-center">
                    <div className="font-semibold text-xs">{item.title}</div>
                    <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modelagem Temporal */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Modelagem Temporal — DBN + TD + Q-Learning (v12–v19)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <h4 className="font-semibold text-xs mb-1">🔬 Kalman Filter</h4>
              <p className="text-[10px] text-muted-foreground mb-2">Evolução suave dos pesos das attention heads</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px]">x̂ = x̂⁻ + K(z - x̂⁻)</Badge>
                <Badge variant="outline" className="text-[9px]">P = (1-K)P⁻</Badge>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <h4 className="font-semibold text-xs mb-1">📊 EM Algorithm</h4>
              <p className="text-[10px] text-muted-foreground mb-2">Inferência de área jurídica latente</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px]">E-step: P(z|x)</Badge>
                <Badge variant="outline" className="text-[9px]">M-step: update π</Badge>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <h4 className="font-semibold text-xs mb-1">🔗 HMM + TD + Q-Learning</h4>
              <p className="text-[10px] text-muted-foreground mb-2">Viterbi decode + Temporal Difference + ε-greedy</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px]">12 estados</Badge>
                <Badge variant="outline" className="text-[9px]">γ=0.9</Badge>
                <Badge variant="outline" className="text-[9px]">ε=0.1</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Neurociência Cognitiva */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Neurociência Cognitiva — Bio-Inspirada (v14–v19)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "📐 Weber-Fechner (ANS)", desc: "Log normalization — discriminação perceptual bio-realista", badges: ["log(v/ref)", "mediana ref", ">10 results"] },
              { name: "🧬 Edelman Groups (Nobel 1972)", desc: "Seleção de grupos neuronais — co-ativação sináptica entre heads", badges: ["synapses", "+10% max", "bidirectional"] },
              { name: "🔬 Paralelo→Serial (Crick/Tall)", desc: "Focalização serial quando entropia > 0.7 (alta confusão)", badges: ["top-3 boost", "entropy > 0.7", "80/20 split"] },
              { name: "🧠 Memória Curto→Longo (Tall 1999)", desc: "Consolidação após 20 feedbacks estáveis", badges: ["0.7L + 0.3S", "mielinização", "±10%"] },
              { name: "✂️ Pruning Sináptico (Morais 2020)", desc: "Poda de sinapses <0.02 a cada 50 iter + decay 0.5%", badges: ["threshold 0.02", "a cada 50 iter", "decay 0.5%"] },
              { name: "💓 Modulação Emocional (Aguilar 2021)", desc: "Learning rate modulado pela intensidade: 1.0x–1.5x", badges: ["|q-0.5|×2", "1.0x–1.5x LR", "fallback 1.0x"] },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
                <h4 className="font-semibold text-xs mb-1">{item.name}</h4>
                <p className="text-[10px] text-muted-foreground mb-2">{item.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {item.badges.map((b, j) => (
                    <Badge key={j} variant="outline" className="text-[9px]">{b}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* RLHF + DPO + RLVR */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Pipeline de Aprendizado Unificado — RLHF + DPO + RLVR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            28 tipos de interações capturadas via useNeuralFeedback em 5 clusters: 
            Documento, MHA, CRM, Admin e Ferramentas. O loop universal alimenta DPO para preferências 
            e RLVR para verificação factual de citações jurídicas.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { cluster: "Documento", types: "geração, edição, feedback, análise, assinatura", count: "8 tipos" },
              { cluster: "MHA/Neural", types: "busca, atenção, treinamento, evolução, A/B", count: "7 tipos" },
              { cluster: "CRM", types: "agendamento, pagamento, cliente, contato, processo", count: "6 tipos" },
              { cluster: "Admin + Ferramentas", types: "OCR, tradução, Gmail, Calendar, configuração", count: "7 tipos" },
            ].map((item, i) => (
              <div key={i} className="p-2 bg-muted/50 rounded-lg">
                <div className="font-semibold text-xs">{item.cluster}</div>
                <Badge variant="outline" className="text-[9px] mt-1">{item.count}</Badge>
                <p className="text-[9px] text-muted-foreground mt-1">{item.types}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assistentes IA — Advogado + Cliente */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Assistentes IA — Arquitetura Dual (v2)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground mb-3">
            O sistema possui dois assistentes flutuantes independentes, selecionados automaticamente 
            pelo role do usuário (advogado/cliente) via <code className="text-primary">useUserRole()</code>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <h4 className="font-semibold text-xs mb-1 flex items-center gap-1">
                <Bot className="h-3.5 w-3.5 text-primary" />
                FloatingAssistant (Advogado)
              </h4>
              <p className="text-[10px] text-muted-foreground mb-2">
                Agente completo com acesso a 11+ tabelas Supabase, navegação por 25+ módulos, 
                pesquisa neural, envio de mensagens a clientes, geração de documentos e 
                diagnóstico de sistema em tempo real.
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px]">25+ módulos</Badge>
                <Badge variant="outline" className="text-[9px]">11+ tabelas</Badge>
                <Badge variant="outline" className="text-[9px]">Pesquisa Neural</Badge>
                <Badge variant="outline" className="text-[9px]">Voz + Wake Word</Badge>
                <Badge variant="outline" className="text-[9px]">3 estados UI</Badge>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <h4 className="font-semibold text-xs mb-1 flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                FloatingClientAssistant (Cliente)
              </h4>
              <p className="text-[10px] text-muted-foreground mb-2">
                Assistente isolado para clientes com acesso somente aos dados próprios (RLS).
                Consulta processos, documentos, consultas e faturas em tempo real. 
                Sem acesso a IA generativa, rede neural ou ferramentas do advogado.
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px]">8 módulos cliente</Badge>
                <Badge variant="outline" className="text-[9px]">RLS isolado</Badge>
                <Badge variant="outline" className="text-[9px]">FAQ automático</Badge>
                <Badge variant="outline" className="text-[9px]">Voz + Wake Word</Badge>
                <Badge variant="outline" className="text-[9px]">Dados tempo real</Badge>
              </div>
            </div>
          </div>

          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="font-semibold text-xs mb-2 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Segurança — Isolamento por Role
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "Seleção automática", desc: "useUserRole() → advogado | cliente" },
                { label: "RLS por tabela", desc: "Cada cliente vê apenas seus dados" },
                { label: "Sem cross-access", desc: "Cliente não acessa dados do advogado" },
                { label: "Sem IA generativa", desc: "Cliente usa respostas pré-definidas + DB" },
              ].map((item, i) => (
                <div key={i} className="p-2 bg-background rounded border text-center">
                  <div className="text-[10px] font-bold">{item.label}</div>
                  <div className="text-[9px] text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-muted/30 rounded-lg border">
            <h4 className="font-semibold text-xs mb-2 flex items-center gap-1">
              <Mic className="h-3.5 w-3.5 text-primary" />
              Comandos de Voz (Ambos Assistentes)
            </h4>
            <p className="text-[10px] text-muted-foreground">
              Ambos suportam a palavra de ativação <strong>"Assistente"</strong> seguida do comando.
              A API Web Speech Recognition (pt-BR) converte fala em texto, que é processado
              pelos motores de intenção (navegação, FAQ, consulta de dados). O assistente do advogado
              adiciona pesquisa neural e diagnóstico; o do cliente limita-se a navegação e consulta de dados próprios.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* v21.2: Framework Multi-Agentes */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            Framework Multi-Agentes v21.2 — 10 Agentes Neuro-Inspirados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground mb-3">
            Inspirado na "Sociedade da Mente" (Minsky, 1986) e Global Workspace Theory (Dehaene, 2011).
            Cada agente mapeia para uma região cerebral especializada, comunicando-se via protocolo A2A
            com prioridade neuromodulada (Dopamina·0.4 + Norepinefrina·0.3 + Acetilcolina·0.2 − Serotonina·0.1).
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { name: "Leitura", brain: "Lobo Temporal", tools: "read_code, docs, logs" },
              { name: "Pesquisa", brain: "Hipocampo", tools: "web, legal, KB search" },
              { name: "Construção", brain: "Córtex Motor", tools: "gen code/sql/doc" },
              { name: "Planejador", brain: "DLPFC", tools: "decompose, DAG" },
              { name: "Supervisor", brain: "Cingulado Ant.", tools: "orchestrate, merge" },
              { name: "Crítico", brain: "Orbitofrontal", tools: "verify_facts" },
              { name: "Refinador", brain: "Gânglios Basais", tools: "iterate, polish" },
              { name: "Monitor", brain: "Ínsula", tools: "track_metrics" },
              { name: "Colaborador", brain: "Neurônios-espelho", tools: "human approval" },
              { name: "Multimodal", brain: "STS", tools: "CLIP, STDP bind" },
            ].map((a, i) => (
              <div key={i} className="p-2 bg-muted/50 rounded-lg">
                <div className="font-semibold text-xs">{a.name}</div>
                <div className="text-[9px] text-primary">{a.brain}</div>
                <div className="text-[9px] text-muted-foreground">{a.tools}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant="outline" className="text-[9px]">A2A Protocol (7 msg types)</Badge>
            <Badge variant="outline" className="text-[9px]">DAG Execution (Kahn's)</Badge>
            <Badge variant="outline" className="text-[9px]">Swarms (até 10 inst.)</Badge>
            <Badge variant="outline" className="text-[9px]">Memória 4 níveis</Badge>
            <Badge variant="outline" className="text-[9px]">Human-in-the-Loop</Badge>
          </div>
        </CardContent>
      </Card>

      {/* v21.2: Cross-Modal + Mamba + STDP */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Multimodal v21 — Cross-Modal CLIP + Mamba SSM + STDP Gamma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <h4 className="font-semibold text-xs mb-1">🔗 Cross-Modal Embeddings</h4>
              <p className="text-[10px] text-muted-foreground mb-2">
                InfoNCE Contrastive Loss alinha texto↔visão em espaço latente 512d.
                Fusão ponderada: texto 0.6 + visão 0.4.
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px]">CLIP-like</Badge>
                <Badge variant="outline" className="text-[9px]">τ = 0.07</Badge>
                <Badge variant="outline" className="text-[9px]">Proj. 256d</Badge>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <h4 className="font-semibold text-xs mb-1">🧬 Mamba SSM Fusion</h4>
              <p className="text-[10px] text-muted-foreground mb-2">
                State Space Model para sequências longas O(n). Gated Fusion de 3 streams:
                texto, visão, layout. BiMamba + residual + LayerNorm.
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px]">dState=16</Badge>
                <Badge variant="outline" className="text-[9px]">4 Layers</Badge>
                <Badge variant="outline" className="text-[9px]">BiMamba</Badge>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <h4 className="font-semibold text-xs mb-1">⚡ Temporal Binding STDP</h4>
              <p className="text-[10px] text-muted-foreground mb-2">
                Spike-Timing-Dependent Plasticity com oscilações gamma (PING/ING 30–100Hz).
                Triplet STDP + Anti-Hebbian + Theta-Gamma Coupling (MI Tort et al.).
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px]">PLV ~1.0</Badge>
                <Badge variant="outline" className="text-[9px]">γ 40Hz</Badge>
                <Badge variant="outline" className="text-[9px]">CTC Fries</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* v21.2: QHRL */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quantum Hierarchical RL (QHRL) v21.2
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground mb-3">
            Integra princípios quânticos (superposição, entrelaçamento) com HRL para otimizar
            decomposição de tarefas jurídicas. VQC (4 qubits, 3 layers, ZZ feature map) superpõe
            caminhos DAG e mede via Born rule. Fallback clássico automático se entropia Von Neumann {">"} 0.95.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { name: "DAG Quântico", desc: "4 templates de caminhos superpostos" },
              { name: "Options Framework", desc: "7 opções jurídicas temporalmente estendidas" },
              { name: "Natural Gradient", desc: "Fisher Information Matrix para VQC" },
              { name: "7 Domínios QHRL", desc: "Petição, previsão, extração, swarm, etc." },
            ].map((item, i) => (
              <div key={i} className="p-2 bg-muted/50 rounded-lg">
                <div className="font-semibold text-xs">{item.name}</div>
                <div className="text-[9px] text-muted-foreground">{item.desc}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant="outline" className="text-[9px]">Score: 0.55 MHA + 0.25 QNN + 0.15 Mamba + 0.05 S(ρ)</Badge>
            <Badge variant="outline" className="text-[9px]">Decoherence {"<"} 0.85 → execute</Badge>
            <Badge variant="outline" className="text-[9px]">{">"} 0.95 → fallback clássico</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Neural Pipeline v2 — 9 Modelos */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            Neural Pipeline v2 — 9 Modelos em Cadeia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground mb-3">
            Pipeline local completo que encadeia 9 módulos neurais antes de cada chamada LLM:
            SLM Router → CAG Lookup → Semantic Cache → LCM Concept → MoE Internal Gating →
            [Parallel: Mamba SSM | MLM | Cross-Attention | LAM | SAM | VLM] → Meta-Reasoning → LLM Judge (8-dim) → Resposta.
          </p>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {[
              { name: "SLM Router", desc: "Classificação de complexidade + roteamento por tier", arch: "Perceptron" },
              { name: "CAG (KV Cache)", desc: "2048 entries, 14-day TTL, 16-head, 128-dim", arch: "NTM Memory" },
              { name: "Semantic Cache", desc: "TF-IDF weighted, 7-day TTL, cosine similarity", arch: "AE" },
              { name: "LCM Concept", desc: "256-dim embeddings, 15 diffusion steps", arch: "VAE Diffusion" },
              { name: "MoE Gate", desc: "Top-K experts, compute budget, synergy bonus", arch: "Gated MoE" },
              { name: "Mamba SSM", desc: "O(n) long-sequence analysis, BiMamba", arch: "SSM" },
              { name: "MLM Masked", desc: "Completeness check, bidirectional scoring", arch: "BERT-like" },
              { name: "Cross-Attention", desc: "Query↔Context fusion, 4 heads, 64-dim", arch: "Transformer" },
              { name: "LAM Action", desc: "Perceive→Intent→Decompose→Plan→Execute", arch: "Transformer" },
              { name: "SAM Segment", desc: "Scene + document segmentation", arch: "CNN+Decoder" },
              { name: "VLM Offline", desc: "FastVLM + local detections + Mamba fusion", arch: "DCIGN" },
              { name: "Meta-Reasoning", desc: "Conflict detection + confidence aggregation", arch: "DNC" },
              { name: "LLM Judge", desc: "8-dimension quality scoring + bias detection", arch: "Critic Net" },
              { name: "Active Inference", desc: "Free Energy anti-hallucination guard", arch: "VAE/FEP" },
              { name: "Quantum Ψ", desc: "Wave function collapse, Born rule, von Neumann entropy", arch: "QNN/RBM" },
            ].map((item, i) => (
              <div key={i} className="p-2 bg-muted/50 rounded-lg">
                <div className="font-semibold text-xs">{item.name}</div>
                <Badge variant="outline" className="text-[9px] mt-0.5">{item.arch}</Badge>
                <div className="text-[9px] text-muted-foreground mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Taxonomia de Redes Neurais Implementadas */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Taxonomia de Redes Neurais — Mapeamento Orion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground mb-3">
            Referência: IAExpert Academy / Asimov Institute Neural Network Zoo.
            Cada arquitetura clássica está mapeada para um módulo funcional do Orion.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { type: "Perceptron (P)", module: "SlimRouter", usage: "Classificação de complexidade de queries" },
              { type: "FFN (Deep)", module: "MLP Backprop", usage: "Treinamento de especializações neurais" },
              { type: "RNN", module: "Teoria da Mente", usage: "Modelagem temporal de intenções do usuário" },
              { type: "LSTM", module: "Memória Episódica", usage: "Retenção de contexto conversacional" },
              { type: "GRU", module: "Provider Health", usage: "Monitoramento temporal de saúde de providers" },
              { type: "Autoencoder (AE)", module: "Embeddings 768d", usage: "Compressão semântica de conhecimento" },
              { type: "VAE", module: "Active Inference", usage: "Anti-alucinação via Free Energy Principle" },
              { type: "CNN", module: "YOLOv8/SAM/OCR", usage: "Classificação e segmentação visual" },
              { type: "DCIGN", module: "VLM Offline", usage: "Cross-modal vision-language generation" },
              { type: "GAN", module: "Orion Shield", usage: "Gerador vs. Critic para defesa adversarial" },
              { type: "Hopfield (HN)", module: "Hopfield Memory", usage: "Recall associativo de precedentes" },
              { type: "Boltzmann/RBM", module: "Quantum Ψ", usage: "Estados quânticos probabilísticos" },
              { type: "Kohonen/SOM", module: "SOM Router", usage: "Mapa auto-organizável de intenções" },
              { type: "Attention (AN)", module: "MHA 7-Head", usage: "Multi-Head Attention para scoring" },
              { type: "Transformer", module: "LLM Core", usage: "Motor principal de geração de linguagem" },
              { type: "Mamba/SSM", module: "Mamba SSM", usage: "Sequências longas O(n) sem atenção" },
              { type: "DNC", module: "Meta-Cognição", usage: "Memória diferenciável e raciocínio meta" },
              { type: "LSM", module: "STDP Gamma", usage: "Spike-timing plasticity temporal" },
              { type: "DRN (Residual)", module: "DeepSeek", usage: "Conexões residuais profundas" },
              { type: "CapsNet", module: "CapsNet Node", usage: "Multi-informação posicional + equivariância" },
              { type: "GNN", module: "Raciocínio Causal", usage: "Message passing em grafos causais" },
              { type: "NTM", module: "KV Cache", usage: "Read/write memory bank para contexto" },
              { type: "DBN", module: "Knowledge Base", usage: "Empilhamento de representações latentes" },
              { type: "ESN", module: "Marcadores Somáticos", usage: "Echo state para sinais emocionais" },
              { type: "RBF (Radial Basis)", module: "RBF Gate", usage: "Distância radial para gating de roteamento" },
              { type: "GRU", module: "GRU Health", usage: "Monitoramento temporal de saúde de providers" },
              { type: "DAE (Denoising AE)", module: "DAE Cleaner", usage: "Limpeza de ruído em embeddings" },
              { type: "SAE (Sparse AE)", module: "SAE Features", usage: "Descoberta de features latentes no knowledge" },
              { type: "Markov Chain (MC)", module: "Markov Chain", usage: "Probabilidades de transição causal" },
              { type: "Boltzmann Machine (BM)", module: "Boltzmann", usage: "Equilíbrio termodinâmico probabilístico" },
              { type: "DN (Deconvolucional)", module: "Deconv Gen", usage: "Geração de imagens a partir de embeddings" },
              { type: "ELM (Extreme Learning)", module: "ELM Fast", usage: "Inferência rápida sem backpropagation" },
            ].map((item, i) => (
              <div key={i} className="p-2 bg-muted/50 rounded-lg">
                <div className="font-semibold text-xs">{item.type}</div>
                <Badge variant="outline" className="text-[9px] mt-0.5">{item.module}</Badge>
                <div className="text-[9px] text-muted-foreground mt-1">{item.usage}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sistema de Loja + Afiliados + Stripe */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            E-Commerce — Loja + Afiliados + Stripe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground mb-3">
            Sistema completo de loja com criação de produtos (produtor), afiliação (afiliado),
            checkout Stripe com taxa plataforma 10%, e rastreamento de comissões.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { name: "Loja Pública", desc: "Vitrine por criador com carrinho", table: "products" },
              { name: "Checkout Stripe", desc: "product_checkout action + platform fee 10%", table: "orders" },
              { name: "Afiliados", desc: "Links ?ref=HASH + tracking clicks/conversions", table: "affiliate_links" },
              { name: "Comissões", desc: "Cálculo automático por venda + status", table: "affiliate_commissions" },
            ].map((item, i) => (
              <div key={i} className="p-2 bg-muted/50 rounded-lg">
                <div className="font-semibold text-xs">{item.name}</div>
                <div className="text-[9px] text-muted-foreground">{item.desc}</div>
                <Badge variant="outline" className="text-[9px] mt-1">{item.table}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* IoT + Child Networks */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            IoT + Child Networks + Federação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <h4 className="font-semibold text-xs mb-1">📡 IoT/BLE/MQTT</h4>
              <p className="text-[10px] text-muted-foreground mb-2">
                Integração com dispositivos IoT via HiveMQ MQTT broker e BLE.
                Tabelas iot_devices e iot_telemetry para telemetria.
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px]">HiveMQ</Badge>
                <Badge variant="outline" className="text-[9px]">BLE</Badge>
                <Badge variant="outline" className="text-[9px]">Telemetry</Badge>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <h4 className="font-semibold text-xs mb-1">🧬 Child Networks</h4>
              <p className="text-[10px] text-muted-foreground mb-2">
                Rede neural federada: projetos-filhos reportam métricas via neural_child_reports.
                Perfis neurais por role (advogado/produtor/afiliado) com arquiteturas adaptativas.
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px]">Federated</Badge>
                <Badge variant="outline" className="text-[9px]">A2A Protocol</Badge>
                <Badge variant="outline" className="text-[9px]">MCP Bridge</Badge>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <h4 className="font-semibold text-xs mb-1">🛡️ Orion Defense System</h4>
              <p className="text-[10px] text-muted-foreground mb-2">
                Sistema de defesa com detecção de ameaças, circuit breaker,
                rate limiting, e monitoramento de anomalias em tempo real.
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[9px]">Circuit Breaker</Badge>
                <Badge variant="outline" className="text-[9px]">Rate Limit</Badge>
                <Badge variant="outline" className="text-[9px]">Anomaly Detection</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualização Neural 3D */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Visualização Neural 3D — Universo de Conexões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Globo 3D interativo (Three.js + React Three Fiber) com {">"}55 nós e {">"}75 conexões
            representando a arquitetura completa do Orion. Cada nó exibe o nome do módulo e o tipo
            de rede neural clássica correspondente (Transformer, CNN, LSTM, Hopfield, GAN, SOM, etc.).
            Flow beams animados simulam o tráfego de dados em tempo real entre os neurônios.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { name: "Globe Layout", desc: "Fibonacci sphere distribution" },
              { name: "Flow Beams", desc: "50 partículas percorrendo conexões" },
              { name: "Bloom PostFX", desc: "Unreal Bloom Pass + fog" },
              { name: "HUD Métricas", desc: "QPS, Cache, Experts, Latência" },
              { name: "Labels Duplos", desc: "Nome + tipo de rede neural" },
            ].map((item, i) => (
              <div key={i} className="p-2 bg-muted/50 rounded-lg">
                <div className="font-semibold text-xs">{item.name}</div>
                <div className="text-[9px] text-muted-foreground">{item.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
