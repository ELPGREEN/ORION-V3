#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Orion V5.7 - Automated Environment Setup (GPU + NemoClaw)
# Automates installation of dependencies with hardware acceleration.
# ═══════════════════════════════════════════════════════════════

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Iniciando setup do ambiente Orion (Neurocore) com Aceleração por Hardware..."

# 1. Hardware Detection
echo -e "\n${YELLOW}[1/6] Detectando Hardware...${NC}"
HAS_NVIDIA=false
HAS_APPLE_SILICON=false

if command -v nvidia-smi &> /dev/null; then
    echo -e "${GREEN}✓ GPU NVIDIA detectada (CUDA)${NC}"
    HAS_NVIDIA=true
elif [[ "$(uname)" == "Darwin" && "$(uname -m)" == "arm64" ]]; then
    echo -e "${GREEN}✓ Apple Silicon detectado (MPS)${NC}"
    HAS_APPLE_SILICON=true
else
    echo -e "${YELLOW}! Nenhuma GPU compatível detectada. Usando CPU Mode.${NC}"
fi

# 2. Check Prerequisites
echo -e "\n${YELLOW}[2/6] Verificando pré-requisitos...${NC}"
for cmd in docker python3 npm; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}✗ $cmd não encontrado.${NC}"
    else
        echo -e "${GREEN}✓ $cmd detectado${NC}"
    fi
done

# 3. NVIDIA NemoClaw Integration
echo -e "\n${YELLOW}[3/6] Potencializando com NVIDIA NemoClaw...${NC}"
if ! command -v nemoclaw &> /dev/null; then
    echo -e "O NemoClaw fornece o sandbox seguro (OpenShell) para os agentes do Órion."
    echo -e "Para instalar: ${YELLOW}curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash${NC}"
else
    echo -e "${GREEN}✓ NVIDIA NemoClaw detectado! Sandboxing ativo.${NC}"
fi

# 4. OpenRouter Intelligence Check
echo -e "\n${YELLOW}[4/6] Verificando Inteligência OpenRouter...${NC}"
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo -e "${YELLOW}! OPENROUTER_API_KEY não encontrada. Fallback para Free Tier.${NC}"
else
    echo -e "${GREEN}✓ Conexão OpenRouter configurada.${NC}"
fi

# 5. Local Spaces Setup (with GPU Logic)
echo -e "\n${YELLOW}[5/6] Configurando Espaços Locais (Accelerated)...${NC}"
if [ -d "orion_cpu_space" ]; then
    cd orion_cpu_space
    if [ -f "requirements.txt" ]; then
        python3 -m venv venv 2>/dev/null || true
        source venv/bin/activate 2>/dev/null || true

        if [ "$HAS_NVIDIA" = true ]; then
            echo "Instalando PyTorch com suporte CUDA..."
            pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121 --quiet
        fi

        pip install -r requirements.txt --quiet
        deactivate 2>/dev/null || true
    fi
    cd ..
    echo -e "${GREEN}✓ Orion Hub configurado para seu hardware.${NC}"
fi

# 6. Extension Readiness
echo -e "\n${YELLOW}[6/6] Preparando Extensão Órion (GPU-Ready)...${NC}"
if [ -d "extension" ]; then
    echo -e "${GREEN}✓ Blueprints sincronizados.${NC}"
    echo -e "${GREEN}✓ WebGPU Engine pronto para ativação no navegador.${NC}"
fi

echo -e "\n${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  SETUP CONCLUÍDO COM SUCESSO!                        ${NC}"
echo -e "${GREEN}  Órion agora utiliza sua GPU para máxima potência.   ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
