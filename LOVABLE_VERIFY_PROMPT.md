# Prompt para Lovable.dev - Verificação de Integrações Orion V3

---

## COMANDO PRINCIPAL

```
Verifique e valide TODAS as integrações de frontend do Orion V3 listadas abaixo. 
Teste cada componente, verifique imports, resolva erros de TypeScript, 
e confirme que tudo está funcionando corretamente.
```

---

## 1. ARC-AGI-2 MÓDULOS (src/lib/neural/)

### Verificar existência e exports:
```
1. arc-decision-core.ts
   - Classe: ArcDecisionCore
   - Métodos: decide(), getStatistics(), configureMCTS()
   - Types: DecisionContext, DecisionResult, MCTSNode

2. arc-robotics-perception.ts
   - Classe: ArcRoboticsPerception
   - Métodos: initialize(), processImage(), processPointCloud(), fuseSensors()
   - Types: DetectedObject, RobotPose, SensorReading, FusionResult

3. arc-swarm-coordination.ts
   - Classe: ArcSwarmCoordination
   - Métodos: registerAgent(), createTask(), setFormation(), communicate()
   - Types: Agent, SwarmTask, FormationConfig

4. arc-financial-trading.ts
   - Classe: ArcFinancialTrading
   - Métodos: processTick(), getRiskMetrics(), getPortfolio(), haltTrading()
   - Types: MarketTick, Position, Order, TradingSignal, RiskMetrics

5. arc-system-integrator.ts
   - Classe: ArcSystemIntegrator
   - Instância: arcSystemIntegrator
   - Métodos: initialize(), decision(), getIntegratedStatus(), getAgents()
   - Integration: IoT Bridge + Smart Home + ROS2
```

### Verificar index.ts exports:
```
src/lib/neural/index.ts deve conter exports de todos os módulos ARC-AGI-2
```

---

## 2. OTIMIZAÇÃO DE VISÃO (src/components/dashboard/neural/)

### Verificar NeuralVision.tsx:
```
- VISION_GEMINI_THROTTLE_MS: 1000 (era 6000)
- VISION_MEDIAPIPE_FRAMESKIP: 10 (era 30)
- VISION_SUPERNET_FRAMESKIP: 15 (era 30)
- Função detectRealTime() com throttle de 1 segundo
- MediaPipe ObjectDetector com frameskip otimizado
```

### Verificar VisionControlPanel.tsx:
```
- Componente VisionPerformanceIndicator
- Exibição de FPS com grade (A+, A, B, C)
- Controles: faceDetection, handDetection, objectDetection, textRecognition
- Sliders: confidenceThreshold, detectionFrequency
```

### Verificar src/lib/vision/:
```
- realtime-vision-optimizer.ts
- gemini-vision.ts (captureVideoFrame, analyzeFrame)
- transformers-vision.ts (YOLO/DETR via Transformers.js)
```

### Verificar .env:
```
VITE_VISION_GEMINI_THROTTLE=1000
VITE_VISION_MEDIAPIPE_FRAMESKIP=10
VITE_VISION_SUPERNET_FRAMESKIP=15
VITE_VISION_LOCAL_FRAMESKIP=3
```

---

## 3. OTIMIZAÇÃO DE VOZ (src/lib/voice/)

### Verificar gcpSTT.ts:
```
- SPEECH_RMS_THRESHOLD: 0.01 (era 0.008)
- DEFAULT_SILENCE_MS: 1000 (era 4000) - CRÍTICO!
- Função createGCPSTTSession()
- Função calculateRMS()
```

### Verificar sileroVAD.ts:
```
- minSilenceDurationMs: 400 (era 800)
- speechThreshold: 0.5
- exitThreshold: 0.15
- Classe SileroVAD com state machine
```

### Verificar useNeuralVoice.ts:
```
- NO_SPEECH_TIMEOUT_MS: 1500 (era 2500)
- RESTART_DELAY_MS: 500 (era 1500)
- STOP_PATTERNS para barge-in
- ECHO_JACCARD_THRESHOLD: 0.35
```

### Verificar voice-latency-optimizer.ts:
```
- Classe VoiceLatencyOptimizer
- FastVoiceConfig com valores otimizados
- Métodos: markSpeechDetected(), markSTTComplete(), getGrade()
```

---

## 4. PIPELINE DE VOZ (src/hooks/)

### Verificar useVoicePipeline.ts:
```
- createVoicePipeline() integration
- push() para frames
- on() para eventos
- bridgeSTT(), bridgeLLM(), bridgeTTS()
```

### Verificar persistence:
```
- persistentMic.ts: ensurePersistentMic()
- micArbiter.ts: claimMic(), releaseMic()
```

---

## 5. INTEGRAÇÕES EXISTENTES

### Verificar IoT Bridge:
```
src/lib/neural/iot-device-bridge.ts
- IoTDeviceBridge class
- MQTT via Edge Function (mqtt-bridge)
- Methods: connect(), publish(), subscribe(), deviceList
```

### Verificar Smart Home:
```
src/lib/neural/smart-home-controller.ts
- SmartHomeController
- BLE profiles (Magic Blue, Tuya, Govee)
- MQTT integration
```

### Verificar ROS2 Bridge:
```
src/lib/neural/ros2-protocol-bridge.ts
- Protocol types: Twist, Pose, LaserScan, Imu
- ROS2 message bridges
```

### Verificar Robot Voice Commands:
```
src/components/dashboard/neural/RobotVoiceCommands.tsx
- Comandos: ligar luz, desligar luz
- IoT control integration
```

---

## 6. COMPONENTES DE DASHBOARD

### Verificar painéis existentes:
```
- VisionStatsPanel (FPS, detections)
- VisionControlPanel (settings)
- DeviceIntegrationPanel (IoT)
- NeuralVision (main vision component)
- RobotSensorsPanel (telemetria)
- RobotDigitalTwinPanel (Digital Twin AAS)
```

---

## 7. VERIFICAÇÕES DE CÓDIGO

### Executar verificações:

```
1. Verificar imports em cada arquivo ARC-AGI-2
2. Verificar LogManager imports (de ../core/log-manager)
3. Verificar tipo de retorno dos métodos
4. Verificar exports no index.ts
5. Verificar variáveis de ambiente no .env
```

### Problemas comuns a verificar:
```
1. Imports quebrados
2. Tipos TypeScript faltantes
3. Valores hardcoded (4000ms, 6000ms, etc)
4. Funções undefined
5. Exports faltantes
```

---

## 8. TESTES MANUAIS ( após resolver erros)

```
1. Visão:
   - Ativar câmera → FPS deve mostrar 20+
   - Colocar objeto → detecção em < 2 segundos
   
2. Voz:
   - Falar "Olá Orion" → resposta em < 3 segundos
   - Silêncio → STT flush em ~1 segundo
   
3. ARC-AGI-2:
   - ArcDecisionCore.decide() deve funcionar
   - ArcSwarmCoordination.registerAgent() deve funcionar
   - ArcFinancialTrading.processTick() deve funcionar
   
4. IoT:
   - DeviceIntegrationPanel deve mostrar dispositivos
   - RobotVoiceCommands deve controlar luzes
```

---

## 9. CRITÉRIOS DE SUCESSO

```
[ ] Todos os 5 arquivos ARC-AGI-2 existem e compilam
[ ] exports no index.ts estão corretos
[ ] Valores de visão otimizados (throttle 1000ms)
[ ] Valores de voz otimizados (silence 1000ms)
[ ] Nenhum erro de TypeScript
[ ] Variáveis de ambiente configuradas
[ ] Painéis de dashboard funcionando
[ ] Pipeline de voz sem erros
[ ] Pipeline de visão sem erros
```

---

## 10. RELATÓRIO FINAL

```
Reportar:

1. ERROS ENCONTRADOS:
   - Lista de erros de compilação
   - Imports quebrados
   - Tipos faltantes

2. CORREÇÕES APLICADAS:
   - Lista de correções feitas

3. STATUS:
   - ARC-AGI-2: [completo/pendente]
   - Visão: [completo/pendente]
   - Voz: [completo/pendente]
   - IoT: [completo/pendente]

4. RECOMENDAÇÕES:
   - Melhorias sugeridas
   - Bugs a resolver
   - Configurações adicionais
```

---

## INSTRUÇÕES PARA LOVABLE.DEV

```
1. Execute TODAS as verificações listadas
2. Resolva TODOS os erros de TypeScript
3. Verifique manualmente os componentes principais
4. Teste voz e visão se possível
5. Reporte resultados detalhados
6. NÃO pule nenhuma verificação
7. Se encontrar problema, CORRIJA ou reporte
```

---

**Copie este prompt e envie ao Lovable.dev para verificar todas as integrações.**
