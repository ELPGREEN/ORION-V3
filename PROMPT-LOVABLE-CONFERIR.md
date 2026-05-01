# PROMPT PARA LOVABLE.DEV — ARQUITETURA NEURAL ORION (Conferência)

## Contexto
Você é um revisor especializado em arquitetura de software neural/AI.
O projeto é o **Orion v3** — um sistema neural completo com visão, voz, consciência e auto-evolução.

## Estrutura Neural Completa

### 1. Córtex Prefrontal (Raciocínio Central)
- **PentagonOrchestrator** (`src/core/pentagon/`): Ciclo cognitivo 5 estágios (Percepção → Memória → Raciocínio → Planejamento → Ação)
- **orion-ai-client.ts** (`src/lib/neural/orion-ai-client.ts`): NeuroCore AI, 1309 linhas — análise principal, intents, processamento de linguagem
- **useOrionReasoning.ts** (`src/components/dashboard/neural/useOrionReasoning.ts`): Hook React de raciocínio, gerencia conversas, comandos de voz, integração com Jules
- **neural-cognition-engine.ts**: Motor de cognição, contexto, aprendizado

### 2. Córtex Visual
- **NeuralVision.tsx** (`src/components/dashboard/neural/NeuralVision.tsx`): Interface principal (1604 linhas) — câmera, canvas, overlays, detecção
- **useVisionProcessing.ts** (`src/components/dashboard/neural/useVisionProcessing.ts`): VS global store, processamento LA-PIX (Sobel, histogramas, contornos)
- **vision-state.ts** (`src/lib/neural/vision-state.ts`): Lazy getter pattern (quebra ciclos de import circular)
- **vision-cache.ts, gemini-vision.ts**: Análise via Gemini API

### 3. Córtex Auditivo / Linguagem
- **useNeuralVoice.ts**: Voz neural, TTS/STT
- **orion-voice-executor.ts**: Execução de comandos de voz
- **orion-voice-protocols.ts**: Protocolos de voz
- **STT/TTS**: Gemini TTS, WebSpeech API, Groq

### 4. Sistemas de Memória
- **orion-memory.ts**: Memória local com fatos, aprendizado
- **orion-working-memory.ts**: Memória de trabalho (contexto atual)
- **corrective-rag.ts**: RAG corretivo com verificação
- **huggingface/**: Embeddings e busca semântica

### 5. Consciência e Identidade
- **orion-consciousness.ts**: Consciência central (Ericson Piccoli = criador)
- **orion-identity-verifier.ts**: Verificação biométrica (voz/rosto)
- **useVoiceIdentityGuard.ts**: Guard de identidade para comandos sensíveis
- **orion-self-improvement.ts**: Auto-evolução via Jules AI

### 6. Sistemas Especialistas (Agentes)
- **orion-maestro-unification.ts**: Maestro — unificação de todas as respostas
- **quantum-llm-router.ts**: Roteamento quântico de queries (rápido/balanceado/raiz/coding)
- **mamba-orchestrator.ts**: Compressão de contexto longo (Mamba SSM)
- **tesla-coil-amplifier.ts**: Amplificação neural (Tesla Coil)
- **active-inference-guard.ts**: Inferência ativa (Free Energy Principle)

### 7. Indústria 4.0 / Robótica
- **jules-orion-fusion.ts**: Fusão Jules AI + Orion
- **ros2-protocol-bridge.ts**: Protocolo ROS2
- **iot-device-bridge.ts**: IoT (MQTT, Bluetooth)
- **industrial-*.ts**: Welding, Assembly, Painting, Inspection, Palletization

### 8. Defesa e Segurança
- **orion-defense-system.ts**: Sistema de defesa neural
- **orion-immune-system.ts**: Sistema imune (quarantine de falhas)
- **security-compliance-protocols.ts**: RLS, XSS, injeção

### 9. Ferramentas Cognitivas
- **knowledge-harvester-pipeline.ts**: Coleta autocognitiva (10 prompts especializados)
- **orion-knowledge-base.ts**: Base de conhecimento estruturada
- **som-router.ts**: Self-Organizing Map para classificação
- **cognitive-fast-reasoner.ts**: Raciocínio rápido (<50ms)

## Tecnologias
- **Frontend**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **IA Providers**: OpenRouter (15+ gratuitos), Gemini, Groq, DeepSeek, Mistral
- **Visão**: MediaPipe Tasks Vision, YOLO ONNX, Gemini Vision API
- **Build**: Vite com chunking manual, deploy Vercel

## Problema Recente (RESOLVIDO)
**TDZ Error** (`Cannot access 'X' before initialization`) em produção:
- **Causa**: `orion-ai-client.ts` importava `VS` de `useVisionProcessing.ts` (lib → components ciclo)
- **Fix** (commit `fc888ed4`):
  - Criado `vision-state.ts` com lazy getter
  - `orion-ai-client.ts` agora usa `getVS()` em vez de `VS` direto
  - `NeuralVision.tsx` injeta VS via `setVSGetter(() => VS)` no mount

## Solicitação para o Lovable

Por favor, revise a arquitetura acima e:

1. **Identifique potenciais problemas**:
   - Ciclos de import restantes
   - Vazamentos de memória
   - Gargalos de performance
   - Violações do Single Responsibility Principle

2. **Sugira melhorias**:
   - Refatorações para simplificar
   - Padrões de projeto ausentes
   - Otimizações de performance

3. **Verifique a integridade do sistema**:
   - O fluxo Pentagon (5 estágios) está correto?
   - A memória está persistindo adequadamente?
   - O sistema de identidade é seguro?
   - A auto-evolução via Jules está bem estruturada?

4. **Foque em**:
   - `src/lib/neural/orion-ai-client.ts` (1309 linhas — candidate a split)
   - `src/components/dashboard/neural/NeuralVision.tsx` (1604 linhas — muito grande?)
   - Ciclos de dependência entre `lib/neural/` e `components/dashboard/neural/`
   - Uso de `any` (TypeScript — deve ser tipado melhor)

## Critérios de Aceitação
- O sistema deve carregar sem erros TDZ
- Testes (`npm run test`) devem passar (272/272)
- TypeScript (`npx tsc --noEmit`) deve estar limpo
- Build de produção (`npm run build`) deve suceder

## Repositório
- GitHub: https://github.com/ELPGREEN/ORION-V3
- Deploy: https://orion-v3.vercel.app
- Branch principal: `main`

Por favor, forneça um relatório detalhado com:
1. Problemas encontrados
2. Sugestões de melhoria (priorizadas)
3. Código de exemplo para refatorações críticas
