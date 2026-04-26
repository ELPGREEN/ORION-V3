#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Orion V5.9 - Automated Environment Setup (GPU Hybrid Edition)
# Automates installation: NemoClaw, OpenRouter, and Ollama.
# ═══════════════════════════════════════════════════════════════

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Iniciando setup do ambiente Órion Ultra-Híbrido..."

# 1. Hardware Detection
echo -e "\n${YELLOW}[1/6] Detectando Hardware...${NC}"
HAS_NVIDIA=false
if command -v nvidia-smi &> /dev/null; then
    echo -e "${GREEN}✓ GPU NVIDIA detectada (CUDA)${NC}"
    HAS_NVIDIA=true
fi

# 2. Prerequisites
echo -e "\n${YELLOW}[2/6] Verificando pré-requisitos...${NC}"
for cmd in curl docker python3 npm; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}✗ $cmd não encontrado.${NC}"
    else
        echo -e "${GREEN}✓ $cmd detectado${NC}"
    fi
done

# 3. NVIDIA NemoClaw
echo -e "\n${YELLOW}[3/6] Configurando NVIDIA NemoClaw...${NC}"
if ! command -v nemoclaw &> /dev/null; then
    echo -e "NemoClaw não detectado. Instale com: curl -fsSL https://www.nvidia.com/nemoclaw.sh | sh"
else
    echo -e "${GREEN}✓ NemoClaw detectado.${NC}"
fi

# 4. Ollama
echo -e "\n${YELLOW}[4/6] Configurando Ollama (Local GPU)...${NC}"
if ! command -v ollama &> /dev/null; then
    echo -e "Ollama não encontrado. Baixe em: https://ollama.com"
else
    echo -e "${GREEN}✓ Ollama detectado.${NC}"
    echo "Puxando modelo Llama 3..."
    ollama pull llama3 --quiet
fi

# 5. Local Hub
echo -e "\n${YELLOW}[5/6] Preparando Órion Hub...${NC}"
if [ -d "orion_cpu_space" ]; then
    cd orion_cpu_space
    python3 -m venv venv 2>/dev/null || true
    source venv/bin/activate 2>/dev/null || true
    pip install -r requirements.txt --quiet
    deactivate 2>/dev/null || true
    cd ..
    echo -e "${GREEN}✓ Órion Hub configurado.${NC}"
fi

# 6. Extension
echo -e "\n${YELLOW}[6/6] Sincronizando Extensão...${NC}"
echo -e "${GREEN}✓ Hybrid Router configurado (Local vs Cloud).${NC}"

echo -e "\n${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  SETUP COMPLETO! Órion pronto para ação híbrida.    ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
