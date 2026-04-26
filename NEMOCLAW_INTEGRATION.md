# 🦞 Órion V6.2: A Pilha Definitiva de IA (NemoClaw + Langflow + OpenRouter)

O Órion agora atingiu o nível máximo de sofisticação, unindo a segurança da NVIDIA, a orquestração visual do Langflow e a potência híbrida da Cloud e GPU Local.

## 🧠 Arquitetura de 3 Camadas (Hybrid Flow Routing)

O novo roteador híbrido decide em tempo real o melhor motor para sua solicitação:

1.  **Orquestração Langflow (Complexidade Máxima):** Tarefas que exigem múltiplos passos ou agentes especializados (ex: Pesquisa Jurídica profunda) são enviadas para o **Langflow**.
2.  **GPU Local Ollama (Privacidade & Velocidade):** Dados sensíveis ou tarefas comuns (resumos) rodam diretamente no seu metal.
3.  **Cloud OpenRouter (Inteligência Pura):** Raciocínio de ponta via DeepSeek R1 e Gemini 2.0.

## 🛠️ Novas Ferramentas

### 1. 🌊 Langflow Sync
A extensão agora fala a língua do Langflow. Seus blueprints (`extension/blueprints/`) seguem o esquema de nós e arestas, permitindo que você visualize e edite a inteligência do Órion no dashboard do Langflow.

### 2. 🛡️ NemoClaw Sandbox
Toda execução de código local e ferramentas sensíveis operam dentro do sandbox **OpenShell**, garantindo que a IA nunca tenha acesso não autorizado aos seus arquivos pessoais.

## 🚀 Como Ativar

1.  **Setup Unificado:**
    ```bash
    bash scripts/setup-orion-env.sh
    ```
2.  **Inicie os Motores:**
    - Rode o Ollama para GPU local.
    - Rode `langflow run` para habilitar a orquestração visual.
3.  **Use a Extensão:** O Órion detectará automaticamente quais motores estão ativos e escolherá o melhor para você.

---
*Orion V6.2 - Powered by NVIDIA NemoClaw & Langflow AI.*
