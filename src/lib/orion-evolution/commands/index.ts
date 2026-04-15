/**
 * ─── Orion Auto-Evolution Commands System ───
 * Similar to OpenCode commands - allows Orion to self-program and evolve
 * 
 * Usage: "Orion, auto evoluir" or "Orion, novo comando [nome]"
 */

export interface OrionCommand {
  name: string;
  description: string;
  template: string;
  agent?: "build" | "plan" | "code" | "general";
  model?: string;
  subtask?: boolean;
  enabled?: boolean;
}

export interface OrionCommandResult {
  success: boolean;
  output: string;
  filesCreated?: string[];
  filesModified?: string[];
  error?: string;
}

// Default evolution commands
export const DEFAULT_ORION_COMMANDS: OrionCommand[] = [
  {
    name: "auto-evoluir",
    description: "Analisa o código atual e faz melhorias autônomas",
    template: `
Analise o código do projeto Orion em @src/App.tsx e sugira melhorias.
Identifique:
1. Funções que podem ser refatoradas
2. Bugs óbvios que podem ser corrigidos
3. Código redundante
4. Melhorias de performance

Aplique as correções automaticamente se forem seguras.
`,
    agent: "build",
    subtask: true,
  },
  {
    name: "novo-comando",
    description: "Cria um novo comando de voz para o Orion",
    template: `
Crie um novo comando de voz no arquivo @src/lib/neural/smart-intent-classifier.ts
Nome do comando: $ARGUMENTS

O comando deve:
1. Ter regex para reconhecer a frase falada
2. Classificar o intent corretamente
3. Ter confiança >= 0.9

Adicione também o handler no @src/lib/neural/voice-intent-dispatcher.ts se necessário.
`,
    agent: "code",
    subtask: true,
  },
  {
    name: "otimizar",
    description: "Otimiza código para melhor performance",
    template: `
Analise o arquivo @src/lib/neural/orion-ai-client.ts e otimize para melhor performance.
Identifique:
1. Chamadas desnecessárias
2. Funções que podem ser memoizadas
3. Requests que podem ser batchados
4. Operações síncronas que podem ser assíncronas

Aplique as otimizações diretamente no código.
`,
    agent: "build",
    subtask: true,
  },
  {
    name: "corrigir-bug",
    description: "Corrige bugs automaticamente",
    template: `
Analise e corrija o bug no arquivo especificado.
Execute testes para verificar se a correção funciona.
Se não houver arquivo específico, use $ARGUMENTS como escopo.

Fluxo:
1. Identifique a causa raiz
2. Aplique a correção
3. Verifique com testes
`,
    agent: "build",
    subtask: true,
  },
  {
    name: "adicionar-feature",
    description: "Adiciona nova funcionalidade ao Orion",
    template: `
Adicione uma nova feature ao projeto Orion.
Descrição: $ARGUMENTS

Siga o padrão de código existente:
- Use React hooks corretamente
- Siga a estrutura de componentes
- Adicione tipos TypeScript
- Mantenha consistência com o design system
`,
    agent: "code",
    subtask: true,
  },
  {
    name: "revisar-codigo",
    description: "Revisa código e sugere melhorias",
    template: `
Revise o código em @src/components/dashboard/neural/NeuralVision.tsx
Forneça:
1. Pontos positivos
2. Problemas encontrados
3. Sugestões de melhoria
4. Score de qualidade (0-100)
`,
    agent: "plan",
    subtask: true,
  },
  {
    name: "criar-teste",
    description: "Cria testes unitários automaticamente",
    template: `
Crie testes unitários para @src/components/dashboard/neural/useOrionReasoning.ts
Use Jest/Testing Library.
Cubra:
- Funções principais
- Casos de borda
- Error handling
`,
    agent: "build",
    subtask: true,
  },
  {
    name: "atualizar-docs",
    description: "Atualiza documentação automaticamente",
    template: `
Atualize a documentação em @src/pages/dashboard/InstrucoesPlataforma.tsx
Adicione informações sobre: $ARGUMENTS
Mantenha o mesmo formato e estilo das outras seções.
`,
    agent: "general",
    subtask: true,
  },
  {
    name: "integrar-ferramenta",
    description: "Integra nova ferramenta/IA externa",
    template: `
Integre uma nova ferramenta ao sistema Orion.
Ferramenta: $ARGUMENTS

Crie:
1. Cliente em @src/lib/integrations/
2. Hook de uso em @src/hooks/
3. Exemplo de uso na documentação
`,
    agent: "code",
    subtask: true,
  },
  {
    name: "melhorar-ui",
    description: "Melora interface visual do componente",
    template: `
Melore o componente em @src/components/orion/VideoOverlay.tsx
Use o design system existente (Tron/Holographic style).
Adicione:
1. Animações suaves
2. Feedback visual
3. Estados de hover/active
4. Responsividade
`,
    agent: "build",
    subtask: true,
  },
];

export function getCommand(name: string): OrionCommand | undefined {
  return DEFAULT_ORION_COMMANDS.find(c => c.name === name || c.name.includes(name.toLowerCase()));
}

export function getAllCommands(): OrionCommand[] {
  return DEFAULT_ORION_COMMANDS;
}