# Orion V3 - Jules Auto-Evolution Setup Guide

## Problema Identificado

O Jules tenta clonar uma branch que não existe:
```
fatal: Remote branch fix/jules-sec_xss-1776402803867 not found in upstream origin
```

## Solução: Configurar Jules para usar main + criar branch local

### Opção 1: Configurar via LOVABLE_PROMPT (Recomendado)

Quando iniciar uma task na Lovable, use este prompt:

```
IMPORTANTE: Configure o git antes de clonar:

1. Clone a branch main (NÃO tente criar branch antes):
   git clone https://github.com/ELPGREEN/ORION-V3 -b main /app

2. Configure git para permitir push:
   git config --global user.name 'Seu Nome'
   git config --global user.email 'seu-email@exemplo.com'

3. Crie uma nova branch SOMENTE depois de clonar:
   cd /app
   git checkout -b fix/nome-da-task

4. Faça suas modificações

5. Commit e push:
   git add .
   git commit -m "descrição das mudanças"
   git push -u origin fix/nome-da-task

6. O PR será criado pela Lovable automaticamente se configurado.
```

### Opção 2: GitHub Actions Workflow (para PRs automáticos)

Criar `.github/workflows/jules-pr.yml`:

```yaml
name: Create PR from Jules

on:
  workflow_dispatch:
    inputs:
      branch_name:
        description: 'Branch name'
        required: true
        type: string
      title:
        description: 'PR Title'
        required: true
        type: string
      body:
        description: 'PR Description'
        required: false
        type: string

jobs:
  create-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Create branch
        run: |
          git checkout -b ${{ inputs.branch_name }}

      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          branch: ${{ inputs.branch_name }}
          title: ${{ inputs.title }}
          body: ${{ inputs.body }}
          base: main
```

### Opção 3: Script de Setup Automático

Criar `jules-setup.sh` na raiz:

```bash
#!/bin/bash
# Jules Auto-Evolution Setup Script

echo "=== Orion V3 - Jules Setup ==="

# 1. Configurar git
git config --global user.name "Jules-Auto-Evolution"
git config --global user.email "jules@orion-ai.dev"

# 2. Garantir que está na main
git checkout main
git pull origin main

# 3. Criar branch de trabalho
BRANCH_NAME="fix/jules-$(date +%s)"
git checkout -b $BRANCH_NAME

echo "Branch criada: $BRANCH_NAME"
echo "Agora faça suas modificações e commit."
```

### Opção 4: Configurar Remote (para Jules criar branches)

O Jules precisa ter permissão para criar branches. Configure no GitHub:

1. Vá em Settings → Developer settings → Personal access tokens
2. Crie um token com permissão `repo` (Full control)
3. Dê o token ao Jules/Lovable

---

## Configuração Recomendada para Lovable

Quando iniciar uma task na Lovable, cole esta instrução ANTES de qualquer outro comando:

```
SETUP ANTES DE CLONAR:
========================
Este repositório usa a branch main como base.

1. Clone: git clone https://github.com/ELPGREEN/ORION-V3 -b main /app
2. NÃO tente criar branches antes de clonar
3. Configure git: git config user.name "seu-nome"
4. Só depois de clonado: git checkout -b fix/nome-task
5. Modifique, commit, push
6. PR será criado automaticamente

ARQUIVO DE REFERÊNCIA:
=====================
Verifique todas as integrações no arquivo: LOVABLE_VERIFY_PROMPT.md
```

---

## Verificação Rápida

Teste se o Jules consegue clonar:

```bash
git clone https://github.com/ELPGREEN/ORION-V3 -b main /tmp/test-orion
cd /tmp/test-orion
git checkout -b test-branch
echo "Funciona!" > test.txt
git add . && git commit -m "test" && git push -u origin test-branch
```

---

## Se o Problema Persistir

1. **Verifique se o token da Lovable tem permissão de push**
2. **Confirme se o repositório não está protected**
3. **Tente criar uma branch manualmente primeiro**

Settings → Branches → desproteger `main` temporariamente se necessário.

---

## Resumo

| Problema | Solução |
|----------|---------|
| Branch não existe | Clonar `main` primeiro |
| Jules não consegue criar branch | Criar branch APÓS clone |
| PR não criado | Usar workflow ou Lovable template |

**A chave é: CLONAR PRIMEIRO, CRIAR BRANCH DEPOIS**
