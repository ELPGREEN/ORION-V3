<div align="center">

# 🧠 NEUROCORE AI

### Cognitive Robotics Platform — Edge AI + Computer Vision + IoT + BLE + ROS2

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![ROS2](https://img.shields.io/badge/ROS2-Humble-brightgreen.svg)](https://docs.ros.org/en/humble/)
[![YOLOv11](https://img.shields.io/badge/YOLO-v11-red.svg)](https://github.com/ultralytics/ultralytics)
[![Supabase](https://img.shields.io/badge/Supabase-Edge_Functions-3ecf8e.svg)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-black.svg)](https://vercel.com)
[![HuggingFace](https://img.shields.io/badge/🤗_HuggingFace-Space-yellow.svg)](https://huggingface.co/spaces/Ericsonv12/adv)
[![PWA](https://img.shields.io/badge/PWA-Installable-blue.svg)](https://web.dev/progressive-web-apps/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Native_App-119EFF.svg)](https://capacitorjs.com)
[![HiveMQ](https://img.shields.io/badge/MQTT-HiveMQ_Cloud-orange.svg)](https://www.hivemq.com/mqtt-cloud-broker/)

**Projetado por Ericson Piccoli** — Data Scientist & Engenheiro de Sistemas Robóticos

</div>

---

## 📋 Visão Geral

NEUROCORE AI é uma plataforma de robótica cognitiva que integra visão computacional, processamento de linguagem natural, reconhecimento de LIBRAS, integração IoT/Bluetooth e orquestração autônoma via ROS2. A arquitetura opera em 5 camadas, do edge computing à interface humano-robô, com suporte a PWA instalável e app nativo via Capacitor.

## 🏗️ Arquitetura — 5 Camadas

### Camada 1 — Infraestrutura Edge/Cloud + MQTT + IoT

| Componente | Repositório | Licença |
|-----------|------------|---------|
| Eclipse Mosquitto | [eclipse-mosquitto/mosquitto](https://github.com/eclipse-mosquitto/mosquitto) | EPL-2.0 |
| EMQX | [emqx/emqx](https://github.com/emqx/emqx) | Apache-2.0 |
| NanoMQ | [emqx/NanoMQ](https://github.com/emqx/NanoMQ) | MIT |
| VerneMQ | [vernemq/vernemq](https://github.com/vernemq/vernemq) | Apache-2.0 |
| Home Assistant MQTT | [home-assistant.io/mqtt](https://www.home-assistant.io/integrations/mqtt/) | Apache-2.0 |
| **HiveMQ Cloud** | [hivemq.com](https://www.hivemq.com/) | Managed (WebSocket TLS 8884) |
| **Web Bluetooth API** | [Web Bluetooth Spec](https://webbluetoothcg.github.io/web-bluetooth/) | Web Standard |
| **Capacitor Native** | [capacitorjs.com](https://capacitorjs.com) | MIT |

### Camada 1.1 — Módulos IoT & Bluetooth Implementados

| Módulo | Arquivo | Função |
|--------|---------|--------|
| Bluetooth Manager | `src/lib/neural/bluetooth-manager.ts` | Scan BLE, pareamento, leitura/escrita GATT |
| IoT Device Bridge | `src/lib/neural/iot-device-bridge.ts` | MQTT over WebSocket (HiveMQ), registro de dispositivos |
| Device Panel | `src/components/dashboard/neural/DeviceIntegrationPanel.tsx` | UI de dispositivos conectados e controle |
| Native Bridge | `src/lib/native-bridge.ts` | Sensores nativos (câmera, GPS, acelerômetro, bateria) |
| Orion Voice IoT | `src/hooks/useOrionReasoning.ts` | Comandos de voz para BLE/IoT/sensores |

### Camada 2 — Motor de Visão Computacional

| Componente | Repositório | Função |
|-----------|------------|--------|
| YOLOv11 | [ultralytics/ultralytics](https://github.com/ultralytics/ultralytics) | Detecção de objetos (mAP@0.5: 0.92) |
| MediaPipe | [google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe) | Gestos, mãos e rosto |
| OpenPose | [CMU-Perceptual-Computing-Lab/openpose](https://github.com/CMU-Perceptual-Computing-Lab/openpose) | Pose multi-pessoa |
| vision_opencv (ROS2) | [ros-perception/vision_opencv](https://github.com/ros-perception/vision_opencv) | Bridge ROS2 ↔ OpenCV |
| darknet_ros | [leggedrobotics/darknet_ros](https://github.com/leggedrobotics/darknet_ros) | YOLO em ROS2 |
| ros2_pytorch | [klintan/ros2_pytorch](https://github.com/klintan/ros2_pytorch) | PyTorch em ROS2 |
| **PDF Layout Analyzer** | [Ericsonv12/adv (HF Space)](https://huggingface.co/spaces/Ericsonv12/adv) | Análise de layout de documentos |

### Camada 3 — Módulos Especializados (LIBRAS + Raciocínio + Memória)

| Componente | Repositório | Precisão |
|-----------|------------|----------|
| Sign Language Recognition | [Dudu197/sign-language-recognition](https://github.com/Dudu197/sign-language-recognition) | — |
| Talking Hands | [AdrianoCLeao/talking-hands](https://github.com/AdrianoCLeao/talking-hands) | — |
| LIBRAS Decoder | [gugarosa/libras_decoder](https://github.com/gugarosa/libras_decoder) | — |
| YOLO11 Sign Language | [alihassanml/Yolo11-sign-lanugage-detection](https://github.com/alihassanml/Yolo11-sign-lanugage-detection) | — |
| ISLR LIBRAS | [Malta-Lab/ISLR_LIBRAS](https://github.com/Malta-Lab/ISLR_LIBRAS) | **96.8%** |
| Omdena LIBRAS | [OmdenaAI/SaoPauloBrazilChapter_BrazilianSignLanguage](https://github.com/OmdenaAI/SaoPauloBrazilChapter_BrazilianSignLanguage) | — |
| LIBRAS Alphabet Dataset | [biankatpas/Brazilian-Sign-Language-Alphabet-Dataset](https://github.com/biankatpas/Brazilian-Sign-Language-Alphabet-Dataset) | Dataset |

### Camada 4 — Orquestrador Cognitivo + ROS2

| Componente | Repositório |
|-----------|------------|
| ROS2 Core | [ros2/ros2](https://github.com/ros2/ros2) |
| Awesome ROS2 | [fkromer/awesome-ros2](https://github.com/fkromer/awesome-ros2) |
| RPi Vision Robot | [noshluk2/ROS2-Raspberry-PI-Intelligent-Vision-Robot](https://github.com/noshluk2/ROS2-Raspberry-PI-Intelligent-Vision-Robot) |
| Obstacle Avoidance | [AI-Geniuses/Autonomous-Robot-Obstacle-Avoidance-with-ROS2](https://github.com/AI-Geniuses/Autonomous-Robot-Obstacle-Avoidance-with-ROS2) |
| Robot Simulation | [IFRA-Cranfield/ros2_RobotSimulation](https://github.com/IFRA-Cranfield/ros2_RobotSimulation) |

### Camada 5 — Interface + Deploy + Mobile

| Componente | Tecnologia |
|-----------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Three.js |
| Backend | Supabase Edge Functions (Deno) |
| PDF Analysis | HF Space → Edge Function fallback |
| TTS | ElevenLabs via Edge Function |
| Deploy Web | Vercel (frontend) + Supabase (backend) |
| PWA | vite-plugin-pwa (instalável, offline) |
| App Nativo | Capacitor (iOS + Android) |
| IoT / MQTT | HiveMQ Cloud (WebSocket TLS) |
| Bluetooth BLE | Web Bluetooth API (GATT) |
| Sensores Nativos | Câmera, GPS, Acelerômetro, Háptica, Bateria, Rede |
| Assistente de Voz | Orion (Web Speech API + comandos IoT/BLE) |
| Casa Inteligente | [Home Assistant](https://github.com/home-assistant/home-assistant) |

## 📊 Métricas de Performance (v2.0 — Abril 2026)

| Métrica | Valor |
|---------|-------|
| mAP@0.5 (YOLOv11) | **0.92** |
| Precisão LIBRAS | **96.8%** |
| Precisão facial (7 emoções) | **94%** |
| Rastreamento de gestos | **60 FPS** |
| Latência câmera → ação | **< 120ms** (edge) |
| Análise PDF (HF Space) | **< 2s** (warm) |
| Análise PDF (fallback) | **< 800ms** |
| Módulos neurais | **24+** |
| Páginas/rotas | **~50** |
| Edge Functions | **80+** |
| Tipos de documentos | **100+** |
| Documentos internacionais | **15+** |
| Idiomas nativos | **5** |
| Classificação de intenção | **v3 (emocional + contextual)** |
| Neurolinguística TTS | **Limpeza markdown + entonação ;** |

## 🧠 Sistema de Raciocínio Orion (v3)

### Motor de Intenção
- Classificação v3 com suporte a padrões emocionais, conversacionais e contextuais
- Continuidade: últimas intenções influenciam classificação da intenção atual
- Categorias: `juridica`, `geral`, `pesquisa`, `documento`, `emocional`, `conversacional`

### Neurolinguística de Fala
- `cleanTextForSpeech()` — Remove markdown, URLs, HTML, emojis técnicos, tabelas
- Ponto e vírgula (`;`) como fim de sentença para entonação natural
- Quebra automática de cláusulas longas (>120 chars) em vírgulas
- Sincronizado entre ElevenLabs TTS, browserSpeak e Web Speech API
- Comunicação 100% humana — sem `**`, `//`, `##` na voz

## 📱 Integração IoT & Mobile

### Conectividade Bluetooth (BLE)
- Web Bluetooth API para scan, pareamento e comunicação GATT
- Serviços suportados: Battery (0x180F), Heart Rate (0x180D), Device Info (0x180A), custom
- Reconexão automática e notificações de características

### MQTT / IoT Bridge
- HiveMQ Cloud cluster (WebSocket TLS na porta 8884)
- Bridge NeuralMessageBus ↔ tópicos MQTT remotos
- Registro de dispositivos IoT com status em tempo real
- Comandos: ligar/desligar dispositivos, consultar temperatura, status robô

### PWA (Progressive Web App)
- Instalável via navegador (Add to Home Screen)
- Manifest com ícones 192px e 512px
- Suporte offline com service worker
- Sensores via Web APIs (câmera, geolocalização, acelerômetro)

### App Nativo (Capacitor)
- Build nativo iOS (Xcode) e Android (Android Studio)
- Acesso completo a Bluetooth, câmera, GPS, notificações push
- Hot-reload em desenvolvimento via sandbox URL
- AppID: `app.lovable.a9011a39281d4fa990b80890e1648690`

### Assistente Orion — Comandos de Voz IoT
| Comando | Ação |
|---------|------|
| "Orion, conecte ao bluetooth" | Scan e pareamento BLE |
| "Orion, ligue a luz" | Envia comando MQTT `ligar_luz` |
| "Orion, desligue a luz" | Envia comando MQTT `desligar_luz` |
| "Orion, status dos sensores" | Consulta sensores BLE/IoT |
| "Orion, status do robô" | Consulta status robótico via MQTT |
| "Orion, tire uma foto" | Captura foto (câmera nativa) |
| "Orion, qual minha localização?" | Retorna GPS (lat/lng) |
| "Orion, status da bateria" | Nível de bateria do dispositivo |

## 🚀 Quick Start

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/neurocore-ai.git
cd neurocore-ai

# Instale dependências do frontend
npm install

# Configure variáveis de ambiente
cp .env.example .env

# Inicie o servidor de desenvolvimento
npm run dev
```

### Build Mobile

```bash
# Adicionar plataforma
npx cap add android  # ou ios

# Sincronizar após mudanças
npx cap sync

# Rodar no emulador/dispositivo
npx cap run android  # ou ios
```

## 📦 Clone de Todos os Repositórios Open Source

```bash
# Script disponível em: scripts/clone-neurocore-all.sh
chmod +x scripts/clone-neurocore-all.sh
./scripts/clone-neurocore-all.sh
```

## 🔗 Links Importantes

- **HuggingFace Space**: [Ericsonv12/adv](https://huggingface.co/spaces/Ericsonv12/adv)
- **Documentação ROS2**: [docs.ros.org](https://docs.ros.org/en/humble/)
- **HiveMQ Cloud**: [hivemq.com](https://www.hivemq.com/)
- **Capacitor Docs**: [capacitorjs.com](https://capacitorjs.com/docs)
- **Supabase Dashboard**: Gerenciado via Supabase CLI

## 📄 Licença

Este projeto utiliza múltiplas licenças open source. Consulte cada submódulo para detalhes específicos. O código principal é licenciado sob Apache-2.0.

---

<div align="center">
  <sub>Construído com ❤️ por Ericson Piccoli — NEUROCORE AI © 2026</sub>
</div>
