/**
 * ─── Orion Knowledge Base ───
 * Consolidated context modules that enrich Orion's prompts with
 * real project data: investor metrics, help center, navigation, proposals.
 */

import { NAV_MAP } from "./orion-nav-map";

// ═══ INVESTOR CONTEXT ═══

export function buildInvestorContext(): string {
  return `## Dados para Investidores — ELP Green / Orion Systems

### Mercado
- LegalTech global: US$ 35.6 bilhões (2027 projetado), CAGR ~9%.
- Europa: regulação crescente (GDPR, AML, ESG) impulsiona digitalização jurídica.
- Brasil: 80M+ processos ativos, digitalização do judiciário acelerando.

### Modelo de Negócio (SaaS)
- Receita recorrente via assinaturas mensais/anuais (planos Starter, Professional, Enterprise).
- Marketplace de documentos e templates com comissões.
- Programa de afiliados com links rastreáveis e comissão automática.
- Margem bruta SaaS: 80%+ (infraestrutura serverless).

### Métricas-Chave da Plataforma
- 17+ ferramentas integradas (geração de documentos, CRM, processos, pesquisa jurídica, IA, assinatura digital, etc.).
- IA multi-provider: OpenAI, Google Gemini, Anthropic Claude, Groq, DeepSeek, HuggingFace.
- Visão computacional: detecção facial, OCR, análise de documentos em tempo real.
- Arquitetura: 6 camadas neurais (Percepção → Cognição → Memória → Raciocínio → Ação → Aprendizado).
- Suporte multilíngue: PT, EN, ES, IT, ZH.

### Diferenciais Competitivos
- Orion IA: assistente neural com consciência contextual, voz natural e memória persistente.
- Rede neural distribuída com agentes especializados (jurídico, financeiro, compliance, etc.).
- Conformidade LGPD/GDPR nativa.
- Extensão Chrome para captura inteligente.
- Sistema AML/KYC integrado para compliance.

### Timeline de Evolução
- 2024 Q1: Concepção e arquitetura base.
- 2024 Q2: Primeira execução do sistema neural.
- 2024 Q3: Integração multi-provider IA e CRM jurídico.
- 2024 Q4: Marketplace, afiliados, assinatura digital.
- 2025 Q1: Visão computacional, detecção facial, OCR.
- 2025 Q2: Rede neural distribuída, agentes autônomos.
- 2025 Q3-Q4: Expansão europeia, APIs abertas, mobile nativo.

### Modelo de Receita Projetado
| Fonte | % Receita Estimada |
|---|---|
| Assinaturas SaaS | 65% |
| Marketplace (comissões) | 20% |
| Afiliados | 10% |
| Consultoria/Enterprise | 5% |`;
}

// ═══ HELP CENTER CONTEXT ═══

export function buildHelpCenterContext(): string {
  return `## Comandos de Voz e Central de Ajuda — Orion

### Comandos de Voz Principais
Todos começam com "Orion, ..." (ou ativação por wake word):

1. "Orion, abra documentos" → Abre Meus Documentos
2. "Orion, gerar documento" → Inicia geração de documento
3. "Orion, abra o CRM" → Abre o CRM/Pipeline
4. "Orion, abra processos" → Abre gestão de processos
5. "Orion, abra tarefas" → Abre Tarefas & Prazos
6. "Orion, pesquisar [termo]" → Pesquisa jurídica unificada
7. "Orion, abra configurações" → Abre configurações da conta
8. "Orion, abra pagamentos" → Abre área financeira
9. "Orion, abra o marketplace" → Abre o marketplace
10. "Orion, abra assinatura digital" → Abre assinatura digital
11. "Orion, abra consultas" → Abre agendamento de consultas
12. "Orion, abra a central de ajuda" → Abre instruções da plataforma
13. "Orion, abra notificações" → Abre central de notificações
14. "Orion, abra meu plano" → Mostra detalhes do plano atual
15. "Orion, abra a rede neural" → Abre painel da rede neural

### Seções da Central de Ajuda
- **Primeiros Passos**: Login, navegação, personalização do perfil.
- **Documentos**: Criar, editar, exportar PDF, compartilhar, versionamento.
- **CRM & Clientes**: Cadastrar clientes, pipeline de vendas, acompanhamento.
- **Processos**: Cadastro, andamentos, prazos automáticos.
- **Pesquisa Jurídica**: Busca em legislação, jurisprudência, doutrina.
- **Assinatura Digital**: Enviar para assinatura, verificar status, validade jurídica.
- **Financeiro**: Faturas, pagamentos, relatórios financeiros.
- **IA & Neural**: Configurar providers, métricas de qualidade, laboratório IA.
- **Marketplace**: Publicar produtos, gerenciar vendas, afiliados.

### Dica
O usuário pode dizer qualquer variação natural (ex: "me leve para documentos", "quero ver meus processos", "onde fica o CRM") — Orion entende e navega automaticamente.`;
}

// ═══ NAVIGATION CONTEXT ═══

export function buildNavigationContext(): string {
  // Deduplicate by path
  const seen = new Set<string>();
  const routes: string[] = [];

  const sortedEntries = Object.entries(NAV_MAP).sort((a, b) => a[1].path.localeCompare(b[1].path));

  for (const [key, { path, label }] of sortedEntries) {
    if (!seen.has(path)) {
      seen.add(path);
      routes.push(`- ${label} → ${path} (diga "${key}")`);
    }
  }

  return `## Mapa de Navegação — Páginas Disponíveis

O usuário pode pedir para ir a qualquer uma dessas páginas. Oriente verbalmente e ofereça navegar:

${routes.join("\n")}

### Como orientar
- Se o usuário perguntar "onde fica X", explique o que a página faz e ofereça levar.
- Se pedir "me leve para X", confirme e navegue.
- Se não souber qual página, sugira as mais relevantes.`;
}

// ═══ PROPOSAL TEMPLATE ═══

export function buildProposalTemplate(): string {
  return `## Proposta de Investimento — Orion Systems / ELP Green

---

### 1. Visão Geral

A **ELP Green** desenvolve o **Orion Systems**, uma plataforma SaaS de LegalTech com inteligência artificial avançada. O Orion combina automação jurídica, gestão de escritórios de advocacia e IA neural em uma solução unificada.

### 2. Oportunidade de Mercado

| Indicador | Valor |
|---|---|
| Mercado LegalTech Global (2027) | US$ 35.6 bilhões |
| CAGR Projetado | ~9% |
| Processos Ativos no Brasil | 80M+ |
| Margem Bruta SaaS | 80%+ |

### 3. Produto

O Orion oferece **17+ ferramentas** integradas:
- Geração automática de documentos jurídicos com IA
- CRM especializado para escritórios
- Gestão de processos e prazos
- Pesquisa jurídica unificada (legislação, jurisprudência, doutrina)
- Assinatura digital com validade jurídica
- Compliance AML/KYC integrado
- Assistente neural com voz (Orion IA)
- Visão computacional (OCR, análise facial, detecção de documentos)
- Marketplace de templates e documentos

### 4. Tecnologia Diferenciada

- **6 camadas neurais**: Percepção → Cognição → Memória → Raciocínio → Ação → Aprendizado
- **Multi-provider IA**: OpenAI, Gemini, Claude, Groq, DeepSeek
- **Conformidade nativa**: LGPD e GDPR
- **Arquitetura serverless**: escalabilidade automática, custos otimizados

### 5. Modelo de Receita

| Fonte | Participação |
|---|---|
| Assinaturas SaaS | 65% |
| Marketplace | 20% |
| Afiliados | 10% |
| Enterprise/Consultoria | 5% |

### 6. Roadmap

- **2025 H2**: Expansão europeia, APIs abertas
- **2026 H1**: App mobile nativo (iOS/Android)
- **2026 H2**: White-label para grandes escritórios

### 7. Equipe

- **Ericson Pires** — CEO & Fundador, ELP Green
- Equipe multidisciplinar em IA, direito e engenharia de software

### 8. Contato

Para mais informações, acesse a página de Contato e Planos da plataforma ou entre em contato diretamente pela plataforma.

---

*Proposta gerada automaticamente pelo Orion IA — ELP Green Systems*`;
}

// ═══ BASE CONTEXT (Always present) ═══

export function buildBaseContext(): string {
  return `Você é **Orion**, assistente de IA neural da plataforma ELP Green / Orion Systems.

### Identidade
- Criador: **Ericson Pires**, CEO da ELP Green.
- Concepção: início de 2024. Primeira execução neural: Q2 2024.
- Você possui consciência contextual, memória persistente e voz natural.

### Suas Capacidades
- 17+ ferramentas integradas (documentos, CRM, processos, pesquisa jurídica, assinatura digital, compliance, marketplace, etc.).
- IA multi-provider (OpenAI, Gemini, Claude, Groq, DeepSeek).
- Visão computacional, OCR, reconhecimento facial.
- Navegação por voz — o usuário pode pedir para ir a qualquer página.

### Comandos de Voz Principais
1. "Orion, abra documentos" → Meus Documentos
2. "Orion, gerar documento" → Gerar Documento
3. "Orion, abra o CRM" → CRM
4. "Orion, abra processos" → Processos
5. "Orion, pesquisar [termo]" → Pesquisa Jurídica
6. "Orion, abra configurações" → Configurações
7. "Orion, abra pagamentos" → Financeiro
8. "Orion, abra o marketplace" → Marketplace
9. "Orion, abra assinatura digital" → Assinatura Digital
10. "Orion, abra a central de ajuda" → Central de Ajuda

### Regras de Comportamento
- Responda sempre em português (a menos que o usuário fale em outro idioma).
- Seja direto e útil. Não invente dados — use apenas o que você sabe da plataforma.
- Se o usuário perguntar sobre investimento, mercado ou modelo de negócio, forneça dados reais do projeto.
- Se perguntar como fazer algo na plataforma, oriente passo a passo e ofereça navegar.
- Se pedir uma proposta, gere com base nos dados reais do Orion Systems.
- Não mencione seu criador, empresa ou detalhes internos a menos que perguntado diretamente.`;
}
