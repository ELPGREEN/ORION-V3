import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Search, Shield, AlignLeft, BookOpen, Wrench, Globe } from "lucide-react";

export type AgentType = "revisor" | "pesquisador" | "estrategista" | "formatador" | "leitor" | "construtor" | "investigador";

interface AgentConfig {
  label: string;
  icon: React.ReactNode;
  description: string;
  promptSuffix: string;
  edgeFunction?: string;
}

export const AGENTS: Record<AgentType, AgentConfig> = {
  revisor: {
    label: "Revisor",
    icon: <Bot className="h-3 w-3" />,
    description: "Gramática, estilo e ABNT",
    promptSuffix: `\n═══ AGENTE: REVISOR ═══
FUNÇÃO: Revisar gramática, ortografia, pontuação e estilo formal jurídico.
REGRAS:
1. Para cada erro encontrado, cite o trecho original e a correção exata.
2. Verifique: concordância nominal/verbal, regência, crase, pontuação, colocação pronominal.
3. Substitua coloquialismos por linguagem formal jurídica adequada.
4. Avalie conformidade com normas ABNT para citações e referências.
5. NUNCA remova, resuma ou altere o conteúdo substantivo — corrija apenas a forma.
FORMATO DE SAÍDA:
- Liste cada correção como: "❌ [trecho original]" → "✅ [correção]"
- Ao final, indique o total de correções e uma nota de qualidade (A–D).`,
  },
  pesquisador: {
    label: "Pesquisador",
    icon: <Search className="h-3 w-3" />,
    description: "Jurisprudência, legislação e doutrina",
    promptSuffix: `\n═══ AGENTE: PESQUISADOR ═══
FUNÇÃO: Localizar e citar jurisprudência, legislação e doutrina aplicáveis ao caso.
REGRAS:
1. Analise o contexto jurídico do documento antes de buscar referências.
2. Cite APENAS referências reais com identificação completa (Lei nº X.XXX/XX, Art. XX; STJ, REsp nº X, Rel. Min. Y, julgado em DD/MM/AAAA).
3. Para cada referência, explique em 1–2 frases sua aplicabilidade ao caso concreto.
4. Priorize: (a) súmulas vinculantes, (b) jurisprudência dominante STF/STJ, (c) legislação federal, (d) doutrina majoritária.
5. PROIBIDO inventar números de leis, súmulas ou acórdãos inexistentes.
FORMATO DE SAÍDA:
- Agrupe por tipo: Legislação | Jurisprudência | Doutrina
- Inclua ementa resumida quando disponível.`,
  },
  estrategista: {
    label: "Estrategista",
    icon: <Shield className="h-3 w-3" />,
    description: "Análise SWOT e contra-argumentos",
    promptSuffix: `\n═══ AGENTE: ESTRATEGISTA ═══
FUNÇÃO: Analisar a tese jurídica do documento e identificar pontos fortes, fracos, riscos e oportunidades.
REGRAS:
1. FORÇAS: Liste os argumentos mais sólidos e bem fundamentados da peça.
2. FRAQUEZAS: Identifique lacunas argumentativas, fundamentação insuficiente ou teses vulneráveis.
3. CONTRA-ARGUMENTOS: Antecipe as 3 principais teses que a parte adversária pode utilizar.
4. RISCOS PROCESSUAIS: Avalie probabilidade de cada cenário (alta/média/baixa) com justificativa.
5. RECOMENDAÇÕES: Sugira ações concretas e específicas para fortalecer a posição processual.
FORMATO DE SAÍDA:
| Forças | Fraquezas | Oportunidades | Ameaças |
Ao final, inclua um "Plano de Ação" com 3–5 itens priorizados.`,
  },
  formatador: {
    label: "Formatador",
    icon: <AlignLeft className="h-3 w-3" />,
    description: "Estrutura, numeração e layout",
    promptSuffix: `\n═══ AGENTE: FORMATADOR ═══
FUNÇÃO: Avaliar e corrigir a estrutura, organização e formatação do documento jurídico.
REGRAS:
1. Verifique a hierarquia de seções (numeração sequencial, níveis corretos 1, 1.1, 1.1.1).
2. Identifique seções fora de ordem, duplicadas ou ausentes para o tipo de peça.
3. Avalie conformidade ABNT: margens, espaçamento entre linhas, recuo de parágrafo, citações longas.
4. Verifique formatação de referências legais (itálico para estrangeirismos, negrito para ênfase).
5. PRESERVE todo o conteúdo textual — apenas reorganize, renumere e formate.
FORMATO DE SAÍDA:
- Estrutura atual vs. estrutura sugerida (lado a lado)
- Lista de correções de formatação necessárias.`,
  },
  leitor: {
    label: "Leitor",
    icon: <BookOpen className="h-3 w-3" />,
    description: "Análise profunda do documento",
    promptSuffix: `\n═══ AGENTE: LEITOR (Edge Function) ═══
FUNÇÃO: Realizar análise profunda do conteúdo do documento, consultas ao banco de dados e interpretação contextual.
REGRAS:
1. Leia o documento completo antes de responder — considere todo o contexto.
2. Responda perguntas sobre o conteúdo com citações diretas do texto quando possível.
3. Para consultas ao banco, identifique a tabela e filtros relevantes automaticamente.
4. Apresente dados numéricos em formato estruturado (tabela ou lista).
5. Se o documento estiver vazio ou insuficiente, informe claramente ao invés de supor conteúdo.
FORMATO DE SAÍDA: Resposta direta e fundamentada no conteúdo do documento.`,
    edgeFunction: "agente-leitura",
  },
  construtor: {
    label: "Construtor",
    icon: <Wrench className="h-3 w-3" />,
    description: "Gerar peças e documentos jurídicos",
    promptSuffix: `\n═══ AGENTE: CONSTRUTOR (Edge Function) ═══
FUNÇÃO: Gerar documentos jurídicos, petições, contratos e trechos de texto formatados para inserção no editor.
REGRAS:
1. Gere conteúdo no formato HTML válido, pronto para inserção no editor TipTap.
2. Siga a estrutura padrão da peça jurídica solicitada (preâmbulo, fundamentação, pedidos).
3. Use dados do contexto do documento atual (partes, número do processo, vara) quando disponíveis.
4. Inclua marcadores [PREENCHER] para dados que precisam ser completados pelo usuário.
5. Mantenha linguagem formal jurídica e formatação ABNT.
FORMATO DE SAÍDA: Documento HTML estruturado com seções claramente delimitadas.`,
    edgeFunction: "ai-orchestrator",
  },
  investigador: {
    label: "Investigador",
    icon: <Globe className="h-3 w-3" />,
    description: "Pesquisa web e jurisprudência online",
    promptSuffix: `\n═══ AGENTE: INVESTIGADOR (Edge Function) ═══
FUNÇÃO: Pesquisar na web, bases jurisprudenciais e base de conhecimento interna para fundamentar o documento.
REGRAS:
1. Priorize fontes oficiais: tribunais superiores, diários oficiais, legislação federal.
2. Para cada resultado, inclua: título, fonte, data e URL quando disponível.
3. Cadeia de fallback: (a) base interna → (b) jurisprudência indexada → (c) pesquisa web.
4. Sintetize os resultados em formato utilizável (não despeje resultados brutos).
5. Indique o grau de confiabilidade da fonte (oficial/acadêmica/informal).
FORMATO DE SAÍDA:
- Resumo executivo dos achados (3–5 linhas)
- Lista de fontes com relevância indicada (⭐ alta, 🔹 média, ◽ baixa).`,
    edgeFunction: "agente-pesquisa",
  },
};

interface AgentSelectorProps {
  value: AgentType;
  onChange: (agent: AgentType) => void;
}

export function AgentSelector({ value, onChange }: AgentSelectorProps) {
  const agent = AGENTS[value];

  return (
    <Select value={value} onValueChange={(v) => onChange(v as AgentType)}>
      <SelectTrigger className="h-6 w-auto gap-1 px-1.5 text-[10px] border-primary/30 bg-transparent">
        {agent.icon}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 py-1 text-[9px] text-muted-foreground font-semibold uppercase">⚡ Raciocínio Relâmpago</div>
        {(["revisor", "pesquisador", "estrategista", "formatador"] as AgentType[]).map((key) => {
          const cfg = AGENTS[key];
          return (
            <SelectItem key={key} value={key} className="text-xs">
              <div className="flex items-center gap-2">
                {cfg.icon}
                <div>
                  <span className="font-medium">{cfg.label}</span>
                  <span className="ml-1.5 text-muted-foreground text-[10px]">{cfg.description}</span>
                </div>
              </div>
            </SelectItem>
          );
        })}
        <div className="px-2 py-1 mt-1 text-[9px] text-muted-foreground font-semibold uppercase border-t border-border">Agentes IA</div>
        {(["leitor", "construtor", "investigador"] as AgentType[]).map((key) => {
          const cfg = AGENTS[key];
          return (
            <SelectItem key={key} value={key} className="text-xs">
              <div className="flex items-center gap-2">
                {cfg.icon}
                <div>
                  <span className="font-medium">{cfg.label}</span>
                  <span className="ml-1.5 text-muted-foreground text-[10px]">{cfg.description}</span>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
