

# Plano: Painel Completo do Advogado + Integração Advogado ↔ Cliente + Orion IA

## Estado Atual

O sistema JA possui bastante infraestrutura para advogados, mas espalhada e sem painel dedicado:

- **DashboardHome** (default para advogado): stats genéricos (docs, processos, clientes, conversas), ações rápidas judiciais/extrajudiciais, navegação admin
- **ChatHumano**: chat em tempo real entre advogado e cliente (conversations + messages)
- **ClientesPage/CRMClientes**: CRUD de clientes com CRM Pipeline + Contatos
- **ClientFolderDialog**: pasta do cliente com tabs (info, documentos, chat) -- ja robusto (837 linhas)
- **ProcessosPage**: CRUD completo de processos (1755 linhas)
- **GerarDocumento**: geração de peças jurídicas com IA
- **PesquisaUnificada**: pesquisa jurisprudencial com RAG
- **ClienteDashboard**: painel do cliente (1448 linhas) com docs, assinaturas, processos, consultas
- **PortalCliente**: visão resumida dos processos/docs do cliente

**O que falta:**
1. Advogado NAO tem painel dedicado no DashboardRouter (cai no `default: DashboardHome`)
2. Falta visao unificada: pastas de clientes + chat + processos + prazos num painel coeso
3. Orion nao auxilia o advogado no dia-a-dia (análise de prazos, resumo de caso, sugestao de estratégia)
4. Cliente nao recebe updates automáticos do advogado
5. Falta timeline de atividades por caso/cliente

---

## Arquitetura do Fluxo

```text
┌──────────────────────────────────────────────────────┐
│                  ADVOGADO                             │
│                                                      │
│  ┌─────────┐  ┌───────────┐  ┌──────────────────┐   │
│  │ Pastas  │  │  Chat     │  │  Processos/Prazos│   │
│  │ Cliente │  │  Ao Vivo  │  │  Documentos      │   │
│  └────┬────┘  └─────┬─────┘  └────────┬─────────┘   │
│       │             │                  │             │
│       └─────────────┼──────────────────┘             │
│                     │                                │
│              ┌──────▼──────┐                         │
│              │  ORION IA   │                         │
│              │ Resumo Caso │                         │
│              │ Prazos IA   │                         │
│              │ Estratégia  │                         │
│              │ Minutas     │                         │
│              └──────┬──────┘                         │
│                     │                                │
│              ┌──────▼──────┐                         │
│              │   CLIENTE   │                         │
│              │ Portal      │                         │
│              │ Notificação │                         │
│              │ Chat        │                         │
│              └─────────────┘                         │
└──────────────────────────────────────────────────────┘
```

---

## Etapas de Implementação

### 1. Criar `AdvogadoDashboard.tsx` — Painel Dedicado

Novo componente com visão executiva:
- **Header**: Saudação + stats (clientes ativos, processos em andamento, prazos da semana, mensagens nao lidas)
- **Seção "Meus Clientes"**: Grid compacto dos clientes ativos com badges de status, ultimo contato, click abre a pasta
- **Seção "Prazos Urgentes"**: Lista dos proximos 7 dias com cores (vermelho = vence hoje, amarelo = 3 dias)
- **Seção "Mensagens Recentes"**: Ultimas mensagens do chat com clientes (preview + unread count)
- **Seção "Atividade Recente"**: Timeline de atividades (novos docs, movimentações, mensagens)
- **Widget "Orion Insights"**: Resumo IA do dia (prazos, pendências, sugestões)
- **Navegação rápida**: Gerar Documento, Pesquisa, CRM, Processos, Chat, Consultas

Registrar no `DashboardRouter`:
```
case "advogado": return <AdvogadoDashboard />;
```

### 2. Expandir Pasta do Cliente (ClientFolderDialog)

A pasta ja tem tabs info/documentos. Adicionar:
- **Tab "Processos"**: Lista de processos vinculados ao cliente (via `processos.client_profile_id`)
- **Tab "Timeline"**: Histórico cronológico de todas interações (mensagens, docs, movimentações, consultas)
- **Tab "Orion"**: Botão "Resumo do Caso" que gera resumo IA completo do cliente (docs + processos + chat)

### 3. Chat Advogado ↔ Cliente Aprimorado

O ChatHumano ja funciona. Melhorias:
- **Indicador de presença** (ja tem `useLawyerPresence` -- garantir funcionalidade)
- **Botão "Orion: Redigir Resposta"**: Sugere resposta ao advogado baseado no contexto da conversa
- **Botão "Resumir Conversa"**: Orion resume toda a conversa em 3-5 pontos
- **Anexo de documento**: Permitir enviar arquivos no chat (upload para Storage)
- **Notificação push**: Ao enviar mensagem, criar `notificacoes` para o destinatário

### 4. Integração Orion IA para Advogado

Nova edge function `orion-advogado-ai` com actions:
- `case_summary`: Resumo completo de um caso (agrega processos, docs, chat, consultas de um cliente)
- `deadline_analysis`: Analisa prazos processuais e sugere prioridades
- `draft_response`: Sugere resposta para mensagem de cliente
- `strategy_suggestion`: Sugere estratégia jurídica baseada nos dados do caso
- `document_review`: Revisa documento e sugere melhorias

Usa Gemini free API (7-key rotation), stack existente.

### 5. Sistema de Notificações Advogado ↔ Cliente

Usar tabela `notificacoes` existente para:
- Advogado adiciona documento → notifica cliente
- Advogado muda status do processo → notifica cliente
- Cliente envia mensagem → notifica advogado
- Prazo se aproxima (3 dias) → notifica advogado
- Consulta agendada → notifica ambos

### 6. Dashboard do Cliente — Melhorias de Conexão

Atualizar `ClienteDashboard.tsx`:
- Mostrar nome e foto do advogado vinculado
- Badge de "advogado online" (presença)
- Botão direto "Enviar Mensagem" que abre chat com o advogado
- Seção "Atualizações" mostrando ações recentes do advogado no caso

---

## Detalhes Técnicos

### Arquivos a criar:
1. `src/pages/dashboard/AdvogadoDashboard.tsx` — painel dedicado do advogado
2. `src/components/dashboard/OrionAdvogadoInsights.tsx` — widget de insights IA
3. `supabase/functions/orion-advogado-ai/index.ts` — edge function IA do advogado

### Arquivos a modificar:
1. `src/pages/dashboard/DashboardRouter.tsx` — adicionar case "advogado"
2. `src/components/dashboard/clients/ClientFolderDialog.tsx` — novas tabs (processos, timeline, orion)
3. `src/pages/dashboard/ChatHumano.tsx` — botoes Orion (redigir resposta, resumir)
4. `src/pages/dashboard/ClienteDashboard.tsx` — info do advogado + updates

### Database:
- Nenhuma migration necessaria — todas as tabelas ja existem (client_profiles, processos, chat_conversations, chat_messages, notificacoes, documents, consultas)
- Relacao advogado-cliente ja via `client_profiles.advogado_id` e `chat_conversations.advogado_id`

### Edge function actions:
| Action | Input | Output |
|--------|-------|--------|
| `case_summary` | client_profile_id | Resumo estruturado do caso |
| `deadline_analysis` | user_id (advogado) | Lista priorizada de prazos |
| `draft_response` | conversation_id, last_message | Sugestao de resposta |
| `strategy_suggestion` | processo_id | Analise e sugestoes |
| `document_review` | document_id | Revisao com pontos de melhoria |

