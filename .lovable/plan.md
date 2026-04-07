

# Plano: Painel do Proprietário (Owner) — Acesso Total + Robótica + Orion Completo

## Estado Atual

- O **proprietário** (info@elpgreen.com) é detectado via `useAdminAccess` (`isOwner`) e tem role `admin` no DB
- `useUserRole` resolve `admin` como `advogado` — então cai no `AdvogadoDashboard` que é focado em advocacia
- `DashboardHome` tem ferramentas admin (robótica, rede neural, lab IA) mas só aparece no `default` case
- Rotas avançadas (controle-robotico, rede-neural, lab-ia, IoT) estão restritas a `allowedRoles: ["advogado"]`
- **Problema**: O proprietário NÃO tem painel próprio que unifique TODAS as ferramentas (jurídico + produtos + afiliados + robótica + Orion total)

## Arquitetura Proposta

```text
PROPRIETÁRIO (info@elpgreen.com / role: admin)
     │
     ├── VISÃO EXECUTIVA (stats globais de TODOS os roles)
     │     ├── Clientes totais, Processos, Vendas, Comissões
     │     ├── Produtos ativos, Afiliados, Receita
     │     └── Dispositivos IoT, Agentes IA, Uptime
     │
     ├── FERRAMENTAS JURÍDICAS (tudo do advogado)
     │     ├── CRM, Processos, Documentos, Chat
     │     └── Pesquisa Jurídica, Assinaturas
     │
     ├── FERRAMENTAS PRODUTOR (tudo do produtor)
     │     ├── Meus Produtos, Programa Afiliados
     │     └── Editor de Vendas, Orion Insights
     │
     ├── FERRAMENTAS AFILIADO (visão de afiliados)
     │     ├── Analytics de vendas, Marketplace
     │     └── Links, Cupons
     │
     ├── CENTRO DE COMANDO ORION
     │     ├── Rede Neural, Lab IA, Reformulação
     │     ├── Controle Robótico, IoT/MQTT
     │     ├── Ferramentas Google, Extensão Chrome
     │     └── Recursos EU, Usuários
     │
     └── ORION IA (capacidade total)
           ├── Todas as actions de todos os edge functions
           ├── Integração robótica direta
           └── Automação de tarefas cross-role
```

## Etapas de Implementação

### 1. Criar `ProprietarioDashboard.tsx`

Painel dedicado com seções:
- **Header executivo**: Stats globais (total clientes, processos, vendas, produtos, dispositivos)
- **Seção "Jurídico"**: Cards compactos linkando a Processos, CRM, Documentos, Pesquisa, Chat
- **Seção "Produtos & Vendas"**: Cards para MeusProdutos, Marketplace, Afiliados, Analytics
- **Seção "Centro de Comando Orion"**: Grid completo com Rede Neural, Lab IA, Controle Robótico, IoT, Ferramentas Google, Extensão Chrome, Reformulação
- **Widget "Orion Status"**: Mostra status dos agentes IA, dispositivos conectados, health do sistema
- **Widget "Atividade Global"**: Timeline de ações recentes de TODOS os roles (vendas, processos, mensagens)

### 2. Atualizar `DashboardRouter.tsx`

Detectar admin/owner e rotear para o novo painel:
- Importar `useAdminAccess` ou checar role admin
- Antes do switch de roles, se `isOwner || role === "admin"` → `<ProprietarioDashboard />`

### 3. Abrir TODAS as rotas para admin

Atualizar `RoleGuard.tsx` para sempre permitir role `admin`/owner:
- Dentro do RoleGuard, checar se user é admin → bypass automático
- Isso libera controle-robotico, rede-neural, lab-ia, IoT, etc. sem listar em cada rota

### 4. Widget "Orion Comando Total"

Componente `OrionComandoTotal.tsx` no dashboard do proprietário:
- Painel de status de todos os subsistemas (agentes IA, TTS, RAG, robótica)
- Botões de ação direta: "Analisar sistema", "Scan de segurança", "Health check IoT"
- Integração com `orion-advogado-ai` + `orion-produtor-ai` — o proprietário acessa TODAS as actions
- Toggle para conectar automação robótica ao Orion (habilitar/desabilitar comandos ROS2 via Orion)

### 5. Expandir Edge Function para Owner Actions

Adicionar ao `orion-produtor-ai` (ou criar `orion-owner-ai`):
- `system_health`: Status completo de todos os subsistemas
- `global_analytics`: Métricas consolidadas cross-role
- `automation_command`: Enviar comandos para dispositivos robóticos/IoT via Orion
- `security_audit`: Auditoria de acessos e ações

---

## Detalhes Técnicos

### Arquivos a criar:
1. `src/pages/dashboard/ProprietarioDashboard.tsx` — painel completo do owner
2. `src/components/dashboard/OrionComandoTotal.tsx` — widget de comando total

### Arquivos a modificar:
1. `src/pages/dashboard/DashboardRouter.tsx` — adicionar detecção de admin/owner antes do switch
2. `src/components/dashboard/RoleGuard.tsx` — bypass automático para admin
3. `src/hooks/useUserRole.ts` — expor `isAdmin` flag separado
4. `supabase/functions/orion-produtor-ai/index.ts` — novas actions owner-only

### Lógica de detecção:
```text
DashboardRouter:
  1. useUserRole() → role
  2. useAdminAccess() → isOwner
  3. if (isOwner || role === "admin") → ProprietarioDashboard
  4. else → switch normal (cliente, advogado, produtor, etc.)

RoleGuard:
  1. Checar useAdminAccess().isOwner
  2. Se owner → render children (bypass total)
  3. Senão → lógica normal de allowedRoles
```

### Nenhuma migration necessária:
- Role `admin` já existe no enum `app_role`
- `user_roles` já suporta admin
- Todas as tabelas já existem

