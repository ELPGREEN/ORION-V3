# 🦞 Potencializando o Órion com NemoClaw, OpenRouter & Aceleração GPU

Este projeto foi atualizado para extrair o máximo de performance do seu hardware, combinando segurança, inteligência e velocidade.

## 1. 🚀 Aceleração por Hardware (GPU)

O Órion agora detecta e utiliza sua GPU automaticamente para processamento de IA:

- **No Navegador (WebGPU):** A extensão utiliza a API **WebGPU** para rodar modelos de linguagem e visão localmente com ultra-velocidade, sem depender apenas da CPU.
- **No Servidor Local (CUDA/MPS):** O componente `orion_cpu_space` auto-detecta se você tem uma GPU NVIDIA (**CUDA**) ou Apple Silicon (**MPS**) para acelerar tarefas pesadas de OCR e Embeddings.
- **Setup Automático:** O script `scripts/setup-orion-env.sh` identifica seu hardware e instala as versões otimizadas do PyTorch e ONNX Runtime.

## 2. 🛡️ NVIDIA NemoClaw (Segurança e Isolamento)

O **NemoClaw** fornece a infraestrutura de sandboxing necessária para que os agentes ajam com segurança.
- **Isolamento:** Cada ação do agente é verificada pelo **Policy Guard**.
- **Sandbox:** Execuções locais ocorrem dentro do ambiente protegido **OpenShell**.

## 3. 🧠 OpenRouter (Inteligência Superior)

Integração profunda com o **OpenRouter** para roteamento dinâmico:
- **Quantum Router:** Decide em tempo real qual modelo (DeepSeek R1, Gemini 2.0, Llama 3.3) é o melhor para sua tarefa atual.

## 🚀 Como Ativar Tudo

1. **Prepare o Ambiente:**
   ```bash
   bash scripts/setup-orion-env.sh
   ```
2. **Instale a Extensão:**
   - Vá em `chrome://extensions`
   - Ative o "Developer Mode"
   - Clique em "Load unpacked" e selecione a pasta `extension`.
3. **Verifique o Status:**
   - O ícone do Órion mostrará "GPU" se a aceleração estiver ativa.
   - Use o comando `nemoclaw onboard` para iniciar o sandbox seguro.

---
*Orion V5.7 - Powered by WebGPU & NVIDIA NemoClaw*
