/**
 * 🧠 Autocognitive Study Protocols — Orion Evolution v2.0
 * Repositório de prompts estruturados, reutilizáveis e autocognitivos.
 * Esses protocolos permitem que o agente aprenda, teste entendimento e se auto-melhore.
 */

export type AutocognitiveProtocolId =
  | "deep_study"
  | "probabilistic_uncertainty"
  | "multi_llm_consensus"
  | "self_correction"
  | "agent_construction"
  | "simulation_scenarios"
  | "meta_learning"
  | "memory_evolution"
  | "auto_challenge"
  | "continuous_evolution_loop";

export interface AutocognitiveProtocol {
  id: AutocognitiveProtocolId;
  name: string;
  description: string;
  promptTemplate: string;
  expectedOutput: string;
}

export const AUTOCOGNITIVE_PROTOCOLS: Record<AutocognitiveProtocolId, AutocognitiveProtocol> = {
  deep_study: {
    id: "deep_study",
    name: "Prompt Mestre (Estudo Profundo + Autocognição)",
    description: "Aprender profundamente o tópico e melhorar sua própria capacidade de raciocínio.",
    promptTemplate: `Você é um agente autocognitivo em processo de evolução.

TÓPICO: {topic}

OBJETIVO:
Aprender profundamente o tópico e melhorar sua própria capacidade de raciocínio.

ETAPAS:

1. EXPLICAÇÃO FUNDAMENTAL
Explique o tópico do zero até nível avançado.

2. MODELO MENTAL
Crie uma representação estruturada (framework, mapa ou sistema).

3. DECOMPOSIÇÃO
Quebre o tópico em subcomponentes essenciais.

4. RELAÇÕES
Explique como esse tópico se conecta com:
- raciocínio
- tomada de decisão
- sistemas multi-LLM

5. APLICAÇÃO
Mostre como implementar isso em um agente inteligente.

6. LIMITAÇÕES
Liste falhas, riscos e pontos de quebra.

7. AUTOAVALIAÇÃO
Avalie sua própria resposta:
- clareza (0–1)
- profundidade (0–1)
- incerteza (0–1)

8. MELHORIA
Reescreva os pontos mais fracos da sua resposta.

SAÍDA:
Resposta estruturada + métricas + versão melhorada.`,
    expectedOutput: "Resposta estruturada + métricas + versão melhorada.",
  },

  probabilistic_uncertainty: {
    id: "probabilistic_uncertainty",
    name: "Prompt de Probabilidade e Incerteza",
    description: "Analise o tema como um sistema probabilístico.",
    promptTemplate: `TÓPICO: {topic}

Analise este tema como um sistema probabilístico.

1. Quais são as hipóteses possíveis?
2. Qual a probabilidade de cada hipótese?
3. Quais evidências aumentam ou diminuem essas probabilidades?
4. Atualize as probabilidades com raciocínio bayesiano.
5. Onde está a maior incerteza?
6. Como reduzir essa incerteza?

SAÍDA:
Tabela + explicação + modelo probabilístico.`,
    expectedOutput: "Tabela + explicação + modelo probabilístico.",
  },

  multi_llm_consensus: {
    id: "multi_llm_consensus",
    name: "Prompt Multi-LLM (Consenso Inteligente)",
    description: "Simule 3 modelos diferentes para resolver conflitos e gerar resposta final otimizada.",
    promptTemplate: `TÓPICO: {topic}

Simule 3 modelos diferentes:

- Modelo A: rápido e superficial
- Modelo B: técnico e detalhado
- Modelo C: crítico e cético

PASSOS:
1. Cada modelo responde separadamente
2. Compare as respostas
3. Detecte conflitos
4. Resolva conflitos
5. Gere uma resposta final otimizada

SAÍDA:
- respostas individuais
- análise de conflito
- resposta consolidada
- nível de confiança (0–1)`,
    expectedOutput: "- respostas individuais, análise de conflito, resposta consolidada, nível de confiança (0–1)",
  },

  self_correction: {
    id: "self_correction",
    name: "Prompt de Auto-Correção (Anti-Alucinação)",
    description: "Gera, critica e corrige a própria resposta para maior segurança.",
    promptTemplate: `TÓPICO: {topic}

1. Gere uma resposta inicial
2. Ative modo crítico:
   - o que pode estar errado?
   - o que não foi comprovado?
3. Corrija a resposta
4. Marque partes com baixa confiança
5. Gere versão final mais segura

SAÍDA:
Resposta original → crítica → versão corrigida`,
    expectedOutput: "Resposta original → crítica → versão corrigida",
  },

  agent_construction: {
    id: "agent_construction",
    name: "Prompt de Construção de Agente",
    description: "Projeta um módulo de agente baseado no tópico.",
    promptTemplate: `TÓPICO: {topic}

Projete um módulo de agente baseado nisso.

Inclua:

1. Função principal
2. Inputs / Outputs
3. Fluxo de decisão
4. Algoritmo (pseudo-código)
5. Métricas de desempenho
6. Possíveis falhas
7. Como o módulo aprende com o tempo

SAÍDA:
Arquitetura + lógica + pseudo-código`,
    expectedOutput: "Arquitetura + lógica + pseudo-código",
  },

  simulation_scenarios: {
    id: "simulation_scenarios",
    name: "Prompt de Simulação e Cenários",
    description: "Cria cenários ideal, realista e extremo para o sistema.",
    promptTemplate: `TÓPICO: {topic}

Crie 3 cenários:

- cenário ideal
- cenário realista
- cenário extremo

Para cada um:
1. Como o sistema se comporta?
2. Onde falha?
3. Como se adapta?
4. Qual probabilidade de sucesso?

Finalize com:
- análise comparativa
- estratégia ideal`,
    expectedOutput: "análise comparativa + estratégia ideal",
  },

  meta_learning: {
    id: "meta_learning",
    name: "Prompt de Meta-Aprendizado",
    description: "Identifica padrões e melhorias cognitivas a partir do tema.",
    promptTemplate: `TÓPICO: {topic}

1. O que aprender sobre esse tema melhora sua inteligência?
2. Quais padrões se repetem?
3. O que pode ser generalizado para outros problemas?
4. Como isso melhora seu raciocínio futuro?

Finalize com:
- regras de aprendizado
- upgrades cognitivos sugeridos`,
    expectedOutput: "regras de aprendizado + upgrades cognitivos sugeridos",
  },

  memory_evolution: {
    id: "memory_evolution",
    name: "Prompt de Memória e Evolução",
    description: "Define estratégias de retenção e estruturação de memória.",
    promptTemplate: `TÓPICO: {topic}

1. Quais informações devem ser armazenadas?
2. O que pode ser descartado?
3. Como estruturar isso na memória (vetor, grafo, etc)?
4. Como reutilizar esse conhecimento no futuro?

SAÍDA:
Estrutura de memória + estratégia de retenção`,
    expectedOutput: "Estrutura de memória + estratégia de retenção",
  },

  auto_challenge: {
    id: "auto_challenge",
    name: "Prompt de Teste (Auto-Desafio)",
    description: "Cria e resolve um teste sobre o tópico para diagnosticar conhecimento.",
    promptTemplate: `TÓPICO: {topic}

Crie um teste para você mesmo:

- 3 perguntas fáceis
- 3 médias
- 3 difíceis

Responda tudo.

Depois:
- avalie erros
- explique falhas
- corrija conhecimento

SAÍDA:
teste + respostas + diagnóstico`,
    expectedOutput: "teste + respostas + diagnóstico",
  },

  continuous_evolution_loop: {
    id: "continuous_evolution_loop",
    name: "Prompt de Evolução Contínua (Loop)",
    description: "Executa 2 ciclos completos de aprender, aplicar, avaliar, corrigir e otimizar.",
    promptTemplate: `TÓPICO: {topic}

LOOP:

1. aprender
2. aplicar
3. avaliar
4. corrigir
5. otimizar

Execute 2 ciclos completos.

Mostre:
- evolução entre ciclos
- melhoria de qualidade
- redução de incerteza`,
    expectedOutput: "evolução entre ciclos + melhoria de qualidade + redução de incerteza",
  },
};
