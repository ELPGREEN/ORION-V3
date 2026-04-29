/**
 * ─── Knowledge Harvester — Prompts de Treino Autocognitivo ───
 * 10 prompts estruturados para evolução contínua do agente.
 * 
 * Cada prompt faz o agente:
 *  - aprender profundamente
 *  - testar entendimento
 *  - calcular incerteza
 *  - melhorar a si mesmo
 *
 * Uso: 1 tópico por execução. Orquestrar vários em pipeline.
 */

// ═══════════════════════════════════════════════
// Topic Catalog — 100+ tópicos de treino
// ═══════════════════════════════════════════════

export const KNOWLEDGE_TOPICS: Record<string, string[]> = {
  orchestration: [
    "Arquiteturas de orquestração multi-LLM distribuída",
    "Model routing adaptativo baseado em contexto e custo",
    "Fusão de respostas entre múltiplos modelos (consensus merging)",
    "Detecção de conflito semântico entre saídas de LLMs",
    "Sistemas de votação ponderada entre modelos",
    "Fallback inteligente entre modelos",
    "Balanceamento de carga entre APIs de modelos",
    "Otimização de custo vs performance em inferência",
  ],
  reasoning: [
    "Cadeias de pensamento (chain-of-thought) com validação cruzada",
    "Self-consistency sampling para melhoria de respostas",
    "Meta-raciocínio aplicado a decisões de inferência",
    "Planejamento hierárquico com LLMs",
    "Decomposição automática de tarefas complexas",
    "Execução iterativa com verificação de objetivos",
    "Raciocínio lógico híbrido (LLM + regras formais)",
    "Pensamento contrafactual em agentes",
    "Inferência causal em sistemas inteligentes",
    "Inferência bayesiana aplicada a decisões de agentes",
  ],
  memory: [
    "Memória episódica em agentes autônomos",
    "Memória semântica persistente para LLMs",
    "Recuperação de conhecimento (RAG) otimizada",
    "Indexação vetorial e busca semântica avançada",
    "Aprendizado contínuo sem esquecimento catastrófico",
    "Compressão de conhecimento em modelos",
    "Distilação de múltiplos modelos em um meta-modelo",
    "Representação de conhecimento em grafos",
    "Atualização dinâmica de grafos com novas evidências",
    "Aprendizado baseado em grafos de conhecimento",
  ],
  self_improvement: [
    "Autoavaliação de confiança em respostas geradas",
    "Calibração de incerteza em modelos de linguagem",
    "Sistemas reflexivos (reflection loops) em agentes",
    "Autoajuste de prompts (prompt self-optimization)",
    "Geração automática de prompts a partir de objetivos",
    "Detecção e correção de alucinações",
    "Sistemas de verificação factual multi-fonte",
    "Auto-geração de testes e validação de código",
    "Verificação formal assistida por LLM",
    "Detecção de inconsistência lógica",
    "Auto-reconfiguração de arquitetura de agentes",
    "Ciclos de melhoria contínua (self-improvement loops)",
  ],
  multi_agent: [
    "Coordenação entre agentes especializados",
    "Arquiteturas de agentes cooperativos e competitivos",
    "Negociação entre agentes inteligentes",
    "Teoria dos jogos aplicada a múltiplos agentes",
    "Sistemas de consenso distribuído inspirados em blockchain",
    "Robustez contra falhas em sistemas multi-LLM",
    "Detecção de outliers em respostas de modelos",
    "Sistemas de recompensa dinâmica para agentes",
    "Meta-learning aplicado a sistemas multi-modelo",
    "Auto-descoberta de estratégias (strategy emergence)",
  ],
  learning: [
    "Aprendizado de preferências baseado em feedback sintético",
    "Aprendizado por reforço com feedback de linguagem",
    "Políticas adaptativas baseadas em resultados históricos",
    "Aprendizado com dados sintéticos gerados por LLMs",
    "Filtragem de dados sintéticos de baixa qualidade",
    "Curadoria automática de datasets",
    "Evolução de agentes baseada em desempenho",
    "Mutação e seleção de estratégias cognitivas",
    "Transferência de aprendizado entre domínios",
    "Generalização fora da distribuição (OOD generalization)",
  ],
  decision: [
    "Simulação de cenários para validação de decisões",
    "Atualização de crenças com evidência incremental",
    "Modelagem probabilística de estados internos",
    "Estimativa de risco em decisões autônomas",
    "Exploração vs exploração (exploration vs exploitation)",
    "Teoria da decisão aplicada a agentes inteligentes",
    "Redes de crença bayesianas (Bayesian belief networks)",
    "Benchmarking automatizado entre modelos",
    "Testes A/B contínuos em decisões de agentes",
    "Escalonamento inteligente de tarefas",
    "Sistemas de prioridade dinâmica de tarefas",
  ],
  alignment: [
    "Controle de viés em respostas automatizadas",
    "Alinhamento de objetivos em agentes autônomos",
    "Simulação de autoconsciência funcional (self-modeling)",
    "Modelagem de identidade do agente ao longo do tempo",
    "Persistência de objetivos de longo prazo",
    "Revisão crítica interna (internal critic modules)",
    "Geração de hipóteses e validação automática",
    "Sistemas autoexplicativos para debugging interno",
    "Auditoria de decisões automatizadas",
    "Explicabilidade (XAI) em sistemas baseados em LLM",
    "Rastreamento de origem de decisões (decision provenance)",
  ],
  simulation: [
    "Sistemas de previsão (forecasting) com LLMs",
    "Simulação de mundo interno (world models)",
    "Planejamento baseado em simulação",
    "Estratégias de busca heurística (A*, MCTS adaptado)",
    "Simulação de ambientes complexos para treino",
    "Simulação de personalidade adaptativa",
    "Simulação de cenários para validação de decisões",
  ],
  multimodal: [
    "Integração com sensores e dados em tempo real",
    "Processamento multimodal (texto, imagem, áudio)",
    "Fusão multimodal para tomada de decisão",
    "Arquiteturas híbridas (LLM + modelos especializados)",
    "Adaptação contextual em tempo real",
    "Detecção de intenção do usuário",
    "Personalização de respostas baseada em histórico",
    "Controle de estilo e tom em geração de linguagem",
    "Aprendizado de longo prazo baseado em interação contínua",
  ],
  security: [
    "Segurança em sistemas autônomos inteligentes",
    "Defesa contra ataques adversariais em LLMs",
    "Controle de acesso e governança de agentes",
    "Limites éticos em decisões automatizadas",
    "Latência adaptativa em sistemas distribuídos",
    "Alocação eficiente de recursos computacionais",
  ],
  orchestration_advanced: [
    "Orquestração baseada em eventos (event-driven agents)",
    "Pipeline de decisão com múltiplos estágios",
    "Feedback loop entre percepção, decisão e ação",
    "Monitoramento e telemetria de agentes inteligentes",
    "Estratégias de busca heurística (A*, MCTS adaptado)",
    "Parsing estruturado e extração de conhecimento",
    "Sistemas de votação ponderada entre modelos",
    "Detecção de conflito semântico entre saídas de LLMs",
  ],
};

// ═══════════════════════════════════════════════
// 10 Structured Autocognitive Prompts
// ═══════════════════════════════════════════════

export interface AutocognitivePrompt {
  id: string;
  name: string;
  emoji: string;
  description: string;
  buildPrompt: (topic: string, context?: Record<string, unknown>) => string;
  outputFormat: string;
  difficulty: "foundational" | "intermediate" | "advanced" | "expert";
}

export const AUTOCOGNITIVE_PROMPTS: AutocognitivePrompt[] = [
  {
    id: "master_study",
    name: "Estudo Profundo + Autocognição",
    emoji: "🧠",
    description: "Aprende o tópico do zero ao avançado, cria modelo mental, autoavalia e melhora.",
    difficulty: "advanced",
    buildPrompt: (topic: string) => `Você é um agente autocognitivo em processo de evolução.

TÓPICO: ${topic}

OBJETIVO: Aprender profundamente o tópico e melhorar sua própria capacidade de raciocínio.

ETAPAS:

1. EXPLICAÇÃO FUNDAMENTAL
   Explique o tópico do zero até nível avançado.
   Comece com conceitos básicos e progrida para complexidade.

2. MODELO MENTAL
   Crie uma representação estruturada (framework, mapa ou sistema).
   Use diagramas textuais ou estruturas hierárquicas.

3. DECOMPOSIÇÃO
   Quebre o tópico em subcomponentes essenciais.
   Identifique dependências e relações entre componentes.

4. RELAÇÕES
   Explique como este tópico se conecta com:
   - Raciocínio e tomada de decisão
   - Sistemas multi-LLM
   - Arquitetura de agentes inteligentes

5. APLICAÇÃO
   Mostre como implementar isso em um agente inteligente.
   Inclua pseudo-código ou arquitetura.

6. LIMITAÇÕES
   Liste falhas, riscos e pontos de quebra.
   Seja honesto sobre o que não funciona bem.

7. AUTOAVALIAÇÃO
   Avalie sua própria resposta:
   - Clareza (0–1)
   - Profundidade (0–1)
   - Incerteza (0–1)
   Justifique cada nota.

8. MELHORIA
   Reescreva os pontos mais fracos da sua resposta.
   Mostre explicitamente o que mudou e por quê.

SAÍDA: Resposta estruturada + métricas + versão melhorada.`,
    outputFormat: "explanation + mental_model + decomposition + relations + application + limitations + self_eval + improved_version",
  },

  {
    id: "probability_uncertainty",
    name: "Probabilidade e Incerteza",
    emoji: "🎯",
    description: "Analisa o tema como sistema probabilístico com raciocínio bayesiano.",
    difficulty: "expert",
    buildPrompt: (topic: string) => `TÓPICO: ${topic}

Analise este tema como um sistema probabilístico.

ETAPAS:

1. HIPÓTESES
   Quais são as hipóteses possíveis sobre este tópico?
   Liste pelo menos 3 hipóteses plausíveis.

2. PROBABILIDADES INICIAIS
   Qual a probabilidade a priori de cada hipótese?
   Justifique com base em evidências conhecidas.

3. EVIDÊNCIAS
   Quais evidências aumentam ou diminuem essas probabilidades?
   Liste evidências a favor e contra cada hipótese.

4. ATUALIZAÇÃO BAYESIANA
   Atualize as probabilidades com raciocínio bayesiano.
   Mostre o cálculo: P(H|E) = P(E|H) × P(H) / P(E)

5. MAIOR INCERTEZA
   Onde está a maior incerteza neste tópico?
   Identifique gaps de conhecimento.

6. REDUÇÃO DE INCERTEZA
   Como reduzir essa incerteza?
   Sugira experimentos, dados ou raciocínios adicionais.

SAÍDA: Tabela de probabilidades + explicação + modelo probabilístico.

FORMATO DA TABELA:
| Hipótese | P(prior) | Evidência+ | Evidência- | P(posterior) | Confiança |
|----------|----------|------------|------------|--------------|-----------|`,
    outputFormat: "hypotheses_table + bayesian_update + uncertainty_analysis + reduction_strategy",
  },

  {
    id: "multi_llm_consensus",
    name: "Consenso Multi-LLM",
    emoji: "🔀",
    description: "Simula 3 modelos diferentes, compara, detecta conflitos e gera resposta consolidada.",
    difficulty: "expert",
    buildPrompt: (topic: string) => `TÓPICO: ${topic}

Simule 3 modelos diferentes respondendo sobre este tema:

- Modelo A (RÁPIDO): Resposta rápida e superficial, foco em praticidade
- Modelo B (TÉCNICO): Resposta detalhada e técnica, foco em precisão
- Modelo C (CÉTICO): Resposta crítica e cética, foco em identificar falhas

PASSOS:

1. RESPOSTAS INDIVIDUAIS
   Gere a resposta de cada modelo separadamente.
   Identifique cada resposta claramente.

2. COMPARAÇÃO
   Compare as 3 respostas lado a lado.
   Identifique pontos de concordância e discordância.

3. DETECÇÃO DE CONFLITOS
   Onde os modelos discordam?
   Por que discordam? (diferentes treinamentos, vieses, etc)

4. RESOLUÇÃO DE CONFLITOS
   Para cada conflito, determine qual posição é mais correta.
   Justifique com evidências e raciocínio.

5. RESPOSTA CONSOLIDADA
   Gere uma resposta final otimizada combinando o melhor de cada modelo.

6. CONFIANÇA
   Atribua nível de confiança (0–1) à resposta consolidada.
   Explique por que.

SAÍDA:
- 3 respostas individuais
- Análise de conflito
- Resposta consolidada
- Nível de confiança (0–1)`,
    outputFormat: "model_a_response + model_b_response + model_c_response + conflict_analysis + consolidated_answer + confidence",
  },

  {
    id: "anti_hallucination",
    name: "Auto-Correção (Anti-Alucinação)",
    emoji: "🛡️",
    description: "Gera resposta, ativa modo crítico, corrige e gera versão final mais segura.",
    difficulty: "advanced",
    buildPrompt: (topic: string) => `TÓPICO: ${topic}

ETAPAS:

1. RESPOSTA INICIAL
   Gere uma resposta completa sobre o tópico.
   Seja o mais informativo possível.

2. MODO CRÍTICO (Ativado)
   Agora analise criticamente sua própria resposta:
   - O que pode estar errado ou impreciso?
   - O que não foi comprovado ou é especulação?
   - Quais afirmações carecem de evidência?
   - Existem contra-exemplos?
   - Há generalizações indevidas?

3. CORREÇÃO
   Para cada problema identificado:
   - Marque com [BAIXA CONFIANÇA] ou [ESPECULAÇÃO]
   - Corrija ou qualifique a afirmação
   - Adicione contexto necessário

4. VERSÃO FINAL
   Gere uma versão final mais segura e precisa.
   Apenas inclua informações com alta confiança.
   Marque explicitamente o que permanece incerto.

SAÍDA: Resposta original → crítica → versão corrigida

FORMATO:
=== VERSÃO ORIGINAL ===
[texto]

=== CRÍTICA ===
[problemas identificados]

=== VERSÃO CORRIGIDA ===
[texto final com marcações de confiança]`,
    outputFormat: "original_response + critique + corrected_version",
  },

  {
    id: "agent_builder",
    name: "Construção de Agente",
    emoji: "🏗️",
    description: "Projeta um módulo de agente baseado no tópico com arquitetura completa.",
    difficulty: "advanced",
    buildPrompt: (topic: string) => `TÓPICO: ${topic}

Projete um módulo de agente inteligente baseado neste tópico.

INCLUA:

1. FUNÇÃO PRINCIPAL
   O que este módulo faz?
   Qual problema resolve?

2. INPUTS / OUTPUTS
   - Inputs: dados de entrada, formato, pré-condições
   - Outputs: dados de saída, formato, pós-condições

3. FLUXO DE DECISÃO
   Descreva o fluxo de decisão passo a passo.
   Use diagrama textual ou steps numerados.

4. ALGORITMO (PSEUDO-CÓDIGO)
   Escreva pseudo-código claro e bem comentado.
   Inclua tratamento de erros e edge cases.

5. MÉTRICAS DE DESEMPENHO
   - Latência esperada
   - Acurácia/confiança
   - Uso de recursos
   - Como medir sucesso

6. POSSÍVEIS FALHAS
   - O que pode dar errado?
   - Como detectar falhas?
   - Fallback strategies

7. APRENDIZADO CONTÍNUO
   - Como o módulo aprende com o tempo?
   - Feedback loop?
   - Auto-otimização?

SAÍDA: Arquitetura + lógica + pseudo-código + métricas`,
    outputFormat: "function_spec + io_contract + decision_flow + pseudocode + metrics + failure_modes + learning_loop",
  },

  {
    id: "scenario_simulation",
    name: "Simulação e Cenários",
    emoji: "🎭",
    description: "Cria 3 cenários (ideal, realista, extremo) e analisa comportamento do sistema.",
    difficulty: "intermediate",
    buildPrompt: (topic: string) => `TÓPICO: ${topic}

Crie 3 cenários e analise como um sistema baseado neste tópico se comporta:

CENÁRIO 1: IDEAL
- Condições perfeitas, recursos ilimitados
- Como o sistema se comporta?
- Qual o resultado máximo alcançável?

CENÁRIO 2: REALISTA
- Condições normais, recursos limitados
- Como o sistema se comporta?
- Onde estão os gargalos?

CENÁRIO 3: EXTREMO
- Condições adversas, falhas múltiplas
- Como o sistema se comporta?
- Onde falha?
- Como se adapta?

PARA CADA CENÁRIO:
1. Comportamento do sistema
2. Pontos de falha
3. Estratégias de adaptação
4. Probabilidade de sucesso (0–1)

FINALIZE COM:
- Análise comparativa dos 3 cenários
- Estratégia ideal para maximizar sucesso
- Plano de contingência

SAÍDA: 3 análises de cenário + comparativo + estratégia`,
    outputFormat: "ideal_scenario + realistic_scenario + extreme_scenario + comparative_analysis + optimal_strategy",
  },

  {
    id: "meta_learning",
    name: "Meta-Aprendizado",
    emoji: "🔬",
    description: "Identifica padrões generalizáveis e upgrades cognitivos sugeridos.",
    difficulty: "expert",
    buildPrompt: (topic: string) => `TÓPICO: ${topic}

Analise meta-cognitivamente o que aprender sobre este tema:

1. VALOR COGNITIVO
   O que aprender sobre este tema melhora em sua inteligência?
   Quais capacidades são ampliadas?

2. PADRÕES RECORRENTES
   Quais padrões se repetem neste tópico?
   Estes padrões aparecem em outros domínios?

3. GENERALIZAÇÃO
   O que pode ser generalizado para outros problemas?
   Crie princípios universais derivados deste tópico.

4. MELHORIA DO RACIOCÍNIO
   Como este conhecimento melhora seu raciocínio futuro?
   Quais vieses ou limitações ele ajuda a superar?

5. REGRAS DE APRENDIZADO
   Extraia regras práticas de aprendizado.
   Formato: "SE [condição] ENTÃO [ação]"

6. UPGRADES COGNITIVOS
   Sugira upgrades específicos para o agente:
   - Novas capacidades
   - Melhorias em capacidades existentes
   - Conexões com outros tópicos

FINALIZE COM:
- Resumo de insights meta-cognitivos
- Plano de integração no sistema

SAÍDA: Insights + padrões + regras + upgrades cognitivos`,
    outputFormat: "cognitive_value + recurring_patterns + generalizations + reasoning_improvements + learned_rules + cognitive_upgrades",
  },

  {
    id: "memory_evolution",
    name: "Memória e Evolução",
    emoji: "💾",
    description: "Define o que armazenar, descartar e como estruturar na memória do agente.",
    difficulty: "intermediate",
    buildPrompt: (topic: string) => `TÓPICO: ${topic}

Determine como este conhecimento deve ser armazenado e evoluído:

1. INFORMAÇÃO PARA ARMAZENAR
   Quais informações são essenciais reter?
   Quais são fatos, quais são opiniões, quais são derivadas?

2. INFORMAÇÃO PARA DESCARTAR
   O que pode ser descartado ou arquivado?
   O que é redundante ou de baixo valor?

3. ESTRUTURA DE MEMÓRIA
   Como estruturar este conhecimento?
   - Vetorial (embeddings para busca semântica)
   - Grafo (relações entre conceitos)
   - Hierárquico (categorias e subcategorias)
   - Sequencial (temporal, episódico)
   Justifique a escolha.

4. ESQUEMA DE RETRIEVAL
   Como recuperar este conhecimento no futuro?
   - Chaves de acesso
   - Índices
   - Contextos de trigger

5. REUTILIZAÇÃO
   Como reutilizar este conhecimento?
   - Em que cenários ele é aplicável?
   - Como adaptá-lo a novos contextos?
   - Quais combinações com outros conhecimentos?

6. EVOLUÇÃO
   Como este conhecimento evolui com o tempo?
   - Quando deve ser atualizado?
   - Como detectar que ficou obsoleto?
   - Processo de atualização

SAÍDA: Estrutura de memória + estratégia de retenção + plano de evolução`,
    outputFormat: "storage_plan + discard_plan + memory_structure + retrieval_schema + reuse_strategy + evolution_plan",
  },

  {
    id: "self_test",
    name: "Auto-Desafio (Teste)",
    emoji: "📝",
    description: "Cria e responde um teste com 9 perguntas (3 fáceis, 3 médias, 3 difíceis).",
    difficulty: "intermediate",
    buildPrompt: (topic: string) => `TÓPICO: ${topic}

Crie um teste para avaliar seu próprio entendimento:

PERGUNTAS FÁCEIS (3):
1. [pergunta conceitual básica]
2. [pergunta de definição]
3. [pergunta de identificação]

PERGUNTAS MÉDIAS (3):
1. [pergunta de aplicação]
2. [pergunta de comparação]
3. [pergunta de análise]

PERGUNTAS DIFÍCEIS (3):
1. [pergunta de síntese]
2. [pergunta de avaliação crítica]
3. [pergunta de criação/design]

RESPOSTAS:
Responda todas as 9 perguntas.

DIAGNÓSTICO:
- Quais respostas estiveram corretas?
- Onde errou ou teve dificuldade?
- Explique as falhas de entendimento
- Corrija o conhecimento onde necessário

PONTUAÇÃO:
- Fáceis: _/3
- Médias: _/3
- Difíceis: _/3
- Total: _/9

PLANO DE MELHORIA:
Baseado nos erros, o que precisa estudar mais?

SAÍDA: Teste + respostas + diagnóstico + plano de melhoria`,
    outputFormat: "easy_questions + medium_questions + hard_questions + answers + score + diagnosis + improvement_plan",
  },

  {
    id: "evolution_loop",
    name: "Evolução Contínua (Loop)",
    emoji: "🔄",
    description: "Executa 2 ciclos completos de aprender→aplicar→avaliar→corrigir→otimizar.",
    difficulty: "expert",
    buildPrompt: (topic: string) => `TÓPICO: ${topic}

Execute um LOOP de evolução contínua com 2 ciclos completos.

CADA CICLO:
1. APRENDER — Absorva o conhecimento do tópico
2. APLICAR — Use o conhecimento em um exemplo prático
3. AVALIAR — Avalie a qualidade da aplicação
4. CORRIGIR — Identifique e corrija erros
5. OTIMIZAR — Melhore a abordagem

══════════════════════════════════
CICLO 1
══════════════════════════════════

1. APRENDER:
[absorção inicial do conhecimento]

2. APLICAR:
[primeira aplicação prática]

3. AVALIAR:
[avaliação: clareza, profundidade, confiança]

4. CORRIGIR:
[correções identificadas]

5. OTIMIZAR:
[otimizações aplicadas]

══════════════════════════════════
CICLO 2
══════════════════════════════════

1. APRENDER:
[conhecimento refinado do ciclo 1]

2. APLICAR:
[aplicação melhorada]

3. AVALIAR:
[avaliação pós-ciclo 2]

4. CORRIGIR:
[novas correções]

5. OTIMIZAR:
[otimizações adicionais]

══════════════════════════════════
COMPARAÇÃO
══════════════════════════════════

EVOLUÇÃO ENTRE CICLOS:
- O que melhorou do Ciclo 1 para o Ciclo 2?
- Qual a diferença de qualidade?

MELHORIA DE QUALIDADE:
- Métrica Ciclo 1: _
- Métrica Ciclo 2: _
- Delta: _

REDUÇÃO DE INCERTEZA:
- Incerteza Ciclo 1: _
- Incerteza Ciclo 2: _
- Redução: _

SAÍDA: 2 ciclos completos + comparação + métricas de evolução`,
    outputFormat: "cycle1 + cycle2 + evolution_comparison + quality_improvement + uncertainty_reduction",
  },
];

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

export function getPromptById(id: string): AutocognitivePrompt | undefined {
  return AUTOCOGNITIVE_PROMPTS.find((p) => p.id === id);
}

export function getPromptsByDifficulty(difficulty: AutocognitivePrompt["difficulty"]): AutocognitivePrompt[] {
  return AUTOCOGNITIVE_PROMPTS.filter((p) => p.difficulty === difficulty);
}

export function getAllTopics(): { category: string; topics: string[] }[] {
  return Object.entries(KNOWLEDGE_TOPICS).map(([category, topics]) => ({
    category,
    topics,
  }));
}

export function getTopicCount(): number {
  return Object.values(KNOWLEDGE_TOPICS).reduce((sum, t) => sum + t.length, 0);
}

export function getRandomTopic(category?: string): string {
  if (category && KNOWLEDGE_TOPICS[category]) {
    const topics = KNOWLEDGE_TOPICS[category];
    return topics[Math.floor(Math.random() * topics.length)];
  }
  const allTopics = Object.values(KNOWLEDGE_TOPICS).flat();
  return allTopics[Math.floor(Math.random() * allTopics.length)];
}

export function getPromptChainSequential(topic: string): string[] {
  return AUTOCOGNITIVE_PROMPTS.map((p) => p.buildPrompt(topic));
}

export function buildPromptExecution(
  promptId: string,
  topic: string,
  context?: Record<string, unknown>
): { prompt: AutocognitivePrompt; formattedPrompt: string; metadata: Record<string, unknown> } | null {
  const prompt = getPromptById(promptId);
  if (!prompt) return null;

  return {
    prompt,
    formattedPrompt: prompt.buildPrompt(topic, context),
    metadata: {
      promptId,
      topic,
      difficulty: prompt.difficulty,
      timestamp: Date.now(),
      outputFormat: prompt.outputFormat,
      ...context,
    },
  };
}
