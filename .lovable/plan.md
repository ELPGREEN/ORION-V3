

# Auditoria Completa — Páginas Públicas vs Serviços Orion

## Diagnóstico

Analisei todas as páginas públicas, navegação, traduções e conteúdo. O Orion se posiciona como **plataforma SaaS de IA** para 4 perfis: Advogados, Escritórios/Empresas, Produtores Digitais e Afiliados.

### Páginas COERENTES (OK)

| Página | Status | Observação |
|--------|--------|------------|
| **Index (Home)** | OK | Hero "IA Empresarial", WhoIsItFor com 4 perfis, WhyOrion, Comparison — tudo alinhado como plataforma SaaS |
| **Clientes** | OK | 4 categorias corretas com benefícios específicos por perfil |
| **Contato** | OK | 4 planos SaaS (Starter grátis → Enterprise R$497) coerentes |
| **Plataforma** | OK | Mostra utilidades da IA (Visão, Raciocínio, Docs, Pesquisa, Multi-idioma) |
| **Publicações/Blog** | OK | Conteúdo editorial neutro |
| **Vitrine Afiliado** | OK | Página pública de vitrine para afiliados |

### PROBLEMA GRAVE: Página "Serviços" (/servicos)

A página **Serviços** é inteiramente sobre um **escritório de advocacia tradicional** — Direito Penal, Internacional, Direitos Humanos, Trabalhista, Empresarial, Civil. Inclui:
- "Formação em Harvard e UC Berkeley"
- "Atuação em 8+ países"
- "AGENDAR CONSULTA" com link para WhatsApp pessoal
- "CONHECER O ESCRITÓRIO"

Isso é **100% incoerente** com o resto do site que vende o Orion como plataforma de IA SaaS. Confunde o visitante — parece site de advogado, não de tecnologia.

### PROBLEMA NA NAVEGAÇÃO (Header)

O menu "Serviços" no Header tem:
- **"Áreas Jurídicas"** → `/servicos` (conteúdo de escritório de advocacia)
- "Consultoria IA" → `/plataforma#ia`
- "Documentação" → `/docs/rede-neural`

Mistura serviço de advocacia com produto de tecnologia.

### PROBLEMA: Página "Serviços" requer AUTH

`/servicos` está atrás de `AuthGuard` — uma página que deveria ser vitrine pública está bloqueada para visitantes não logados.

---

## Plano de Correção

### 1. Reescrever a página Serviços (/servicos)
Transformar de "escritório de advocacia" para **"Serviços da Plataforma Orion"** com seções por perfil:
- **Para Advogados**: IA jurídica, geração de petições, pesquisa jurisprudencial, gestão de processos
- **Para Escritórios & Empresas**: CRM, gestão de equipe, faturamento, dashboard, multi-usuários
- **Para Produtores Digitais**: Loja própria, checkout, gestão de produtos, dashboard de vendas
- **Para Afiliados**: Links rastreáveis, comissões automáticas, marketplace
- CTA linkando para `/contato` (planos) em vez de WhatsApp pessoal

### 2. Atualizar navegação (Header)
Trocar o submenu "Serviços":
- **"Para Advogados"** → `/clientes?perfil=advogados`
- **"Para Empresas"** → `/clientes?perfil=escritorios`
- **"Para Produtores"** → `/clientes?perfil=produtores`
- **"Todos os Serviços"** → `/servicos` (nova página reescrita)

### 3. Tornar /servicos PÚBLICA
Remover `AuthGuard` de `/servicos` — é página de vitrine, deve ser acessível sem login.

### 4. Atualizar traduções (pt.json)
Reescrever a seção `services` do i18n para refletir os serviços SaaS em vez de áreas de atuação jurídica de um escritório.

### 5. Mover conteúdo jurídico pessoal
O conteúdo sobre o escritório de advocacia (Harvard, Berkeley, áreas de atuação jurídica) já existe na página `/advogado/:advogadoId` — não precisa estar duplicado em `/servicos`.

---

### Resumo das mudanças

| Arquivo | Ação |
|---------|------|
| `src/pages/Servicos.tsx` | Reescrever completamente — serviços SaaS por perfil |
| `src/components/layout/Header.tsx` | Atualizar submenu Serviços |
| `src/App.tsx` | Remover AuthGuard de `/servicos` |
| `src/i18n/pt.json` | Reescrever seção `services` |
| `src/i18n/en.json` | Atualizar tradução EN correspondente |

