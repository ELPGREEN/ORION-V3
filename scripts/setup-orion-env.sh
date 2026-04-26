#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Orion V5.5 - Automated Environment Setup
# Automates installation of dependencies for local AI processing.
# ═══════════════════════════════════════════════════════════════

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Iniciando setup do ambiente Orion (Neurocore)..."

# 1. Check Prerequisites
echo -e "\n${YELLOW}[1/4] Verificando pré-requisitos...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker não encontrado. Por favor, instale o Docker primeiro.${NC}"
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

# 2. Setup orion_cpu_space
echo -e "\n${YELLOW}[2/4] Configurando orion_cpu_space (Cérebro Local)...${NC}"
if [ -d "orion_cpu_space" ]; then
    cd orion_cpu_space
    if [ -f "requirements.txt" ]; then
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt --quiet
        deactivate
        echo -e "${GREEN}✓ Dependências do CPU Space instaladas${NC}"
    fi
    cd ..
fi

# 3. Setup orion_voice_space
echo -e "\n${YELLOW}[3/4] Configurando orion_voice_space (Processamento de Voz)...${NC}"
if [ -d "orion_voice_space" ]; then
    cd orion_voice_space
    if [ -f "Dockerfile" ]; then
        echo "Construindo imagem Docker para processamento de voz..."
        docker build -t orion-voice-space . --quiet
        echo -e "${GREEN}✓ Imagem orion-voice-space construída${NC}"
    fi
    cd ..
fi

# 4. Extension Setup
echo -e "\n${YELLOW}[4/4] Preparando extensão para o navegador...${NC}"
if [ -d "extension" ]; then
    cd extension
    npm install --quiet || echo "npm install falhou ou não necessário"
    echo -e "${GREEN}✓ Extensão pronta para carregamento (load unpacked)${NC}"
    cd ..
fi

echo -e "\n${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  SETUP COMPLETO! O Órion está pronto para agir.      ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
