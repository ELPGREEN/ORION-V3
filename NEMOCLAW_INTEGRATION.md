# 🦞 Órion Ultra-Híbrido: NemoClaw, OpenRouter & GPU Local (Ollama)

O Órion agora opera com uma arquitetura de **Inteligência Híbrida**, decidindo em milissegundos se deve usar a potência da nuvem ou a privacidade da sua GPU local.

## 🧠 Como o Roteador Híbrido Funciona

O novo `Hybrid Router` utiliza uma lógica de pontuação para cada tarefa:

1.  **Privacidade Total:** Se dados sensíveis (CPF, CNPJ, etc.) forem detectados, o Órion **força** a execução na sua GPU local (Ollama).
2.  **Complexidade:** Tarefas de raciocínio pesado (DeepSeek R1, Gemini 2.0) vão para a nuvem.
3.  **Performance:** Resumos e traduções simples são processados localmente se você tiver uma GPU ativa, economizando tokens e latência.

## 🛠️ Componentes do Ecossistema

### 1. 🛡️ NVIDIA NemoClaw
Fornece o sandbox **OpenShell** para que o Órion execute scripts e análises com isolamento total do sistema operacional.

### 2. 🔥 Ollama (GPU Local)
O motor que permite ao Órion "pensar" dentro da sua máquina. O setup automatizado configura o Ollama e baixa o modelo `llama3` para você.

### 3. ☁️ OpenRouter (Cloud)
Acesso unificado aos melhores modelos do mundo quando o Local não for suficiente ou a tarefa for complexa demais.

## 🚀 Guia de Inalação Rápida

1.  **Execute o Setup:**
    ```bash
    bash scripts/setup-orion-env.sh
    ```
2.  **Instale a Extensão:** No Chrome, carregue a pasta `extension` no modo desenvolvedor.
3.  **Certifique-se que o Ollama está rodando:** O Órion detectará automaticamente e mostrará a notificação "Respondido via Local GPU".

---
*Orion V5.9 - O equilíbrio perfeito entre Nuvem e Metal.*
