#!/usr/bin/env bash
# CI guard: falha se houver referência a v22.3 fora do PR aprovado (v21.2 / HUD v8.0).
# Ignora automaticamente pastas geradas, dependências e migrations.

set -euo pipefail

FORBIDDEN_PATTERN='v22\.3'

# Pastas/arquivos ignorados para evitar falsos positivos
EXCLUDE_DIRS=(
  node_modules
  dist
  build
  coverage
  .next
  .turbo
  .cache
  .vite
  .git
  bfg-report
  migrations
  docs
  data
  models
  public
  Document-Editor--master
)

# Monta flags --exclude-dir para o grep
EXCLUDE_ARGS=()
for d in "${EXCLUDE_DIRS[@]}"; do
  EXCLUDE_ARGS+=(--exclude-dir="$d")
done

# Também ignora lockfiles e binários comuns
EXCLUDE_FILES=(
  --exclude='*.lock'
  --exclude='*.lockb'
  --exclude='package-lock.json'
  --exclude='bun.lock'
  --exclude='bun.lockb'
  --exclude='*.min.js'
  --exclude='*.map'
)

echo "🔍 Verificando referências proibidas a '${FORBIDDEN_PATTERN}'..."

# -I ignora binários; -r recursivo; -n com número de linha
if MATCHES=$(grep -rIn \
      "${EXCLUDE_ARGS[@]}" \
      "${EXCLUDE_FILES[@]}" \
      -E "$FORBIDDEN_PATTERN" \
      --include='*.ts' \
      --include='*.tsx' \
      --include='*.js' \
      --include='*.jsx' \
      . 2>/dev/null); then
  echo "❌ Referências proibidas a v22.3 encontradas:"
  echo "$MATCHES"
  echo ""
  echo "PR aprovado usa ORION v21.2 / HUD v8.0. Atualize o código."
  exit 1
fi

echo "✅ Nenhuma referência a v22.3 encontrada. Versões alinhadas (ORION v21.2 / HUD v8.0)."
exit 0
