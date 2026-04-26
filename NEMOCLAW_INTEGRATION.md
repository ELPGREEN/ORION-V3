# 🦞 Potencializando o Órion com NemoClaw & OpenRouter

Para levar a extensão do Órion ao nível máximo de segurança e inteligência, integramos dois pilares fundamentais da NVIDIA e do ecossistema Open Source.

## 1. 🛡️ NVIDIA NemoClaw (Segurança e Isolamento)

O **NemoClaw** é a infraestrutura que permite ao Órion rodar agentes de forma autônoma sem comprometer a segurança do seu PC.

- **Por que instalar?** Ele cria um sandbox (**OpenShell**) que isola a execução do código. Se o Órion precisar rodar um script local para analisar dados, ele o fará dentro deste sandbox protegido por **Landlock** e **seccomp**.
- **Como instalar?** O script `scripts/setup-orion-env.sh` verificará a presença dele. Caso não tenha, instale com:
  `curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash`
- **Integração:** Usamos o blueprint em `nemoclaw-blueprint/orion-extension-blueprint.yaml` para definir as políticas de rede e acesso do Órion.

## 2. 🧠 OpenRouter (Inteligência Superior)

O **OpenRouter** unifica o acesso aos melhores modelos de IA do mundo (DeepSeek R1, Gemini 2.0, Llama 3.3).

- **O que mudou?** Implementamos o **Quantum Inference Router** na extensão (`extension/router.js`). Ele decide em tempo real qual cérebro usar para cada tarefa.
- **Vantagem:** Você não fica preso a um único modelo. Se o DeepSeek for melhor para código, o Órion mudará automaticamente para ele.
- **Configuração:** Para usar todo o potencial, adicione sua chave de API ao ambiente:
  `export OPENROUTER_API_KEY='sua_chave_aqui'`

## 3. 🛠️ OpenCode Skills (Habilidades Dinâmicas)

As habilidades do Órion agora são sincronizadas com o diretório `.opencode/skills/`. Isso significa que:
- **Auto-Evolução:** O Órion pode se auto-melhorar usando as skills do OpenCode.
- **Blueprints:** A extensão usa arquivos JSON (`extension/blueprints/`) para definir o comportamento de cada agente (Pesquisador, Analista de Dados, etc).

## 🚀 Como Ativar Tudo

1. Execute o setup automatizado:
   `bash scripts/setup-orion-env.sh`
2. Carregue a extensão no Chrome (`chrome://extensions` -> Developer Mode -> Load unpacked -> selecione a pasta `extension`).
3. Diga "Orion" ou use os menus de contexto para ver a IA em ação com a proteção do NemoClaw.

---
*Orion V5.6 - Powered by NVIDIA NemoClaw & OpenRouter*
