# Órion Core - Novo Assistente Autônomo

Esta é a implementação do novo cérebro central do Órion, projetado para ser um assistente autônomo e modular. Ele utiliza o Google Assistant SDK apenas como um motor auxiliar (fallback) e para aprendizado de estrutura, mantendo controle total sobre as integrações de IoT, BLE e ROS2.

## 🧠 Arquitetura

O Órion Core é dividido em módulos especializados:

- **`main.py`**: Ponto de entrada que coordena a inicialização.
- **`brain.py`**: O Cérebro Central (`OrionAssistant`). Gerencia intenções, roteamento e lógica de negócio.
- **`voice_interface.py`**: Interface de voz com suporte a Wake Word ("Hey Órion") e CLI interativo.
- **`memory.py`**: Camada de persistência para histórico de conversas e contexto.
- **`integrations/`**: Módulos para controle direto de hardware e APIs externas.
  - `google_assistant.py`: Integração gRPC com o Google.
  - `iot_manager.py`: Controle via MQTT (HiveMQ).
  - `ble_manager.py`: Gerenciamento de Bluetooth Low Energy (Bleak).
  - `ros2_manager.py`: Ponte para o ecossistema ROS2.

## 🚀 Instalação

### 1. Dependências Python

Instale as bibliotecas necessárias:

```bash
pip install google-assistant-sdk google-auth-oauthlib paho-mqtt bleak rclpy SpeechRecognition
```

*(Nota: `rclpy` exige um ambiente ROS2 instalado. `SpeechRecognition` pode exigir `PyAudio` ou `google-cloud-speech` para melhor performance).*

### 2. Configuração do Google Assistant

1. Vá ao [Google Cloud Console](https://console.cloud.google.com/).
2. Ative a **Google Assistant API**.
3. Crie credenciais do tipo **OAuth 2.0 Client ID** (Desktop App).
4. Faça o download do JSON e salve como `credentials.json` na pasta `orion_cpu_space/`.
5. Na primeira execução, o Órion abrirá o navegador para autorizar o acesso e gerará o `token.pickle`.

## 🛠️ Como Usar

### Modo Texto (Padrão)
Ideal para testes e desenvolvimento:
```bash
python main.py
```

### Modo Voz (Com Wake Word)
Requer microfone configurado:
```bash
python main.py --voice
```

## 📋 Regras de Negócio Implementadas

1.  **Prioridade YouTube**: Comandos de música ou vídeo são automaticamente direcionados para o YouTube, a menos que Spotify/Amazon sejam citados explicitamente.
2.  **Fallback Inteligente**: Se o Órion não reconhecer um comando localmente, ele consulta o Google Assistant, mas aplica as regras do Órion na resposta final.
3.  **Memória de Contexto**: O Órion lembra das últimas interações para manter uma conversa fluida.
4.  **Controle Direto**: Comandos de luz ou status de robô são executados via MQTT/ROS2 sem passar pelo Google.

## 🔮 Sugestões para o Futuro (Aprimoramento)

- **Extração de Padrões**: Use os dados salvos em `google_structure` dentro da memória para treinar um modelo local de classificação de intenção (NLU) mais robusto.
- **Transição 2026**: Como o SDK do Google será desligado em Março de 2026, comece a mapear todas as respostas do Google que você mais usa e crie fallbacks usando LLMs locais (como Llama 3 ou Gemma) rodando no `orion_gpu_space`.
- **Visão Computacional**: Integre o módulo de OCR e YOLO já existentes no Órion para que ele possa "ver" e responder sobre o ambiente através do `brain.py`.
