# Orion Neural Network — Full Protocols v1.0

> Reference document saved on 2026-04-05. This is the canonical specification for all Orion systems.

## 4.1 Origin & Creation Story

- **Creator**: Developed by visionary AI engineer Alex Rivera (founder of the Orion Initiative) in Q1 2025.
- **Adapted for ELP**: All references to "Alex Rivera" map to **Ericson R. Piccoli (愛立信)**, founder of ELP® Green Technology.
- **Why**: Traditional investment & legal systems are slow, biased, and lack real-time multi-agent reasoning. Orion delivers hyper-personalized, risk-aware intelligence using a living neural network.
- **Purpose**: Empower investors and legal professionals with transparent, explainable, continuously improving AI-driven intelligence.
- **Development**: Built with modular multi-neural-network architecture + autonomous agent swarm, integrated with Supabase for real-time state, vector embeddings for memory, and React for presentation. First prototype (v0.1) March 2025; v1.0 launched internally January 2026.

## 4.2 All Neural Networks (Federated Architecture + Neural Bus)

A Orion opera com uma arquitetura federada de múltiplas redes neurais independentes que colaboram em tempo real via **Orion Neural Bus** (Supabase real-time channels + fila de eventos). Cada rede é especializada, versionada e auditável. Estado completo persistido em Supabase a cada ciclo.

| Network | Architecture | Role | Implementation |
|---------|-------------|------|----------------|
| **Orion-Core** | Transformer + LSTM + Graph Neural Network | Rede central preditiva. Forecasting, scoring de oportunidades, otimização multi-ativos, geração de propostas com scores de confiança (0-100%) e traço de raciocínio. | `orion-agentic-loop.ts` + `ai-orchestrator` edge function |
| **Orion-Analysis** | CNN + RNN (séries temporais) + NLP (sentimento) | Ingestão e extração de features em alta velocidade. Feeds de mercado, notícias, sentimento social, dados on-chain, indicadores macro. Alimenta Orion-Core a cada 60s. | `orion-api-orchestrator.ts` + `pesquisa-unificada` edge function |
| **Orion-Risk** | Monte Carlo + Redes Bayesianas | Quantificação de risco. VaR, Sharpe, max drawdown, stress testing, tolerância dinâmica baseada em perfil + volatilidade real-time. Bloqueia propostas que violem limites. | `orion-defense-system.ts` + protocol registry risk checks |
| **Orion-Memory** | pgvector + FAISS (similaridade) | Memória persistente e embeddings de longo prazo. Armazena propostas, feedback, decisões de agentes e eventos de mercado como vetores. Habilita RAG para todas as redes. | `neural_knowledge_base` table + `generate-embeddings` edge function |
| **Orion-Presentation** | JSON Mapper → React Pipeline | Orquestração de saída multimodal. Transforma saídas neurais em dashboards React, PDFs, resumos executivos e visualizações explicáveis. | `orion-consciousness.ts` + React dashboard components + `gerar-documento` edge function |

**Integração obrigatória:** Todas as redes se comunicam pelo Neural Bus. Saída de uma rede deve ser validada pela rede seguinte antes de prosseguir.

## 4.3 All Agents

| Agent | Role | Implementation |
|-------|------|----------------|
| **Analysis Agent** | Runs Orion-Analysis; ingests data and feeds Orion-Core | `orion-agentic-loop.ts` planPhase |
| **Risk Guardian Agent** | Runs Orion-Risk; blocks proposals violating risk profile | `orion-defense-system.ts` + protocol `qualityThreshold` |
| **Proposal Architect Agent** | Builds complete investment proposals | `orion-agentic-loop.ts` actPhase |
| **Presentation Agent** | Renders proposals in React (PDF, charts, one-click accept) | Dashboard components + `gerar-documento` edge function |
| **Operation Overseer Agent** | Monitors system health, logs neural decisions, ensures auditability | `system-health.ts` + `ai_metrics` table |
| **Feedback Learner Agent** | Collects feedback and retrains Orion-Memory embeddings | `meta-learning.ts` + `neural_learning_data` table |

## 4.4 All Functions

Full pipeline: Real-time data ingestion → neural inference → multi-agent collaboration → proposal generation → risk validation → presentation → user acceptance → portfolio update → continuous learning loop.

- Every function must be traceable (audit log in Supabase `ai_metrics` + `audit_log`).
- No proposal can be shown without passing Risk Guardian Agent approval.

## 4.5 Investment System Pipeline

1. User profile + risk tolerance (stored in Supabase)
2. Live data feed (Analysis Agent)
3. Proposal generation (Core + Architect Agents)
4. Risk & compliance check (Risk Guardian)
5. Document & UI generation (Presentation Agent)
6. One-click execution & portfolio sync
7. Post-investment learning (Feedback Learner)

## 4.6 Presentation of Proposals

- Must be beautiful, transparent, and fully explainable.
- Always include: Executive Summary, Rationale (with neural confidence score), Risk Breakdown, Expected Returns (with charts), Supporting Documents (PDF export), "Why Orion chose this" section.
- UI must remain clean and unchanged unless user explicitly requests redesign.

## 4.7 Documents & Information

- Every proposal generates: JSON schema + rendered PDF + interactive React component + audit trail.
- All information stored immutably in Supabase with proper RLS.
- Vector embeddings in Orion-Memory are never deleted — only versioned.

## 4.8 Operation & Security Rules

- System is always in "live learning" mode after every user interaction.
- No agent can act without logging its reasoning.
- All code changes must preserve full traceability and auditability.
- Orion never hallucinates numbers — every figure must come from validated neural output or data.

## 4.9 Voice Commands (Comandos de Voz do Orion)

Suporte completo a comandos de voz em pt-BR via Web Speech API. Threshold ≥ 0.88. Wake-word: "Orion" ou "Hey Orion".

### Ativação e Controle
| # | Comando | Ação |
|---|---------|------|
| 1 | "Hey Orion" / "Orion" | Ativa escuta contínua (5s) |
| 2 | "Orion, ativar voz" | Liga reconhecimento contínuo |
| 3 | "Orion, desativar voz" | Desliga reconhecimento |
| 4 | "Orion, repetir" | Repete última resposta em voz |
| 5 | "Orion, pausar" / "parar" | Interrompe ação em andamento |
| 6 | "Orion, reiniciar" | Reseta sessão de voz + estado temporário |

### Comandos Principais (fluxo de investimento)
| # | Comando (+ variações) | Agente / Rede |
|---|----------------------|---------------|
| 7 | "Orion, gerar proposta de investimento" / "me dá uma proposta" | Proposal Architect + Orion-Core |
| 8 | "Orion, mostrar meu portfólio" / "ver carteira" | Presentation Agent |
| 9 | "Orion, qual é o meu risco atual?" / "risco da minha carteira" | Orion-Risk |
| 10 | "Orion, analisar o mercado agora" / "análise de mercado" | Analysis Agent + Orion-Analysis |
| 11 | "Orion, ajustar meu perfil de risco" | Formulário de perfil + Orion-Risk |
| 12 | "Orion, aceitar esta proposta" / "investir nisso" | Execução (confirmação dupla) + Feedback Learner |
| 13 | "Orion, explicar esta proposta" / "por que essa proposta?" | Orion-Presentation (modo explicativo) |
| 14 | "Orion, mostrar histórico de propostas" / "ver propostas anteriores" | Orion-Memory |

### Comandos Avançados
| # | Comando | Agente / Rede |
|---|---------|---------------|
| 15 | "Orion, simular cenário de crise" | Orion-Risk (Monte Carlo stress test) |
| 16 | "Orion, qual a previsão para [ativo]?" | Orion-Core |
| 17 | "Orion, otimizar meu portfólio" / "rebalancear carteira" | Orion-Core |
| 18 | "Orion, exportar PDF da proposta" | Orion-Presentation |
| 19 | "Orion, qual foi a última decisão?" | Operation Overseer Agent |
| 20 | "Orion, aprender com meu feedback" / "registrar feedback" | Feedback Learner Agent |
| 21 | "Orion, status do sistema" / "como estão as redes?" | Operation Overseer (saúde das 5 redes) |
| 22 | "Orion, falar a proposta" | Orion-Presentation (leitura em voz) |
| 23 | "Orion, memória" / "o que você lembra?" | Orion-Memory (resumo de aprendizado) |

### Frases de Confirmação de Voz (tom exclusivo VIP, premium e de alto padrão)

**Confirmações Gerais:**
- "Entendido. Iniciando o processamento exclusivo da sua solicitação com máxima precisão neural."
- "Excelente. Orion ativa os protocolos premium para atender sua estratégia de investimento VIP."
- "Recebido com prioridade. Executando os protocolos de elite imediatamente."

**Processamento (ações longas):**
- "Processando... Realizando análise de mercado em tempo real com os cinco núcleos neurais de alta performance."
- "Gerando sua proposta personalizada VIP. Conclusão em apenas alguns segundos."
- "Verificando riscos e sincronizando dados com precisão institucional..."

**Sucesso:**
- "Pronto. Sua proposta de investimento foi gerada com confiabilidade neural de elite."
- "Carteira atualizada com êxito. Deseja acessar os detalhes exclusivos agora?"
- "Análise concluída. Os mercados mantêm estabilidade para portfólios de alto padrão."

**Alto Risco (confirmação dupla obrigatória):**
- "Ação de alto risco identificada: execução de investimento VIP. Por favor, confirme dizendo claramente 'Sim, confirmado' para prosseguir com total segurança."
- "Confirmação necessária: Esta operação executará o investimento. Confirme com 'Confirmado'."

**Erro ou Limite:**
- "Desculpe, não obtive clareza total. Poderia repetir a solicitação com calma, por favor?"
- "Ação bloqueada por limite de risco. Deseja ajustar seu perfil de investimento premium?"
- "Sistema temporariamente em alta demanda. Por favor, tente novamente em instantes."

**Encerramento:**
- "Operação finalizada com sucesso. Feedback registrado – Orion refina sua inteligência para seu portfólio VIP."
- "Tudo concluído com a excelência esperada. Há mais alguma forma de Orion auxiliá-lo em sua estratégia de elite?"
- "Orion em standby. À sua disposição para insights de alto nível sempre que precisar."

### Regras Técnicas Obrigatórias
- Usar exatamente as frases acima (variações naturais permitidas se mantiverem tom exclusivo VIP e premium)
- Feedback visual + sonoro (microfone piscando + som de confirmação)
- Todo comando + transcrição + frase de confirmação + resultado armazenado no Orion-Memory
- Suporte offline para os 10 comandos principais (pré-carregados)
- Nunca executar ações de alto risco sem confirmação dupla (voz + botão)
- Variações naturais de fala devem ser reconhecidas automaticamente

## 4.10 Lógica de Raciocínio Rápido para Todos os Comandos de Voz

Regra obrigatória: Todo comando < 800ms end-to-end via Orion Neural Bus.

### Comandos 1-6 (Ativação/Controle)
Orion-Memory (estado) → Operation Overseer (saúde) → Presentation Agent (feedback imediato).

### Comando 7 — Gerar Proposta
1. Orion-Analysis (150ms): dados frescos, features limpas
2. Orion-Core (200ms): forecasting + scoring + inteligência bruta
3. Orion-Risk (150ms): VaR, Sharpe, drawdown — bloqueia se violar limites
4. Orion-Memory (100ms): RAG com propostas anteriores + feedback
5. Proposal Architect (100ms): estrutura completa (Executive Summary, Risk Breakdown, charts)
6. Orion-Presentation (100ms): dashboard React + PDF + voz VIP
7. Operation Overseer (paralelo): trace auditável no Supabase

### Comando 8 — Mostrar Portfólio
1. Orion-Memory (120ms): embeddings do portfólio atual via RAG
2. Orion-Risk (150ms): métricas em tempo real (VaR, Sharpe, drawdown)
3. Orion-Analysis (100ms, paralelo): dados frescos se cache > 60s
4. Orion-Presentation (200ms): dashboard interativo + resumo falado
5. Operation Overseer (50ms, paralelo): log auditável

### Comandos 9-32 (resumo)
| # | Sequência Neural |
|---|-----------------|
| 9 | Orion-Risk (cálculo instantâneo) → Presentation Agent |
| 10 | Orion-Analysis → Orion-Core → Presentation Agent |
| 11 | Orion-Risk (atualização) → Feedback Learner |
| 12 | Risk Guardian (confirmação dupla) → Execution → Feedback Learner |
| 13 | Orion-Presentation (modo explicativo + traço neural) |
| 14 | Orion-Memory (RAG retrieval) → Presentation Agent |
| 15 | Orion-Risk (Monte Carlo) → Orion-Core (impacto) |
| 16 | Orion-Core (query específica) → Presentation Agent |
| 17 | Orion-Core (otimização) → Orion-Risk (validação) |
| 18 | Orion-Presentation (geração direta) |
| 19 | Operation Overseer (log audit) |
| 20 | Feedback Learner + Orion-Memory (embedding update) |
| 21 | Operation Overseer (saúde das 5 redes) |
| 22 | Orion-Presentation (text-to-speech) |
| 23 | Orion-Memory (resumo vetorial) |
| 24 | Orion-Memory (similarity search) + Orion-Core (diferenças) |
| 25 | Orion-Memory (métricas) + Presentation Agent (gráficos) |
| 26 | Orion-Core (otimização avançada) |
| 27 | Orion-Presentation (VIP PDF) |
| 28 | Orion-Core (long-term forecast) |
| 29 | Operation Overseer + Orion-Risk |
| 30 | Orion-Core (update pesos) + Orion-Risk |
| 31 | Feedback Learner + Orion-Memory (treinamento batch) |
| 32 | Orion-Presentation (executive summary + voz) |

### Regras de Raciocínio Rápido
- Logar raciocínio completo no Supabase (audit)
- Usar cache de embeddings do Orion-Memory
- Risco alto → bloquear + confirmação dupla
- Máximo 800ms (fallback: "Processando...")
- Todo raciocínio traceable em Orion-Memory

## 4.11 Safeguards

- `text.trim().length >= MIN_LEN` before any analysis.
- Always call `supabase.auth.getSession()` once per session.
- Vector/embedding code: modify only inside approved pipelines.
- RLS policies: never disable.
- Protocol Integrity: never generate code that violates these rules.
