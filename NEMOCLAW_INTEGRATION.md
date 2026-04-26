# Integração NVIDIA NemoClaw no Órion

Este projeto agora conta com uma arquitetura robusta baseada no framework **NemoClaw**, potencializando a extensão com segurança, modularidade e inteligência.

## Principais Componentes

### 1. 🛡️ Policy Guard (`extension/policies.js`)
Camada de segurança que valida todas as ações do agente.
- **Trusted Domains:** Lista branca de domínios seguros.
- **Restricted Actions:** Ações que exigem aprovação (downloads, bookmarks, clipboard).
- **PII Detection:** Alertas automáticos ao detectar dados sensíveis (CPF, CNPJ, Email).

### 2. 📋 Sistema de Blueprints (`extension/blueprints/`)
Habilidades definidas de forma modular e expansível.
- **summarizer.json:** Especialista em conteúdo.
- **researcher.json:** Cientista de dados e pesquisa de PDFs.
- **searcher.json:** Navegador e explorador web.

### 3. 🧠 Quantum Inference Routing (`extension/router.js`)
Roteamento inteligente de modelos em tempo real.
- Escolhe entre **DeepSeek R1** (raciocínio), **Gemini 2.0** (geral) e **Llama 3.3** (rápido) dependendo da complexidade da tarefa.

### 4. ⚡ Motor Proativo (`extension/proactive.js`)
Monitoramento do ciclo de vida para ajuda proativa.
- Sugere síntese de abas quando detecta múltiplas pesquisas no mesmo domínio.
- Sugere scraping ao detectar URLs no clipboard.

### 5. 🛠️ Instalação Automatizada (`scripts/setup-orion-env.sh`)
Script para configurar todo o ambiente local do Órion com um único comando.
- Instala dependências do CPU Space.
- Constrói imagens Docker do Voice Space.
- Prepara a extensão para uso.

## Como Usar
1. Execute `bash scripts/setup-orion-env.sh` para preparar a máquina.
2. Carregue a pasta `extension` no Chrome.
3. O Órion agora opera com as proteções e inteligência do NemoClaw.
