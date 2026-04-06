

# Plano: Enriquecer o Conhecimento do Orion

## Resumo

O Orion cai num prompt genérico para qualquer pergunta fora de identidade/capacidades/Jarvis. Vamos criar um módulo de conhecimento consolidado e expandir a detecção de intenção nos dois pontos do `orion-ai-client.ts` (linhas ~460 e ~636).

## Arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/neural/orion-knowledge-base.ts` | **Criar** |
| `src/lib/neural/orion-ai-client.ts` | Editar linhas ~460-474 e ~636-650 |
| `src/lib/neural/orion-tool-executor.ts` | Adicionar tool `generate_proposal` |
| `src/lib/neural/index.ts` | Adicionar export |

## Detalhes

### 1. Novo `orion-knowledge-base.ts`

Quatro funções exportadas:

- **`buildInvestorContext()`** — Texto compacto com: mercado LegalTech US$35.6B, margem SaaS 80%+, 17+ ferramentas, modelo de receita (assinaturas + marketplace + afiliados), timeline de evolução, diferenciais competitivos. Dados extraídos estaticamente do que existe em `InvestorTools.tsx`.

- **`buildHelpCenterContext()`** — Top 15 comandos de voz formatados ("Diga 'Orion, abra documentos' para ir a Meus Documentos"), seções da Central de Ajuda resumidas.

- **`buildNavigationContext()`** — Importa `NAV_MAP` de `orion-nav-map.ts` e formata como lista: "Documentos → /dashboard/documentos", "CRM → /dashboard/crm", etc. para o Orion orientar verbalmente.

- **`buildProposalTemplate()`** — Template de proposta de investimento com placeholders preenchidos pelos dados da ELP (Orion Systems, métricas, modelo SaaS, timeline, diferenciais).

- **`buildBaseContext()`** — Contexto mínimo sempre presente: criador (Ericson Pires, CEO ELP Green), data de concepção (2024), top 10 comandos, orientação para usar módulos especializados quando perguntado.

### 2. Expandir detecção em `orion-ai-client.ts`

Nos dois blocos de context-building (linhas ~460 e ~636), após os 3 checks existentes e antes do fallback genérico, adicionar:

```typescript
const isInvestorQuestion = /investidor|investimento|mercado|saas|modelo.de.neg[oó]cio|receita|margem|oportunidade|pitch/i.test(question);
const isProjectQuestion = /projeto|plataforma|orion.*sistema|ferramenta|evolu[çc][aã]o|timeline|desenvolvimento/i.test(question);
const isHelpQuestion = /comando|ajuda|como.faz|onde.fica|central|instru[çc][aã]o|tutorial|orienta[çc][aã]o/i.test(question);
const isProposalQuestion = /proposta|proposal|apresenta[çc][aã]o|pitch.*invest|investir/i.test(question);
const isNavigationGuide = /onde\s+(fica|est[aá]|acess)|como\s+(chego|acesso|fa[çc]o\s+para)|me\s+lev|navegar|ir\s+(para|pra)|encontrar|acessar/i.test(question);
```

Cada um injeta o contexto correspondente do knowledge-base. O fallback genérico passa a usar `buildBaseContext()` em vez do texto hardcoded.

### 3. Tool `generate_proposal` no `orion-tool-executor.ts`

Nova entrada no array de tools com:
- **Regex**: `/cri(?:ar?|e)\s+(?:uma?\s+)?proposta|ger(?:ar?|e)\s+(?:uma?\s+)?proposta|proposta.*invest/i`
- **Ação**: Chama `buildProposalTemplate()` do knowledge-base, retorna texto formatado com visão geral, métricas, modelo de receita, timeline e call-to-action.

### 4. Export em `index.ts`

Adicionar `export * from "./orion-knowledge-base";` na seção "Orion Core Systems".

