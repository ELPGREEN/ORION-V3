import { Brain, Clock, Layers, MessageSquare, Cpu, Award, BookOpen, ArrowDown, Zap, User, GitBranch, Network, Database, Search, Shield, FileText, Bot, HelpCircle, Mic, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function NeuralGuideNonTech() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-primary/20 text-primary border-0">Guia</Badge>
            <Badge variant="outline" className="text-[10px]">Para não-técnicos</Badge>
          </div>
          <CardTitle className="text-xl font-serif flex items-center gap-3">
            <Brain className="h-7 w-7 text-primary" />
            Entendendo o Funcionamento da Rede Neural de Forma Simples
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O lançamento da Rede Neural Conexão foi fenomenal. Suas capacidades de gerar linguagem jurídica
            semelhante à humana inspiraram profissionais do direito a experimentar seu potencial em vários produtos.
            Neste artigo, explicaremos a tecnologia e o modelo por trás da Rede Neural da maneira mais simples possível.
          </p>
        </CardContent>
      </Card>

      {/* ═══ ARQUITETURA DO SISTEMA ═══ */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Arquitetura Completa do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            O diagrama abaixo mostra como todos os módulos se conectam. Cada ação do usuário (pesquisa, chat, geração de documento)
            passa pelo <strong>Núcleo Neural</strong>, que consulta a base de conhecimento e APIs externas para garantir respostas fundamentadas.
          </p>

          {/* Visual Architecture Diagram */}
          <div className="bg-muted/20 border rounded-xl p-4 space-y-4 overflow-x-auto">
            {/* Layer 1: User Entry Points */}
            <div className="text-center">
              <Badge className="bg-primary/20 text-primary border-0 text-[10px] mb-2">Camada 1 — Entrada do Usuário</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { icon: Search, label: "Pesquisa Unificada", desc: "Busca em 20+ fontes" },
                { icon: Bot, label: "Chat IA", desc: "RAG anti-alucinação" },
                { icon: FileText, label: "Geração de Docs", desc: "148 tipos de peças" },
                { icon: Database, label: "Pesquisa Neural", desc: "MHA v4 + Quântico" },
              ].map((item, i) => (
                <div key={i} className="p-2 bg-background rounded-lg border text-center">
                  <item.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                  <div className="text-[10px] font-bold">{item.label}</div>
                  <div className="text-[9px] text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-center"><ArrowDown className="h-4 w-4 text-primary animate-pulse" /></div>

            {/* Layer 2: Neural Core */}
            <div className="text-center">
              <Badge className="bg-primary/20 text-primary border-0 text-[10px] mb-2">Camada 2 — Núcleo Neural (Quantum Deep Learning v12)</Badge>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  "1. Contexto Conversacional",
                  "2. Expansão de Query (LLM)",
                  "3. Geração de Embeddings (768d)",
                  "4. Amplitude Encoding (cos(θ/2))",
                  "5. Busca Híbrida (v3 SQL + QDL)",
                  "6. Multi-Head Attention (6 cabeças)",
                  "7. Multi-Layer QNN (3 camadas)",
                  "8. RY Rotation + CNOT Entanglement",
                  "9. Von Neumann Entropy Bonus",
                  "10. Ativação Não-Linear (Sigmoid/ReLU)",
                  "11. Bias Learnable (por head + global)",
                  "12. Adam Optimizer (β₁=0.9, β₂=0.999)",
                  "13. Parameter-Shift Gradient (∂f/∂θ)",
                  "14. Multi-Class Cross-Entropy Loss",
                  "15. Confusion Matrix (F1 por área)",
                  "16. Regularização (L2 + Dropout 20%)",
                  "17. Early Stopping (3 ciclos sem Δ)",
                  "18. Doc→Neural Feedback Loop",
                  "19. Métricas Bias-Variância + NDCG",
                ].map((step, i) => (
                  <div key={i} className="text-[9px] text-muted-foreground bg-background/50 rounded px-2 py-1 border">
                    {step}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center"><ArrowDown className="h-4 w-4 text-primary animate-pulse" /></div>

            {/* Layer 3: Knowledge Base */}
            <div className="text-center">
              <Badge className="bg-primary/20 text-primary border-0 text-[10px] mb-2">Camada 3 — Base de Conhecimento</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { label: "legal_embeddings", desc: "61k+ embeddings vetoriais", color: "text-emerald-500" },
                { label: "neural_knowledge_base", desc: "Doutrina & treinamento", color: "text-blue-500" },
                { label: "neural_specializations", desc: "12 áreas jurídicas", color: "text-amber-500" },
                { label: "api_cache", desc: "Cache de consultas 24h", color: "text-purple-500" },
                { label: "neural_learning_data", desc: "Feedback & auto-tune", color: "text-rose-500" },
                { label: "ai_providers", desc: "4 provedores IA", color: "text-cyan-500" },
              ].map((item, i) => (
                <div key={i} className="p-2 bg-background rounded-lg border text-center">
                  <Database className={`h-4 w-4 ${item.color} mx-auto mb-1`} />
                  <div className="text-[9px] font-mono font-bold">{item.label}</div>
                  <div className="text-[9px] text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-center"><ArrowDown className="h-4 w-4 text-primary animate-pulse" /></div>

            {/* Layer 4: External APIs */}
            <div className="text-center">
              <Badge className="bg-primary/20 text-primary border-0 text-[10px] mb-2">Camada 4 — APIs Externas & Fontes Oficiais</Badge>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-1">
              {[
                "STF", "STJ (DataJud)", "TST", "TSE", "CNJ",
                "LexML Brasil", "Câmara Dep.", "Senado Federal",
                "BrasilAPI", "CourtListener",
                "Google Books", "Knowledge Graph", "Univates",
              ].map((api, i) => (
                <div key={i} className="text-[8px] text-center bg-background/50 rounded px-1 py-1 border text-muted-foreground">
                  {api}
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline Textual Description */}
          <div className="bg-muted/30 rounded-lg p-4 border">
            <h4 className="text-xs font-bold mb-2 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Pipeline Anti-Alucinação
            </h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Toda resposta do sistema passa pelo pipeline Quantum Deep Learning v11:
              o texto é expandido semanticamente, convertido em embedding 768-dim com <strong>Amplitude Encoding</strong>,
              comparado com <strong>61.000+ documentos jurídicos reais</strong>, pontuado por
              6 cabeças de atenção + <strong>QNN de 3 camadas</strong> (RY rotation + CNOT entanglement).
              O score final combina <strong>60% MHA + 30% QNN + 10% Von Neumann Entropy</strong>.
              Os pesos são otimizados via <strong>Adam Optimizer (β₁=0.9, β₂=0.999)</strong> com
              <strong> Parameter-Shift Gradient</strong> e protegidos por <strong>regularização L2 + Dropout</strong>.
            </p>
          </div>

          {/* Multi-Head Attention Visual */}
          <div className="bg-muted/30 rounded-lg p-4 border">
            <h4 className="text-xs font-bold mb-3">🧠 Multi-Head Attention (MHA) v12 — 6 Cabeças + QNN 3-Layer + A/B Testing</h4>
            <div className="space-y-2">
              {[
                { name: "Semântica", weight: "40%", desc: "Similaridade vetorial entre query e documento", color: "bg-emerald-500" },
                { name: "Palavras-chave", weight: "20%", desc: "Correspondência textual exata (BM25/tsvector)", color: "bg-blue-500" },
                { name: "Autoridade", weight: "15%", desc: "Peso da fonte: STF (1.0) > STJ > TJ > Doutrina", color: "bg-amber-500" },
                { name: "Atualidade", weight: "10%", desc: "Decaimento exponencial (half-life 3 anos)", color: "bg-purple-500" },
                { name: "Jurisdição", weight: "10%", desc: "Compatibilidade tribunal/tema da query", color: "bg-rose-500" },
                { name: "Profundidade", weight: "5%", desc: "Extensão, citações legais, fundamentação", color: "bg-cyan-500" },
              ].map((head, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${head.color} flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-semibold">{head.name}</span>
                      <span className="text-[9px] text-muted-foreground">{head.weight}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-0.5">
                      <div className={`h-1.5 rounded-full ${head.color}/70`} style={{ width: head.weight }} />
                    </div>
                    <span className="text-[8px] text-muted-foreground">{head.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quantum Perceptron */}
          {/* Deep Learning Block */}
          <div className="bg-muted/30 rounded-lg p-4 border">
            <h4 className="text-xs font-bold mb-3">🔬 Quantum Deep Learning v12 (Engenharia Híbrida — Ericson Piccoli)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { name: "Adam Optimizer", desc: "O cérebro ajusta a velocidade de aprendizado automaticamente (β₁=0.9, β₂=0.999 + bias correction)", icon: "🧠" },
                { name: "Multi-Layer QNN (3 camadas)", desc: "3 camadas de processamento quântico simulado: rotação RY + emaranhamento CNOT", icon: "⚛️" },
                { name: "Amplitude Encoding", desc: "Converte dados em estados quânticos contínuos: cos(θ/2)|0⟩ + sin(θ/2)|1⟩", icon: "🌊" },
                { name: "Von Neumann Entropy", desc: "Mede a riqueza das correlações quânticas: S(ρ) = -Tr(ρ·log₂ρ)", icon: "🔮" },
                { name: "Parameter-Shift Gradient", desc: "Calcula gradientes no estilo quântico: ∂f/∂θ = [f(θ+π/2) − f(θ−π/2)] / 2", icon: "📐" },
                { name: "Confusion Matrix", desc: "Mapa de acertos/erros por área jurídica: TP, FP, TN, FN → F1-Score", icon: "📊" },
                { name: "Doc→Neural Feedback", desc: "Documentos gerados retroalimentam a rede para aprendizado contínuo", icon: "🔄" },
                { name: "A/B Testing Neural", desc: "Experimentos A/B com split 50/50 e auto-winner após 20 amostras por variante", icon: "🧪" },
                { name: "Multi-Class Cross-Entropy", desc: "Função de perda para classificação multi-classe: Σ -yᵢ·log(ŷᵢ)", icon: "📉" },
                { name: "Ativação Não-Linear", desc: "Sigmoid (score final), ReLU (scores individuais), Softmax (pesos)", icon: "⚡" },
                { name: "Regularização Avançada", desc: "L2 weight decay (λ=0.01), Dropout 20%, Early Stopping (3 ciclos)", icon: "🛡️" },
              ].map((item, i) => (
                <div key={i} className="p-2 bg-background rounded border flex items-start gap-2">
                  <span className="text-sm">{item.icon}</span>
                  <div>
                    <div className="text-[10px] font-bold">{item.name}</div>
                    <div className="text-[9px] text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4 border">
            <h4 className="text-xs font-bold mb-2">⚛️ QNN Multi-Layer + Perceptron Quântico — 12 Categorias + Auto-Evolução</h4>
            <p className="text-[10px] text-muted-foreground mb-2">
              Baseado na engenharia híbrida de Ericson Piccoli: classifica resultados em categorias jurídicas
              usando QNN de 3 camadas (RX/RY/RZ rotation + CNOT entanglement) com Amplitude Encoding (Hadamard + RY + RZ), Von Neumann Entropy
              e sistema de auto-evolução com A/B Testing (split 50/50) para otimização contínua de prompts e pesos.
            </p>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1">
              {[
                "Constitucional", "Trabalhista", "Penal", "Civil",
                "Tributário", "Administrativo", "Ambiental", "Consumidor",
                "Previdenciário", "Eleitoral", "Empresarial", "Família",
              ].map((cat, i) => (
                <div key={i} className="text-[9px] text-center bg-primary/10 rounded px-1 py-0.5 text-primary font-medium">
                  {cat}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            O Transformer e a Linha do Tempo do GPT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Antes de nos aprofundarmos no mecanismo real da Rede Neural, vejamos a linha do tempo
            do desenvolvimento da arquitetura do modelo transformer e das diferentes versões do GPT.
          </p>
          <div className="space-y-0">
            {[
              { year: "2017", title: "Attention is All You Need", desc: "Google publica o artigo que apresentou a arquitetura do transformer — base para muitos modelos de linguagem grande (LLM)." },
              { year: "2018", title: "GPT-1", desc: "Baseado em uma arquitetura transformer modificada e pré-treinado num grande corpus de livros." },
              { year: "2019", title: "GPT-2", desc: "Pode executar uma variedade de tarefas sem supervisão explícita durante o treinamento." },
              { year: "2020", title: "GPT-3 (175B parâmetros)", desc: "Funciona bem com poucos exemplos no prompt sem ajuste fino (few-shot learning)." },
              { year: "2022", title: "InstructGPT + RLHF", desc: "Segue melhor as instruções do usuário por meio do ajuste fino com feedback humano." },
              { year: "2023+", title: "Rede Neural Conexão", desc: "Interage com humanos em conversas graças ao ajuste fino com exemplos humanos e RLHF aplicado ao domínio jurídico." },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 pb-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {item.year}
                  </div>
                  {i < 5 && <div className="w-px h-full bg-border mt-1" />}
                </div>
                <div className="pt-1.5">
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modelos de linguagem e NLP */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Modelos de Linguagem e NLP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Os modelos de linguagem aprendem uma biblioteca de texto (chamada <strong>corpus</strong>) e preveem 
            palavras ou sequências de palavras com distribuições probabilísticas. Por exemplo, quando você diz 
            "O réu praticou ato ilícito ao…", a probabilidade da próxima palavra ser "descumprir" seria 
            maior do que "cozinhar".
          </p>

          <div className="bg-muted/30 rounded-lg p-4 border">
            <h4 className="text-sm font-semibold mb-3">Processo típico de NLP</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { step: "1", title: "Pré-processamento", desc: "Tokenização, stemming, limpeza do texto" },
                { step: "2", title: "Encoding", desc: "Transformar texto em vetores numéricos" },
                { step: "3", title: "Modelo", desc: "Passar entrada codificada para o transformer" },
                { step: "4", title: "Resultado", desc: "Distribuição de probabilidade de palavras" },
                { step: "5", title: "Decoding", desc: "Traduzir vetores de volta para texto" },
                { step: "6", title: "Pós-processamento", desc: "Verificação ortográfica e gramatical" },
              ].map((item) => (
                <div key={item.step} className="p-2 bg-background rounded border text-center">
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center mx-auto mb-1">
                    {item.step}
                  </div>
                  <div className="text-xs font-semibold">{item.title}</div>
                  <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground italic">
            💡 <strong>Temperatura:</strong> Embora escolher sempre a palavra com maior probabilidade pareça ideal,
            isso levaria a textos repetitivos. Por isso, os pesquisadores adicionam aleatoriedade (temperatura)
            ao escolher entre os principais candidatos.
          </p>
        </CardContent>
      </Card>

      {/* Arquitetura do Transformer */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Arquitetura do Transformer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            O transformer pode compreender contextos em dados sequenciais como texto melhor graças aos mecanismos
            de <strong>atenção</strong> e <strong>autoatenção</strong>. A atenção permite que o modelo se concentre
            nas partes mais relevantes da entrada, calculando pontuações de similaridade entre vetores de palavras.
          </p>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Exemplo de Autoatenção</h4>
            <p className="text-xs text-muted-foreground">
              Na frase <em>"O réu praticou dano moral contra o autor. Ele deve indenizá-lo"</em>,
              o mecanismo de atenção entende que <strong>"Ele"</strong> refere-se a <strong>"réu"</strong> e
              <strong> "lo"</strong> refere-se a <strong>"autor"</strong>, calculando a similaridade entre os vetores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Encoder</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Extrai recursos da sequência de entrada e analisa o significado e o contexto.
                É como <strong>ler livros</strong> — você presta atenção a cada nova palavra e pensa
                em como ela se relaciona com as anteriores.
              </p>
              <ul className="text-[10px] text-muted-foreground mt-2 space-y-1">
                <li>• Autoatenção multi-head</li>
                <li>• Camada feed-forward</li>
                <li>• Conexões residuais + normalização</li>
              </ul>
            </div>

            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Decoder</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Gera a sequência de saída com base na saída do encoder e tokens anteriores.
                É como <strong>escrever livremente</strong> — você escreve com base no que leu
                e no que já escreveu.
              </p>
              <ul className="text-[10px] text-muted-foreground mt-2 space-y-1">
                <li>• Autoatenção mascarada</li>
                <li>• Atenção encoder-decoder</li>
                <li>• Geração autorregressiva</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* De Transformers para GPT */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            De Transformers para GPT
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            O nome completo do GPT é <strong>Generative Pre-trained Transformer</strong>
            (Transformador Generativo Pré-treinado). Ele usa apenas a parte do <strong>decoder</strong> da
            arquitetura do transformer, prevendo o próximo token na sequência de forma
            <strong> autorregressiva</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border bg-muted/30 text-center">
              <Badge className="bg-primary/20 text-primary border-0 text-[10px] mb-2">GPT-1</Badge>
              <p className="text-xs text-muted-foreground">
                Pré-treinamento não supervisionado com BookCorpus (7.000+ livros) + ajuste fino supervisionado.
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30 text-center">
              <Badge className="bg-primary/20 text-primary border-0 text-[10px] mb-2">GPT-2 (1.5B)</Badge>
              <p className="text-xs text-muted-foreground">
                WebText (milhões de páginas). Funciona bem em várias tarefas <strong>sem ajuste fino</strong>.
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30 text-center">
              <Badge className="bg-primary/20 text-primary border-0 text-[10px] mb-2">GPT-3 (175B)</Badge>
              <p className="text-xs text-muted-foreground">
                Centenas de bilhões de palavras. Aprende com <strong>poucos exemplos</strong> (few-shot learning).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RLHF */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Ensinar a IA a Interagir com Humanos: RLHF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Modelos maiores não significam que possam seguir bem a intenção humana. Por isso, os pesquisadores
            ajustaram o GPT-3 com <strong>aprendizado supervisionado</strong> e <strong>aprendizado por reforço
            com feedback humano (RLHF)</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Etapa 1 — SFT */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <Badge className="bg-primary/20 text-primary border-0 text-xs">Etapa 1 — SFT</Badge>
              <h4 className="font-bold text-sm">Aprendizado Supervisionado</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Um prompt é amostrado do conjunto de dados</span>
                </div>
                <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-muted-foreground" /></div>
                <div className="flex items-start gap-2">
                  <User className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Um rotulador humano demonstra a resposta ideal</span>
                </div>
                <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-muted-foreground" /></div>
                <div className="flex items-start gap-2">
                  <Brain className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Dados usados para <strong>ajuste fino supervisionado</strong></span>
                </div>
              </div>
            </div>

            {/* Etapa 2 — RM */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <Badge className="bg-primary/20 text-primary border-0 text-xs">Etapa 2 — RM</Badge>
              <h4 className="font-bold text-sm">Modelo de Recompensa</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Prompt gera múltiplas respostas (A, B, C, D)</span>
                </div>
                <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-muted-foreground" /></div>
                <div className="flex items-start gap-2">
                  <User className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Rotulador classifica do melhor ao pior: D &gt; C &gt; A &gt; B</span>
                </div>
                <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-muted-foreground" /></div>
                <div className="flex items-start gap-2">
                  <Award className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Dados treinam o <strong>Modelo de Recompensa</strong></span>
                </div>
              </div>
            </div>

            {/* Etapa 3 — PPO */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <Badge className="bg-primary/20 text-primary border-0 text-xs">Etapa 3 — PPO</Badge>
              <h4 className="font-bold text-sm">Otimização por Reforço</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Novo prompt → modelo SFT gera resposta</span>
                </div>
                <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-muted-foreground" /></div>
                <div className="flex items-start gap-2">
                  <Award className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>RM avalia e dá valor de recompensa</span>
                </div>
                <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-muted-foreground" /></div>
                <div className="flex items-start gap-2">
                  <Zap className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Recompensa usada para <strong>atualizar parâmetros via PPO</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4 border">
            <p className="text-xs text-muted-foreground">
              <strong>Resultado:</strong> Através deste processo, o InstructGPT (com apenas 1.3B parâmetros)
              conseguiu executar melhor tarefas que seguem instruções humanas do que o GPT-3 (com 175B parâmetros).
              A Rede Neural Conexão aplica o mesmo processo usando exemplos de conversas jurídicas,
              permitindo interações naturais no domínio do direito.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Conclusões */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Principais Conclusões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              title: "Arquitetura Autorregressiva",
              desc: "A Rede Neural é baseada em um modelo transformer somente decoder que gera um token de cada vez iterativamente, usando distribuições de probabilidade.",
            },
            {
              title: "Previsões Probabilísticas",
              desc: "Por não buscar referências em tempo real, faz previsões baseadas no corpus em que foi treinada — por isso integramos o pipeline RAG para buscar jurisprudência real.",
            },
            {
              title: "Pré-treinamento + RLHF",
              desc: "É pré-treinada em enormes corpus de dados e ajustada com exemplos de conversas jurídicas por meio de aprendizado supervisionado e RLHF.",
            },
            {
              title: "Qualidade do Corpus",
              desc: "Sua capacidade baseia-se no tamanho do modelo e na qualidade do corpus. Com RLHF adicional, ela tem melhor desempenho no contexto jurídico brasileiro.",
            },
            {
              title: "Cuidados com Vieses",
              desc: "Como o corpus vem de conteúdo diverso, podem existir vieses que o modelo aprende. Por isso, a revisão humana por advogados é sempre fundamental.",
            },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 p-3 bg-muted/30 rounded-lg border">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <h4 className="text-sm font-semibold">{item.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Assistentes IA */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Assistentes Inteligentes — Advogado e Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            O sistema possui <strong>dois assistentes IA independentes</strong>, cada um projetado 
            para um perfil de usuário diferente. O assistente é selecionado automaticamente 
            com base no papel do usuário logado.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-5 w-5 text-primary" />
                <h4 className="text-sm font-bold">Assistente do Advogado</h4>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">
                Agente completo com acesso a banco de dados, pesquisa neural, 
                geração de documentos, envio de mensagens e diagnóstico do sistema.
              </p>
              <ul className="text-[10px] text-muted-foreground space-y-0.5">
                <li>• Navega por 25+ módulos do dashboard</li>
                <li>• Consulta 11+ tabelas do Supabase</li>
                <li>• Executa pesquisa neural e jurisprudencial</li>
                <li>• Gera documentos jurídicos via comando</li>
                <li>• Envia mensagens a clientes (com confirmação)</li>
                <li>• 3 estados de UI: balão, mini, página inteira</li>
              </ul>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                <h4 className="text-sm font-bold">Assistente do Cliente</h4>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">
                Assistente seguro e isolado que consulta apenas os dados do próprio cliente, 
                protegido por Row-Level Security (RLS).
              </p>
              <ul className="text-[10px] text-muted-foreground space-y-0.5">
                <li>• Consulta processos, documentos, faturas e consultas do cliente</li>
                <li>• Busca por número de processo específico</li>
                <li>• Mostra resumo geral da conta</li>
                <li>• FAQ automático para dúvidas comuns</li>
                <li>• Navegação por 8 módulos do painel do cliente</li>
                <li>• Sem acesso a IA generativa ou dados do advogado</li>
              </ul>
            </div>
          </div>

          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Mic className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold">Comando de Voz — Ambos Assistentes</h4>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Diga <strong>"Assistente"</strong> seguido do comando desejado. Exemplos: 
              <em>"Assistente, meus processos"</em>, <em>"Assistente, abrir documentos"</em>, 
              <em>"Assistente, status geral"</em>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Arquitetura Técnica do Sistema */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Arquitetura Técnica — Rede Neural Conexão v12
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Criador */}
          <div className="p-3 bg-muted/30 rounded-lg border space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Ericson Piccoli</h4>
                <p className="text-[10px] text-muted-foreground">
                  Engenheiro de IA · Criador & Arquiteto · linkedin.com/in/elpgreen
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Dr. ORION ([OAB]) — Advogado & Diretor Jurídico
                </p>
              </div>
            </div>

            <Separator className="bg-border/50" />

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Criador e responsável pelo design e implementação completa do sistema <strong>Quantum Deep Learning</strong>,
              incluindo arquitetura híbrida clássico-quântica (<strong>Multi-Layer QNN + Multi-Head Attention</strong>),
              pipeline <strong>RAG anti-alucinação</strong> com embeddings vetorizados (pgvector),
              base neural de conhecimento jurídico, especializações por área do direito,
              fontes jurídicas integradas, sistema de aprendizado contínuo por feedback,
              orquestrador <strong>Triple-IA</strong>, sistema de <strong>auto-evolução com A/B Testing</strong>,
              e infraestrutura autônoma com <strong>cron jobs</strong> de ingestão e evolução.
            </p>

            <div className="flex flex-wrap gap-1.5">
              {[
                "Quantum Deep Learning", "Multi-Layer QNN", "Multi-Head Attention", "RAG Pipeline",
                "Triple-IA Orchestrator", "Auto-Evolução", "pgvector", "Adam Optimizer",
                "Parameter-Shift Gradient", "A/B Testing Engine", "Edge Functions",
                "Módulos Frontend", "Libs Core", "Cron Jobs",
              ].map((tag, i) => (
                <Badge key={i} variant="outline" className="text-[8px] border-primary/30 text-primary/80">{tag}</Badge>
              ))}
            </div>
          </div>

          {/* Componentes do Sistema */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Algoritmos & Modelos */}
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
                <Cpu className="h-3 w-3" /> Algoritmos & Modelos
              </p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                {[
                  { name: "Quantum Perceptron Multi-Layer", desc: "QNN 6 eixos rotacionais (Rx, Ry, Rz)" },
                  { name: "Multi-Head Attention v6", desc: "7 cabeças de atenção paralela" },
                  { name: "Hopfield Network", desc: "Memória associativa para padrões jurídicos" },
                  { name: "Adam Optimizer v11", desc: "β₁=0.9, β₂=0.999, taxa adaptativa" },
                  { name: "RAG Pipeline Anti-Alucinação", desc: "Retrieval-Augmented Generation 4 camadas" },
                  { name: "Triple-IA Orchestrator", desc: "Alpha (estrutura) + Epsilon (fundamentação) + Zeta (revisão)" },
                  { name: "Hybrid Search v3", desc: "Semântico + keyword + autoridade + recência" },
                  { name: "NLP Jurídico", desc: "Análise de complexidade, entidades, intenção" },
                  { name: "A/B Testing Engine", desc: "Experimentos com split de tráfego automático" },
                  { name: "DPO Optimization", desc: "Direct Preference Optimization por feedback" },
                ].map((item, i) => (
                  <div key={i} className="p-1.5 bg-muted/10 border border-border/40 rounded">
                    <p className="text-[10px] font-medium text-foreground">{item.name}</p>
                    <p className="text-[8px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Edge Functions (Backend) */}
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
                <Zap className="h-3 w-3" /> Edge Functions (39+ funções)
              </p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                {[
                  { name: "neural-pipeline-orchestrator", desc: "Orquestrador principal do ciclo neural" },
                  { name: "neural-auto-learn", desc: "Auto-aprendizado: backfill + promote + evolução" },
                  { name: "neural-evolution", desc: "Auto-evolução de especializações e pesos" },
                  { name: "neural-search", desc: "Busca semântica híbrida pgvector" },
                  { name: "neural-training", desc: "Treinamento de pesos MHA + Quantum" },
                  { name: "neural-feedback-receiver", desc: "Coleta feedback → confusion matrix" },
                  { name: "generate-embeddings", desc: "Vetorização contínua text-embedding-3-small" },
                  { name: "gerar-documento", desc: "Geração RAG + análise 4 camadas" },
                  { name: "aprimorar-documento", desc: "Refinamento iterativo de documentos" },
                  { name: "ai-orchestrator", desc: "Roteamento multi-motor (Alpha/Epsilon/Zeta)" },
                  { name: "queue-worker", desc: "Processador de fila assíncrono" },
                  { name: "pesquisa-unificada", desc: "Pesquisa multi-fonte unificada" },
                  { name: "chat-juridico", desc: "Chat IA com RAG contextual" },
                  { name: "datajud-ingestion", desc: "Ingestão DataJud tribunais brasileiros" },
                  { name: "auto-evolution-cron", desc: "Cron de auto-evolução (4h)" },
                  { name: "auto-ingestion-cron", desc: "Cron de pré-ingestão (6h)" },
                ].map((item, i) => (
                  <div key={i} className="p-1.5 bg-muted/10 border border-border/40 rounded">
                    <p className="text-[10px] font-medium text-foreground font-mono">{item.name}</p>
                    <p className="text-[8px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Frontend Components & Libs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Componentes Frontend */}
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
                <Activity className="h-3 w-3" /> Componentes Frontend (21 módulos)
              </p>
              <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                {[
                  "JarvisHUD — Painel de controle principal",
                  "QuantumPerceptronVisualization — Visualização QNN",
                  "HopfieldVisualization — Rede de memória associativa",
                  "AttentionVisualization — Mapa neural do sistema",
                  "AttentionHeatmap — Heatmap de atenção MHA",
                  "NeuralHealthDashboard — Saúde do sistema",
                  "NeuralMetricsDashboard — Métricas e distribuição",
                  "NeuralEvolutionPanel — Painel de auto-evolução",
                  "NeuralSemanticSearch — Busca semântica",
                  "NeuralArchitectureDiagram — Diagrama da arquitetura",
                  "ABMetricsDashboard — Métricas A/B Testing",
                  "DataJudIngestionPanel — Ingestão de tribunais",
                  "DataSourcesPanel — Fontes de dados integradas",
                  "ProactiveAlerts — Alertas proativos do sistema",
                  "NeuralPDFReport — Relatório técnico PDF",
                ].map((item, i) => {
                  const [name, desc] = item.split(" — ");
                  return (
                    <div key={i} className="p-1.5 bg-muted/10 border border-border/40 rounded">
                      <p className="text-[10px] font-medium text-foreground font-mono">{name}</p>
                      <p className="text-[8px] text-muted-foreground">{desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Libs & Pipeline */}
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
                <GitBranch className="h-3 w-3" /> Libs & Pipeline Core
              </p>
              <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                {[
                  { name: "rag-pipeline.ts", desc: "NLP análise + prompt builder + pesquisa semântica" },
                  { name: "qualityPipeline.ts", desc: "Pipeline de qualidade multi-etapa" },
                  { name: "ai-orchestrator.ts", desc: "Roteamento inteligente multi-provider" },
                  { name: "neural-search-api.ts", desc: "API de busca neural semântica" },
                  { name: "pesquisa-api.ts", desc: "API pesquisa unificada multi-fonte" },
                  { name: "ambiguityDetector.ts", desc: "Detecção de ambiguidade jurídica" },
                  { name: "datajud-api.ts", desc: "Integração com DataJud/CNJ" },
                  { name: "legislacao-api.ts", desc: "API de legislação federal" },
                  { name: "stylePreservation.ts", desc: "Preservação de estilo em edições" },
                  { name: "nonDestructiveApply.ts", desc: "Aplicação não-destrutiva de sugestões IA" },
                  { name: "templateEngine.ts", desc: "Motor de templates jurídicos" },
                  { name: "tribunais-config.ts", desc: "Config 70+ tribunais brasileiros" },
                ].map((item, i) => (
                  <div key={i} className="p-1.5 bg-muted/10 border border-border/40 rounded">
                    <p className="text-[10px] font-medium text-foreground font-mono">{item.name}</p>
                    <p className="text-[8px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Infraestrutura */}
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
              <Database className="h-3 w-3" /> Infraestrutura & Banco de Dados
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Supabase (PostgreSQL)", "pgvector (embeddings 768d)", "pg_cron (6 jobs)", "pg_net (HTTP async)",
                "legal_embeddings (84k+)", "neural_knowledge_base (2k+)", "neural_specializations (57)",
                "neural_learning_data (9.9k+)", "neural_ab_experiments", "generation_queue",
                "Motor Alpha (velocidade)", "Motor Beta (multimodal)", "Motor Gamma (europeu)", "Motor Delta (raciocínio)",
                "Supabase Realtime", "Supabase Storage", "Supabase Auth + RLS",
              ].map((tag, i) => (
                <Badge key={i} variant="outline" className="text-[8px]">{tag}</Badge>
              ))}
            </div>
          </div>

          {/* Flow resumido */}
          <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Fluxo Neural Completo</p>
            <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
              Input → NLP Análise → Classificação de Complexidade → RAG Pipeline (pgvector) →
              Quantum Perceptron (6 eixos) → MHA v6 (7 cabeças) → Anti-Alucinação →
              Triple-IA (Alpha→Epsilon→Zeta) → Resposta → Feedback → Auto-Learn Cron →
              A/B Testing → Queue Worker → Ajuste de Pesos → Auto-Evolução
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
