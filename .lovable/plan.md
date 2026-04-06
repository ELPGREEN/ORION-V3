

# ORION — Plano de Integração Real do Software com a Linha Robótica

## Problema Atual

O sistema tem **dois bridges desconectados**:

1. **`ros2-protocol-bridge.ts`** (antigo) — simulação via MQTT/iotBridge. É o que o `RobotControlPanel` usa hoje.
2. **`rosbridge-client.ts`** (novo) — WebSocket real para `rosbridge_suite`. Só os painéis novos (WebRTC, Telemetry) usam.

**Resultado:** O painel principal do robô opera em simulação enquanto a infraestrutura Docker real já existe. Precisamos unificar tudo no client real.

---

## Plano de Implementação

### Etapa 1 — Unificar bridges (migrar para o real)

- Criar **`src/lib/robotics/unified-robot-client.ts`** — camada única que:
  - Usa `rosbridge-client.ts` (WebSocket real) como transporte primário
  - Mantém fallback MQTT via `iot-device-bridge` quando ROSBridge não está disponível
  - Exporta a mesma API do bridge antigo (`RobotState`, `sendCmdVel`, etc.) para não quebrar componentes existentes
- Criar **`src/hooks/useRobotConnection.ts`** — hook unificado com:
  - Configuração de IP/porta do robô (persistida em localStorage)
  - Estado de conexão global (Context API)
  - Auto-discovery de serviços disponíveis (rosbridge, webrtc, mqtt)

### Etapa 2 — Painel de Conexão Real

- Criar **`src/components/dashboard/neural/RobotConnectionManager.tsx`**:
  - Formulário: IP do robô, porta ROSBridge (9090), porta WebRTC (8443), porta MQTT (1883)
  - Botão "Testar Conexão" — tenta WS handshake e mostra latência
  - Indicador visual de cada serviço (verde/vermelho): ROSBridge, WebRTC, MQTT, Foxglove
  - Salva perfis de robô (ex: "AGV-01 Fábrica", "Braço-02 Linha Pneus")

### Etapa 3 — Migrar RobotControlPanel para bridge real

- Substituir import de `ros2-protocol-bridge` por `unified-robot-client`
- Joystick → envia `cmd_vel` real via WebSocket
- Botões de navegação → `sendNav2Goal` real
- Emergency stop → chamada de service real
- Telemetria → subscription real em `/battery_state`, `/odom`, `/imu/data`

### Etapa 4 — Integrar WebRTC com signaling real

- Atualizar `WebRTCCameraViewer.tsx`:
  - Usar o IP configurado no Connection Manager para montar URL do signaling server (`http://{robotIP}:8443/offer`)
  - Adicionar suporte a TURN server (para acesso remoto via VPN)
  - Indicador de latência do stream em tempo real

### Etapa 5 — Pipeline de Inspeção YOLOv8 conectado

- Atualizar `YOLOv8InspectionPanel.tsx`:
  - Capturar frame do stream WebRTC real (não imagem de teste)
  - Enviar para Edge Function que chama HuggingFace Inference API
  - Publicar resultado como `/tire_line/defect_alert` via ROSBridge
  - Mostrar bounding boxes sobrepostos no vídeo

### Etapa 6 — Node-RED e Grafana integrados

- `NodeREDPanel.tsx` → usar IP do robô para iframe (`http://{robotIP}:1880`)
- Criar **`GrafanaDashboardPanel.tsx`** → embed Grafana (`http://{robotIP}:3001`) com dashboards de OEE pré-provisionados
- Ambos usando o IP do Connection Manager

---

## Arquitetura Final Unificada

```text
┌─ ORION Frontend ──────────────────────────────────────┐
│                                                        │
│  RobotConnectionManager (IP/porta config)              │
│         │                                              │
│  unified-robot-client.ts                               │
│    ├── rosbridge-client.ts ──── WS ──→ :9090           │
│    ├── WebRTC negotiation ──── HTTP ──→ :8443           │
│    └── MQTT.js (fallback) ──── WS ──→ :8083            │
│                                                        │
│  Panels: Control │ Telemetry │ Camera │ YOLOv8 │ Tire  │
│          Node-RED │ Grafana │ Fleet │ Digital Twin      │
└────────────────────────────────────────────────────────┘
                    │
          LAN / VPN │
                    ▼
┌─ Robot Edge (Docker) ─────────────────────────────────┐
│  rosbridge:9090 │ webrtc:8443 │ mqtt:1883             │
│  influxdb:8086  │ grafana:3001 │ nodered:1880          │
│  ROS2 DDS ← Nav2 │ YOLOv8 │ tire_line_services        │
└────────────────────────────────────────────────────────┘
```

## Arquivos a Criar/Editar

| Ação | Arquivo |
|------|---------|
| Criar | `src/lib/robotics/unified-robot-client.ts` |
| Criar | `src/hooks/useRobotConnection.ts` |
| Criar | `src/contexts/RobotConnectionContext.tsx` |
| Criar | `src/components/dashboard/neural/RobotConnectionManager.tsx` |
| Criar | `src/components/dashboard/neural/GrafanaDashboardPanel.tsx` |
| Editar | `src/components/dashboard/neural/RobotControlPanel.tsx` — migrar para unified client |
| Editar | `src/components/dashboard/neural/WebRTCCameraViewer.tsx` — usar IP dinâmico |
| Editar | `src/components/dashboard/neural/YOLOv8InspectionPanel.tsx` — captura real |
| Editar | `src/components/dashboard/neural/NodeREDPanel.tsx` — IP dinâmico |
| Editar | `src/components/dashboard/neural/TireProductionPanel.tsx` — dados reais |

