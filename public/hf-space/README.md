---
title: Adv
emoji: ⚡
colorFrom: red
colorTo: red
sdk: docker
pinned: false
---

# PDF Layout Analysis (Lightweight)

Lightweight PDF layout analysis API using PyMuPDF + pdfplumber.
Runs on 2GB RAM (HF Spaces free tier).

## Endpoints

- `GET /` — Health check
- `POST /` — Analyze PDF layout → JSON segments
- `POST /markdown` — Convert PDF → structured Markdown
- `POST /html` — Convert PDF → HTML

All POST endpoints accept `multipart/form-data` with a `file` field.

## Integração NEUROCORE AI

Este Space é o módulo oficial **PDF Vision API** da arquitetura NEUROCORE AI (Camada 2 — Visão Computacional). Utilizado para análise de documentos jurídicos capturados por câmera ou upload, convertendo PDFs em dados estruturados para o Cognitive Engine.

- **Client TypeScript**: `src/lib/neural/hf-space-client.ts`
- **Documentação completa**: Seção 6 (API Reference) + Seção 13 (Repositórios Open Source)
- **Lista de repos**: [`NEUROCORE_OPENSOURCE.md`](./NEUROCORE_OPENSOURCE.md)

---

# NEUROCORE AI — Open Source Stack

Todos os repositórios open source que compõem a arquitetura NEUROCORE AI.

## Camada 1 — Infraestrutura Edge/Cloud + Wireless

| Projeto | Link | Licença |
|---------|------|---------|
| Eclipse Mosquitto | [GitHub](https://github.com/eclipse-mosquitto/mosquitto) | EPL-2.0 |
| EMQX | [GitHub](https://github.com/emqx/emqx) | Apache-2.0 |
| NanoMQ | [GitHub](https://github.com/emqx/NanoMQ) | MIT |
| VerneMQ | [GitHub](https://github.com/vernemq/vernemq) | Apache-2.0 |

## Camada 2 — Motor de Visão Computacional

| Projeto | Link | Licença |
|---------|------|---------|
| Ultralytics YOLOv11 | [GitHub](https://github.com/ultralytics/ultralytics) | AGPL-3.0 |
| Google MediaPipe | [GitHub](https://github.com/google-ai-edge/mediapipe) | Apache-2.0 |
| CMU OpenPose | [GitHub](https://github.com/CMU-Perceptual-Computing-Lab/openpose) | Custom |
| vision_opencv (ROS2) | [GitHub](https://github.com/ros-perception/vision_opencv) | Apache-2.0 |
| darknet_ros | [GitHub](https://github.com/leggedrobotics/darknet_ros) | BSD-3 |

## Camada 3 — Módulos Especializados (LIBRAS + Cognição)

| Projeto | Link | Licença |
|---------|------|---------|
| sign-language-recognition | [GitHub](https://github.com/Dudu197/sign-language-recognition) | MIT |
| talking-hands | [GitHub](https://github.com/AdrianoCLeao/talking-hands) | MIT |
| libras_decoder | [GitHub](https://github.com/gugarosa/libras_decoder) | MIT |
| YOLO11 Sign Language | [GitHub](https://github.com/alihassanml/Yolo11-sign-lanugage-detection) | MIT |
| ISLR_LIBRAS | [GitHub](https://github.com/Malta-Lab/ISLR_LIBRAS) | MIT |
| Omdena Brazilian SL | [GitHub](https://github.com/OmdenaAI/SaoPauloBrazilChapter_BrazilianSignLanguage) | MIT |
| ViT Fine-tuning | [HuggingFace](https://huggingface.co/learn/cookbook/fine_tuning_vit_custom_dataset) | Apache-2.0 |

## Camada 4 — Orquestrador Cognitivo + ROS2

| Projeto | Link | Licença |
|---------|------|---------|
| ROS2 Core | [GitHub](https://github.com/ros2/ros2) | Apache-2.0 |
| Awesome ROS2 | [GitHub](https://github.com/fkromer/awesome-ros2) | CC0 |
| ROS2 Vision Robot | [GitHub](https://github.com/noshluk2/ROS2-Raspberry-PI-Intelligent-Vision-Robot) | MIT |
| ROS2 Robot Simulation | [GitHub](https://github.com/IFRA-Cranfield/ros2_RobotSimulation) | Apache-2.0 |

## Camada 5 — Aplicação / Interface + Deploy

| Projeto | Link | Licença |
|---------|------|---------|
| Home Assistant | [GitHub](https://github.com/home-assistant/home-assistant) | Apache-2.0 |
| Docker | [GitHub](https://github.com/docker) | Apache-2.0 |
| Kubernetes | [GitHub](https://github.com/kubernetes/kubernetes) | Apache-2.0 |

---

Veja também: [`NEUROCORE_OPENSOURCE.md`](./NEUROCORE_OPENSOURCE.md) para a lista completa com descrições detalhadas.
