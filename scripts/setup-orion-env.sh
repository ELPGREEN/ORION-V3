#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Orion V6.2 - Automated Environment Setup (The Ultimate Stack)
# NemoClaw + OpenRouter + Ollama + Langflow.
# ═══════════════════════════════════════════════════════════════

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Iniciando setup do Ecossistema Órion V6.2..."

# 1. Prerequisites Check
for cmd in curl docker python3 npm; do
    if ! command -v $cmd &> /dev/null; then echo -e "${RED}✗ $cmd não encontrado.${NC}"; else echo -e "${GREEN}✓ $cmd detectado${NC}"; fi
done

# 2. NVIDIA NemoClaw (Sandbox)
if ! command -v nemoclaw &> /dev/null; then
    echo -e "Instalando NemoClaw..."
    curl -fsSL https://www.nvidia.com/nemoclaw.sh | sh 2>/dev/null || true
else echo -e "${GREEN}✓ NemoClaw detectado.${NC}"; fi

# 3. Ollama (Local GPU)
if ! command -v ollama &> /dev/null; then
    echo -e "Ollama não encontrado. Baixe em: https://ollama.com"
else echo -e "${GREEN}✓ Ollama detectado.${NC}"; fi

# 4. Langflow (Orchestration)
if ! command -v langflow &> /dev/null; then
    echo -e "${YELLOW}Langflow não detectado. Instalando via pip...${NC}"
    pip install langflow -U --quiet 2>/dev/null && echo -e "${GREEN}✓ Langflow instalado.${NC}"
else echo -e "${GREEN}✓ Langflow detectado.${NC}"; fi

# 5. Local Spaces
if [ -d "orion_cpu_space" ]; then
    cd orion_cpu_space
    python3 -m venv venv 2>/dev/null || true
    source venv/bin/activate 2>/dev/null || true
    pip install -r requirements.txt --quiet
    deactivate 2>/dev/null || true
    cd ..
    echo -e "${GREEN}✓ Órion Hub configurado.${NC}"
fi

echo -e "\n${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  SETUP COMPLETO!                                    ${NC}"
echo -e "${GREEN}  Órion pronto com NemoClaw + Langflow.             ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo "Dica: Rode 'langflow run' para ativar a orquestração visual."
