import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { JurisdictionSelector, type Jurisdiction } from "@/components/dashboard/JurisdictionSelector";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { lazyRetry } from "@/lib/lazyRetry";

// Lazy-load heavy sub-components for code-splitting
const DocumentFeedback = lazy(lazyRetry(() => import("@/components/dashboard/DocumentFeedback").then(m => ({ default: m.DocumentFeedback }))));
import {
  Sparkles,
  ChevronLeft,
  Download,
  Save,
  RefreshCw,
  Copy,
  Loader2,
  Scale,
  Handshake,
  Shield,
  AlertTriangle,
  Gavel,
  ScrollText,
  FileCheck,
  BookOpen,
  FileText,
  PenTool,
  Send,
  Users,
  Home,
  Briefcase,
  ClipboardList,
  GraduationCap,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DocumentTypeSelector } from "@/components/dashboard/DocumentTypeSelector";
import { DocumentForm } from "@/components/dashboard/DocumentForm";
import { DraftIndicator } from "@/components/dashboard/DraftIndicator";
import { getDocumentTemplate } from "@/lib/document-templates";
import { getDocumentTemplateHTML } from "@/lib/document-templates-html";
import { getAutoAreaForCategory, getDocTypeConfig } from "@/lib/document-type-configs-map";
import { getTribunalConfig, varasPrimeiraInstancia, formatarEnderecamento } from "@/lib/tribunais-config";
import { useDocumentDraft } from "@/hooks/useDocumentDraft";
import { useGenerationQueue } from "@/hooks/useGenerationQueue";
import { getRefinementFields } from "@/components/dashboard/RefinementQuestionsStep";
import { calculateRisk, type RiskResult } from "@/lib/analysis/riskPredictor";
import { Badge } from "@/components/ui/badge";

// Lazy-load the heaviest editor components
const DocumentEditor = lazy(lazyRetry(() => import("@/components/dashboard/DocumentEditor").then(m => ({ default: m.DocumentEditor }))));
const TriplePipelineProgress = lazy(lazyRetry(() => import("@/components/dashboard/TriplePipelineProgress").then(m => ({ default: m.TriplePipelineProgress }))));
const RefinementQuestionsStep = lazy(lazyRetry(() => import("@/components/dashboard/RefinementQuestionsStep")));

// Types re-exported from shared module
export type { DocumentType, FormData, UploadedDocument } from "@/types/document-types";
export { categoryLabels, judicialCategories, isJudicialCategory } from "@/types/document-types";
import type { DocumentType, FormData } from "@/types/document-types";
import { isJudicialCategory, categoryLabels, judicialCategories } from "@/types/document-types";

export const documentTypes: DocumentType[] = [
  // PENAL
  { id: "habeas-corpus", label: "Habeas Corpus", icon: Shield, desc: "Liberdade de locomoção", category: "penal" },
  { id: "queixa-crime", label: "Queixa-Crime", icon: Gavel, desc: "Ação penal privada", category: "penal" },
  { id: "defesa-previa-criminal", label: "Defesa Prévia Criminal", icon: Shield, desc: "Defesa prévia em processo criminal", category: "penal" },
  { id: "resposta-acusacao", label: "Resposta à Acusação", icon: Shield, desc: "Resposta à acusação (art. 396 CPP)", category: "penal" },
  { id: "liberdade-provisoria", label: "Pedido de Liberdade Provisória", icon: Shield, desc: "Liberdade provisória com ou sem fiança", category: "penal" },
  { id: "recurso-sentido-estrito", label: "Recurso em Sentido Estrito", icon: Scale, desc: "Recurso contra decisões interlocutórias (CPP art. 581)", category: "penal" },
  { id: "alegacoes-finais-criminais", label: "Alegações Finais Criminais", icon: FileText, desc: "Memoriais ou alegações finais em processo criminal", category: "penal" },
  { id: "revisao-criminal", label: "Revisão Criminal", icon: Scale, desc: "Revisão de condenação transitada em julgado", category: "penal" },
  { id: "revogacao-prisao-preventiva", label: "Revogação de Prisão Preventiva", icon: Shield, desc: "Pedido de revogação de prisão preventiva", category: "penal" },
  { id: "apelacao-criminal", label: "Apelação Criminal", icon: Scale, desc: "Recurso de apelação criminal", category: "penal" },
  { id: "contrarrazoes-apelacao-criminal", label: "Contrarrazões à Apelação Criminal", icon: Shield, desc: "Resposta ao recurso de apelação criminal", category: "penal" },
  { id: "embargos-declaracao-penal", label: "Embargos de Declaração (Penal)", icon: BookOpen, desc: "Esclarecimento de obscuridade/omissão em decisão penal", category: "penal" },
  { id: "recurso-especial-penal", label: "Recurso Especial (Penal)", icon: Scale, desc: "Recurso ao STJ em matéria penal", category: "penal" },
  { id: "agravo-execucao-penal", label: "Agravo em Execução Penal", icon: Scale, desc: "Recurso em execução penal", category: "penal" },
  { id: "progressao-regime", label: "Pedido de Progressão de Regime", icon: FileText, desc: "Progressão de regime prisional", category: "penal" },
  { id: "livramento-condicional", label: "Pedido de Livramento Condicional", icon: FileText, desc: "Livramento condicional", category: "penal" },
  { id: "relaxamento-prisao", label: "Pedido de Relaxamento de Prisão", icon: Shield, desc: "Relaxamento de prisão ilegal", category: "penal" },
  { id: "manifestacao-penal", label: "Manifestação Processual (Penal)", icon: FileText, desc: "Manifestação genérica em processo criminal", category: "penal" },
  { id: "denuncia-penal", label: "Denúncia", icon: Gavel, desc: "Peça acusatória do Ministério Público", category: "penal" },
  { id: "emenda-inicial-penal", label: "Emenda à Inicial (Penal)", icon: FileText, desc: "Correção da peça inicial", category: "penal" },
  { id: "replica-criminal", label: "Réplica Criminal (Alegações do MP)", icon: Shield, desc: "Réplica às alegações do MP", category: "penal" },
  { id: "excecao-suspeicao-penal", label: "Exceção de Suspeição (Penal)", icon: Shield, desc: "Exceção de suspeição do magistrado", category: "penal" },
  { id: "revogacao-medidas-protetivas", label: "Revogação de Medidas Protetivas de Urgência", icon: Shield, desc: "Pedido de revogação de medidas protetivas", category: "penal" },
  { id: "quesitos-periciais-penal", label: "Quesitos Periciais (Penal)", icon: BookOpen, desc: "Apresentação de quesitos periciais em processo criminal", category: "penal" },
  { id: "contrarrazoes-rese", label: "Contrarrazões ao Recurso em Sentido Estrito", icon: Shield, desc: "Resposta ao RESE", category: "penal" },
  { id: "recurso-ordinario-constitucional-penal", label: "Recurso Ordinário Constitucional (Penal)", icon: Scale, desc: "ROC em matéria penal", category: "penal" },
  { id: "memoriais-recursais-penal", label: "Memoriais Recursais (Penal)", icon: FileText, desc: "Memoriais em fase recursal penal", category: "penal" },
  { id: "contrarrazoes-recurso-especial-penal", label: "Contrarrazões ao REsp (Penal)", icon: Shield, desc: "Resposta ao recurso especial penal", category: "penal" },
  { id: "contrarrazoes-embargos-penal", label: "Contrarrazões aos Embargos de Declaração (Penal)", icon: Shield, desc: "Resposta aos embargos de declaração penais", category: "penal" },
  { id: "restituicao-coisa-apreendida", label: "Restituição de Coisa Apreendida", icon: FileText, desc: "Pedido de restituição de bens apreendidos", category: "penal" },
  { id: "incidente-execucao-penal", label: "Petição de Incidente (Execução Penal)", icon: FileText, desc: "Incidente em execução penal", category: "penal" },
  { id: "contrarrazoes-agravo-execucao", label: "Contrarrazões ao Agravo em Execução Penal", icon: Shield, desc: "Resposta ao agravo em execução penal", category: "penal" },
  { id: "indulto-natalino", label: "Pedido de Indulto Natalino", icon: FileText, desc: "Pedido de indulto natalino", category: "penal" },
  { id: "revogacao-preventiva-cautelares", label: "Revogação de Preventiva com Cautelares", icon: Shield, desc: "Revogação com aplicação de medidas cautelares", category: "penal" },

  // CIVIL
  { id: "peticao-inicial", label: "Petição Inicial", icon: Gavel, desc: "Peça inaugural de ação judicial", category: "civil" },
  { id: "contestacao", label: "Contestação", icon: Shield, desc: "Defesa em ação judicial", category: "civil" },
  { id: "replica-civil", label: "Réplica (Impugnação à Contestação)", icon: Shield, desc: "Réplica do autor à contestação", category: "civil" },
  { id: "tutela-provisoria", label: "Tutela Provisória", icon: Gavel, desc: "Tutela de urgência ou evidência", category: "civil" },
  { id: "recurso-apelacao", label: "Apelação", icon: Scale, desc: "Recurso contra sentença de 1º grau", category: "civil" },
  { id: "contrarrazoes-apelacao", label: "Contrarrazões de Apelação", icon: Shield, desc: "Resposta ao recurso de apelação", category: "civil" },
  { id: "agravo-instrumento", label: "Agravo de Instrumento", icon: Scale, desc: "Recurso contra decisão interlocutória", category: "civil" },
  { id: "agravo-interno", label: "Agravo Interno", icon: Scale, desc: "Recurso contra decisão monocrática", category: "civil" },
  { id: "embargos-declaracao", label: "Embargos de Declaração", icon: BookOpen, desc: "Esclarecimento de obscuridade ou omissão", category: "civil" },
  { id: "cumprimento-sentenca", label: "Cumprimento de Sentença", icon: FileCheck, desc: "Execução de decisão judicial transitada", category: "civil" },
  { id: "impugnacao", label: "Impugnação ao Cumprimento de Sentença", icon: Shield, desc: "Defesa em cumprimento de sentença", category: "civil" },
  { id: "manifestacao", label: "Manifestação Processual", icon: FileText, desc: "Manifestação genérica nos autos", category: "civil" },
  { id: "alegacoes-finais", label: "Alegações Finais", icon: FileText, desc: "Memoriais em processo cível", category: "civil" },
  { id: "recurso-especial", label: "Recurso Especial", icon: Scale, desc: "Recurso ao STJ", category: "civil" },
  { id: "mandado-seguranca", label: "Mandado de Segurança", icon: Shield, desc: "Proteção de direito líquido e certo", category: "civil" },
  { id: "mandado-seguranca-coletivo", label: "Mandado de Segurança Coletivo", icon: Shield, desc: "MS impetrado por entidade/partido/sindicato", category: "civil" },
  { id: "acao-popular", label: "Ação Popular", icon: Gavel, desc: "Proteção do patrimônio público pelo cidadão", category: "civil" },
  { id: "acao-civil-publica", label: "Ação Civil Pública", icon: Gavel, desc: "Tutela de interesses difusos e coletivos", category: "civil" },
  { id: "reclamacao-constitucional", label: "Reclamação Constitucional", icon: Scale, desc: "Garantia de autoridade de decisão do tribunal", category: "civil" },
  { id: "execucao-titulo-extrajudicial", label: "Execução de Título Extrajudicial", icon: FileCheck, desc: "Ação de execução", category: "civil" },
  { id: "embargos-execucao", label: "Embargos à Execução", icon: Shield, desc: "Defesa em ação de execução", category: "civil" },
  { id: "embargos-terceiro", label: "Embargos de Terceiro", icon: Shield, desc: "Proteção de posse de terceiro", category: "civil" },
  { id: "acao-rescisoria", label: "Ação Rescisória", icon: Gavel, desc: "Rescisão de sentença transitada", category: "civil" },
  { id: "recurso-inominado", label: "Recurso Inominado", icon: Scale, desc: "Recurso em JEC", category: "civil" },
  { id: "peticao-inicial-jec", label: "Petição Inicial JEC", icon: Gavel, desc: "Ação no Juizado Especial Cível", category: "civil" },
  { id: "acao-monitoria", label: "Ação Monitória", icon: Gavel, desc: "Cobrança via procedimento monitório", category: "civil" },
  { id: "desconsideracao-personalidade", label: "Desconsideração da Personalidade Jurídica", icon: Gavel, desc: "Incidente de desconsideração", category: "civil" },
  { id: "emenda-inicial-civil", label: "Emenda à Inicial", icon: FileText, desc: "Correção/complementação da petição inicial", category: "civil" },
  { id: "recuperacao-judicial", label: "Pedido de Recuperação Judicial", icon: Gavel, desc: "Recuperação judicial de empresa", category: "civil" },
  { id: "manifestacao-impugnacao-civil", label: "Manifestação à Impugnação", icon: FileText, desc: "Resposta à impugnação ao cumprimento de sentença", category: "civil" },
  { id: "contraminuta-agravo", label: "Contraminuta ao Agravo de Instrumento", icon: Shield, desc: "Resposta ao agravo de instrumento", category: "civil" },
  { id: "contraminuta-agravo-interno", label: "Contraminuta ao Agravo Interno", icon: Shield, desc: "Resposta ao agravo interno", category: "civil" },
  { id: "recurso-ordinario-constitucional-civil", label: "Recurso Ordinário Constitucional (Civil)", icon: Scale, desc: "ROC em matéria cível", category: "civil" },
  { id: "memoriais-recursais-civil", label: "Memoriais Recursais (Civil)", icon: FileText, desc: "Memoriais em fase recursal cível", category: "civil" },
  { id: "contrarrazoes-recurso-especial-civil", label: "Contrarrazões ao REsp (Civil)", icon: Shield, desc: "Resposta ao recurso especial", category: "civil" },
  { id: "agravo-recurso-especial", label: "Agravo em Recurso Especial", icon: Scale, desc: "AREsp", category: "civil" },
  { id: "recurso-extraordinario-civil", label: "Recurso Extraordinário (Civil)", icon: Scale, desc: "RE ao STF em matéria cível", category: "civil" },
  { id: "embargos-divergencia", label: "Embargos de Divergência", icon: Scale, desc: "Uniformização de jurisprudência", category: "civil" },
  { id: "embargos-execucao-fiscal", label: "Embargos à Execução Fiscal", icon: Shield, desc: "Defesa em execução fiscal", category: "civil" },
  { id: "excecao-pre-executividade", label: "Exceção de Pré-Executividade", icon: Shield, desc: "Defesa sem garantia do juízo", category: "civil" },
  { id: "impugnacao-penhora", label: "Impugnação à Penhora", icon: Shield, desc: "Impugnação a ato de penhora", category: "civil" },
  { id: "adjudicacao-compulsoria", label: "Adjudicação Compulsória", icon: Gavel, desc: "Ação de adjudicação compulsória", category: "civil" },
  { id: "sustacao-protesto", label: "Sustação de Protesto", icon: Gavel, desc: "Ação cautelar de sustação de protesto", category: "civil" },
  { id: "busca-apreensao-menor", label: "Busca e Apreensão de Menor", icon: Gavel, desc: "Busca e apreensão de menor com tutela de urgência", category: "civil" },
  { id: "acordo-judicial-extincao", label: "Acordo Judicial e Extinção do Processo", icon: Handshake, desc: "Acordo judicial com pedido de extinção", category: "civil" },
  { id: "cumprimento-provisorio", label: "Cumprimento Provisório de Sentença", icon: FileCheck, desc: "Execução provisória de sentença", category: "civil" },
  { id: "contrarrazoes-recurso-inominado", label: "Contrarrazões ao Recurso Inominado", icon: Shield, desc: "Resposta ao recurso inominado", category: "civil" },
  { id: "quesitos-periciais-civil", label: "Quesitos Periciais (Civil)", icon: BookOpen, desc: "Apresentação de quesitos para perícia", category: "civil" },
  { id: "producao-provas-civil", label: "Manifestação para Produção de Provas", icon: FileText, desc: "Requerimento de provas", category: "civil" },

  // TRABALHISTA
  { id: "reclamacao-trabalhista", label: "Reclamação Trabalhista", icon: Gavel, desc: "Ação trabalhista", category: "trabalhista" },
  { id: "contestacao-trabalhista", label: "Contestação Trabalhista", icon: Shield, desc: "Defesa em reclamação trabalhista", category: "trabalhista" },
  { id: "replica-trabalhista", label: "Réplica Trabalhista", icon: Shield, desc: "Impugnação à contestação trabalhista", category: "trabalhista" },
  { id: "recurso-ordinario-trabalhista", label: "Recurso Ordinário Trabalhista", icon: Scale, desc: "Recurso ordinário ao TRT", category: "trabalhista" },
  { id: "contrarrazoes-ro-trabalhista", label: "Contrarrazões ao RO Trabalhista", icon: Shield, desc: "Resposta ao recurso ordinário trabalhista", category: "trabalhista" },
  { id: "recurso-revista", label: "Recurso de Revista", icon: Scale, desc: "Recurso ao TST", category: "trabalhista" },
  { id: "agravo-peticao-trabalhista", label: "Agravo de Petição", icon: Scale, desc: "Recurso em execução trabalhista", category: "trabalhista" },
  { id: "embargos-declaracao-trabalhista", label: "Embargos de Declaração (Trabalhista)", icon: BookOpen, desc: "Esclarecimento em processo trabalhista", category: "trabalhista" },
  { id: "alegacoes-finais-trabalhista", label: "Alegações Finais (Trabalhista)", icon: FileText, desc: "Razões finais em audiência trabalhista", category: "trabalhista" },
  { id: "cumprimento-sentenca-trabalhista", label: "Cumprimento de Sentença (Trabalhista)", icon: FileCheck, desc: "Execução de sentença trabalhista", category: "trabalhista" },
  { id: "embargos-execucao-trabalhista", label: "Embargos à Execução (Trabalhista)", icon: Shield, desc: "Defesa em execução trabalhista", category: "trabalhista" },
  { id: "acordo-extrajudicial-trabalhista", label: "Acordo Extrajudicial Trabalhista", icon: Handshake, desc: "Acordo conforme CLT art. 855-B a 855-E", category: "trabalhista" },
  { id: "consignacao-pagamento-trab", label: "Consignação em Pagamento (Trabalhista)", icon: Gavel, desc: "Ação de consignação em pagamento trabalhista", category: "trabalhista" },
  { id: "acao-monitoria-trab", label: "Ação Monitória (Trabalhista)", icon: Gavel, desc: "Procedimento monitório trabalhista", category: "trabalhista" },
  { id: "emenda-inicial-trab", label: "Emenda à Inicial (Trabalhista)", icon: FileText, desc: "Correção da reclamação trabalhista", category: "trabalhista" },
  { id: "quesitos-periciais-trab", label: "Quesitos Periciais (Trabalhista)", icon: BookOpen, desc: "Quesitos para perícia trabalhista", category: "trabalhista" },
  { id: "manifestacao-trab", label: "Manifestação Processual (Trabalhista)", icon: FileText, desc: "Manifestação genérica em processo trabalhista", category: "trabalhista" },
  { id: "agravo-instrumento-trab", label: "Agravo de Instrumento (Trabalhista)", icon: Scale, desc: "AI para destrancar recurso de revista", category: "trabalhista" },
  { id: "contraminuta-ai-trab", label: "Contraminuta ao AI (Trabalhista)", icon: Shield, desc: "Resposta ao agravo de instrumento trabalhista", category: "trabalhista" },
  { id: "recurso-adesivo-trab", label: "Recurso Adesivo (Trabalhista)", icon: Scale, desc: "Recurso adesivo ao recurso ordinário", category: "trabalhista" },
  { id: "contrarrazoes-revista", label: "Contrarrazões ao Recurso de Revista", icon: Shield, desc: "Resposta ao recurso de revista", category: "trabalhista" },
  { id: "agravo-regimental-trab", label: "Agravo Regimental (Trabalhista)", icon: Scale, desc: "Agravo regimental trabalhista", category: "trabalhista" },
  { id: "embargos-sdi1-tst", label: "Embargos para a SDI-1 do TST", icon: Scale, desc: "Embargos à SDI-1 do TST", category: "trabalhista" },
  { id: "recurso-extraordinario-trab", label: "Recurso Extraordinário (Trabalhista)", icon: Scale, desc: "RE ao STF em matéria trabalhista", category: "trabalhista" },
  { id: "acao-rescisoria-trab", label: "Ação Rescisória (Trabalhista)", icon: Gavel, desc: "Rescisão de sentença trabalhista", category: "trabalhista" },
  { id: "impugnacao-cumprimento-trab", label: "Impugnação ao Cumprimento (Trabalhista)", icon: Shield, desc: "Defesa em cumprimento de sentença trabalhista", category: "trabalhista" },
  { id: "contrarrazoes-agravo-peticao", label: "Contrarrazões ao Agravo de Petição", icon: Shield, desc: "Resposta ao agravo de petição trabalhista", category: "trabalhista" },
  { id: "pedido-revisao-trab", label: "Pedido de Revisão (Trabalhista)", icon: FileText, desc: "Pedido de revisão trabalhista", category: "trabalhista" },

  // CONTRATO
  { id: "contrato-servicos", label: "Contrato de Prestação de Serviços", icon: Handshake, desc: "Contrato entre prestador e contratante", category: "contrato" },
  { id: "contrato-honorarios", label: "Contrato de Honorários", icon: Briefcase, desc: "Honorários advocatícios contratuais", category: "contrato" },
  { id: "contrato-locacao", label: "Contrato de Locação", icon: Home, desc: "Locação residencial ou comercial", category: "contrato" },
  { id: "contrato-modelo", label: "Criar Contrato a Partir de Modelo", icon: FileText, desc: "Gerar contrato baseado em modelo padrão", category: "contrato" },
  { id: "revisar-contrato", label: "Revisar Contrato", icon: BookOpen, desc: "Revisão de cláusulas e riscos", category: "contrato" },
  { id: "analise-contrato-parecer", label: "Análise de Contrato com Parecer", icon: BookOpen, desc: "Parecer técnico sobre contrato", category: "contrato" },
  { id: "comparar-contratos", label: "Comparar Contratos", icon: FileText, desc: "Comparação entre versões de contratos", category: "contrato" },
  { id: "aditivo-contratual", label: "Criar Aditivo", icon: FileText, desc: "Aditivo a contrato existente", category: "contrato" },
  { id: "termo-encerramento", label: "Termo de Encerramento", icon: FileCheck, desc: "Encerramento de relação contratual", category: "contrato" },
  { id: "termo-confidencialidade", label: "Termo de Confidencialidade (NDA)", icon: Shield, desc: "Proteção de informações sigilosas", category: "contrato" },
  { id: "termos-uso", label: "Termos de Uso", icon: FileText, desc: "Termos de uso para plataformas/serviços", category: "contrato" },

  // EXTRAJUDICIAL
  { id: "procuracao-ad-judicia", label: "Procuração Ad Judicia", icon: PenTool, desc: "Outorga de poderes para atuação judicial", category: "extrajudicial" },
  { id: "procuracao-ad-negotia", label: "Procuração Ad Negotia", icon: PenTool, desc: "Outorga de poderes para atos extrajudiciais", category: "extrajudicial" },
  { id: "notificacao-extrajudicial", label: "Notificação Extrajudicial", icon: AlertTriangle, desc: "Notificação com embasamento legal", category: "extrajudicial" },
  { id: "acordo-extrajudicial", label: "Acordo Extrajudicial", icon: ScrollText, desc: "Acordo/transação entre partes (art. 784 CPC)", category: "extrajudicial" },
  { id: "acordo-familia", label: "Acordo de Divórcio/Partilha/Alimentos/Guarda/Visitas", icon: Users, desc: "Acordo familiar consensual (Lei 11.441/07)", category: "extrajudicial" },
  { id: "acordo-alimentos-guarda", label: "Acordo de Alimentos, Guarda e Visitas", icon: Users, desc: "Acordo de alimentos, guarda e regulamentação de visitas", category: "extrajudicial" },
  { id: "parecer-juridico", label: "Parecer Jurídico", icon: BookOpen, desc: "Análise técnica fundamentada", category: "extrajudicial" },
  { id: "declaracao", label: "Declaração / Termo", icon: ClipboardList, desc: "Declarações, atas e termos diversos", category: "extrajudicial" },
  { id: "recibo", label: "Recibo de Pagamento", icon: FileCheck, desc: "Recibo gerado automaticamente", category: "extrajudicial" },

  // ACADÊMICO
  { id: "monografia-juridica", label: "Monografia Jurídica", icon: GraduationCap, desc: "Monografia para TCC de Direito (ABNT NBR 14724)", category: "academico" },
  { id: "tcc-direito", label: "TCC de Direito", icon: GraduationCap, desc: "Trabalho de Conclusão de Curso (ABNT NBR 14724)", category: "academico" },
  { id: "artigo-cientifico", label: "Artigo Científico Jurídico", icon: BookOpen, desc: "Artigo acadêmico para periódico (ABNT)", category: "academico" },
  { id: "projeto-pesquisa", label: "Projeto de Pesquisa", icon: FileText, desc: "Projeto de pesquisa acadêmica (ABNT)", category: "academico" },

  // INTERNACIONAL / EMPRESARIAL
  { id: "loi-internacional", label: "Letter of Intent (LOI)", icon: Globe, desc: "Carta de intenção para parcerias internacionais", category: "internacional" },
  { id: "mou-internacional", label: "Memorandum of Understanding (MOU)", icon: Globe, desc: "Acordo preliminar entre empresas internacionais", category: "internacional" },
  { id: "nda-internacional", label: "NDA Internacional (Bilíngue)", icon: Shield, desc: "Acordo de confidencialidade bilíngue EN/PT", category: "internacional" },
  { id: "contrato-distribuicao-internacional", label: "Contrato de Distribuição Internacional", icon: Globe, desc: "Distribuição de produtos em outro país", category: "internacional" },
  { id: "contrato-representacao-comercial", label: "Contrato de Representação Comercial", icon: Briefcase, desc: "Agente/representante comercial internacional", category: "internacional" },
  { id: "supply-agreement", label: "Supply Agreement", icon: Globe, desc: "Contrato de fornecimento internacional", category: "internacional" },
  { id: "joint-venture-agreement", label: "Joint Venture Agreement", icon: Handshake, desc: "Parceria empresarial internacional", category: "internacional" },
  { id: "proposta-comercial-internacional", label: "Proposta Comercial Internacional", icon: FileText, desc: "Proposta formal de negócios internacionais", category: "internacional" },
  { id: "invoice-proforma", label: "Invoice Proforma", icon: ClipboardList, desc: "Fatura proforma para exportação", category: "internacional" },
  { id: "estudo-viabilidade", label: "Estudo de Viabilidade", icon: Scale, desc: "Estudo de viabilidade para projetos industriais", category: "internacional" },
  { id: "due-diligence-report", label: "Due Diligence Report", icon: BookOpen, desc: "Relatório de due diligence empresarial", category: "internacional" },
  { id: "term-sheet", label: "Term Sheet", icon: FileText, desc: "Termos principais de negociação", category: "internacional" },
  { id: "power-of-attorney-internacional", label: "Power of Attorney (Internacional)", icon: PenTool, desc: "Procuração para atos no exterior", category: "internacional" },
  { id: "compliance-report", label: "Compliance Report", icon: FileCheck, desc: "Relatório de conformidade GDPR/ambiental", category: "internacional" },
  { id: "partnership-agreement", label: "Partnership Agreement", icon: Handshake, desc: "Acordo de parceria estratégica", category: "internacional" },

  // FERRAMENTAS
  { id: "pesquisa-jurisprudencial-doc", label: "Pesquisa Jurisprudencial Completa", icon: Scale, desc: "Documento completo de jurisprudência com ementa, relatório, voto e decisão", category: "ferramentas" },
  { id: "upload", label: "Upload de Documento", icon: FileText, desc: "Upload manual de arquivo", category: "ferramentas" },
  { id: "busca-jurisprudencia", label: "Busca de Jurisprudência", icon: BookOpen, desc: "Pesquisa jurisprudencial inteligente", category: "ferramentas" },
  { id: "calculadora-liquidacao", label: "Calculadora de Liquidação Cível", icon: Scale, desc: "Cálculo de valores para liquidação", category: "ferramentas" },
  { id: "chat-juridico", label: "Chat Jurídico", icon: Send, desc: "Consulte dúvidas com IA jurídica", category: "ferramentas" },
  { id: "melhorar-documento", label: "Melhorar Documento com IA", icon: Sparkles, desc: "Aprimoramento de texto jurídico", category: "ferramentas" },
  { id: "resumir-visual-law", label: "Resumir com Visual Law", icon: FileText, desc: "Resumo visual de documentos", category: "ferramentas" },
  { id: "resumir-documento", label: "Resumir Documentos e Processo", icon: FileText, desc: "Resumo completo de documentos", category: "ferramentas" },
  { id: "transcricao-audio", label: "Transcrição de Áudio", icon: FileText, desc: "Transcrever áudio para texto", category: "ferramentas" },
  { id: "medidas-cabiveis", label: "Medidas Cabíveis para um Caso", icon: Scale, desc: "Análise de medidas jurídicas aplicáveis", category: "ferramentas" },
  { id: "explicacao-movimento", label: "Explicação de Movimento Processual", icon: BookOpen, desc: "Tradução de movimentações em linguagem clara", category: "ferramentas" },
  { id: "legenda-rede-social", label: "Legenda para Post Profissional", icon: PenTool, desc: "Legenda jurídica para redes sociais", category: "ferramentas" },
  { id: "relatorio-processual", label: "Relatório Processual para Cliente", icon: ClipboardList, desc: "Relatório detalhado para enviar ao cliente", category: "ferramentas" },
  { id: "roteiro-audiencia", label: "Roteiro para Audiência", icon: ClipboardList, desc: "Preparação e roteiro para audiência", category: "ferramentas" },
  { id: "roteiro-sustentacao-oral", label: "Roteiro para Sustentação Oral", icon: ClipboardList, desc: "Preparação para sustentação oral", category: "ferramentas" },
  { id: "roteiro-primeira-consulta", label: "Roteiro para Primeira Consulta", icon: ClipboardList, desc: "Guia para atendimento inicial do cliente", category: "ferramentas" },
  { id: "documentos-necessarios", label: "Documentos Necessários para um Caso", icon: ClipboardList, desc: "Lista de documentos para instrução", category: "ferramentas" },
  { id: "quesitos-pericia", label: "Quesitos para Perícia Judicial", icon: BookOpen, desc: "Elaboração de quesitos periciais", category: "ferramentas" },
];


export const initialFormData: FormData = {
  tipo: "",
  parteAutora: "",
  parteRe: "",
  qualificacaoAutora: "",
  qualificacaoRe: "",
  correus: [],
  testemunhas: [],
  fatos: "",
  pedidos: "",
  valorCausa: "",
  tribunal: "",
  tribunalId: "",
  tipoVara: "",
  comarca: "Porto Alegre",
  numeroVara: "",
  areaJuridica: "",
  numeroProcesso: "",
  tom: "formal",
  incluirJurisprudencia: true,
  incluirTestemunhasAssinatura: false,
  watermark: "rascunho",
  clausulasExtras: "",
  foroEleicao: "",
  modelo: "",
  jurisdicao: "brasil",
  uploadedDocuments: [],
};

export default function GerarDocumento() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  // Queue hook for async generation
  const {
    enqueue,
    jobStatus,
    jobResult,
    jobMetadata,
    jobError,
    isPolling,
    activeJobId,
    jobStartTime,
    reset: resetQueue,
  } = useGenerationQueue();

  // Draft hook for persistence
  const {
    draft,
    saveDraft,
    clearDraft,
    restoreDraft,
    isSaving,
    lastSavedAt,
    hasDraft,
  } = useDocumentDraft(initialFormData);

  const tipoFromUrl = searchParams.get("tipo") || "";
  const docIdFromUrl = searchParams.get("doc") || "";
  
  // Track the current URL key so we can reset state when navigating back to a clean URL
  const urlKey = `${tipoFromUrl}|${docIdFromUrl}`;

  // Initialize step: if we have a draft, defer to restore; otherwise use URL param
  const localDraft = typeof window !== 'undefined' && !docIdFromUrl ? (() => {
    try {
      const raw = localStorage.getItem('document_draft');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })() : null;

  const [step, setStep] = useState(() => {
    if (docIdFromUrl) return 1;
    if (localDraft) return localDraft.step || 1;
    return tipoFromUrl ? 2 : 1;
  });
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(() => localDraft?.generatedContent || "");
  const [editedContent, setEditedContent] = useState(() => localDraft?.editedContent || "");
  const [qualificationResponses, setQualificationResponses] = useState<Record<string, string>>(() => localDraft?.qualificationResponses || {});
  const [forceLetterhead, setForceLetterhead] = useState(true);
  const [customMarginTop, setCustomMarginTop] = useState(30);
  const [customMarginBottom, setCustomMarginBottom] = useState(20);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(!!localDraft);
  const [loadingSavedDoc, setLoadingSavedDoc] = useState(!!docIdFromUrl);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [advogadoInfo, setAdvogadoInfo] = useState<{ nome: string; oab: string } | undefined>();

  const [formData, setFormData] = useState<FormData>(() => {
    if (localDraft?.formData) return localDraft.formData;
    return { ...initialFormData, tipo: tipoFromUrl };
  });

  // Reset all state when navigating back to clean /gerar-documento (no doc param)
  useEffect(() => {
    if (!docIdFromUrl && !tipoFromUrl) {
      setStep(1);
      setGenerating(false);
      setGeneratedContent("");
      setEditedContent("");
      setQualificationResponses({});
      setFormData({ ...initialFormData });
      setSavedDocId(null);
      setLoadingSavedDoc(false);
      setHasRestoredDraft(false);
      resetQueue();
    }
  }, [urlKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadLawyerInfo = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: config } = await supabase
            .from("escritorio_config")
            .select("nome_escritorio, oab")
            .eq("user_id", session.user.id)
            .maybeSingle();
          if (config?.nome_escritorio && config?.oab) {
            setAdvogadoInfo({ nome: config.nome_escritorio, oab: config.oab });
          }
        }
      } catch (e) { console.warn("[GerarDoc] Failed to load lawyer info, using defaults:", e); }
    };
    loadLawyerInfo();
  }, []);

  // Load saved document when ?doc=ID is present
  useEffect(() => {
    if (!docIdFromUrl) return;
    const loadDoc = async () => {
      setLoadingSavedDoc(true);
      try {
        const { data: doc, error } = await supabase
          .from("documents")
          .select("*")
          .eq("id", docIdFromUrl)
          .single();
        if (error || !doc) {
          toast({ title: "Documento não encontrado", variant: "destructive" });
          setLoadingSavedDoc(false);
          return;
        }
        const meta = (doc.metadata as Record<string, any>) || {};
        setFormData({
          ...initialFormData,
          tipo: doc.document_type || "",
          parteAutora: doc.parties_author || "",
          parteRe: doc.parties_defendant || "",
          numeroProcesso: doc.case_number || "",
          watermark: doc.watermark || "rascunho",
          tom: meta.tom || "formal",
          tribunalId: meta.tribunalId || "",
          tribunal: meta.tribunal || "",
          comarca: meta.comarca || "Porto Alegre",
          tipoVara: meta.tipoVara || "",
          numeroVara: meta.numeroVara || "",
          areaJuridica: meta.areaJuridica || "",
          valorCausa: meta.valorCausa || "",
          foroEleicao: meta.foroEleicao || "",
          fatos: "",
          pedidos: "",
        });
        setEditedContent(doc.content || "");
        setGeneratedContent(doc.content || "");
        setSavedDocId(doc.id);
        if (meta.letterhead !== undefined) setForceLetterhead(!!meta.letterhead);
        if (meta.customMarginTop !== undefined) setCustomMarginTop(meta.customMarginTop);
        if (meta.customMarginBottom !== undefined) setCustomMarginBottom(meta.customMarginBottom);
        setStep(4);
        setHasRestoredDraft(true);
      } catch {
        toast({ title: "Erro ao carregar documento", variant: "destructive" });
      }
      setLoadingSavedDoc(false);
    };
    loadDoc();
  }, [docIdFromUrl]);

  // Pick up context from FloatingAssistant (sessionStorage + custom event)
  const applyAssistantContext = useCallback((ctx: { docType?: string; details?: string; parteAutora?: string; parteRe?: string; fatos?: string }) => {
    if (ctx.docType) {
      const matchedType = documentTypes.find(dt => dt.id === ctx.docType);
      if (matchedType) {
        const autoArea = getAutoAreaForCategory(matchedType.category);
        // Build the new formData with all extracted fields at once
        setFormData(prev => ({
          ...prev,
          tipo: matchedType.id,
          areaJuridica: autoArea || prev.areaJuridica,
          parteAutora: ctx.parteAutora || prev.parteAutora,
          parteRe: ctx.parteRe || prev.parteRe,
          fatos: ctx.fatos || ctx.details || prev.fatos,
        }));
        // Clear draft state to start fresh
        localStorage.removeItem('document_draft');
        setGeneratedContent("");
        setEditedContent("");
        setQualificationResponses({});
        setHasRestoredDraft(false);
        setSavedDocId(null);
        setStep(2);
        const filledFields: string[] = [];
        if (ctx.parteAutora) filledFields.push(`Autor: ${ctx.parteAutora}`);
        if (ctx.parteRe) filledFields.push(`Réu: ${ctx.parteRe}`);
        if (ctx.fatos || ctx.details) filledFields.push("Fatos");
        toast({
          title: "Assistente IA",
          description: `Tipo "${matchedType.label}" selecionado.${filledFields.length > 0 ? ` Campos preenchidos: ${filledFields.join(", ")}.` : " Preencha os detalhes."}`,
        });
      }
    } else {
      // No doc type but may have details
      if (ctx.parteAutora || ctx.parteRe || ctx.fatos) {
        setFormData(prev => ({
          ...prev,
          parteAutora: ctx.parteAutora || prev.parteAutora,
          parteRe: ctx.parteRe || prev.parteRe,
          fatos: ctx.fatos || ctx.details || prev.fatos,
        }));
        toast({
          title: "Assistente IA",
          description: "Campos preenchidos automaticamente a partir do comando.",
        });
      }
    }
  }, [toast]);

  // On mount: check sessionStorage
  useEffect(() => {
    if (docIdFromUrl) return;
    try {
      const raw = sessionStorage.getItem("assistente_doc_context");
      if (!raw) return;
      const ctx = JSON.parse(raw);
      if (ctx.timestamp && Date.now() - ctx.timestamp > 60000) {
        sessionStorage.removeItem("assistente_doc_context");
        return;
      }
      sessionStorage.removeItem("assistente_doc_context");
      applyAssistantContext(ctx);
    } catch { /* ignore */ }
  }, [docIdFromUrl, applyAssistantContext]);

  // Listen for custom event (when already on the same route)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        sessionStorage.removeItem("assistente_doc_context");
        applyAssistantContext(detail);
      }
    };
    window.addEventListener("assistente-doc-context", handler);
    return () => window.removeEventListener("assistente-doc-context", handler);
  }, [applyAssistantContext]);

  // Listen for "preenche automático" event from FloatingAssistant
  useEffect(() => {
    const handler = () => {
      // Auto-fill with example/placeholder data based on current document type
      const docConfig = documentTypes.find(dt => dt.id === formData.tipo);
      const category = docConfig?.category || "";
      
      setFormData(prev => ({
        ...prev,
        parteAutora: prev.parteAutora || "João da Silva",
        qualificacaoAutora: prev.qualificacaoAutora || "brasileiro, solteiro, portador do RG nº 00.000.000-0 e CPF nº 000.000.000-00, residente e domiciliado na Rua Exemplo, nº 100, Centro, Porto Alegre/RS",
        parteRe: prev.parteRe || (["contrato", "extrajudicial"].includes(category) ? "Empresa Exemplo Ltda." : "Maria de Souza"),
        qualificacaoRe: prev.qualificacaoRe || (["contrato", "extrajudicial"].includes(category)
          ? "pessoa jurídica de direito privado, inscrita no CNPJ sob nº 00.000.000/0001-00, com sede na Av. Exemplo, nº 200, Porto Alegre/RS"
          : "brasileira, casada, portadora do RG nº 00.000.000-0 e CPF nº 000.000.000-00, residente e domiciliada na Rua Modelo, nº 50, Centro, Porto Alegre/RS"),
        fatos: prev.fatos || "Descreva aqui os fatos relevantes do caso...",
        pedidos: prev.pedidos || "Requer a Vossa Excelência que se digne a...",
        valorCausa: prev.valorCausa || "10.000,00",
        comarca: prev.comarca || "Porto Alegre",
      }));
      
      toast({
        title: "✍️ Preenchimento Automático",
        description: "Campos preenchidos com dados de exemplo. Revise e ajuste conforme o caso real.",
      });
    };
    window.addEventListener("assistente-autofill", handler);
    return () => window.removeEventListener("assistente-autofill", handler);
  }, [formData.tipo, toast]);

  // Auto-save document to DB (with PDF) when generation completes
  const autoSaveDocument = useCallback(async (content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !content) return null;

      const typeLabel = documentTypes.find(t => t.id === formData.tipo)?.label || formData.tipo || "Documento";
      const title = `${typeLabel}${formData.parteAutora ? ` — ${formData.parteAutora}` : ""}`;

      // Generate and upload PDF to storage
      let pdfStoragePath: string | null = null;
      try {
        const { generateHTMLPDFBlob } = await import("@/lib/generators");
        const { sanitizeStorageFileName } = await import("@/lib/utils");
        const pdfBlob = await generateHTMLPDFBlob({
          content,
          watermark: formData.watermark,
          documentType: formData.tipo,
          forceLetterhead,
          customMarginTop,
          customMarginBottom,
        });
        const pdfPath = `${user.id}/${Date.now()}-${sanitizeStorageFileName(title).substring(0, 50)}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(pdfPath, pdfBlob, { contentType: "application/pdf", upsert: true });
        if (!uploadError) {
          pdfStoragePath = pdfPath;
        }
      } catch (pdfErr) {
      }

      const { data: saved, error } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          title,
          content,
          document_type: formData.tipo || "geral",
          status: "rascunho",
          watermark: formData.watermark || "rascunho",
          parties_author: formData.parteAutora || null,
          parties_defendant: formData.parteRe || null,
          case_number: formData.numeroProcesso || null,
          pdf_url: pdfStoragePath,
          tags: [documentTypes.find(t => t.id === formData.tipo)?.category || "geral"],
          metadata: {
            areaJuridica: formData.areaJuridica,
            tribunalId: formData.tribunalId,
            tribunal: formData.tribunal,
            comarca: formData.comarca,
            tipoVara: formData.tipoVara,
            numeroVara: formData.numeroVara,
            tom: formData.tom,
            valorCausa: formData.valorCausa,
            letterhead: forceLetterhead,
            customMarginTop,
            customMarginBottom,
            storage_path: pdfStoragePath,
            auto_saved: true,
          },
        })
        .select("id")
        .single();

      if (error) throw error;
      return saved?.id || null;
    } catch (err) {
      return null;
    }
  }, [formData, forceLetterhead, customMarginTop, customMarginBottom]);

  // When queue job completes, update content and auto-save
  // Guard: track whether we already processed this particular job result to prevent duplicates
  const [lastProcessedJobId, setLastProcessedJobId] = useState<string | null>(null);

  useEffect(() => {
    if (jobStatus === "completed" && jobResult) {
      // Prevent duplicate auto-saves when navigating away and back
      if (activeJobId && activeJobId === lastProcessedJobId) {
        // Already processed this job — just restore UI state without re-saving
        setGeneratedContent(jobResult);
        setEditedContent(jobResult);
        setStep(4);
        setGenerating(false);
        return;
      }

      setGeneratedContent(jobResult);
      setEditedContent(jobResult);
      setStep(4);
      setGenerating(false);
      if (activeJobId) setLastProcessedJobId(activeJobId);

      const isFromCache = jobMetadata?.fromCache === true;
      const cacheSimilarity = jobMetadata?.cacheSimilarity as number | undefined;

      // Auto-save the document
      autoSaveDocument(jobResult).then((docId) => {
        if (docId) {
          setSavedDocId(docId);
          if (isFromCache) {
            toast({
              title: "♻️ Documento recuperado do cache neural!",
              description: `Similaridade: ${cacheSimilarity ? Math.round(cacheSimilarity * 100) : "—"}% — Créditos de IA economizados. Documento salvo automaticamente.`,
            });
          } else {
            toast({
              title: "✅ Documento gerado e salvo!",
              description: "Seu documento foi salvo automaticamente em 'Meus Documentos'. Você pode editar, baixar ou assinar.",
            });
          }
        } else {
          const wasFallback = jobMetadata?.fallback === true;
          toast({
            title: isFromCache ? "♻️ Documento do cache neural" : wasFallback ? "Documento gerado (fallback)" : "Documento gerado!",
            description: isFromCache
              ? "Recuperado do cache semântico — sem consumo de créditos de IA."
              : "Revise o conteúdo e salve em uma pasta.",
          });
        }

        // 🧠 Neural feedback: registra geração bem-sucedida como sinal RLHF
        const typeLabel = documentTypes.find(t => t.id === formData.tipo)?.label || formData.tipo;
      });
    } else if (jobStatus === "failed") {
      setGenerating(false);
      toast({
        title: "Erro na geração",
        description: jobError || "O documento não pôde ser gerado após múltiplas tentativas.",
        variant: "destructive",
      });
    }
  }, [jobStatus, jobResult, jobMetadata, jobError, toast, autoSaveDocument, activeJobId, lastProcessedJobId]);


  // When returning to page with an active job in background, show step 3 with progress
  useEffect(() => {
    if (activeJobId && (jobStatus === "pending" || jobStatus === "processing" || jobStatus === "queued")) {
      // Reconnected to an in-progress job — make sure we're on the generating step
      if (step < 3) setStep(3);
      setGenerating(true);
    }
  }, [activeJobId, jobStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore draft on mount (only once) — also handles Supabase fallback
  useEffect(() => {
    if (hasRestoredDraft) return;

    const savedDraft = restoreDraft();
    if (savedDraft) {
      setFormData(savedDraft.formData);
      setEditedContent(savedDraft.editedContent);
      setGeneratedContent(savedDraft.generatedContent || savedDraft.editedContent);
      setStep(savedDraft.step);
      if (savedDraft.forceLetterhead !== undefined) setForceLetterhead(savedDraft.forceLetterhead);
      if (savedDraft.customMarginTop !== undefined) setCustomMarginTop(savedDraft.customMarginTop);
      if (savedDraft.customMarginBottom !== undefined) setCustomMarginBottom(savedDraft.customMarginBottom);
      setHasRestoredDraft(true);
      
      if (savedDraft.step > 1 || savedDraft.formData.fatos || savedDraft.editedContent) {
        toast({
          title: "Rascunho restaurado",
          description: "Seu progresso anterior foi recuperado automaticamente.",
        });
      }
    } else {
      setHasRestoredDraft(true);
    }
  }, [restoreDraft, toast, hasRestoredDraft]);

  // Auto-save on form changes - including generated content
  // Only persist when there's meaningful data to avoid overwriting a good draft with empty state
  useEffect(() => {
    if (!hasRestoredDraft) return;
    
    const hasContent = editedContent || generatedContent || formData.tipo || formData.fatos || formData.parteAutora;
    if (!hasContent && step <= 1) return; // Don't overwrite saved draft with empty state
    
    saveDraft({
      formData,
      editedContent,
      generatedContent,
      qualificationResponses,
      step,
      forceLetterhead,
      customMarginTop,
      customMarginBottom,
    });
  }, [formData, editedContent, generatedContent, qualificationResponses, step, forceLetterhead, customMarginTop, customMarginBottom, saveDraft, hasRestoredDraft]);

  const selectedType = documentTypes.find((t) => t.id === formData.tipo);

  const handleSelectType = (tipoId: string) => {
    const selected = documentTypes.find((t) => t.id === tipoId);
    const isJud = selected?.category ? judicialCategories.includes(selected.category) : false;
    
    // Auto-set area juridica from category
    const autoArea = getAutoAreaForCategory(selected?.category);
    
    const isContrato = selected?.category === "contrato" || selected?.category === "extrajudicial";
    setFormData((prev) => ({
      ...prev,
      tipo: tipoId,
      watermark: isJud ? "none" : prev.watermark === "none" ? "rascunho" : prev.watermark,
      areaJuridica: autoArea || prev.areaJuridica,
      incluirTestemunhasAssinatura: isContrato,
    }));
    // Default: timbre habilitado para TODOS os tipos
    setForceLetterhead(true);
    setStep(2); // Step 2 = qualification questions (reordered)
  };

  const handleRestore = useCallback(() => {
    const savedDraft = restoreDraft();
    if (savedDraft && (savedDraft.editedContent || savedDraft.generatedContent || savedDraft.formData?.tipo)) {
      const restoredContent = savedDraft.editedContent || savedDraft.generatedContent || "";
      const restoredStep = restoredContent
        ? 4
        : savedDraft.formData?.tipo
        ? 2
        : 1;

      setFormData(savedDraft.formData);
      setGeneratedContent(savedDraft.generatedContent || "");
      setEditedContent(restoredContent);
      setStep(restoredStep);
      toast({
        title: "✅ Rascunho restaurado",
        description: restoredStep === 4
          ? "Documento recuperado. Continue editando."
          : `Dados recuperados. Continuando da etapa ${restoredStep}.`,
      });
    } else {
      toast({
        title: "Nenhum rascunho encontrado",
        description: "Não há rascunho salvo para restaurar. Comece um novo documento.",
        variant: "destructive",
      });
    }
  }, [restoreDraft, toast]);

  const handleClearDraft = useCallback(async () => {
    if (!hasDraft) {
      toast({
        title: "Nenhum rascunho encontrado",
        description: "Não há rascunho salvo para apagar.",
        variant: "destructive",
      });
      return;
    }
    await clearDraft();
    resetQueue();
    setFormData({ ...initialFormData, tipo: searchParams.get("tipo") || "" });
    setEditedContent("");
    setStep(1);
    toast({
      title: "🗑️ Rascunho apagado",
      description: "Rascunho removido. Você pode começar um novo documento.",
    });
  }, [clearDraft, resetQueue, searchParams, toast, hasDraft]);

  // (Step navigation is now: 1→2 qualification, 2→3 data form, 3→generate→4 editor)

  // Step 3 → Generate: Validate, build prompt with qualification responses and enqueue
  const handleGenerateWithQualification = async (skipQualification = false) => {
    if (!formData.fatos.trim()) {
      toast({ title: "Preencha os dados", description: "Descreva os fatos/objeto do documento.", variant: "destructive" });
      return;
    }
    // Validate required upload slots
    const config = getDocTypeConfig(formData.tipo);
    const requiredSlots = (config.uploadSlots ?? []).filter(s => s.required);
    const uploaded = formData.uploadedDocuments ?? [];
    const missing = requiredSlots.filter(s => !uploaded.some(d => d.key === s.key));
    if (missing.length > 0) {
      toast({
        title: "Documentos obrigatórios",
        description: `Faça upload de: ${missing.map(s => s.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);

    const responses = skipQualification ? {} : qualificationResponses;
    const prompt = buildPrompt(formData, selectedType, responses, advogadoInfo);

    const jobId = await enqueue("document", {
      prompt,
      tipo: formData.tipo,
      modelo: formData.modelo,
      tribunal: formData.tribunalId,
      vara: formData.tipoVara,
      comarca: formData.comarca,
      areaJuridica: formData.areaJuridica,
      incluirJurisprudencia: formData.incluirJurisprudencia,
      incluirTestemunhasAssinatura: formData.incluirTestemunhasAssinatura,
      correus: (formData.correus ?? []).filter(c => c.nome.trim()),
      testemunhas: (formData.testemunhas ?? []).filter(t => t.nome.trim()),
      qualificationResponses: Object.keys(responses).length > 0 ? responses : undefined,
      jurisdicao: formData.jurisdicao,
    });

    if (!jobId) {
      setGenerating(false);
    }
  };

  const handleSkipToEditor = () => {
    if (!formData.tipo) {
      toast({ title: "Selecione o tipo", description: "Escolha o tipo de documento antes de redigir.", variant: "destructive" });
      return;
    }
    const category = documentTypes.find(t => t.id === formData.tipo)?.category;
    const template = getDocumentTemplateHTML(formData.tipo, category, advogadoInfo ? { nome: advogadoInfo.nome, oab: advogadoInfo.oab } : undefined);
    setEditedContent(template);
    setGeneratedContent("");
    setStep(4);
    toast({ title: "Modo redação manual", description: "Template carregado. Edite à vontade e use 'Aprimorar com IA' quando quiser." });
  };

  const stepLabel = step === 1
    ? "Selecione o tipo"
    : step === 2
    ? "Perguntas de qualificação"
    : step === 3
    ? "Preencha os dados"
    : "Edite e baixe";

  return (
    <div className={`animate-fade-in ${step === 4 ? "w-[calc(100%+2rem)] lg:w-[calc(100%+4rem)] -m-4 lg:-m-8" : "max-w-5xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0"}`}>
      {/* Header — hidden in step 4 (editor is full-bleed) */}
      <div className={`flex items-start sm:items-center justify-between gap-2 sm:gap-3 flex-wrap ${step === 4 ? "hidden" : ""}`}>
        <div className="flex items-center gap-2 sm:gap-3">
          {step > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setStep(step - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-serif text-foreground">
              Documento Jurídico
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              Etapa {step} de 4 — {stepLabel}
            </p>
          </div>
        </div>

        {/* Draft Indicator */}
        <DraftIndicator
          isSaving={isSaving}
          lastSavedAt={lastSavedAt}
          hasDraft={hasDraft}
          onRestore={handleRestore}
          onClear={handleClearDraft}
          showRestoreButton={step === 1 && hasDraft}
        />
      </div>

      {/* Progress Stepper */}
      <div className={`flex items-center gap-0 ${step === 4 ? "hidden" : ""}`}>
        {[
          { n: 1, label: "Tipo" },
          { n: 2, label: "Qualificação" },
          { n: 3, label: "Dados" },
          { n: 4, label: "Editor" },
        ].map(({ n, label }, idx) => (
          <div key={n} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-0.5 flex-1">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-all ${
                  n < step
                    ? "bg-primary text-primary-foreground"
                    : n === step
                    ? "bg-primary/20 text-primary ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground/40"
                }`}
              >
                {n < step ? "✓" : n}
              </div>
              <span className={`text-[9px] tracking-wide ${
                n <= step ? "text-foreground font-medium" : "text-muted-foreground/40"
              }`}>
                {label}
              </span>
            </div>
            {idx < 3 && (
              <div className={`h-px flex-1 mx-1 transition-colors ${
                n < step ? "bg-primary" : "bg-border"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Queue Status Banner */}
      {(jobStatus === "queued" || jobStatus === "processing") && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {jobStatus === "queued" ? "Na fila de geração..." : "Gerando documento..."}
            </p>
            <p className="text-xs text-muted-foreground">
              {jobStatus === "queued"
                ? "Seu documento será processado em breve. Você pode continuar navegando."
                : "A IA está redigindo seu documento com jurisprudência. Isso pode levar até 2 minutos."}
            </p>
          </div>
        </div>
      )}

      {/* Triple/Combined Pipeline Progress */}
      <TriplePipelineProgress
        isActive={generating}
        modelo={formData.modelo}
        jobStatus={jobStatus}
        jobMetadata={jobMetadata}
        jobStartTime={jobStartTime}
      />

      {/* Step 1: Select Type */}
      {step === 1 && (
        <DocumentTypeSelector
          selectedType={formData.tipo}
          onSelect={handleSelectType}
          types={documentTypes}
          categoryLabels={categoryLabels}
        />
      )}

      {/* Step 2: Refinement / Qualification Questions (first!) */}
      {step === 2 && (
        <RefinementQuestionsStep
          documentTypeId={formData.tipo}
          documentTypeLabel={selectedType?.label || formData.tipo}
          category={selectedType?.category}
          responses={qualificationResponses}
          onResponsesChange={setQualificationResponses}
          onGenerate={() => setStep(3)}
          onSkip={() => setStep(3)}
          onBack={() => setStep(1)}
          generating={generating}
          generalData={{
            parteAutora: formData.parteAutora,
            parteRe: formData.parteRe,
            fatos: formData.fatos,
          }}
          onGeneralDataChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
        />
      )}

      {/* Step 3: Fill Data + Generate */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Jurisdiction selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 bg-card border border-border p-3">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">Jurisdição</span>
            <JurisdictionSelector
              value={formData.jurisdicao}
              onChange={(j) => setFormData(prev => ({ ...prev, jurisdicao: j }))}
              size="sm"
            />
            <span className="text-[9px] text-muted-foreground sm:ml-auto">
              {formData.jurisdicao === "brasil" ? "🇧🇷 Fontes e legislação brasileiras" : formData.jurisdicao === "eua" ? "🇺🇸 US case law & statutes" : "🌐 Direito comparado BR + US"}
            </span>
          </div>
          <DocumentForm
            formData={formData}
            setFormData={setFormData}
            selectedType={selectedType}
            generating={generating}
            onGenerate={() => handleGenerateWithQualification(false)}
            onBack={() => setStep(2)}
            onSkipToEditor={handleSkipToEditor}
          />
        </div>
      )}

      {/* Step 4: Review & Download */}
      {step === 4 && !loadingSavedDoc && (
        <>
          {/* Floating back button to create new document */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-card/50">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] gap-1 px-2 sm:px-2.5 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setStep(1);
                setGeneratedContent("");
                setEditedContent("");
                setFormData({ ...initialFormData });
                setSavedDocId(null);
                setQualificationResponses({});
                resetQueue();
              }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="sm:hidden">Novo</span>
              <span className="hidden sm:inline">Novo Doc.</span>
            </Button>
          </div>
          {/* 📊 Análise de Risco Automática */}
          {editedContent && editedContent.length > 100 && (() => {
            const risk = calculateRisk(editedContent, selectedType?.category === "penal" || selectedType?.category === "civil" || selectedType?.category === "trabalhista" ? "Judicial" : undefined);
            if (risk.wordCount < 30) return null;
            const colorMap = { baixo: "bg-primary/10 text-primary border-primary/30", medio: "bg-warning/15 text-warning-foreground border-warning/30", alto: "bg-destructive/15 text-destructive border-destructive/30" };
            const labelMap = { baixo: "Risco Baixo", medio: "Risco Médio", alto: "Risco Alto" };
            const negativeFactors = risk.factors.filter(f => f.status === "negative").slice(0, 3);
            return (
              <div className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border text-xs ${colorMap[risk.level]}`}>
                <Badge variant="outline" className={colorMap[risk.level]}>
                  {risk.level === "baixo" ? <FileCheck className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                  {labelMap[risk.level]} — {risk.score}/100
                </Badge>
                {negativeFactors.map(f => (
                  <span key={f.id} className="opacity-80">• {f.detail || f.label}</span>
                ))}
              </div>
            );
          })()}
          <DocumentEditor
            editedContent={editedContent}
            setEditedContent={setEditedContent}
            formData={formData}
            selectedType={selectedType}
            forceLetterhead={forceLetterhead}
            onLetterheadChange={setForceLetterhead}
            onWatermarkChange={(v) => setFormData(prev => ({ ...prev, watermark: v }))}
            initialSavedDocId={savedDocId || undefined}
            marginTop={customMarginTop}
            marginBottom={customMarginBottom}
            onMarginTopChange={setCustomMarginTop}
            onMarginBottomChange={setCustomMarginBottom}
          />
          {/* 🧠 DocumentFeedback — captura avaliação qualitativa para RLHF */}
          {generatedContent && (
            <DocumentFeedback
              documentType={documentTypes.find(t => t.id === formData.tipo)?.label || formData.tipo}
              generatedContent={generatedContent}
              provider={(jobMetadata as any)?.provider}
            />
          )}
        </>
      )}
      {loadingSavedDoc && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando documento...</span>
        </div>
      )}
    </div>
  );
}

function buildPrompt(data: FormData, selectedType?: DocumentType, qualificationResponses?: Record<string, string>, advogadoInfo?: { nome: string; oab: string }): string {
  const isJudicial = selectedType?.category ? ["penal", "civil", "trabalhista"].includes(selectedType.category) : false;
  const config = getDocTypeConfig(data.tipo);

  const tom: Record<string, string> = {
    formal: "formal e técnico",
    agressivo: "assertivo e combativo",
    conciliatorio: "conciliatório e diplomático",
  };

  // Resolve tribunal name from tribunalId
  const resolvedTribunal = (() => {
    if (data.tribunalId) {
      const cfg = getTribunalConfig(data.tribunalId);
      if (cfg) return `${cfg.sigla} — ${cfg.nome}`;
      return data.tribunalId.toUpperCase();
    }
    if (data.tipoVara && data.comarca) {
      const vara = varasPrimeiraInstancia[data.tipoVara];
      if (vara) {
        const nVara = data.numeroVara ? parseInt(data.numeroVara) : undefined;
        return formatarEnderecamento(undefined, vara, data.comarca, nVara);
      }
    }
    return data.tribunal || "(a ser preenchido)";
  })();

  // Collect extra fields data
  const extraFieldsText = config.extraFields
    ?.map((f: any) => {
      const val = (data as any)[f.key];
      return val ? `- ${f.label}: ${val}` : "";
    })
    .filter(Boolean)
    .join("\n") || "";

  // Collect corréus
  const correusText = (data.correus ?? [])
    .filter(c => c.nome.trim())
    .map((c, i) => `- Corréu ${i + 1}: ${c.nome}${c.qualificacao ? ` (${c.qualificacao})` : ""}`)
    .join("\n");

  // Collect testemunhas
  const testemunhasText = (data.testemunhas ?? [])
    .filter(t => t.nome.trim())
    .map((t, i) => `- Testemunha ${i + 1}: ${t.nome}${t.qualificacao ? ` (${t.qualificacao})` : ""}`)
    .join("\n");
  // Build qualification block
  // Separate texto_base_aprimorar from qualification responses
  const textoBase = qualificationResponses?.["texto_base_aprimorar"]?.trim() || "";
  const filteredResponses = qualificationResponses
    ? Object.fromEntries(Object.entries(qualificationResponses).filter(([k]) => k !== "texto_base_aprimorar"))
    : {};

  const qualBlock = filteredResponses && Object.keys(filteredResponses).length > 0
    ? `\nDETALHES QUALIFICADOS PELO USUÁRIO (PRIORIDADE MÁXIMA - USE EXATAMENTE):
${Object.entries(filteredResponses)
  .filter(([, v]) => v.trim())
  .map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`)
  .join("\n")}

INSTRUÇÃO: Incorpore TODOS os detalhes acima nos locais apropriados da peça.
Use datas reais, valores exatos e provas mencionadas. NÃO use placeholders genéricos.`
    : "";

  const textoBaseBlock = textoBase
    ? `\n\n═══ TEXTO BASE DO USUÁRIO (PRESERVAR INTEGRALMENTE) ═══
${textoBase}
═══ FIM DO TEXTO BASE ═══

REGRAS RÍGIDAS DE PRESERVAÇÃO DO TEXTO BASE:
- NÃO encurtar, resumir ou remover qualquer trecho do texto acima
- NÃO inventar fatos ou argumentos não presentes no texto ou nas respostas do usuário
- APENAS agregar, complementar, estender, reorganizar logicamente, melhorar linguagem e técnica jurídica
- Adaptar tom, estrutura e terminologia conforme a área jurídica e os dados fornecidos
- O documento final DEVE conter TODO o conteúdo do texto base, aprimorado e enriquecido`
    : "";

  // Build uploaded documents block — prefer Deep Analysis if available
  const docAnalyses = (data as any).documentAnalyses as Record<string, any> | undefined;
  const uploadedDocsBlock = (data.uploadedDocuments ?? []).length > 0
    ? `\n${data.uploadedDocuments.map(doc => {
        const analysis = docAnalyses?.[doc.key];
        if (analysis && analysis.arguments?.length > 0) {
          // Deep Analysis available — use structured format
          const argsBlock = analysis.arguments
            .map((a: any, i: number) => `  ${i + 1}. [FORÇA: ${a.strength.toFixed(2)}] "${a.text}"${a.relatedLaw ? ` — ${a.relatedLaw}` : ""}${a.weakness ? `\n     PONTO FRACO: ${a.weakness}` : ""}`)
            .join("\n");
          const counterBlock = (analysis.counterArguments || [])
            .map((c: any, i: number) => `  - Arg "${c.targetArgument}": ${c.suggestion}`)
            .join("\n");
          return `ANÁLISE PROFUNDA (Deep Learning v1) — [${doc.promptRole} — ${doc.fileName}]
Tipo detectado: ${analysis.documentType || "documento"}
Área: ${analysis.area || "geral"}
Argumentos identificados (${analysis.arguments.length}):
${argsBlock}
${counterBlock ? `\nContra-argumentos sugeridos pela Rede Neural:\n${counterBlock}` : ""}
${analysis.citedLegislation?.length ? `\nLegislação citada: ${analysis.citedLegislation.join(", ")}` : ""}
${analysis.strategicBriefing ? `\nBRIEFING ESTRATÉGICO:\n${analysis.strategicBriefing}` : ""}

INSTRUÇÕES DE ANÁLISE:
- Refute CADA argumento usando os contra-argumentos sugeridos
- Priorize os argumentos de força > 0.7 (maior risco)
- Explore os PONTOS FRACOS identificados`;
        }
        // Fallback: raw text
        return `[${doc.promptRole} — ${doc.fileName}]\n${doc.content}`;
      }).join("\n\n")}\n\nINSTRUÇÕES DE ANÁLISE DOS DOCUMENTOS:\n- Para documentos ADVERSÁRIOS: Analise e refute cada argumento ponto a ponto\n- Para SENTENÇAS/DECISÕES recorridas: Identifique os pontos de erro para fundamentar o recurso\n- Para DOCUMENTOS MODELO: Use APENAS como referência de ESTRUTURA, NÃO copie argumentos`
    : "";

  if (isJudicial) {
    return `Gere uma ${selectedType?.label || "petição judicial"} completa em português brasileiro, pronta para protocolo judicial.

DADOS DO CASO:
${config.showParteAutora ? `- ${config.parteAutoraLabel}: ${data.parteAutora || "(a ser preenchido)"}` : ""}
${config.showParteAutora && data.qualificacaoAutora ? `  Qualificação: ${data.qualificacaoAutora}` : ""}
${config.showParteRe ? `- ${config.parteReLabel}: ${data.parteRe || "(a ser preenchido)"}` : ""}
${config.showParteRe && data.qualificacaoRe ? `  Qualificação: ${data.qualificacaoRe}` : ""}
${extraFieldsText ? `\n${extraFieldsText}` : ""}
${correusText ? `\nCORRÉUS:\n${correusText}` : ""}
- ${config.fatosLabel.replace(" *", "")}: ${data.fatos}
- ${config.pedidosLabel}: ${data.pedidos || "(a ser preenchido)"}
${!config.hideFields.includes("valorCausa") ? `- Valor da causa: ${data.valorCausa || "(a ser preenchido)"}` : ""}
- Tribunal/Foro: ${resolvedTribunal}
- Nº Processo: ${data.numeroProcesso || "(novo processo)"}
${testemunhasText ? `\nTESTEMUNHAS:\n${testemunhasText}` : ""}
${qualBlock}
${uploadedDocsBlock}

INSTRUÇÕES:
- Tom: ${tom[data.tom] || "formal e técnico"}
- JURISDIÇÃO: ${data.jurisdicao === "eua" ? "Direito norte-americano (US law). Use case law, statutes, e precedentes dos tribunais americanos." : data.jurisdicao === "ambos" ? "Direito comparado Brasil + EUA. Compare legislação e jurisprudência de ambos os sistemas." : "Direito brasileiro. Use legislação e jurisprudência brasileiras."}
- ${data.incluirJurisprudencia ? (data.jurisdicao === "eua" ? "INCLUA case law relevante (SCOTUS, Circuit Courts) com citações reais." : data.jurisdicao === "ambos" ? "INCLUA jurisprudência brasileira (STF, STJ, TST) E case law americano relevante para comparação." : "INCLUA jurisprudência relevante dos tribunais superiores (STF, STJ, TST) e estaduais (TJSP, TJRJ, TJMG, TJRS, TJPR) com números reais.") : "Apenas fundamentação legal, sem jurisprudência."}
- Use a terminologia correta para este tipo de peça: ${config.parteAutoraLabel} (não "Parte Autora") e ${config.parteReLabel} (não "Parte Ré").
- Área jurídica: ${config.autoAreaJuridica || data.areaJuridica || "geral"}
- Estrutura conforme as normas processuais aplicáveis a ${selectedType?.label}.
- Advogado: ${advogadoInfo?.nome || "[Nome do Advogado]"} – ${advogadoInfo?.oab || "[OAB]"}
- ASSINATURA: Apenas "${advogadoInfo?.nome || "[Nome do Advogado]"} – ${advogadoInfo?.oab || "[OAB]"}". SEM assinatura do autor, partes ou testemunhas.${data.incluirTestemunhasAssinatura ? "\n- EXCEÇÃO: Incluir assinatura de 2 testemunhas com nome e CPF ao final." : ""}
- Gere documento COMPLETO sem placeholders genéricos.${textoBaseBlock}`;
  }

  // Extrajudicial / Ferramentas
  return `Gere um(a) ${selectedType?.label || "documento extrajudicial"} completo(a) em português brasileiro, pronto para assinatura.

DADOS:
${config.showParteAutora ? `- ${config.parteAutoraLabel}: ${data.parteAutora || "(a ser preenchido)"}` : ""}
${config.showParteAutora && data.qualificacaoAutora ? `  Qualificação completa: ${data.qualificacaoAutora}` : ""}
${config.showParteRe ? `- ${config.parteReLabel}: ${data.parteRe || "(a ser preenchido)"}` : ""}
${config.showParteRe && data.qualificacaoRe ? `  Qualificação completa: ${data.qualificacaoRe}` : ""}
${extraFieldsText ? `\n${extraFieldsText}` : ""}
- ${config.fatosLabel.replace(" *", "")}: ${data.fatos}
- ${config.pedidosLabel}: ${data.pedidos || "(a ser preenchido)"}
${!config.hideFields.includes("valorCausa") ? `- Valor: ${data.valorCausa || "(se aplicável)"}` : ""}
${data.foroEleicao ? `- Foro de Eleição: ${data.foroEleicao}` : "- Foro: Comarca de Porto Alegre/RS"}
${data.clausulasExtras ? `- Cláusulas extras: ${data.clausulasExtras}` : ""}
${qualBlock}
${uploadedDocsBlock}

INSTRUÇÕES:
- Tom: ${tom[data.tom] || "formal e técnico"}
- Estrutura conforme as normas aplicáveis a ${selectedType?.label}.
- Advogado: ${advogadoInfo?.nome || "[Nome do Advogado]"} – ${advogadoInfo?.oab || "[OAB]"}
- ASSINATURA: Inclua assinatura das partes.${data.incluirTestemunhasAssinatura ? " Inclua também 2 testemunhas com nome e CPF." : " SEM testemunhas."}
- Gere documento COMPLETO pronto para assinatura.${textoBaseBlock}`;
}
