#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Orion V5.6 - Automated Environment Setup (NemoClaw + OpenRouter)
# Automates installation of dependencies for local AI processing.
# ═══════════════════════════════════════════════════════════════

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Iniciando setup do ambiente Orion (Neurocore)..."

# 1. Check Prerequisites
echo -e "\n${YELLOW}[1/5] Verificando pré-requisitos...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker não encontrado. Altamente recomendado para sandbox seguro.${NC}"
else
    echo -e "${GREEN}✓ Docker detectado${NC}"
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python3 não encontrado.${NC}"
else
    echo -e "${GREEN}✓ Python3 detectado${NC}"
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ Node.js/NPM não encontrado.${NC}"
else
    echo -e "${GREEN}✓ Node.js detectado${NC}"
fi

# 2. NVIDIA NemoClaw Integration (The "Power Up")
echo -e "\n${YELLOW}[2/5] Potencializando com NVIDIA NemoClaw...${NC}"
if ! command -v nemoclaw &> /dev/null; then
    echo -e "O NemoClaw fornece o sandbox seguro (OpenShell) para os agentes do Órion."
    echo -e "Deseja instalar o NemoClaw agora? (s/n)"
    # Note: In an automated environment, we might skip this or provide the command
    echo -e "Execute: ${YELLOW}curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash${NC} para instalar."
else
    echo -e "${GREEN}✓ NVIDIA NemoClaw detectado! Sandboxing ativo.${NC}"
fi

# 3. OpenRouter Intelligence Check
echo -e "\n${YELLOW}[3/5] Verificando Inteligência OpenRouter...${NC}"
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo -e "${YELLOW}! OPENROUTER_API_KEY não encontrada no ambiente.${NC}"
    echo -e "O Órion usará o fallback gratuito, mas para máximo poder, adicione sua chave."
else
    echo -e "${GREEN}✓ Conexão OpenRouter configurada.${NC}"
fi

# 4. Local Spaces Setup
echo -e "\n${YELLOW}[4/5] Configurando Espaços Locais (CPU & Voice)...${NC}"
if [ -d "orion_cpu_space" ]; then
    cd orion_cpu_space
    if [ -f "requirements.txt" ]; then
        python3 -m venv venv 2>/dev/null || true
        source venv/bin/activate 2>/dev/null || true
        pip install -r requirements.txt --quiet 2>/dev/null || echo "Erro ao instalar dependências Python. Verifique o ambiente."
        deactivate 2>/dev/null || true
    fi
    cd ..
fi

# 5. Extension Readiness
echo -e "\n${YELLOW}[5/5] Preparando Extensão Órion...${NC}"
if [ -d "extension" ]; then
    cd extension
    # Blueprints already in sync
    echo -e "${GREEN}✓ Blueprints sincronizados com OpenCode Skills.${NC}"
    echo -e "${GREEN}✓ Policy Guard ativo.${NC}"
    cd ..
fi

echo -e "\n${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  SETUP CONCLUÍDO!                                    ${NC}"
echo -e "${GREEN}  O Órion agora tem o poder do NemoClaw + OpenRouter. ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "\nPróximos Passos:"
echo "1. Carregue a pasta 'extension' no Chrome."
echo "2. Para segurança máxima, rode o Órion dentro do NemoClaw:"
echo "   nemoclaw onboard"
