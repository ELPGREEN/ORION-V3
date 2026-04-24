#!/usr/bin/env bash
# Verify Vercel + GitHub Actions setup
# Usage: bash scripts/verify-vercel-setup.sh [VERCEL_TOKEN]
#
# Checks:
#   1. Vercel CLI installed
#   2. Project linked (.vercel/project.json exists with orgId/projectId)
#   3. VERCEL_TOKEN valid (whoami)
#   4. Environment variables present on Vercel (production + preview)
#   5. Required app variables exist (VITE_SUPABASE_*)
#   6. Local build can run with pulled env vars

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
info() { echo -e "${BLUE}ℹ${NC} $1"; }

echo "════════════════════════════════════════════"
echo "  Vercel + GitHub Actions — Setup Check"
echo "════════════════════════════════════════════"
echo ""

TOKEN="${1:-$VERCEL_TOKEN}"
REQUIRED_VARS=("VITE_SUPABASE_URL" "VITE_SUPABASE_PUBLISHABLE_KEY" "VITE_SUPABASE_PROJECT_ID")
ERRORS=0

# 1. CLI
info "1/6 — Vercel CLI"
if command -v vercel &>/dev/null; then
  ok "vercel CLI: $(vercel --version)"
else
  fail "vercel CLI não instalado. Rode: npm i -g vercel"
  exit 1
fi

# 2. Project link
info "2/6 — Projeto vinculado"
if [[ -f ".vercel/project.json" ]]; then
  ORG_ID=$(grep -o '"orgId":\s*"[^"]*"' .vercel/project.json | cut -d'"' -f4)
  PROJECT_ID=$(grep -o '"projectId":\s*"[^"]*"' .vercel/project.json | cut -d'"' -f4)
  if [[ -n "$ORG_ID" && -n "$PROJECT_ID" ]]; then
    ok "orgId:     $ORG_ID"
    ok "projectId: $PROJECT_ID"
    echo ""
    info "👉 Use estes valores como secrets no GitHub:"
    echo "   VERCEL_ORG_ID     = $ORG_ID"
    echo "   VERCEL_PROJECT_ID = $PROJECT_ID"
  else
    fail ".vercel/project.json malformado"
    ((ERRORS++))
  fi
else
  fail "Projeto não vinculado. Rode: vercel link"
  ((ERRORS++))
fi

# 3. Token
info "3/6 — VERCEL_TOKEN"
if [[ -z "$TOKEN" ]]; then
  warn "Token não fornecido. Pulando checks de API."
  warn "Uso: bash scripts/verify-vercel-setup.sh SEU_TOKEN"
  warn "     ou: export VERCEL_TOKEN=xxx && bash scripts/verify-vercel-setup.sh"
else
  WHOAMI=$(vercel whoami --token="$TOKEN" 2>&1 || echo "FAIL")
  if [[ "$WHOAMI" == *"FAIL"* ]] || [[ "$WHOAMI" == *"Error"* ]]; then
    fail "Token inválido ou expirado"
    ((ERRORS++))
  else
    ok "Autenticado como: $WHOAMI"
  fi
fi

# 4. Env vars (production)
info "4/6 — Variáveis de ambiente (production)"
if [[ -n "$TOKEN" ]]; then
  ENV_PROD=$(vercel env ls production --token="$TOKEN" 2>&1 || echo "FAIL")
  if [[ "$ENV_PROD" == *"FAIL"* ]]; then
    fail "Não foi possível listar env vars production"
    ((ERRORS++))
  else
    echo "$ENV_PROD" | tail -n +3
    for var in "${REQUIRED_VARS[@]}"; do
      if echo "$ENV_PROD" | grep -q "$var"; then
        ok "[prod] $var presente"
      else
        fail "[prod] $var FALTANDO — adicione em: Vercel → Settings → Environment Variables"
        ((ERRORS++))
      fi
    done
  fi
fi

# 5. Env vars (preview)
info "5/6 — Variáveis de ambiente (preview)"
if [[ -n "$TOKEN" ]]; then
  ENV_PREV=$(vercel env ls preview --token="$TOKEN" 2>&1 || echo "FAIL")
  if [[ "$ENV_PREV" != *"FAIL"* ]]; then
    for var in "${REQUIRED_VARS[@]}"; do
      if echo "$ENV_PREV" | grep -q "$var"; then
        ok "[preview] $var presente"
      else
        warn "[preview] $var faltando (preview deploys vão falhar)"
      fi
    done
  fi
fi

# 6. Pull + build dry-run
info "6/6 — Pull env + build local"
if [[ -n "$TOKEN" ]]; then
  if vercel pull --yes --environment=production --token="$TOKEN" >/tmp/vercel-pull.log 2>&1; then
    ok "vercel pull OK (.vercel/.env.production.local gerado)"
    if [[ -f ".vercel/.env.production.local" ]]; then
      INJECTED=$(grep -c "^VITE_" .vercel/.env.production.local || echo 0)
      ok "$INJECTED variáveis VITE_* injetadas no build"
      for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" .vercel/.env.production.local; then
          ok "build vai receber: $var"
        else
          fail "build NÃO vai receber: $var"
          ((ERRORS++))
        fi
      done
    fi
  else
    fail "vercel pull falhou. Veja /tmp/vercel-pull.log"
    ((ERRORS++))
  fi
fi

echo ""
echo "════════════════════════════════════════════"
if [[ $ERRORS -eq 0 ]]; then
  echo -e "${GREEN}✓ Setup OK — pode fazer push pra main${NC}"
  exit 0
else
  echo -e "${RED}✗ $ERRORS problema(s) — corrija antes de fazer push${NC}"
  exit 1
fi
