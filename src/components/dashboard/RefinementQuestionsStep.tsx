import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, SkipForward, ChevronLeft, ClipboardList, FileText, Users, Search, Upload, Scale, MessageSquare, Wand2, Eye, FileSearch, Mic, Shield, HelpCircle, PenTool, FileBarChart, Gavel, BookOpen, BriefcaseBusiness, FolderSearch, ClipboardCheck, Info, GraduationCap } from "lucide-react";

import { RefinementField } from "./refinement-types";
export type { RefinementField };

// ═══════════════════════════════════════════════════════════════
// MAPA DE PERGUNTAS OBRIGATÓRIAS POR TIPO DE DOCUMENTO
// ═══════════════════════════════════════════════════════════════


import { MANDATORY_REFINEMENT_FIELDS } from "./refinement-fields-data";


// ═══════════════════════════════════════
// DESCRIÇÕES CONTEXTUAIS POR FERRAMENTA
// ═══════════════════════════════════════
const TOOL_DESCRIPTIONS: Record<string, { icon: React.ComponentType<any>; title: string; description: string; dica: string }> = {
  "pesquisa-jurisprudencial": {
    icon: Search,
    title: "Pesquisa Jurisprudencial Completa",
    description: "Documento completo de jurisprudência com ementa, relatório, voto e decisão.",
    dica: "💡 Dica: Quanto mais específica a tese, melhores os resultados. Indique tribunais e período para refinar.",
  },
  "upload": {
    icon: Upload,
    title: "Upload de Documento",
    description: "Upload manual de arquivo para análise, resumo ou aprimoramento pela IA.",
    dica: "💡 Dica: Indique a finalidade do upload para que a IA saiba o que fazer com o documento.",
  },
  "busca-jurisprudencia": {
    icon: FolderSearch,
    title: "Busca de Jurisprudência",
    description: "Pesquisa jurisprudencial inteligente em múltiplos tribunais.",
    dica: "💡 Dica: Use operadores booleanos e filtre por relator ou classe para resultados mais precisos.",
  },
  "calculadora-liquidacao": {
    icon: Scale,
    title: "Calculadora de Liquidação Cível",
    description: "Cálculo de valores para liquidação de sentença, juros, correção e honorários.",
    dica: "💡 Dica: Informe o índice de correção e a taxa de juros conforme determinado na sentença.",
  },
  "chat-juridico": {
    icon: MessageSquare,
    title: "Chat Jurídico",
    description: "Consulte dúvidas jurídicas com IA especializada.",
    dica: "💡 Dica: Quanto mais contexto fornecer, mais precisa será a orientação da IA.",
  },
  "melhorar-documento": {
    icon: Wand2,
    title: "Melhorar Documento com IA",
    description: "Aprimoramento de texto jurídico: técnica, fundamentação, gramática e estrutura.",
    dica: "💡 Dica: Cole o texto na área de 'Texto base' abaixo. A IA preservará o conteúdo e melhorará a técnica.",
  },
  "resumir-visual-law": {
    icon: Eye,
    title: "Resumir com Visual Law",
    description: "Resumo visual de documentos com infográficos, timelines e mapas mentais.",
    dica: "💡 Dica: Ideal para apresentar documentos complexos ao cliente de forma clara e visual.",
  },
  "resumir-documentos": {
    icon: FileSearch,
    title: "Resumir Documentos e Processo",
    description: "Resumo completo de documentos jurídicos com diferentes formatos de saída.",
    dica: "💡 Dica: Escolha 'Pontos-chave' para uma visão rápida ou 'Detalhado' para análise profunda.",
  },
  "transcricao-audio": {
    icon: Mic,
    title: "Transcrição de Áudio",
    description: "Transcrever áudio de audiências, reuniões e depoimentos para texto.",
    dica: "💡 Dica: Indique o número de locutores para melhor identificação das falas.",
  },
  "medidas-cabiveis": {
    icon: Shield,
    title: "Medidas Cabíveis para um Caso",
    description: "Análise de medidas jurídicas aplicáveis a uma situação concreta.",
    dica: "💡 Dica: Descreva a situação com o máximo de detalhes. Informe se houve tentativa extrajudicial.",
  },
  "explicacao-movimento": {
    icon: HelpCircle,
    title: "Explicação de Movimento Processual",
    description: "Tradução de movimentações processuais em linguagem clara e acessível.",
    dica: "💡 Dica: Cole o texto exato do movimento. Selecione 'Cliente leigo' para linguagem simplificada.",
  },
  "legenda-post": {
    icon: PenTool,
    title: "Legenda para Post Profissional",
    description: "Legenda jurídica otimizada para redes sociais.",
    dica: "💡 Dica: Indique a rede social — cada uma tem seu estilo ideal de texto e tamanho.",
  },
  "relatorio-processual": {
    icon: FileBarChart,
    title: "Relatório Processual para Cliente",
    description: "Relatório detalhado sobre andamento do processo para enviar ao cliente.",
    dica: "💡 Dica: Escolha tom 'Acessível' se o cliente é leigo, ou 'Técnico' para outro advogado.",
  },
  "roteiro-audiencia": {
    icon: Gavel,
    title: "Roteiro para Audiência",
    description: "Preparação completa com roteiro, perguntas e estratégias para audiência.",
    dica: "💡 Dica: Inclua as perguntas para testemunhas e estratégia de contradita para um roteiro completo.",
  },
  "roteiro-sustentacao": {
    icon: BookOpen,
    title: "Roteiro para Sustentação Oral",
    description: "Preparação de sustentação oral com gestão de tempo e argumentação estruturada.",
    dica: "💡 Dica: Indique o tempo disponível — a IA ajustará a profundidade dos argumentos ao tempo.",
  },
  "roteiro-consulta": {
    icon: BriefcaseBusiness,
    title: "Roteiro para Primeira Consulta",
    description: "Guia completo para o atendimento inicial do cliente.",
    dica: "💡 Dica: Informe o tipo de cliente (PF/PJ) e o modelo de honorários para personalizar o roteiro.",
  },
  "documentos-necessarios": {
    icon: ClipboardCheck,
    title: "Documentos Necessários para um Caso",
    description: "Lista completa de documentos para instrução processual.",
    dica: "💡 Dica: Informe a fase do processo — os documentos necessários variam conforme a etapa.",
  },
  "quesitos-pericia": {
    icon: ClipboardList,
    title: "Quesitos para Perícia Judicial",
    description: "Elaboração de quesitos periciais estratégicos alinhados à tese.",
    dica: "💡 Dica: Informe sua posição (autor/réu) — os quesitos serão direcionados à sua tese.",
  },
  "monografia-juridica": {
    icon: GraduationCap,
    title: "Monografia Jurídica",
    description: "Geração da estrutura completa conforme ABNT NBR 14724.",
    dica: "💡 Dica: Quanto mais detalhado o tema e problema de pesquisa, melhor a monografia gerada.",
  },
  "tcc-direito": {
    icon: GraduationCap,
    title: "TCC de Direito",
    description: "Trabalho de Conclusão de Curso formatado conforme ABNT NBR 14724.",
    dica: "💡 Dica: Defina bem o problema de pesquisa — ele será o fio condutor de todo o trabalho.",
  },
  "artigo-cientifico": {
    icon: BookOpen,
    title: "Artigo Científico Jurídico",
    description: "Artigo acadêmico com resumo, abstract, palavras-chave e referências ABNT.",
    dica: "💡 Dica: Artigos científicos devem ter entre 15 e 25 páginas. Defina uma tese clara.",
  },
  "projeto-pesquisa": {
    icon: FileBarChart,
    title: "Projeto de Pesquisa",
    description: "Projeto acadêmico com tema, justificativa, objetivos e metodologia.",
    dica: "💡 Dica: O projeto é a base da monografia — defina bem o método e o cronograma.",
  },
};

// ═══════════════════════════════════════
// ALIASES — IDs usados em GerarDocumento que diferem das chaves acima
// Mapeiam para os mesmos conjuntos de perguntas
// ═══════════════════════════════════════
const ID_ALIASES: Record<string, string> = {
  "contrato-modelo": "criar-contrato-modelo",
  "aditivo-contratual": "criar-aditivo",
  "acordo-familia": "acordo-divorcio",
  "declaracao": "declaracao-termo",
  "recibo": "recibo-pagamento",
  "pesquisa-jurisprudencial-doc": "pesquisa-jurisprudencial",
  "resumir-documento": "resumir-documentos",
  "legenda-rede-social": "legenda-post",
  "roteiro-sustentacao-oral": "roteiro-sustentacao",
  "roteiro-primeira-consulta": "roteiro-consulta",
  "tcc-direito": "monografia-juridica",
};

// Resolve um ID de documento para as perguntas corretas (direto ou via alias)
function resolveRefinementFields(docTypeId: string): RefinementField[] | undefined {
  return MANDATORY_REFINEMENT_FIELDS[docTypeId]
    ?? MANDATORY_REFINEMENT_FIELDS[ID_ALIASES[docTypeId]];
}

// Fallback genérico por categoria
const CATEGORY_FALLBACK: Record<string, RefinementField[]> = {
  penal: [
    { key: "tipo_crime", label: "Crime imputado (tipo penal)", type: "text", required: true },
    { key: "data_fato", label: "Data do fato / ocorrência", type: "date", required: true },
    { key: "reu_primario", label: "O acusado/paciente é réu primário?", type: "select", options: ["Sim", "Não"], required: true },
    { key: "antecedentes", label: "Possui antecedentes criminais? Detalhe.", type: "textarea", required: true },
    { key: "outro_processo", label: "Responde a outro processo criminal atualmente?", type: "select", options: ["Não", "Sim"], required: true },
    { key: "provas", label: "Provas disponíveis", type: "textarea", required: true },
    { key: "condicoes_pessoais", label: "Condições pessoais (residência, emprego, família)", type: "textarea", required: true },
    { key: "confissao", label: "Houve confissão?", type: "select", options: ["Não", "Sim, total", "Sim, parcial"], required: false },
  ],
  civil: [
    { key: "data_fato", label: "Data do fato principal", type: "date", required: true },
    { key: "relacao_partes", label: "Qual a relação entre as partes?", type: "text", required: true },
    { key: "valor_pretendido", label: "Valor pretendido (R$)", type: "text", required: false },
    { key: "provas", label: "Provas / documentos disponíveis", type: "textarea", required: true },
    { key: "tentou_resolver", label: "Tentou resolver extrajudicialmente?", type: "select", options: ["Não", "Sim, sem sucesso"], required: true },
    { key: "testemunhas", label: "Possui testemunhas?", type: "select", options: ["Não", "Sim"], required: false },
    { key: "pedido_urgencia", label: "Há pedido de urgência?", type: "select", options: ["Não", "Sim"], required: false },
  ],
  trabalhista: [
    { key: "data_admissao", label: "Data de admissão", type: "date", required: true },
    { key: "data_dispensa", label: "Data de dispensa / saída", type: "date", required: false },
    { key: "tipo_dispensa", label: "Tipo de dispensa", type: "select", options: ["Sem justa causa", "Por justa causa", "Pedido de demissão", "Rescisão indireta"], required: true },
    { key: "salario", label: "Último salário (R$)", type: "text", required: true },
    { key: "funcao", label: "Função exercida", type: "text", required: true },
    { key: "ctps_assinada", label: "CTPS foi assinada?", type: "select", options: ["Sim", "Não"], required: true },
    { key: "verbas_pretendidas", label: "Verbas pretendidas", type: "textarea", required: true },
    { key: "provas", label: "Provas disponíveis", type: "textarea", required: false },
  ],
  contrato: [
    { key: "objeto_contrato", label: "Objeto do contrato", type: "textarea", required: true },
    { key: "valor_contrato", label: "Valor total do contrato (R$)", type: "text", required: false },
    { key: "prazo_vigencia", label: "Prazo de vigência", type: "text", required: true },
    { key: "forma_pagamento", label: "Forma de pagamento", type: "text", required: true },
    { key: "penalidades", label: "Multa / penalidades por descumprimento", type: "text", required: false },
    { key: "foro", label: "Foro de eleição", type: "text", required: false },
  ],
  extrajudicial: [
    { key: "finalidade", label: "Finalidade do documento", type: "textarea", required: true },
    { key: "partes_envolvidas", label: "Quem são as partes envolvidas?", type: "textarea", required: true },
    { key: "prazo", label: "Prazo (se aplicável)", type: "text", required: false },
    { key: "valor", label: "Valor envolvido (se aplicável)", type: "text", required: false },
    { key: "historico", label: "Histórico da situação / tentativas anteriores", type: "textarea", required: false },
  ],
  familia: [
    { key: "tipo_relacao", label: "Tipo de relação familiar", type: "select", options: ["Casamento", "União estável", "Pais e filhos", "Outro"], required: true },
    { key: "filhos_menores", label: "Há filhos menores?", type: "select", options: ["Não", "Sim"], required: true },
    { key: "bens", label: "Há bens a serem discutidos?", type: "select", options: ["Não", "Sim"], required: true },
    { key: "pensao", label: "Há questão de pensão alimentícia?", type: "select", options: ["Não", "Sim"], required: true },
    { key: "violencia", label: "Há situação de violência doméstica?", type: "select", options: ["Não", "Sim"], required: false },
    { key: "detalhes", label: "Detalhes adicionais da situação", type: "textarea", required: true },
  ],
  ferramentas: [
    { key: "objetivo", label: "Qual o objetivo principal?", type: "textarea", required: true },
    { key: "contexto", label: "Contexto / informações relevantes", type: "textarea", required: true },
    { key: "formato_saida", label: "Formato de saída desejado", type: "text", required: false },
  ],
  academico: [
    { key: "tema", label: "Tema do trabalho acadêmico", type: "text", required: true },
    { key: "delimitacao", label: "Delimitação do tema", type: "textarea", required: true },
    { key: "problema_pesquisa", label: "Problema de pesquisa (pergunta)", type: "textarea", required: true },
    { key: "metodologia", label: "Metodologia", type: "select", options: ["Método dedutivo", "Método indutivo", "Método dialético", "Pesquisa bibliográfica", "Estudo de caso"], required: true },
    { key: "instituicao", label: "Instituição / Universidade", type: "text", required: true },
  ],
};

// Auto-infer validation and hints based on field key patterns
function enrichField(field: RefinementField): RefinementField {
  const f = { ...field };
  // Auto-detect numero_processo fields
  if (!f.validate && /numero_processo|numero_execucao/.test(f.key) && f.type === "text") {
    f.validate = "processo";
    f.hint = f.hint || "Formato CNJ: 0001234-56.2024.8.21.0001";
  }
  // Auto-detect valor fields
  if (!f.validate && /valor_base|valor_causa|valor_pretendido|valor_devido|valor_alimentos|valor(?!_)/.test(f.key) && f.type === "text" && /R\$|valor/i.test(f.label)) {
    f.validate = "valor";
    f.hint = f.hint || "Informe o valor em reais (ex: 50000 ou 50.000,00)";
  }
  // Auto-detect percentual fields
  if (!f.validate && /percentual|honorarios_percentual/.test(f.key) && f.type === "text") {
    f.validate = "percentual";
    f.hint = f.hint || "Informe apenas o número (ex: 15)";
  }
  // Auto-add hints for common date fields
  if (f.type === "date" && !f.hint) {
    if (/prisao|fato|ocorrencia/.test(f.key)) f.hint = "Data em que o fato ocorreu";
    else if (/sentenca|acordao|decisao|decreto/.test(f.key)) f.hint = "Data da decisão judicial";
    else if (/transito/.test(f.key)) f.hint = "Data do trânsito em julgado";
  }
  // Auto-add hints for prazo fields
  if (f.type === "text" && /prazo/.test(f.key) && !f.hint) {
    f.hint = "Ex: 15 dias, 30 dias úteis, até 10/03/2026";
  }
  return f;
}

export function getRefinementFields(
  documentTypeId: string,
  category?: string
): RefinementField[] {
  const resolved = resolveRefinementFields(documentTypeId);
  if (resolved) {
    return resolved.map(enrichField);
  }
  if (category && CATEGORY_FALLBACK[category]) {
    return CATEGORY_FALLBACK[category].map(enrichField);
  }
  // Generic fallback
  return [
    { key: "data_fato", label: "Data do fato principal", type: "date", required: false },
    { key: "detalhes_adicionais", label: "Detalhes adicionais relevantes", type: "textarea", required: false },
    { key: "provas", label: "Provas / documentos disponíveis", type: "textarea", required: false },
  ].map(enrichField);
}

interface GeneralDataFields {
  parteAutora: string;
  parteRe: string;
  fatos: string;
}

interface RefinementQuestionsStepProps {
  documentTypeId: string;
  documentTypeLabel: string;
  category?: string;
  responses: Record<string, string>;
  onResponsesChange: (responses: Record<string, string>) => void;
  onGenerate: () => void;
  onSkip: () => void;
  onBack: () => void;
  generating: boolean;
  generalData?: GeneralDataFields;
  onGeneralDataChange?: (data: Partial<GeneralDataFields>) => void;
}

export default function RefinementQuestionsStep({
  documentTypeId,
  documentTypeLabel,
  category,
  responses,
  onResponsesChange,
  onGenerate,
  onSkip,
  onBack,
  generating,
  generalData,
  onGeneralDataChange,
}: RefinementQuestionsStepProps) {
  const fields = useMemo(
    () => getRefinementFields(documentTypeId, category),
    [documentTypeId, category]
  );

  const requiredFields = useMemo(() => fields.filter((f) => f.required), [fields]);
  const filledRequiredCount = useMemo(
    () => requiredFields.filter((f) => (responses[f.key] || "").trim().length > 0).length,
    [requiredFields, responses]
  );
  const allRequiredFilled = filledRequiredCount === requiredFields.length;

  const handleChange = (key: string, value: string) => {
    onResponsesChange({ ...responses, [key]: value });
  };

  // Validation helpers
  const validateField = (field: RefinementField, value: string): string | null => {
    if (!value.trim()) return null; // Don't validate empty optional fields
    switch (field.validate) {
      case "processo": {
        // CNJ format: NNNNNNN-DD.AAAA.J.TR.OOOO
        const cleanVal = value.replace(/\s/g, "");
        if (cleanVal.length > 4 && !/^\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}$/.test(cleanVal)) {
          return "Formato esperado: 0001234-56.2024.8.21.0001";
        }
        return null;
      }
      case "valor": {
        const cleanVal = value.replace(/[R$\s.]/g, "").replace(",", ".");
        if (isNaN(Number(cleanVal)) || Number(cleanVal) < 0) return "Informe um valor numérico válido";
        return null;
      }
      case "percentual": {
        const cleanVal = value.replace(/[%\s]/g, "").replace(",", ".");
        if (isNaN(Number(cleanVal)) || Number(cleanVal) < 0 || Number(cleanVal) > 100) return "Informe um percentual entre 0 e 100";
        return null;
      }
      case "cpf": {
        const digits = value.replace(/\D/g, "");
        if (digits.length > 3 && digits.length !== 11) return "CPF deve ter 11 dígitos";
        return null;
      }
      case "cnpj": {
        const digits = value.replace(/\D/g, "");
        if (digits.length > 3 && digits.length !== 14) return "CNPJ deve ter 14 dígitos";
        return null;
      }
      case "email": {
        if (value.length > 3 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "E-mail inválido";
        return null;
      }
      case "oab": {
        if (value.length > 2 && !/^\d+(\s*\/?\s*[A-Z]{2})?$/i.test(value.trim())) return "Formato esperado: 123456/RS";
        return null;
      }
      default:
        return null;
    }
  };

  const renderField = (field: RefinementField) => {
    const value = responses[field.key] || "";
    const validationError = validateField(field, value);

    const fieldElement = (() => {
      switch (field.type) {
        case "textarea":
          return (
            <Textarea
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder || `Descreva aqui...`}
              className={`min-h-[80px] ${validationError ? "border-destructive" : ""}`}
            />
          );
        case "select":
          return (
            <Select
              value={value}
              onValueChange={(v) => handleChange(field.key, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        case "date":
          return (
            <Input
              type="date"
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          );
        case "number":
          return (
            <Input
              type="number"
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={validationError ? "border-destructive" : ""}
            />
          );
        default:
          return (
            <Input
              type="text"
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={validationError ? "border-destructive" : ""}
            />
          );
      }
    })();

    return (
      <>
        {fieldElement}
        {field.hint && !validationError && (
          <p className="text-xs text-muted-foreground mt-1">{field.hint}</p>
        )}
        {validationError && (
          <p className="text-xs text-destructive mt-1">{validationError}</p>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Contextual Banner for Ferramentas */}
      {category === "ferramentas" && (() => {
        const resolvedId = ID_ALIASES[documentTypeId] || documentTypeId;
        const toolInfo = TOOL_DESCRIPTIONS[resolvedId];
        if (!toolInfo) return null;
        const IconComp = toolInfo.icon;
        return (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                <IconComp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{toolInfo.title}</h2>
                <p className="text-sm text-muted-foreground">{toolInfo.description}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 mt-3 rounded-md bg-accent/50 p-3">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{toolInfo.dica}</p>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Perguntas de Qualificação
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Para gerar uma <strong>{documentTypeLabel}</strong> personalizada e completa,
          responda às perguntas abaixo. Campos com <span className="text-destructive">*</span> são obrigatórios.
        </p>
      </div>

      {/* Optional General Data */}
      {generalData && onGeneralDataChange && (
        <div className="rounded-lg border border-border bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">
              Dados gerais <span className="text-muted-foreground font-normal">(opcional — pode preencher na próxima etapa)</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gd-parte1" className="text-xs text-muted-foreground">Parte 1 / Contratante / Autor</Label>
              <Input
                id="gd-parte1"
                value={generalData.parteAutora}
                onChange={(e) => onGeneralDataChange({ parteAutora: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gd-parte2" className="text-xs text-muted-foreground">Parte 2 / Contratada / Réu</Label>
              <Input
                id="gd-parte2"
                value={generalData.parteRe}
                onChange={(e) => onGeneralDataChange({ parteRe: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gd-fatos" className="text-xs text-muted-foreground">Breve descrição dos fatos / objeto</Label>
            <Textarea
              id="gd-fatos"
              value={generalData.fatos}
              onChange={(e) => onGeneralDataChange({ fatos: e.target.value })}
              placeholder="Descreva brevemente o caso ou objeto do documento..."
              className="min-h-[60px]"
            />
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={field.key} className="text-sm font-medium">
              {field.label}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            {renderField(field)}
          </div>
        ))}
      </div>

      {/* Base Text for Improvement */}
      <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <Label className="text-sm font-medium text-foreground">
            Texto base para aprimoramento (opcional)
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Cole abaixo o texto que deseja aprimorar. A IA preservará todo o conteúdo original, apenas agregando, complementando e melhorando a técnica jurídica.
        </p>
        <Textarea
          value={responses["texto_base_aprimorar"] || ""}
          onChange={(e) => handleChange("texto_base_aprimorar", e.target.value)}
          placeholder="Cole aqui o texto base que deseja que a IA aprimore..."
          className="min-h-[120px]"
        />
      </div>

      {/* Required counter */}
      {requiredFields.length > 0 && !allRequiredFilled && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{filledRequiredCount}</span> de{" "}
          <span className="font-medium text-foreground">{requiredFields.length}</span> campos obrigatórios preenchidos
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={generating}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={generating}
          className="gap-2 text-muted-foreground"
        >
          <SkipForward className="h-4 w-4" />
          Pular perguntas
        </Button>

        <Button
          onClick={onGenerate}
          disabled={!allRequiredFilled || generating}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Próximo
        </Button>
      </div>
    </div>
  );
}
