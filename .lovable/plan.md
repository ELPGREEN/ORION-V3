

# Sistema Completo de Comandos de Voz do Orion — Industrial & Empresarial

## Diagnóstico

O sistema de voz do Orion tem 3 camadas independentes que **não estão conectadas**:

```text
Camada 1: orion-command-registry.ts    → 1000+ comandos catalogados
Camada 2: som-router.ts               → 30 handlers SOM (iot_robot, iot_light, etc.)
Camada 3: useOrionReasoning.ts         → Execução real (regex + LLM)

PROBLEMA: matchCommand() da Camada 1 NUNCA é chamado.
Os 20 comandos robóticos e 100+ comandos industriais/empresariais
existem como dados mas não executam nada.
```

## Plano de Implementação

### 1. Criar Command Executor — Motor de execução real
**Arquivo:** `src/lib/neural/orion-voice-executor.ts`

Um dispatcher que:
- Recebe o texto do comando + o resultado do `matchCommand()`
- Despacha para handlers reais (navigate, IoT, robotics, CRM, documents, etc.)
- Retorna `{ handled: boolean, response: string, action?: string }`

Handlers incluídos:
- **navigation** → `navigate(path)` via nav map
- **crm** → Supabase queries (criar/buscar/listar clientes, processos, tarefas)
- **document** → Supabase queries + nav para gerar/abrir documentos
- **search** → Neural search API + Supabase
- **financial** → Faturas, cobranças, relatórios
- **robotics** → `UnifiedRobotClient` (mover, parar, e-stop, telemetria, garra, fleet)
- **iot** → `smartHome.handleVoiceCommand()` + `iotBridge`
- **neural** → Status, métricas, provedores, pipeline
- **marketplace** → Produtos, vendas, afiliados
- **email** → Google tools integration
- **config** → Voice speed/pitch, theme

### 2. Expandir SOM Router com handlers industriais/empresariais
**Arquivo:** `src/lib/neural/som-router.ts`

Novos handlers no `SOMHandler` type e `KEYWORD_GROUPS`:
- `"industrial_scada"` — SCADA, OPC-UA, PLC, supervisório, alarme industrial
- `"industrial_fleet"` — frota, AGV, VDA5050, robôs, missão, despacho
- `"industrial_quality"` — qualidade, OEE, defeito, inspeção, SPC, Six Sigma
- `"industrial_maintenance"` — manutenção, preventiva, preditiva, MTBF, spare parts
- `"enterprise_erp"` — estoque, inventário, ordem produção, MRP, BOM
- `"enterprise_hr"` — RH, funcionário, folha, ponto, férias, admissão
- `"enterprise_logistics"` — logística, expedição, rastreamento, frete, entrega

### 3. Expandir Robotics Commands no Registry
**Arquivo:** `src/lib/neural/orion-command-registry.ts`

Adicionar 80+ comandos industriais:
- **SCADA/Supervisório** (20): alarme, setpoint, histórico, trend, receita, batelada
- **Fleet Management** (20): despachar AGV, status frota, missão, rota, carga/descarga
- **Qualidade** (15): OEE, SPC, inspeção visual, defeito, rastreabilidade
- **Manutenção** (15): ordem de serviço, preventiva, preditiva, MTBF, calibração
- **ERP/Logística** (10): estoque, BOM, rastreamento, expedição

### 4. Integrar matchCommand no Reasoning Pipeline
**Arquivo:** `src/components/dashboard/neural/useOrionReasoning.ts`

Inserir **antes** do LLM call:
```text
// Após SOM fast-path e antes do LLM:
const cmdMatch = matchCommand(question);
if (cmdMatch) {
  const result = await executeCommand(cmdMatch, question, navigate, speak);
  if (result.handled) {
    // Respond immediately, skip LLM
    return;
  }
}
```

### 5. Expandir Nav Map com destinos industriais
**Arquivo:** `src/lib/neural/orion-nav-map.ts`

Novos destinos:
- `"scada"`, `"supervisório"` → `/dashboard/controle-robotico`
- `"frota"`, `"fleet"`, `"agv"` → `/dashboard/controle-robotico`
- `"qualidade"`, `"oee"` → `/dashboard/metricas-ia`
- `"manutenção"` → `/dashboard/tarefas`
- `"estoque"`, `"inventário"` → `/dashboard/marketplace`

### 6. Expandir PublicOrionListener com Command Executor
**Arquivo:** `src/components/PublicOrionListener.tsx`

Além de navegação, adicionar respostas a comandos simples:
- "que horas são" → resposta local
- "status do sistema" → resposta local
- "ajuda" → lista de comandos
- Comandos que requerem auth → feedback "faça login"

## Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `src/lib/neural/orion-voice-executor.ts` | CRIAR — Motor de execução de comandos |
| `src/lib/neural/som-router.ts` | Adicionar 7 handlers industriais/empresariais |
| `src/lib/neural/orion-command-registry.ts` | Adicionar 80+ comandos industriais |
| `src/lib/neural/orion-nav-map.ts` | Adicionar destinos industriais/empresariais |
| `src/components/dashboard/neural/useOrionReasoning.ts` | Integrar matchCommand + executor |
| `src/components/PublicOrionListener.tsx` | Adicionar respostas a comandos básicos |

## Resultado esperado
- matchCommand() finalmente conectado ao pipeline de execução
- 1000+ comandos catalogados com execução real (não apenas dados)
- Comandos industriais: SCADA, fleet, qualidade, manutenção
- Comandos empresariais: ERP, HR, logística
- Execução determinística (<10ms) para comandos conhecidos, sem LLM
- LLM usado apenas para queries complexas/ambíguas

