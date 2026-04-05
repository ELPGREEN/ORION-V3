INSERT INTO public.neural_knowledge_base (title, content, source_type, category, tags, is_processed) VALUES
('Framework E-R-C-A: Arquitetura de Prompts Tri-Camada para Agentes Visuais',
'O framework E-R-C-A (Especialize-Rede Neural-Contexto-Ação) define a arquitetura de prompts em 3 níveis para agentes visuais autônomos:

NÍVEL 1 — Prompt de Sistema (Configuração do Agente):
Define comportamento geral, identidade e capacidades. Integra CNN para detecção e LLM para interpretação. Configura latência, modelos e ações automáticas. Exemplo: Agente de Inspeção de Segurança Industrial com entrada de vídeo 4K, detecção de EPIs via CNN, interpretação de comportamento via LLM. Latência < 50ms.

NÍVEL 2 — Prompt Operacional (Tarefa Específica - Few-Shot):
Usado em runtime para direcionar foco. Componentes: (1) Sensor/câmera alvo, (2) Modelo ML específico (YOLO-PPE), (3) Regras de contexto (distância < 2m = ALTO RISCO), (4) Formato de saída (JSON estruturado: {risco, local, violacao}), (5) Comportamento (executar imediatamente, não descrever).

NÍVEL 3 — Prompt de Auto-Refinamento (Agente Agêntico Self-Evolving):
Para agentes que aprendem com o ambiente. Ciclo: Analisar logs de erro (precisão < 90%) → Identificar causa de falha de classificação → Sugerir augmentation de dados ou ajuste de threshold → Aplicar correção → Validar melhoria.

COMPONENTES CHAVE E-R-C-A:
E - Especialize: Papel do agente (Inspetor Industrial, Operador Drone, Monitor Médico, Controlador de Qualidade)
R - Rede Neural: Modelo visual (YOLO11, ResNet, ViT, MediaPipe, ONNX, BlazeFace, COCO-SSD)
C - Contexto: Critérios de sucesso/falha no ambiente operacional
A - Ação: Saída exata (mover braço robótico, enviar alerta sonoro, salvar log JSON, chamar paramédico)

PADRÕES DE PROMPT VISUAL:
- Inspeção de segurança: Detectar EPIs (capacete, colete, bota), zonas de risco, proximidade de máquinas
- Emergência médica: Detecção de pose (humano caído) → ativar protocolo de emergência
- Controle de qualidade: Segmentação de defeitos visuais em linha de produção
- Navegação autônoma: Mapeamento de obstáculos e planejamento de rota
- Vigilância: Detecção de comportamento anômalo, invasão de perímetro',
'framework', 'prompt_engineering', ARRAY['erca','prompt-architecture','visual-agent','autonomous','industrial','tri-layer','self-evolving'], true),

('Padrões de Prompt Operacional E-R-C-A: Exemplos Industriais',
'Exemplos de prompts operacionais seguindo o framework E-R-C-A para diferentes cenários industriais:

CENÁRIO 1 — Inspeção de EPIs:
E: Inspetor de Segurança Autônomo
R: YOLO-PPE + MediaPipe PoseLandmarker
C: Violação = ausência de capacete/colete/bota OU proximidade < 2m de empilhadeira
A: {risco: "alto", local: "zona_carga", violacao: "epi_ausente", timestamp: ISO8601, frame_id: UUID}

CENÁRIO 2 — Emergência Médica:
E: Monitor de Saúde Ocupacional
R: PoseLandmarker 33pts + BlazeFace
C: Pose horizontal (humano caído) + face com expressão de dor/inconsciência
A: Ativar protocolo_emergencia, chamar_paramedico, registrar_cena, alertar_supervisao

CENÁRIO 3 — Controle de Qualidade:
E: Inspetor de Linha de Produção
R: YOLOv8-seg + classificador de defeitos customizado
C: Defeito visual > 2mm em superfície do produto
A: Rejeitar peça, desviar para linha secundária, registrar defeito com coordenadas

CENÁRIO 4 — Auto-Refinamento:
Trigger: Precisão < 90% nos últimos 10 frames
Análise: Comparar error_frames com ground_truth
Ações: (1) Ajustar confidence_threshold, (2) Sugerir data augmentation, (3) Retreinar embeddings de borda',
'framework', 'prompt_engineering', ARRAY['erca','prompt-operacional','industrial','exemplos','few-shot'], true);