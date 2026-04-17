#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Orion V3 - Jules Auto-Evolution Setup Script
# Run this BEFORE starting Jules tasks
# ═══════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════════════"
echo "  Orion V3 - Jules Auto-Evolution Setup"
echo "═══════════════════════════════════════════════════"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verify we're in the right directory
echo ""
echo -e "${YELLOW}[1/5] Verificando diretório...${NC}"
if [ -d ".git" ]; then
    echo -e "${GREEN}✓${NC} Repositório Orion V3 detectado"
else
    echo -e "${RED}✗${NC} ERRO: Não está no diretório do Orion V3"
    echo "   Navegue para o diretório do repositório e execute novamente"
    exit 1
fi

# 2. Configure git user
echo ""
echo -e "${YELLOW}[2/5] Configurando git...${NC}"
git config user.name "Jules-Auto-Evolution" 2>/dev/null || true
git config user.email "jules@orion-ai.dev" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Git configurado"

# 3. Ensure on main branch
echo ""
echo -e "${YELLOW}[3/5] Sincronizando com main...${NC}"
git checkout main 2>/dev/null || echo "  (Already on main)"
git pull origin main --quiet 2>/dev/null && echo -e "${GREEN}✓${NC} Main atualizado" || echo -e "${YELLOW}!${NC} Pull skipped (pode não ser necessário)"

# 4. Check for existing Jules branches
echo ""
echo -e "${YELLOW}[4/5] Verificando branches...${NC}"
JULES_BRANCHES=$(git branch -r | grep -c "jules" || echo "0")
if [ "$JULES_BRANCHES" -gt 0 ]; then
    echo -e "${YELLOW}!${NC} Existem $JULES_BRANCHES branches Jules anteriores"
    echo "   Considere limpar branches antigas após merge"
fi

# 5. Create starter branch
echo ""
echo -e "${YELLOW}[5/5] Criando branch de trabalho...${NC}"
TASK_BRANCH="fix/jules-task-$(date +%s)"
git checkout -b "$TASK_BRANCH" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Branch criada: $TASK_BRANCH"

echo ""
echo "═══════════════════════════════════════════════════"
echo -e "${GREEN}SETUP COMPLETO!${NC}"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Próximos passos para o Jules:"
echo ""
echo "1. Fazer modificações no código"
echo ""
echo "2. Commitar:"
echo "   git add ."
echo "   git commit -m 'descrição das mudanças'"
echo ""
echo "3. Push:"
echo "   git push -u origin $TASK_BRANCH"
echo ""
echo "4. Criar PR:"
echo "   gh pr create --title 'Título' --body 'Descrição'"
echo ""
echo "═══════════════════════════════════════════════════"
