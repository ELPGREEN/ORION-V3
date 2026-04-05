// Extracted from document-type-config.ts for maintainability
// Contains the 148+ document type configuration map

import type { DocumentTypeConfig } from "./document-type-config";
import {
  penalDefesa,
  penalHide,
  penalHideExtra,
  penalRecurso,
  penalContrarrazoes,
  penalExecucao,
  civilRecurso,
  civilContrarrazoes,
  embargosDeclaracao,
  defaultExtrajudicialConfig,
  trabHide,
  trabRecurso,
  trabContrarrazoes,
  ferramentaBase,
  slotDocumentoModelo,
  slotOutrosDocumentos,
} from "./document-type-config";

const configs: Record<string, Partial<DocumentTypeConfig>> = {

  // ══════════════════════════════════════════════════════
  // PENAL (34 tipos)
  // ══════════════════════════════════════════════════════

  "habeas-corpus": {
    autoAreaJuridica: "penal",
    parteAutoraLabel: "Paciente",
    parteAutoraPlaceholder: "Nome completo do paciente (preso ou ameaçado de prisão)",
    qualificacaoAutoraPlaceholder: "RG, CPF, nacionalidade, estado civil, profissão, endereço completo, e-mail, telefone, local onde se encontra preso (se aplicável)",
    parteReLabel: "Autoridade Coatora",
    parteRePlaceholder: "Juiz(a) de Direito da ___ Vara Criminal / Delegado(a) de Polícia",
    qualificacaoRePlaceholder: "Indicar o juízo ou autoridade responsável pela coação",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Constrangimento Ilegal *",
    fatosPlaceholder: "Descreva o constrangimento ilegal sofrido pelo paciente: ilegalidade da prisão, ausência de fundamentação, excesso de prazo...",
    pedidosLabel: "Pedido de Ordem",
    pedidosPlaceholder: "Concessão da ordem para relaxamento/revogação da prisão, expedição de alvará de soltura, concessão de liminar...",
    hideFields: penalHideExtra,
    extraFields: [
      { key: "processoOriginario", label: "Nº do Processo Originário", placeholder: "0000000-00.0000.0.00.0000", type: "text" },
      { key: "varaCriminal", label: "Vara Criminal de Origem", placeholder: "Ex: 1ª Vara Criminal de Porto Alegre", type: "text" },
    ],
  },

  "queixa-crime": {
    autoAreaJuridica: "penal",
    parteAutoraLabel: "Querelante (Vítima)",
    parteAutoraPlaceholder: "Nome completo da vítima/querelante",
    parteReLabel: "Querelado (Autor do fato)",
    parteRePlaceholder: "Nome completo do querelado",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos Criminosos *",
    fatosPlaceholder: "Descreva os fatos que configuram o crime de ação penal privada (calúnia, difamação, injúria etc.), com data, local e circunstâncias...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Recebimento da queixa-crime, citação do querelado, condenação nas penas do art. ___...",
    hideFields: penalHide,
  },

  "defesa-previa-criminal": {
    ...penalDefesa,
    fatosLabel: "Defesa Prévia *",
    fatosPlaceholder: "Apresente as teses defensivas, arrolamento de testemunhas, documentos...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Absolvição sumária, desclassificação, oitiva de testemunhas...",
  },

  "resposta-acusacao": {
    ...penalDefesa,
    fatosLabel: "Resposta à Acusação (art. 396-A CPP) *",
    fatosPlaceholder: "Preliminares (incompetência, ilegitimidade, inépcia), mérito (negativa de autoria, excludentes), documentos e testemunhas...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Absolvição sumária (art. 397 CPP), rejeição da denúncia, produção de provas...",
    uploadSlots: [
      { key: "denuncia", label: "Denúncia / Queixa-Crime", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload da denúncia ou queixa-crime para analisar", promptRole: "DOCUMENTO ACUSATÓRIO PARA CONTESTAR — analise e refute cada imputação" },
      slotDocumentoModelo,
    ],
  },

  "liberdade-provisoria": {
    autoAreaJuridica: "penal",
    parteAutoraLabel: "Requerente (Preso)",
    parteAutoraPlaceholder: "Nome completo do preso",
    parteReLabel: "Ministério Público",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Fatos e Fundamentos para Liberdade Provisória *",
    fatosPlaceholder: "Primariedade, residência fixa, trabalho lícito, ausência de periculosidade, possibilidade de fiança...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Concessão de liberdade provisória com/sem fiança, aplicação de medidas cautelares alternativas (art. 319 CPP)...",
    hideFields: penalHideExtra,
  },

  "recurso-sentido-estrito": {
    ...penalRecurso,
    fatosLabel: "Razões do Recurso em Sentido Estrito (art. 581 CPP) *",
    fatosPlaceholder: "Hipótese de cabimento (art. 581 CPP), erro da decisão interlocutória...",
    pedidosLabel: "Pedido de Reforma",
    pedidosPlaceholder: "Reforma da decisão interlocutória para...",
  },

  "alegacoes-finais-criminais": {
    ...penalDefesa,
    fatosLabel: "Alegações Finais / Memoriais *",
    fatosPlaceholder: "Análise das provas produzidas em instrução, contradições na acusação, teses defensivas...",
    pedidosLabel: "Pedidos Finais",
    pedidosPlaceholder: "Absolvição por insuficiência de provas, desclassificação, reconhecimento de atenuantes...",
  },

  "revisao-criminal": {
    ...penalDefesa,
    fatosLabel: "Fatos e Fundamentos para Revisão Criminal *",
    fatosPlaceholder: "Sentença contrária a texto expresso de lei, contrariedade à evidência dos autos, novas provas de inocência (art. 621 CPP)...",
    pedidosLabel: "Pedido de Revisão",
    pedidosPlaceholder: "Absolvição, redução de pena, anulação do processo, novo julgamento...",
    extraFields: [
      { key: "processoOriginario", label: "Nº do Processo Originário", placeholder: "0000000-00.0000.0.00.0000", type: "text" },
    ],
  },

  "revogacao-prisao-preventiva": {
    autoAreaJuridica: "penal",
    parteAutoraLabel: "Requerente (Preso)",
    parteAutoraPlaceholder: "Nome completo do preso preventivamente",
    parteReLabel: "Ministério Público",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Fatos e Fundamentos para Revogação *",
    fatosPlaceholder: "Ausência dos requisitos do art. 312 CPP (garantia da ordem pública, conveniência da instrução, aplicação da lei penal), condições pessoais favoráveis...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Revogação da prisão preventiva, expedição de alvará de soltura...",
    hideFields: penalHideExtra,
  },

  "apelacao-criminal": {
    ...penalRecurso,
    parteAutoraLabel: "Apelante",
    parteReLabel: "Apelado",
    fatosLabel: "Razões de Apelação Criminal *",
    fatosPlaceholder: "Erros da sentença condenatória, análise equivocada de provas, dosimetria incorreta, nulidades...",
    pedidosLabel: "Pedido de Reforma",
    pedidosPlaceholder: "Absolvição, redução da pena, desclassificação do crime, anulação da sentença...",
    uploadSlots: [
      { key: "sentenca", label: "Sentença Recorrida", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload da sentença criminal para recurso", promptRole: "SENTENÇA RECORRIDA — identifique erros de fato e de direito para fundamentar a apelação" },
      slotOutrosDocumentos,
      slotDocumentoModelo,
    ],
  },

  "contrarrazoes-apelacao-criminal": {
    ...penalContrarrazoes,
    parteAutoraLabel: "Apelado / Contrarrazante",
    fatosLabel: "Contrarrazões à Apelação Criminal *",
    fatosPlaceholder: "Rebata os argumentos da apelação, reforce a sentença favorável, demonstre o acerto da decisão...",
    uploadSlots: [
      { key: "recurso_adversario", label: "Apelação Criminal (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload da apelação para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "embargos-declaracao-penal": {
    ...embargosDeclaracao,
    autoAreaJuridica: "penal",
    hideFields: ["areaJuridica", "valorCausa", "testemunhas", "correus"],
    uploadSlots: [
      { key: "decisao_embargada", label: "Decisão Embargada", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload da decisão penal com vício", promptRole: "DECISÃO EMBARGADA — identifique os vícios (obscuridade, omissão, contradição)" },
      slotDocumentoModelo,
    ],
  },

  "recurso-especial-penal": {
    ...penalRecurso,
    fatosLabel: "Razões do Recurso Especial (art. 105, III, CF) *",
    fatosPlaceholder: "Violação de lei federal (alínea 'a'), divergência jurisprudencial (alínea 'c'), prequestionamento...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Conhecimento e provimento do REsp para reformar o acórdão...",
    uploadSlots: [
      { key: "acordao", label: "Acórdão Recorrido", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do acórdão penal recorrido", promptRole: "ACÓRDÃO RECORRIDO — identifique violações de lei federal" },
      slotOutrosDocumentos,
      slotDocumentoModelo,
    ],
  },

  "agravo-execucao-penal": {
    ...penalRecurso,
    parteAutoraLabel: "Agravante (Sentenciado)",
    parteReLabel: "Agravado (MP)",
    fatosLabel: "Razões do Agravo em Execução Penal (art. 197 LEP) *",
    fatosPlaceholder: "Erro da decisão do juízo de execução, direito à progressão/benefício negado indevidamente...",
  },

  "progressao-regime": {
    ...penalExecucao,
    fatosLabel: "Requisitos para Progressão de Regime *",
    fatosPlaceholder: "Requisito objetivo (tempo cumprido conforme art. 112 LEP), requisito subjetivo (bom comportamento carcerário), atestado de conduta...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Progressão de regime (fechado→semiaberto / semiaberto→aberto)...",
  },

  "livramento-condicional": {
    ...penalExecucao,
    fatosLabel: "Requisitos para Livramento Condicional (art. 83 CP) *",
    fatosPlaceholder: "Pena cumprida (1/3, 1/2 ou 2/3), bom comportamento, aptidão para prover própria subsistência...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Concessão de livramento condicional com fixação de condições...",
  },

  "relaxamento-prisao": {
    autoAreaJuridica: "penal",
    parteAutoraLabel: "Preso / Requerente",
    parteAutoraPlaceholder: "Nome completo do preso",
    parteReLabel: "Ministério Público",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Ilegalidade da Prisão (art. 5º, LXV, CF) *",
    fatosPlaceholder: "Falta de flagrante válido, excesso de prazo, ausência de mandado judicial, vício formal...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Relaxamento da prisão ilegal, expedição de alvará de soltura...",
    hideFields: penalHideExtra,
  },

  "manifestacao-penal": {
    ...penalDefesa,
    fatosLabel: "Manifestação *",
    fatosPlaceholder: "Apresente a manifestação sobre o assunto determinado pelo juízo...",
    pedidosLabel: "Requerimentos",
    pedidosPlaceholder: "O que se requer ao juízo...",
  },

  "denuncia-penal": {
    autoAreaJuridica: "penal",
    parteAutoraLabel: "Ministério Público",
    parteAutoraPlaceholder: "Promotor(a) de Justiça",
    parteReLabel: "Denunciado / Acusado",
    parteRePlaceholder: "Nome completo do denunciado",
    qualificacaoRePlaceholder: "RG, CPF, nacionalidade, estado civil, profissão, endereço completo, e-mail, telefone",
    showParteAutora: false,
    showParteRe: true,
    fatosLabel: "Fatos Criminosos / Tipificação *",
    fatosPlaceholder: "Descreva a conduta criminosa, autoria, materialidade, circunstâncias do crime, tipificação legal...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Recebimento da denúncia, citação do réu, condenação nas penas do art. ___...",
    hideFields: penalHide,
  },

  "emenda-inicial-penal": {
    ...penalDefesa,
    fatosLabel: "Emenda à Inicial *",
    fatosPlaceholder: "Correções e complementações à peça inicial conforme determinado pelo juízo...",
    pedidosLabel: "Requerimentos",
  },

  "replica-criminal": {
    ...penalDefesa,
    fatosLabel: "Réplica às Alegações da Acusação *",
    fatosPlaceholder: "Rebata ponto a ponto as alegações do Ministério Público...",
    pedidosLabel: "Requerimentos",
    uploadSlots: [
      { key: "contestacao_adversaria", label: "Alegações do MP / Acusação", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload das alegações da acusação para rebater", promptRole: "DOCUMENTO ADVERSÁRIO PARA REBATER — analise e refute cada argumento do MP" },
      slotDocumentoModelo,
    ],
  },

  "excecao-suspeicao-penal": {
    ...penalDefesa,
    parteAutoraLabel: "Excipiente",
    parteReLabel: "Excepto (Magistrado)",
    parteRePlaceholder: "Nome do magistrado arguido de suspeição",
    showParteRe: true,
    fatosLabel: "Fatos e Motivos da Suspeição (art. 254 CPP) *",
    fatosPlaceholder: "Descreva os fatos que configuram a suspeição do magistrado conforme hipóteses do art. 254 CPP...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Reconhecimento da suspeição e afastamento do magistrado...",
  },

  "revogacao-medidas-protetivas": {
    autoAreaJuridica: "penal",
    parteAutoraLabel: "Requerente",
    parteAutoraPlaceholder: "Nome completo do requerente",
    parteReLabel: "Requerida / Vítima",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fundamentos para Revogação das Medidas Protetivas *",
    fatosPlaceholder: "Cessação do risco, alteração das circunstâncias, desproporcionalidade das medidas...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Revogação das medidas protetivas de urgência (Lei 11.340/06)...",
    hideFields: penalHideExtra,
  },

  "quesitos-periciais-penal": {
    autoAreaJuridica: "penal",
    parteAutoraLabel: "Parte Formulante",
    showParteAutora: true,
    showParteRe: false,
    parteReLabel: "Perito",
    fatosLabel: "Quesitos Periciais *",
    fatosPlaceholder: "Formule os quesitos a serem respondidos pelo perito, de forma clara e objetiva...",
    pedidosLabel: "Requerimentos",
    pedidosPlaceholder: "Intimação do perito, prazo para resposta, esclarecimentos...",
    hideFields: ["areaJuridica", "valorCausa", "correus"],
  },

  "contrarrazoes-rese": {
    ...penalContrarrazoes,
    fatosLabel: "Contrarrazões ao Recurso em Sentido Estrito *",
    fatosPlaceholder: "Rebata os argumentos do RESE, demonstre o acerto da decisão interlocutória...",
    uploadSlots: [
      { key: "recurso_adversario", label: "Recurso em Sentido Estrito (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do RESE para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "recurso-ordinario-constitucional-penal": {
    ...penalRecurso,
    fatosLabel: "Razões do Recurso Ordinário Constitucional (art. 102, II, CF) *",
    fatosPlaceholder: "Denegação de HC/MS por tribunal superior, fundamentos para reforma...",
  },

  "memoriais-recursais-penal": {
    ...penalDefesa,
    fatosLabel: "Memoriais Recursais *",
    fatosPlaceholder: "Síntese das provas e argumentos em fase recursal...",
    pedidosLabel: "Pedidos",
  },

  "contrarrazoes-recurso-especial-penal": {
    ...penalContrarrazoes,
    fatosLabel: "Contrarrazões ao Recurso Especial (Penal) *",
    uploadSlots: [
      { key: "recurso_adversario", label: "Recurso Especial (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do REsp para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "contrarrazoes-embargos-penal": {
    ...penalContrarrazoes,
    fatosLabel: "Contrarrazões aos Embargos de Declaração (Penal) *",
    uploadSlots: [
      { key: "recurso_adversario", label: "Embargos de Declaração (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload dos embargos para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "restituicao-coisa-apreendida": {
    autoAreaJuridica: "penal",
    parteAutoraLabel: "Requerente (Proprietário)",
    parteAutoraPlaceholder: "Nome do proprietário dos bens apreendidos",
    parteReLabel: "Autoridade Policial / MP",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Fatos e Fundamentos (art. 118-120 CPP) *",
    fatosPlaceholder: "Descreva os bens apreendidos, circunstâncias da apreensão, comprovação de propriedade...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Restituição dos bens apreendidos...",
    hideFields: penalHideExtra,
  },

  "incidente-execucao-penal": {
    ...penalExecucao,
    fatosLabel: "Incidente em Execução Penal *",
    fatosPlaceholder: "Descreva o incidente: detração, remição, unificação de penas, excesso de execução...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Deferimento do incidente...",
  },

  "contrarrazoes-agravo-execucao": {
    ...penalContrarrazoes,
    fatosLabel: "Contrarrazões ao Agravo em Execução Penal *",
    uploadSlots: [
      { key: "recurso_adversario", label: "Agravo em Execução (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do agravo para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "indulto-natalino": {
    ...penalExecucao,
    fatosLabel: "Requisitos para Indulto Natalino *",
    fatosPlaceholder: "Enquadramento no decreto de indulto vigente, pena cumprida, requisitos objetivos e subjetivos...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Concessão do indulto natalino, extinção da punibilidade...",
  },

  "revogacao-preventiva-cautelares": {
    autoAreaJuridica: "penal",
    parteAutoraLabel: "Requerente (Preso)",
    parteAutoraPlaceholder: "Nome completo do preso",
    parteReLabel: "Ministério Público",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Fundamentos para Substituição por Cautelares (art. 319 CPP) *",
    fatosPlaceholder: "Desnecessidade da prisão, possibilidade de aplicação de medidas cautelares alternativas, proporcionalidade...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Revogação da preventiva com aplicação de cautelares (monitoramento, comparecimento, proibição de contato etc.)...",
    hideFields: penalHideExtra,
  },

  // ══════════════════════════════════════════════════════
  // CIVIL (49 tipos)
  // ══════════════════════════════════════════════════════

  "peticao-inicial": {
    parteAutoraLabel: "Autor(a)",
    parteReLabel: "Réu / Ré",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos *",
    fatosPlaceholder: "Descreva os fatos relevantes em ordem cronológica, com datas e circunstâncias...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Condenação, indenização, obrigação de fazer/não fazer, tutela de urgência...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "contestacao": {
    parteAutoraLabel: "Réu / Ré (Contestante)",
    parteReLabel: "Autor(a)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Contestação *",
    fatosPlaceholder: "Preliminares (inépcia, ilegitimidade, prescrição), contestação ao mérito ponto a ponto...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Acolhimento das preliminares, improcedência total dos pedidos...",
    hideFields: [],
    autoAreaJuridica: "",
    uploadSlots: [
      { key: "peticao_inicial", label: "Petição Inicial (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload da petição inicial que será contestada", promptRole: "DOCUMENTO ADVERSÁRIO PARA CONTESTAR — analise e refute cada argumento ponto a ponto" },
      slotOutrosDocumentos,
      slotDocumentoModelo,
    ],
  },

  "replica-civil": {
    parteAutoraLabel: "Autor(a)",
    parteReLabel: "Réu / Ré",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Réplica / Impugnação à Contestação *",
    fatosPlaceholder: "Rebata os argumentos da contestação, impugne documentos, reforce as teses autorais...",
    pedidosLabel: "Requerimentos",
    pedidosPlaceholder: "Rejeição das preliminares, produção de provas...",
    hideFields: [],
    autoAreaJuridica: "",
    uploadSlots: [
      { key: "contestacao_adversaria", label: "Contestação (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload da contestação para rebater", promptRole: "DOCUMENTO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "tutela-provisoria": {
    parteAutoraLabel: "Requerente",
    parteReLabel: "Requerido(a)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Urgência (art. 300 CPC) *",
    fatosPlaceholder: "Probabilidade do direito e perigo de dano ou risco ao resultado útil do processo...",
    pedidosLabel: "Pedido de Tutela",
    pedidosPlaceholder: "Concessão de tutela de urgência/evidência para...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "recurso-apelacao": {
    parteAutoraLabel: "Apelante",
    parteReLabel: "Apelado(a)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Razões de Apelação *",
    fatosPlaceholder: "Erros da sentença de primeiro grau, fundamentos de fato e de direito para reforma...",
    pedidosLabel: "Pedido de Reforma",
    pedidosPlaceholder: "Reforma total/parcial da sentença para...",
    hideFields: [],
    autoAreaJuridica: "",
    uploadSlots: [
      { key: "sentenca", label: "Sentença Recorrida", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload da sentença que será objeto do recurso", promptRole: "SENTENÇA RECORRIDA — identifique os pontos de erro para fundamentar o recurso" },
      slotOutrosDocumentos,
      slotDocumentoModelo,
    ],
  },

  "contrarrazoes-apelacao": {
    ...civilContrarrazoes,
    parteAutoraLabel: "Apelado(a) / Contrarrazante",
    parteReLabel: "Apelante",
    fatosLabel: "Contrarrazões de Apelação *",
    fatosPlaceholder: "Demonstre o acerto da sentença, rebata os argumentos do apelante...",
    uploadSlots: [
      { key: "recurso_adversario", label: "Recurso de Apelação (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do recurso para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      { key: "sentenca", label: "Sentença Recorrida", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Sentença favorável a ser defendida", promptRole: "SENTENÇA FAVORÁVEL — reforce os fundamentos desta decisão" },
      slotDocumentoModelo,
    ],
  },

  "agravo-instrumento": {
    parteAutoraLabel: "Agravante",
    parteReLabel: "Agravado(a)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Razões do Agravo de Instrumento (art. 1.015 CPC) *",
    fatosPlaceholder: "Decisão interlocutória agravada, hipótese de cabimento, fundamentos para reforma...",
    pedidosLabel: "Pedido de Reforma",
    pedidosPlaceholder: "Concessão de efeito suspensivo/antecipação de tutela recursal, reforma da decisão...",
    hideFields: [],
    autoAreaJuridica: "",
    extraFields: [
      { key: "processoOriginario", label: "Nº do Processo de Origem", placeholder: "0000000-00.0000.0.00.0000", type: "text" },
    ],
    uploadSlots: [
      { key: "decisao_interlocutoria", label: "Decisão Interlocutória Recorrida", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload da decisão interlocutória agravada", promptRole: "DECISÃO RECORRIDA — identifique os pontos de erro para fundamentar o agravo" },
      slotOutrosDocumentos,
      slotDocumentoModelo,
    ],
  },

  "agravo-interno": {
    parteAutoraLabel: "Agravante",
    parteReLabel: "Agravado(a)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Razões do Agravo Interno (art. 1.021 CPC) *",
    fatosPlaceholder: "Decisão monocrática agravada, fundamentos para reforma pelo órgão colegiado...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Reconsideração/reforma da decisão monocrática...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "embargos-declaracao": {
    ...embargosDeclaracao,
    uploadSlots: [
      { key: "decisao_embargada", label: "Decisão Embargada", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload da decisão com obscuridade/omissão/contradição", promptRole: "DECISÃO EMBARGADA — identifique os vícios (obscuridade, omissão, contradição)" },
      slotDocumentoModelo,
    ],
  },

  "cumprimento-sentenca": {
    parteAutoraLabel: "Exequente (Credor)",
    parteAutoraPlaceholder: "Nome do credor/vencedor da ação",
    parteReLabel: "Executado (Devedor)",
    parteRePlaceholder: "Nome do devedor/vencido",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Demonstrativo do Débito e Fundamentos *",
    fatosPlaceholder: "Título executivo (sentença), trânsito em julgado, demonstrativo atualizado do débito...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Intimação do executado para pagamento em 15 dias (art. 523 CPC), penhora, expropriação...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "impugnacao": {
    parteAutoraLabel: "Executado / Impugnante",
    parteReLabel: "Exequente / Impugnado",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Impugnação ao Cumprimento de Sentença (art. 525 CPC) *",
    fatosPlaceholder: "Matérias arguíveis: falta de citação, inexequibilidade do título, excesso de execução, prescrição...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Acolhimento da impugnação, extinção/redução da execução...",
    hideFields: [],
    autoAreaJuridica: "",
    uploadSlots: [
      { key: "cumprimento_sentenca", label: "Petição de Cumprimento de Sentença", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload da petição de cumprimento de sentença para impugnar", promptRole: "DOCUMENTO ADVERSÁRIO PARA IMPUGNAR — analise e refute os cálculos e argumentos" },
      slotDocumentoModelo,
    ],
  },

  "manifestacao": {
    parteAutoraLabel: "Requerente",
    parteReLabel: "Parte Contrária",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Manifestação *",
    fatosPlaceholder: "Apresente a manifestação sobre o tema determinado pelo juízo...",
    pedidosLabel: "Requerimentos",
    pedidosPlaceholder: "O que se requer ao juízo...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "alegacoes-finais": {
    parteAutoraLabel: "Parte",
    parteReLabel: "Parte Contrária",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Alegações Finais / Memoriais *",
    fatosPlaceholder: "Síntese das provas produzidas, análise jurídica, fundamentação para procedência/improcedência...",
    pedidosLabel: "Pedidos Finais",
    pedidosPlaceholder: "Procedência/improcedência dos pedidos...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "recurso-especial": {
    ...civilRecurso,
    parteAutoraLabel: "Recorrente",
    parteReLabel: "Recorrido(a)",
    fatosLabel: "Razões do Recurso Especial (art. 105, III, CF) *",
    fatosPlaceholder: "Violação de lei federal, divergência jurisprudencial, prequestionamento da matéria...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Conhecimento e provimento do REsp para reformar o acórdão...",
    uploadSlots: [
      { key: "acordao", label: "Acórdão Recorrido", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do acórdão que será objeto do recurso especial", promptRole: "ACÓRDÃO RECORRIDO — identifique violações de lei federal e divergência jurisprudencial" },
      slotOutrosDocumentos,
      slotDocumentoModelo,
    ],
  },

  "mandado-seguranca": {
    parteAutoraLabel: "Impetrante",
    parteReLabel: "Autoridade Coatora",
    parteRePlaceholder: "Autoridade pública responsável pelo ato ilegal/abusivo",
    qualificacaoRePlaceholder: "Cargo, órgão, endereço funcional",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Direito Líquido e Certo *",
    fatosPlaceholder: "Descreva o ato ilegal/abusivo da autoridade e demonstre o direito líquido e certo violado, com prova pré-constituída...",
    pedidosLabel: "Pedido de Concessão da Segurança",
    pedidosPlaceholder: "Concessão da segurança para anular/impedir o ato, liminar (art. 7º Lei 12.016/09)...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "mandado-seguranca-coletivo": {
    parteAutoraLabel: "Impetrante (Entidade/Sindicato/Partido)",
    parteAutoraPlaceholder: "Nome da entidade, sindicato ou partido político",
    parteReLabel: "Autoridade Coatora",
    parteRePlaceholder: "Autoridade pública responsável pelo ato",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Direito Líquido e Certo Coletivo *",
    fatosPlaceholder: "Ato ilegal/abusivo que afeta a coletividade representada, direito líquido e certo...",
    pedidosLabel: "Pedido de Concessão da Segurança Coletiva",
    pedidosPlaceholder: "Concessão da segurança coletiva, liminar...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "acao-popular": {
    parteAutoraLabel: "Autor Popular (Cidadão)",
    parteAutoraPlaceholder: "Nome completo do cidadão (eleitor)",
    qualificacaoAutoraPlaceholder: "RG, CPF, título de eleitor, nacionalidade, estado civil, endereço completo, e-mail, telefone",
    parteReLabel: "Réu (Ente Público / Autoridade)",
    parteRePlaceholder: "Autoridade ou entidade responsável pelo ato lesivo",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Ato Lesivo ao Patrimônio Público *",
    fatosPlaceholder: "Descreva o ato lesivo ao patrimônio público, moralidade administrativa, meio ambiente ou patrimônio histórico/cultural (art. 5º, LXXIII, CF)...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Anulação do ato lesivo, condenação dos responsáveis, ressarcimento ao erário...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "acao-civil-publica": {
    parteAutoraLabel: "Autor (MP / Defensoria / Associação)",
    parteAutoraPlaceholder: "Ministério Público, Defensoria Pública ou associação legitimada",
    parteReLabel: "Réu",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Dano a Interesses Difusos/Coletivos *",
    fatosPlaceholder: "Descreva o dano aos interesses difusos ou coletivos (meio ambiente, consumidor, patrimônio público)...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Obrigação de fazer/não fazer, indenização, reparação do dano...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "reclamacao-constitucional": {
    parteAutoraLabel: "Reclamante",
    parteReLabel: "Reclamado",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Afronta à Autoridade do Tribunal *",
    fatosPlaceholder: "Decisão que desrespeitou julgado do tribunal, usurpação de competência...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Garantia da autoridade da decisão, cassação do ato reclamado...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "execucao-titulo-extrajudicial": {
    parteAutoraLabel: "Exequente (Credor)",
    parteReLabel: "Executado (Devedor)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Título Executivo e Demonstrativo do Débito *",
    fatosPlaceholder: "Título executivo extrajudicial (cheque, nota promissória, contrato), valor atualizado...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Citação do executado para pagar em 3 dias (art. 829 CPC), penhora de bens...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "embargos-execucao": {
    parteAutoraLabel: "Embargante (Executado)",
    parteReLabel: "Embargado (Exequente)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Embargos à Execução (art. 917 CPC) *",
    fatosPlaceholder: "Matérias arguíveis: inexequibilidade do título, excesso de execução, prescrição, compensação...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Acolhimento dos embargos, extinção/redução da execução...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "embargos-terceiro": {
    parteAutoraLabel: "Embargante (Terceiro)",
    parteAutoraPlaceholder: "Nome do terceiro prejudicado (não é parte no processo)",
    parteReLabel: "Embargado",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Turbação/Esbulho da Posse *",
    fatosPlaceholder: "Descreva como o ato judicial (penhora, arresto) atingiu bem de terceiro, comprove a posse/propriedade...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Manutenção/restituição da posse, desconstituição da penhora/arresto...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "acao-rescisoria": {
    parteAutoraLabel: "Autor da Rescisória",
    parteReLabel: "Réu na Rescisória",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Hipótese de Rescisão (art. 966 CPC) *",
    fatosPlaceholder: "Violação de norma jurídica, prova nova, erro de fato, impedimento do juiz...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Rescisão da sentença/acórdão, novo julgamento...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "recurso-inominado": {
    ...civilRecurso,
    parteAutoraLabel: "Recorrente",
    parteReLabel: "Recorrido(a)",
    fatosLabel: "Razões do Recurso Inominado (Lei 9.099/95) *",
    fatosPlaceholder: "Erros da sentença do Juizado Especial...",
    pedidosLabel: "Pedido de Reforma",
  },

  "peticao-inicial-jec": {
    parteAutoraLabel: "Autor(a)",
    parteReLabel: "Réu / Ré",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos *",
    fatosPlaceholder: "Descreva os fatos de forma simples e objetiva (Juizado Especial)...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Condenação, indenização (até 40 salários mínimos)...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "acao-monitoria": {
    parteAutoraLabel: "Autor / Credor",
    parteReLabel: "Réu / Devedor",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Prova Escrita (art. 700 CPC) *",
    fatosPlaceholder: "Prova escrita sem eficácia de título executivo, documentos comprobatórios da dívida...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Expedição de mandado de pagamento, constituição de título executivo...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "desconsideracao-personalidade": {
    parteAutoraLabel: "Requerente",
    parteReLabel: "Sócio / Administrador",
    parteRePlaceholder: "Nome do sócio ou administrador a ser responsabilizado",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Requisitos (art. 133-137 CPC / art. 50 CC) *",
    fatosPlaceholder: "Abuso da personalidade jurídica, confusão patrimonial, desvio de finalidade...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Desconsideração da personalidade jurídica, inclusão do sócio no polo passivo...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "emenda-inicial-civil": {
    parteAutoraLabel: "Autor(a)",
    parteReLabel: "Réu / Ré",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Emenda à Inicial *",
    fatosPlaceholder: "Correções e complementações conforme determinado pelo juízo (art. 321 CPC)...",
    pedidosLabel: "Requerimentos",
    pedidosPlaceholder: "Recebimento da emenda, prosseguimento do feito...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "recuperacao-judicial": {
    parteAutoraLabel: "Empresa Requerente (Devedora)",
    parteAutoraPlaceholder: "Razão social da empresa em crise",
    parteReLabel: "Credores",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Fatos e Viabilidade Econômica (Lei 11.101/05) *",
    fatosPlaceholder: "Demonstre a crise econômico-financeira, viabilidade da recuperação, plano de recuperação...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Deferimento do processamento da recuperação judicial, suspensão das execuções...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "manifestacao-impugnacao-civil": {
    parteAutoraLabel: "Exequente / Manifestante",
    parteReLabel: "Executado / Impugnante",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Manifestação à Impugnação *",
    fatosPlaceholder: "Rebata os argumentos da impugnação ao cumprimento de sentença...",
    pedidosLabel: "Requerimentos",
    pedidosPlaceholder: "Rejeição da impugnação, prosseguimento da execução...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "contraminuta-agravo": {
    parteAutoraLabel: "Agravado(a) / Contrarrazante",
    parteReLabel: "Agravante",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Contraminuta ao Agravo de Instrumento *",
    fatosPlaceholder: "Rebata os argumentos do agravante, demonstre o acerto da decisão interlocutória...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Manutenção da decisão agravada, desprovimento do agravo...",
    hideFields: [],
    autoAreaJuridica: "",
    uploadSlots: [
      { key: "recurso_adversario", label: "Agravo de Instrumento (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do agravo para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "contraminuta-agravo-interno": {
    parteAutoraLabel: "Agravado(a)",
    parteReLabel: "Agravante",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Contraminuta ao Agravo Interno *",
    fatosPlaceholder: "Rebata os argumentos do agravo, demonstre o acerto da decisão monocrática...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Manutenção da decisão monocrática...",
    hideFields: [],
    autoAreaJuridica: "",
    uploadSlots: [
      { key: "recurso_adversario", label: "Agravo Interno (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do agravo interno para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "recurso-ordinario-constitucional-civil": {
    ...civilRecurso,
    fatosLabel: "Razões do Recurso Ordinário Constitucional *",
    fatosPlaceholder: "Denegação de MS/HC por tribunal superior, fundamentos para reforma...",
  },

  "memoriais-recursais-civil": {
    parteAutoraLabel: "Parte",
    parteReLabel: "Parte Contrária",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Memoriais Recursais *",
    fatosPlaceholder: "Síntese dos argumentos, destaques da jurisprudência...",
    pedidosLabel: "Pedidos",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "contrarrazoes-recurso-especial-civil": {
    ...civilContrarrazoes,
    fatosLabel: "Contrarrazões ao Recurso Especial *",
    uploadSlots: [
      { key: "recurso_adversario", label: "Recurso Especial (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do REsp para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "agravo-recurso-especial": {
    parteAutoraLabel: "Agravante",
    parteReLabel: "Agravado(a)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Razões do Agravo em Recurso Especial (AREsp) *",
    fatosPlaceholder: "Decisão de inadmissibilidade do REsp, fundamentos para destrancar...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Provimento do agravo para determinar a subida do REsp...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "recurso-extraordinario-civil": {
    ...civilRecurso,
    fatosLabel: "Razões do Recurso Extraordinário (art. 102, III, CF) *",
    fatosPlaceholder: "Violação constitucional, repercussão geral, prequestionamento...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Conhecimento e provimento do RE...",
  },

  "embargos-divergencia": {
    parteAutoraLabel: "Embargante",
    parteReLabel: "Embargado",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Divergência Jurisprudencial (art. 1.043 CPC) *",
    fatosPlaceholder: "Demonstre a divergência entre acórdãos do mesmo tribunal sobre a mesma questão de direito...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Uniformização da jurisprudência, prevalência da tese favorável...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "embargos-execucao-fiscal": {
    parteAutoraLabel: "Embargante (Contribuinte/Executado)",
    parteReLabel: "Embargada (Fazenda Pública)",
    parteRePlaceholder: "União/Estado/Município (Fazenda Nacional/Estadual/Municipal)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Embargos à Execução Fiscal (Lei 6.830/80) *",
    fatosPlaceholder: "Nulidade da CDA, prescrição, pagamento, ilegitimidade, excesso...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Acolhimento dos embargos, extinção da execução fiscal...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "excecao-pre-executividade": {
    parteAutoraLabel: "Excipiente (Executado)",
    parteReLabel: "Excepto (Exequente)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Matéria Cognoscível de Ofício *",
    fatosPlaceholder: "Matérias que dispensam garantia do juízo: prescrição, ilegitimidade, nulidade da CDA, pagamento...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Extinção da execução, exclusão do executado...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "impugnacao-penhora": {
    parteAutoraLabel: "Executado / Impugnante",
    parteReLabel: "Exequente",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Impugnação à Penhora *",
    fatosPlaceholder: "Impenhorabilidade do bem (art. 833 CPC), excesso de penhora, avaliação errônea...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Desconstituição/redução da penhora, substituição do bem penhorado...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "adjudicacao-compulsoria": {
    parteAutoraLabel: "Adjudicante (Promitente Comprador)",
    parteReLabel: "Adjudicado (Promitente Vendedor)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Recusa à Outorga de Escritura *",
    fatosPlaceholder: "Contrato de promessa de compra e venda, quitação do preço, recusa do vendedor...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Adjudicação compulsória do imóvel, outorga da escritura...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "sustacao-protesto": {
    parteAutoraLabel: "Requerente",
    parteReLabel: "Requerido(a) / Credor",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Irregularidade do Protesto *",
    fatosPlaceholder: "Pagamento já realizado, dívida prescrita, título irregular, cobrança indevida...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Sustação do protesto, cancelamento do registro, tutela de urgência...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "busca-apreensao-menor": {
    parteAutoraLabel: "Requerente (Genitor/a)",
    parteReLabel: "Requerido(a) (Genitor/a)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Risco ao Menor *",
    fatosPlaceholder: "Situação de risco, retenção ilegal, descumprimento de guarda/visitas...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Busca e apreensão do menor, tutela de urgência...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "acordo-judicial-extincao": {
    parteAutoraLabel: "Parte 1",
    parteReLabel: "Parte 2",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Termos do Acordo *",
    fatosPlaceholder: "Descreva os termos acordados entre as partes...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Homologação do acordo, extinção do processo com resolução do mérito (art. 487, III, CPC)...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "cumprimento-provisorio": {
    parteAutoraLabel: "Exequente (Credor)",
    parteReLabel: "Executado (Devedor)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fundamentos do Cumprimento Provisório (art. 520 CPC) *",
    fatosPlaceholder: "Sentença/acórdão com recurso pendente sem efeito suspensivo...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Cumprimento provisório, caução, penhora...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "contrarrazoes-recurso-inominado": {
    ...civilContrarrazoes,
    fatosLabel: "Contrarrazões ao Recurso Inominado *",
    uploadSlots: [
      { key: "recurso_adversario", label: "Recurso Inominado (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do recurso inominado para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "quesitos-periciais-civil": {
    parteAutoraLabel: "Parte Formulante",
    parteReLabel: "Perito",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Quesitos Periciais *",
    fatosPlaceholder: "Formule os quesitos de forma clara, objetiva e pertinente ao objeto da perícia...",
    pedidosLabel: "Requerimentos",
    pedidosPlaceholder: "Intimação do perito, prazo, esclarecimentos adicionais...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  "producao-provas-civil": {
    parteAutoraLabel: "Requerente",
    parteReLabel: "Parte Contrária",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Provas Requeridas *",
    fatosPlaceholder: "Especifique as provas: documental, testemunhal, pericial, depoimento pessoal, inspeção judicial...",
    pedidosLabel: "Requerimentos",
    pedidosPlaceholder: "Deferimento da produção das provas indicadas...",
    hideFields: [],
    autoAreaJuridica: "",
  },

  // ══════════════════════════════════════════════════════
  // TRABALHISTA (28 tipos)
  // ══════════════════════════════════════════════════════

  "reclamacao-trabalhista": {
    parteAutoraLabel: "Reclamante (Empregado)",
    parteAutoraPlaceholder: "Nome completo do trabalhador",
    qualificacaoAutoraPlaceholder: "RG, CPF, CTPS (nº e série), PIS/PASEP, nacionalidade, estado civil, endereço completo, e-mail, telefone, função exercida",
    parteReLabel: "Reclamada (Empregador)",
    parteRePlaceholder: "Razão social da empresa",
    qualificacaoRePlaceholder: "CNPJ, endereço da sede, e-mail, telefone, representante legal",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos da Relação de Emprego *",
    fatosPlaceholder: "Data de admissão, função, salário, jornada, motivo da rescisão, verbas não pagas, irregularidades...",
    pedidosLabel: "Pedidos Trabalhistas",
    pedidosPlaceholder: "Verbas rescisórias, horas extras, FGTS + 40%, danos morais, vínculo empregatício, adicional de insalubridade/periculosidade...",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
  },

  "contestacao-trabalhista": {
    parteAutoraLabel: "Reclamada (Empregador)",
    parteAutoraPlaceholder: "Razão social da empresa",
    qualificacaoAutoraPlaceholder: "CNPJ, endereço da sede, e-mail, telefone, representante legal",
    parteReLabel: "Reclamante (Empregado)",
    parteRePlaceholder: "Nome completo do trabalhador",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Contestação aos Fatos e Pedidos *",
    fatosPlaceholder: "Conteste: vínculo, jornada, salário, motivo da rescisão, verbas devidas, cada pedido individualmente...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Improcedência total, compensação, limitação de condenação, justiça gratuita...",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
    uploadSlots: [
      { key: "reclamacao_trabalhista", label: "Reclamação Trabalhista (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload da reclamação trabalhista para contestar", promptRole: "DOCUMENTO ADVERSÁRIO PARA CONTESTAR — analise e refute cada pedido ponto a ponto" },
      slotOutrosDocumentos,
      slotDocumentoModelo,
    ],
  },

  "replica-trabalhista": {
    parteAutoraLabel: "Reclamante",
    parteReLabel: "Reclamada",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Réplica / Impugnação à Contestação Trabalhista *",
    fatosPlaceholder: "Rebata os argumentos da contestação, impugne documentos, reforce os pedidos...",
    pedidosLabel: "Requerimentos",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
    uploadSlots: [
      { key: "contestacao_adversaria", label: "Contestação Trabalhista (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload da contestação para rebater", promptRole: "DOCUMENTO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "recurso-ordinario-trabalhista": {
    ...trabRecurso,
    parteAutoraLabel: "Recorrente",
    parteReLabel: "Recorrido(a)",
    fatosLabel: "Razões do Recurso Ordinário Trabalhista *",
    fatosPlaceholder: "Erros da sentença de primeiro grau, provas desconsideradas, verbas não deferidas...",
  },

  "contrarrazoes-ro-trabalhista": {
    ...trabContrarrazoes,
    fatosLabel: "Contrarrazões ao Recurso Ordinário Trabalhista *",
    uploadSlots: [
      { key: "recurso_adversario", label: "Recurso Ordinário (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do RO para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "recurso-revista": {
    ...trabRecurso,
    fatosLabel: "Razões do Recurso de Revista (art. 896 CLT) *",
    fatosPlaceholder: "Violação de lei federal/CF, divergência jurisprudencial entre TRTs, contrariedade a súmula do TST...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Conhecimento e provimento do recurso de revista...",
  },

  "agravo-peticao-trabalhista": {
    ...trabRecurso,
    parteAutoraLabel: "Agravante",
    parteReLabel: "Agravado(a)",
    fatosLabel: "Razões do Agravo de Petição (art. 897, a, CLT) *",
    fatosPlaceholder: "Erro nos cálculos de liquidação, excesso de execução, matéria arguível em execução...",
    pedidosLabel: "Pedido de Reforma",
    pedidosPlaceholder: "Reforma da decisão de execução...",
  },

  "embargos-declaracao-trabalhista": {
    ...embargosDeclaracao,
    autoAreaJuridica: "trabalhista",
    hideFields: trabHide,
    uploadSlots: [
      { key: "decisao_embargada", label: "Decisão Embargada", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload da decisão trabalhista com vício", promptRole: "DECISÃO EMBARGADA — identifique os vícios (obscuridade, omissão, contradição)" },
      slotDocumentoModelo,
    ],
  },

  "alegacoes-finais-trabalhista": {
    parteAutoraLabel: "Parte",
    parteReLabel: "Parte Contrária",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Razões Finais (art. 850 CLT) *",
    fatosPlaceholder: "Síntese das provas produzidas em audiência, argumentos finais...",
    pedidosLabel: "Pedidos Finais",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
  },

  "cumprimento-sentenca-trabalhista": {
    parteAutoraLabel: "Exequente (Reclamante/Credor)",
    parteReLabel: "Executada (Reclamada/Devedora)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Demonstrativo do Débito Trabalhista *",
    fatosPlaceholder: "Sentença transitada, cálculos de liquidação, valores atualizados...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Citação para pagamento, penhora, expropriação...",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
  },

  "embargos-execucao-trabalhista": {
    parteAutoraLabel: "Embargante (Executada)",
    parteReLabel: "Embargado (Exequente)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Embargos à Execução Trabalhista (art. 884 CLT) *",
    fatosPlaceholder: "Excesso de execução, erro nos cálculos, matéria de mérito superveniente...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Acolhimento dos embargos, redução/extinção da execução...",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
  },

  "acordo-extrajudicial-trabalhista": {
    parteAutoraLabel: "Empregador (Requerente)",
    parteReLabel: "Empregado (Requerido)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Termos do Acordo (art. 855-B a 855-E CLT) *",
    fatosPlaceholder: "Objeto do acordo, verbas transacionadas, quitação geral ou parcial...",
    pedidosLabel: "Pedido de Homologação",
    pedidosPlaceholder: "Homologação do acordo extrajudicial pelo juízo trabalhista...",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
  },

  "consignacao-pagamento-trab": {
    parteAutoraLabel: "Consignante (Empregador)",
    parteReLabel: "Consignado (Empregado)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Recusa do Credor *",
    fatosPlaceholder: "Recusa injustificada do empregado em receber verbas rescisórias...",
    pedidosLabel: "Pedidos",
    pedidosPlaceholder: "Depósito judicial, quitação das verbas...",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
  },

  "acao-monitoria-trab": {
    parteAutoraLabel: "Autor / Credor",
    parteReLabel: "Réu / Devedor",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Fatos e Prova Escrita *",
    fatosPlaceholder: "Prova escrita do crédito trabalhista...",
    pedidosLabel: "Pedidos",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
  },

  "emenda-inicial-trab": {
    parteAutoraLabel: "Reclamante",
    parteReLabel: "Reclamada",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Emenda à Inicial Trabalhista *",
    fatosPlaceholder: "Correções e complementações conforme determinado pelo juízo...",
    pedidosLabel: "Requerimentos",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
  },

  "quesitos-periciais-trab": {
    parteAutoraLabel: "Parte Formulante",
    parteReLabel: "Perito",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Quesitos Periciais Trabalhistas *",
    fatosPlaceholder: "Quesitos para perícia de insalubridade, periculosidade, ergonômica, contábil...",
    pedidosLabel: "Requerimentos",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
  },

  "manifestacao-trab": {
    parteAutoraLabel: "Parte Manifestante",
    parteReLabel: "Parte Contrária",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Manifestação *",
    fatosPlaceholder: "Apresente a manifestação sobre o tema determinado pelo juízo...",
    pedidosLabel: "Requerimentos",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
  },

  "agravo-instrumento-trab": {
    ...trabRecurso,
    parteAutoraLabel: "Agravante",
    parteReLabel: "Agravado(a)",
    fatosLabel: "Razões do Agravo de Instrumento (art. 897, b, CLT) *",
    fatosPlaceholder: "Denegação do recurso de revista, demonstração de cabimento, violação legal/divergência...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Provimento do AI para destrancar o recurso de revista...",
  },

  "contraminuta-ai-trab": {
    ...trabContrarrazoes,
    parteAutoraLabel: "Agravado(a)",
    parteReLabel: "Agravante",
    fatosLabel: "Contraminuta ao Agravo de Instrumento Trabalhista *",
    uploadSlots: [
      { key: "recurso_adversario", label: "Agravo de Instrumento (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do AI para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "recurso-adesivo-trab": {
    ...trabRecurso,
    fatosLabel: "Razões do Recurso Adesivo (art. 997, §1º CPC c/c CLT) *",
    fatosPlaceholder: "Matéria em que sucumbiu parcialmente, fundamentos para reforma...",
  },

  "contrarrazoes-revista": {
    ...trabContrarrazoes,
    fatosLabel: "Contrarrazões ao Recurso de Revista *",
    uploadSlots: [
      { key: "recurso_adversario", label: "Recurso de Revista (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do recurso de revista para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "agravo-regimental-trab": {
    ...trabRecurso,
    parteAutoraLabel: "Agravante",
    parteReLabel: "Agravado(a)",
    fatosLabel: "Razões do Agravo Regimental *",
    fatosPlaceholder: "Decisão monocrática impugnada, fundamentos para reforma pelo colegiado...",
  },

  "embargos-sdi1-tst": {
    ...trabRecurso,
    parteAutoraLabel: "Embargante",
    parteReLabel: "Embargado(a)",
    fatosLabel: "Embargos para a SDI-1 do TST (art. 894 CLT) *",
    fatosPlaceholder: "Divergência jurisprudencial entre Turmas do TST sobre a mesma matéria...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Uniformização da jurisprudência, prevalência da tese favorável...",
  },

  "recurso-extraordinario-trab": {
    ...trabRecurso,
    fatosLabel: "Razões do Recurso Extraordinário (Trabalhista) *",
    fatosPlaceholder: "Violação constitucional, repercussão geral, prequestionamento...",
  },

  "acao-rescisoria-trab": {
    parteAutoraLabel: "Autor da Rescisória",
    parteReLabel: "Réu na Rescisória",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Hipótese de Rescisão (art. 966 CPC c/c CLT) *",
    fatosPlaceholder: "Violação de norma, prova nova, erro de fato...",
    pedidosLabel: "Pedido",
    pedidosPlaceholder: "Rescisão do julgado, novo julgamento...",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
  },

  "impugnacao-cumprimento-trab": {
    parteAutoraLabel: "Executada / Impugnante",
    parteReLabel: "Exequente / Impugnado",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Impugnação ao Cumprimento (Trabalhista) *",
    fatosPlaceholder: "Excesso de execução, erro nos cálculos, prescrição intercorrente...",
    pedidosLabel: "Pedidos",
    hideFields: trabHide,
    autoAreaJuridica: "trabalhista",
  },

  "contrarrazoes-agravo-peticao": {
    ...trabContrarrazoes,
    fatosLabel: "Contrarrazões ao Agravo de Petição *",
    uploadSlots: [
      { key: "recurso_adversario", label: "Agravo de Petição (parte contrária)", required: false, accept: ".pdf,.docx,.txt,.doc", description: "Faça upload do agravo de petição para rebater", promptRole: "RECURSO ADVERSÁRIO PARA REBATER — analise e refute cada argumento" },
      slotDocumentoModelo,
    ],
  },

  "pedido-revisao-trab": {
    ...trabRecurso,
    fatosLabel: "Pedido de Revisão Trabalhista *",
    fatosPlaceholder: "Fundamentos para revisão da decisão...",
    pedidosLabel: "Pedido",
  },

  // ══════════════════════════════════════════════════════
  // CONTRATOS (11 tipos)
  // ══════════════════════════════════════════════════════

  "contrato-servicos": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Contratante",
    parteReLabel: "Contratada",
    fatosLabel: "Objeto da Prestação de Serviços *",
    fatosPlaceholder: "Descreva os serviços a serem prestados, escopo, entregas, cronograma...",
    pedidosLabel: "Cláusulas Específicas",
    pedidosPlaceholder: "Obrigações, prazos, penalidades, confidencialidade, propriedade intelectual...",
  },

  "contrato-honorarios": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Cliente / Contratante",
    parteReLabel: "Advogado / Contratado",
    fatosLabel: "Objeto dos Serviços Advocatícios *",
    fatosPlaceholder: "Escopo da atuação: tipo de ação/consultoria, foro, instâncias, complexidade...",
    pedidosLabel: "Honorários e Condições",
    pedidosPlaceholder: "Valor fixo, honorários de êxito (ad exitum), forma de pagamento, reajuste, despesas processuais...",
  },

  "contrato-locacao": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Locador (Proprietário)",
    parteReLabel: "Locatário (Inquilino)",
    fatosLabel: "Descrição do Imóvel e Condições *",
    fatosPlaceholder: "Endereço, descrição do imóvel, finalidade (residencial/comercial), estado de conservação...",
    pedidosLabel: "Cláusulas do Contrato",
    pedidosPlaceholder: "Prazo, valor do aluguel, reajuste, garantia (caução/fiança/seguro), multa, benfeitorias...",
  },

  "contrato-modelo": {
    ...defaultExtrajudicialConfig,
    fatosLabel: "Descrição do Contrato Desejado *",
    fatosPlaceholder: "Descreva que tipo de contrato deseja gerar e suas principais condições...",
    pedidosLabel: "Cláusulas e Condições",
  },

  "revisar-contrato": {
    ...defaultExtrajudicialConfig,
    showParteAutora: false,
    showParteRe: false,
    fatosLabel: "Texto do Contrato para Revisão *",
    fatosPlaceholder: "Cole aqui o texto do contrato a ser revisado...",
    pedidosLabel: "Pontos de Atenção",
    pedidosPlaceholder: "Cláusulas específicas a revisar, riscos a identificar...",
    hideFields: ["valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso", "areaJuridica"],
    requiresUpload: true,
  },

  "analise-contrato-parecer": {
    ...defaultExtrajudicialConfig,
    showParteAutora: false,
    showParteRe: false,
    fatosLabel: "Texto do Contrato para Análise *",
    fatosPlaceholder: "Cole aqui o contrato para emissão de parecer técnico...",
    pedidosLabel: "Questões Específicas",
    pedidosPlaceholder: "Quais aspectos devem ser analisados no parecer...",
    hideFields: ["valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso", "areaJuridica"],
    requiresUpload: true,
  },

  "comparar-contratos": {
    ...defaultExtrajudicialConfig,
    showParteAutora: false,
    showParteRe: false,
    fatosLabel: "Textos dos Contratos para Comparação *",
    fatosPlaceholder: "Cole aqui os textos das duas versões do contrato (separe com '---')...",
    pedidosLabel: "Instruções de Comparação",
    pedidosPlaceholder: "Quais cláusulas comparar, identificar alterações, riscos...",
    hideFields: ["valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso", "areaJuridica"],
    requiresUpload: true,
  },

  "aditivo-contratual": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Parte 1",
    parteReLabel: "Parte 2",
    fatosLabel: "Alterações ao Contrato Original *",
    fatosPlaceholder: "Descreva as cláusulas a serem alteradas, incluídas ou excluídas...",
    pedidosLabel: "Novas Condições",
    pedidosPlaceholder: "Novos prazos, valores, obrigações, condições...",
  },

  "termo-encerramento": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Parte 1",
    parteReLabel: "Parte 2",
    fatosLabel: "Motivo do Encerramento *",
    fatosPlaceholder: "Razão do encerramento, cumprimento das obrigações, pendências...",
    pedidosLabel: "Condições de Encerramento",
    pedidosPlaceholder: "Quitação mútua, prazo para obrigações remanescentes, devolução de bens...",
  },

  "termo-confidencialidade": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Parte Reveladora",
    parteReLabel: "Parte Receptora",
    fatosLabel: "Contexto e Informações Confidenciais *",
    fatosPlaceholder: "Descreva o contexto da relação comercial/profissional e quais informações são confidenciais...",
    pedidosLabel: "Obrigações e Penalidades",
    pedidosPlaceholder: "Prazo de sigilo, multa por violação, exceções à confidencialidade, jurisdição...",
  },

  "termos-uso": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Empresa / Plataforma",
    parteAutoraPlaceholder: "Razão social da empresa",
    parteReLabel: "Usuário",
    showParteRe: false,
    fatosLabel: "Descrição do Serviço/Plataforma *",
    fatosPlaceholder: "Descreva o serviço, funcionalidades, público-alvo...",
    pedidosLabel: "Cláusulas dos Termos",
    pedidosPlaceholder: "Responsabilidades, limitações, privacidade, cancelamento, pagamentos...",
  },

  // ══════════════════════════════════════════════════════
  // EXTRAJUDICIAL (9 tipos)
  // ══════════════════════════════════════════════════════

  "procuracao-ad-judicia": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Outorgante",
    parteAutoraPlaceholder: "Nome completo do outorgante (cliente)",
    qualificacaoAutoraPlaceholder: "RG, CPF, nacionalidade, estado civil, profissão, endereço completo, e-mail, telefone",
    parteReLabel: "Outorgado (Advogado)",
    parteRePlaceholder: "[Nome do Advogado] – [OAB]",
    fatosLabel: "Poderes e Finalidade *",
    fatosPlaceholder: "Descreva os poderes: foro em geral, ad judicia et extra, poderes especiais...",
    pedidosLabel: "Poderes Especiais",
    pedidosPlaceholder: "Confessar, transigir, desistir, receber, dar quitação, substabelecer com/sem reserva...",
    hideFields: ["valorCausa"],
  },

  "procuracao-ad-negotia": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Outorgante",
    parteAutoraPlaceholder: "Nome completo do outorgante",
    parteReLabel: "Outorgado",
    parteRePlaceholder: "Nome completo do outorgado (procurador)",
    fatosLabel: "Poderes Específicos *",
    fatosPlaceholder: "Descreva os poderes específicos para atos extrajudiciais: comprar, vender, representar perante órgãos...",
    pedidosLabel: "Limitações e Prazo",
    pedidosPlaceholder: "Prazo de validade, limitações, revogabilidade...",
    hideFields: ["valorCausa"],
  },

  "notificacao-extrajudicial": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Notificante",
    parteAutoraPlaceholder: "Nome completo do notificante",
    parteReLabel: "Notificado(a)",
    parteRePlaceholder: "Nome completo do notificado",
    fatosLabel: "Fatos que Motivam a Notificação *",
    fatosPlaceholder: "Descreva os fatos: descumprimento contratual, cobrança, prazo expirado...",
    pedidosLabel: "Providência Requerida e Prazo",
    pedidosPlaceholder: "O que o notificado deve fazer e em qual prazo, sob pena de medidas judiciais...",
  },

  "acordo-extrajudicial": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Parte 1",
    parteReLabel: "Parte 2",
    fatosLabel: "Objeto do Acordo *",
    fatosPlaceholder: "Descreva o que as partes estão acordando: dívida, obrigações, confissão...",
    pedidosLabel: "Condições do Acordo",
    pedidosPlaceholder: "Valores, parcelas, prazos, penalidades por descumprimento, título executivo extrajudicial (art. 784, III, CPC)...",
  },

  "acordo-familia": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Cônjuge / Companheiro(a) 1",
    parteReLabel: "Cônjuge / Companheiro(a) 2",
    fatosLabel: "Termos do Acordo Familiar (Lei 11.441/07) *",
    fatosPlaceholder: "Divórcio/dissolução, partilha de bens, guarda dos filhos, regime de visitas, alimentos...",
    pedidosLabel: "Cláusulas Específicas",
    pedidosPlaceholder: "Alimentos (valor/periodicidade), guarda compartilhada/unilateral, partilha de bens, uso do nome...",
  },

  "acordo-alimentos-guarda": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Genitor(a) / Alimentante",
    parteReLabel: "Genitor(a) / Representante do Menor",
    fatosLabel: "Termos do Acordo de Alimentos e Guarda *",
    fatosPlaceholder: "Nome e idade dos filhos, situação atual, guarda, visitas, alimentos...",
    pedidosLabel: "Condições Acordadas",
    pedidosPlaceholder: "Valor dos alimentos, dia de pagamento, guarda, regime de visitas, feriados, férias...",
  },

  "parecer-juridico": {
    ...defaultExtrajudicialConfig,
    showParteAutora: false,
    showParteRe: false,
    fatosLabel: "Questão Jurídica Consultada *",
    fatosPlaceholder: "Descreva a questão jurídica sobre a qual se solicita o parecer, com fatos relevantes...",
    pedidosLabel: "Pontos a Analisar",
    pedidosPlaceholder: "Aspectos específicos a serem abordados na análise jurídica...",
    hideFields: ["valorCausa", "correus", "testemunhas"],
  },

  "declaracao": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Declarante",
    parteReLabel: "Destinatário (se aplicável)",
    showParteRe: false,
    fatosLabel: "Conteúdo da Declaração *",
    fatosPlaceholder: "Descreva o que está sendo declarado, com circunstâncias e finalidade...",
    pedidosLabel: "Finalidade",
    pedidosPlaceholder: "Para que fim se destina esta declaração...",
    hideFields: ["valorCausa"],
  },

  "recibo": {
    ...defaultExtrajudicialConfig,
    parteAutoraLabel: "Recebedor (Credor)",
    parteReLabel: "Pagador (Devedor)",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Descrição do Pagamento *",
    fatosPlaceholder: "Valor recebido, referência (serviço, produto, processo), forma de pagamento...",
    pedidosLabel: "Observações",
    pedidosPlaceholder: "Parcela, saldo remanescente, quitação total/parcial...",
    hideFields: ["correus", "testemunhas"],
  },

  // ══════════════════════════════════════════════════════
  // FERRAMENTAS (17 tipos)
  // ══════════════════════════════════════════════════════

  "upload": {
    ...ferramentaBase,
    fatosLabel: "Descrição do Documento *",
    fatosPlaceholder: "Descreva o documento a ser carregado...",
    pedidosLabel: "Instruções",
    pedidosPlaceholder: "O que fazer com o documento...",
    requiresUpload: true,
  },

  "busca-jurisprudencia": {
    ...ferramentaBase,
    fatosLabel: "Tese Jurídica / Termos de Busca *",
    fatosPlaceholder: "Descreva a tese jurídica ou termos de busca para jurisprudência...",
    pedidosLabel: "Filtros",
    pedidosPlaceholder: "Tribunal, período, área do direito, tipo de decisão...",
  },

  "calculadora-liquidacao": {
    ...ferramentaBase,
    fatosLabel: "Dados para Cálculo de Liquidação *",
    fatosPlaceholder: "Valor principal, data de início, índice de correção, juros, multa...",
    pedidosLabel: "Parâmetros Adicionais",
    pedidosPlaceholder: "Tabela de correção (IPCA-E, INPC, SELIC), honorários...",
  },

  "chat-juridico": {
    ...ferramentaBase,
    fatosLabel: "Consulta Jurídica *",
    fatosPlaceholder: "Descreva sua dúvida jurídica...",
    pedidosLabel: "Contexto Adicional",
    pedidosPlaceholder: "Área do direito, situação específica, legislação relevante...",
  },

  "melhorar-documento": {
    ...ferramentaBase,
    fatosLabel: "Texto do Documento a Melhorar *",
    fatosPlaceholder: "Cole aqui o texto do documento que deseja aprimorar, ou faça upload do arquivo abaixo...",
    pedidosLabel: "Instruções para Melhoria",
    pedidosPlaceholder: "Ex: melhorar fundamentação, corrigir erros, tornar mais assertivo, adequar ao padrão ABNT...",
    requiresUpload: true,
  },

  "resumir-visual-law": {
    ...ferramentaBase,
    fatosLabel: "Texto do Documento *",
    fatosPlaceholder: "Cole aqui o texto para resumo com Visual Law...",
    pedidosLabel: "Instruções",
    pedidosPlaceholder: "Tipo de resumo visual desejado...",
    requiresUpload: true,
  },

  "resumir-documento": {
    ...ferramentaBase,
    fatosLabel: "Texto do Documento ou Processo *",
    fatosPlaceholder: "Cole aqui o texto do documento ou processo a resumir...",
    pedidosLabel: "Tipo de Resumo",
    pedidosPlaceholder: "Resumo executivo, pontos principais, cronologia, para cliente leigo...",
    requiresUpload: true,
  },

  "transcricao-audio": {
    ...ferramentaBase,
    fatosLabel: "Descrição do Áudio *",
    fatosPlaceholder: "Descreva o conteúdo do áudio (audiência, depoimento, reunião)...",
    pedidosLabel: "Instruções de Transcrição",
    pedidosPlaceholder: "Identificar interlocutores, incluir timestamps, formatação...",
    requiresUpload: true,
  },

  "medidas-cabiveis": {
    ...ferramentaBase,
    fatosLabel: "Descrição do Caso *",
    fatosPlaceholder: "Descreva os fatos do caso para análise de medidas jurídicas cabíveis...",
    pedidosLabel: "Contexto Adicional",
    pedidosPlaceholder: "Urgência, provas disponíveis, objetivos do cliente...",
  },

  "explicacao-movimento": {
    ...ferramentaBase,
    fatosLabel: "Movimento Processual *",
    fatosPlaceholder: "Cole aqui o texto do movimento processual para tradução em linguagem clara...",
    pedidosLabel: "Instruções",
    pedidosPlaceholder: "Nível de detalhe, explicar para cliente leigo...",
  },

  "legenda-rede-social": {
    ...ferramentaBase,
    fatosLabel: "Tema do Post *",
    fatosPlaceholder: "Descreva o tema jurídico para o post profissional (direitos do consumidor, trabalhista, etc.)...",
    pedidosLabel: "Tom e Estilo",
    pedidosPlaceholder: "Educativo, informativo, provocativo, storytelling, com emojis...",
  },

  "relatorio-processual": {
    ...ferramentaBase,
    showParteAutora: true,
    showParteRe: false,
    parteAutoraLabel: "Cliente Destinatário",
    parteAutoraPlaceholder: "Nome do cliente que receberá o relatório",
    fatosLabel: "Dados do Processo *",
    fatosPlaceholder: "Número do processo, partes, movimentações recentes, status atual...",
    pedidosLabel: "Instruções do Relatório",
    pedidosPlaceholder: "Linguagem (técnica/leiga), nível de detalhe, recomendações...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas"],
  },

  "roteiro-audiencia": {
    ...ferramentaBase,
    fatosLabel: "Dados do Caso e Audiência *",
    fatosPlaceholder: "Tipo de audiência, partes, teses, testemunhas, documentos relevantes...",
    pedidosLabel: "Estrutura do Roteiro",
    pedidosPlaceholder: "Perguntas para testemunhas, argumentos-chave, pontos de atenção...",
  },

  "roteiro-sustentacao-oral": {
    ...ferramentaBase,
    fatosLabel: "Dados do Caso e Recurso *",
    fatosPlaceholder: "Tipo de recurso, tribunal, teses principais, jurisprudência favorável...",
    pedidosLabel: "Estrutura da Sustentação",
    pedidosPlaceholder: "Tempo disponível, argumentos prioritários, resposta a possíveis questionamentos...",
  },

  "roteiro-primeira-consulta": {
    ...ferramentaBase,
    fatosLabel: "Tipo de Caso / Área *",
    fatosPlaceholder: "Área do direito, tipo de demanda (ex: trabalhista por demissão, família por divórcio)...",
    pedidosLabel: "Roteiro Desejado",
    pedidosPlaceholder: "Perguntas-chave, documentos a solicitar, orientações iniciais, honorários...",
  },

  "documentos-necessarios": {
    ...ferramentaBase,
    fatosLabel: "Descrição do Caso *",
    fatosPlaceholder: "Tipo de ação/procedimento e circunstâncias para listar documentos necessários...",
    pedidosLabel: "Instruções",
    pedidosPlaceholder: "Prioridade, documentos já disponíveis, observações...",
  },

  "quesitos-pericia": {
    ...ferramentaBase,
    fatosLabel: "Tipo de Perícia e Contexto *",
    fatosPlaceholder: "Tipo de perícia (contábil, médica, engenharia, insalubridade), fatos relevantes do caso...",
    pedidosLabel: "Pontos a Questionar",
    pedidosPlaceholder: "Aspectos específicos que os quesitos devem abordar...",
  },

  "pesquisa-jurisprudencial-doc": {
    showParteAutora: false,
    showParteRe: false,
    hideFields: ["areaJuridica", "valorCausa", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "",
    parteAutoraLabel: "",
    parteReLabel: "",
    fatosLabel: "Tema / Questão Jurídica para Pesquisa *",
    fatosPlaceholder: "Descreva o tema jurídico para pesquisa de jurisprudência. Ex: 'Princípio da insignificância em crimes de furto', 'Prisão preventiva e excesso de prazo', 'Inversão do ônus da prova em relação de consumo'...",
    pedidosLabel: "Contexto Adicional / Filtros",
    pedidosPlaceholder: "Tribunal preferencial (STF, STJ, TRF), período, tipo de crime/ação, teses específicas que deseja encontrar...",
    extraFields: [
      { key: "tribunalPreferencial", label: "Tribunal Preferencial", placeholder: "Ex: STF, STJ, TJRS, TST", type: "text" },
      { key: "areaEspecifica", label: "Área do Direito", placeholder: "Ex: Penal, Civil, Trabalhista, Consumidor", type: "text" },
    ],
  },

  // ══════════════════════════════════════════════════════
  // ACADÊMICO (4 tipos)
  // ══════════════════════════════════════════════════════

  "monografia-juridica": {
    showParteAutora: false,
    showParteRe: false,
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "",
    parteAutoraLabel: "",
    parteReLabel: "",
    fatosLabel: "Tema e Delimitação da Monografia *",
    fatosPlaceholder: "Descreva o tema central, a delimitação (recorte temporal, geográfico, temático) e o problema de pesquisa...",
    pedidosLabel: "Estrutura e Capítulos Desejados",
    pedidosPlaceholder: "Ex: 3 capítulos — 1. Revisão da literatura sobre responsabilidade civil ambiental; 2. Análise jurisprudencial; 3. Estudo de caso...",
    extraFields: [
      { key: "orientador", label: "Nome do Orientador(a)", placeholder: "Prof. Dr. / Prof. Dra.", type: "text" },
      { key: "instituicao", label: "Instituição / Universidade", placeholder: "Ex: Universidade Católica de Pernambuco", type: "text" },
      { key: "curso", label: "Curso", placeholder: "Ex: Bacharelado em Direito", type: "text" },
    ],
  },

  "tcc-direito": {
    showParteAutora: false,
    showParteRe: false,
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "",
    parteAutoraLabel: "",
    parteReLabel: "",
    fatosLabel: "Tema e Problema de Pesquisa *",
    fatosPlaceholder: "Descreva o tema, a delimitação e formule o problema de pesquisa como pergunta...",
    pedidosLabel: "Objetivos e Estrutura",
    pedidosPlaceholder: "Objetivo geral, objetivos específicos e capítulos desejados...",
    extraFields: [
      { key: "orientador", label: "Nome do Orientador(a)", placeholder: "Prof. Dr. / Prof. Dra.", type: "text" },
      { key: "instituicao", label: "Instituição / Universidade", placeholder: "Ex: UNICAP", type: "text" },
      { key: "curso", label: "Curso", placeholder: "Ex: Bacharelado em Direito", type: "text" },
    ],
  },

  "artigo-cientifico": {
    showParteAutora: false,
    showParteRe: false,
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "",
    parteAutoraLabel: "",
    parteReLabel: "",
    fatosLabel: "Tema e Tese do Artigo *",
    fatosPlaceholder: "Descreva o tema central, a tese ou argumento principal que o artigo defenderá...",
    pedidosLabel: "Estrutura e Seções",
    pedidosPlaceholder: "Introdução, desenvolvimento (seções), considerações finais...",
    extraFields: [
      { key: "palavras_chave", label: "Palavras-chave (3 a 5)", placeholder: "Ex: responsabilidade civil, dano ambiental, jurisprudência", type: "text" },
      { key: "periodico_destino", label: "Periódico / Revista de Destino (opcional)", placeholder: "Ex: Revista de Direito Ambiental", type: "text" },
    ],
  },

  "projeto-pesquisa": {
    showParteAutora: false,
    showParteRe: false,
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "",
    parteAutoraLabel: "",
    parteReLabel: "",
    fatosLabel: "Tema e Justificativa *",
    fatosPlaceholder: "Descreva o tema, a justificativa (relevância científica e social) e a delimitação...",
    pedidosLabel: "Objetivos e Metodologia",
    pedidosPlaceholder: "Objetivo geral, específicos, metodologia (indutivo, dedutivo, dialético), técnicas de pesquisa...",
    extraFields: [
      { key: "orientador", label: "Nome do Orientador(a)", placeholder: "Prof. Dr. / Prof. Dra.", type: "text" },
      { key: "instituicao", label: "Instituição / Universidade", placeholder: "Ex: UNICAP", type: "text" },
      { key: "hipotese", label: "Hipótese (opcional)", placeholder: "Resposta provisória ao problema de pesquisa", type: "text" },
    ],
  },
  // ══════════════════════════════════════════════════════
  // INTERNACIONAL / EMPRESARIAL (15 tipos)
  // ══════════════════════════════════════════════════════

  "loi-internacional": {
    parteAutoraLabel: "Company A (Proponente)",
    parteAutoraPlaceholder: "Nome/razão social da empresa proponente",
    qualificacaoAutoraPlaceholder: "CNPJ/Registration, endereço, país, representante legal",
    parteReLabel: "Company B (Destinatária)",
    parteRePlaceholder: "Nome/razão social da empresa destinatária",
    qualificacaoRePlaceholder: "CNPJ/Registration, endereço, país, representante legal",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Purpose / Objeto da LOI *",
    fatosPlaceholder: "Describe the purpose of this Letter of Intent: partnership, acquisition, supply agreement...",
    pedidosLabel: "Key Terms / Termos Principais",
    pedidosPlaceholder: "Investment amount, timeline, exclusivity period, conditions precedent...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "mou-internacional": {
    parteAutoraLabel: "Party A",
    parteAutoraPlaceholder: "Company name, registration, country",
    parteReLabel: "Party B",
    parteRePlaceholder: "Company name, registration, country",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Scope of Cooperation / Escopo *",
    fatosPlaceholder: "Define the scope and objectives of the cooperation between the parties...",
    pedidosLabel: "Commitments / Compromissos",
    pedidosPlaceholder: "Mutual obligations, timelines, resource allocation...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "nda-internacional": {
    parteAutoraLabel: "Disclosing Party",
    parteAutoraPlaceholder: "Company disclosing confidential information",
    parteReLabel: "Receiving Party",
    parteRePlaceholder: "Company receiving confidential information",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Confidential Information / Informação Confidencial *",
    fatosPlaceholder: "Describe the nature of confidential information: trade secrets, business plans, technical data...",
    pedidosLabel: "Terms / Termos",
    pedidosPlaceholder: "Duration (years), permitted disclosures, return/destruction obligations...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "contrato-distribuicao-internacional": {
    parteAutoraLabel: "Supplier / Fornecedor",
    parteAutoraPlaceholder: "Nome da empresa fornecedora/fabricante",
    parteReLabel: "Distributor / Distribuidor",
    parteRePlaceholder: "Nome da empresa distribuidora",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Products & Territory / Produtos e Território *",
    fatosPlaceholder: "Products to be distributed, geographic territory, exclusivity terms...",
    pedidosLabel: "Commercial Terms / Condições Comerciais",
    pedidosPlaceholder: "Pricing, minimum orders, payment terms, marketing obligations...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "contrato-representacao-comercial": {
    parteAutoraLabel: "Principal / Representado",
    parteAutoraPlaceholder: "Empresa representada",
    parteReLabel: "Agent / Representante",
    parteRePlaceholder: "Agente comercial / representante",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Scope of Representation *",
    fatosPlaceholder: "Territory, products/services, authority limits...",
    pedidosLabel: "Commission & Terms",
    pedidosPlaceholder: "Commission rates, payment terms, exclusivity, non-compete...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "supply-agreement": {
    parteAutoraLabel: "Buyer / Comprador",
    parteAutoraPlaceholder: "Empresa compradora",
    parteReLabel: "Supplier / Fornecedor",
    parteRePlaceholder: "Empresa fornecedora",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Goods / Services Description *",
    fatosPlaceholder: "Describe goods/services, specifications, quality standards...",
    pedidosLabel: "Delivery & Payment Terms",
    pedidosPlaceholder: "Incoterms, delivery schedule, payment terms, warranties...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "joint-venture-agreement": {
    parteAutoraLabel: "JV Partner A",
    parteAutoraPlaceholder: "First joint venture partner",
    parteReLabel: "JV Partner B",
    parteRePlaceholder: "Second joint venture partner",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "JV Purpose & Structure *",
    fatosPlaceholder: "Purpose of the joint venture, proposed structure, capital contributions...",
    pedidosLabel: "Governance & Profit Sharing",
    pedidosPlaceholder: "Management structure, profit/loss sharing, exit mechanisms, dispute resolution...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "proposta-comercial-internacional": {
    parteAutoraLabel: "Proponent / Proponente",
    parteAutoraPlaceholder: "Empresa proponente",
    parteReLabel: "Prospect / Destinatário",
    parteRePlaceholder: "Empresa destinatária da proposta",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Proposal Description / Descrição da Proposta *",
    fatosPlaceholder: "Products/services offered, value proposition, competitive advantages...",
    pedidosLabel: "Commercial Conditions",
    pedidosPlaceholder: "Pricing, payment terms, delivery, validity period...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "invoice-proforma": {
    parteAutoraLabel: "Exporter / Exportador",
    parteAutoraPlaceholder: "Nome da empresa exportadora",
    parteReLabel: "Importer / Importador",
    parteRePlaceholder: "Nome da empresa importadora",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Items / Mercadorias *",
    fatosPlaceholder: "Description of goods, HS codes, quantities, unit prices...",
    pedidosLabel: "Shipping & Payment Terms",
    pedidosPlaceholder: "Incoterms (FOB/CIF/EXW), payment method (L/C, T/T), shipping dates...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "estudo-viabilidade": {
    parteAutoraLabel: "Company / Empresa",
    parteAutoraPlaceholder: "Empresa solicitante do estudo",
    parteReLabel: "Project / Projeto",
    parteRePlaceholder: "Nome do projeto ou planta industrial",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Project Description / Descrição do Projeto *",
    fatosPlaceholder: "Describe the project: type of plant, capacity, location, raw materials...",
    pedidosLabel: "Financial Parameters",
    pedidosPlaceholder: "Investment budget, expected ROI, financing sources, timeline...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "due-diligence-report": {
    parteAutoraLabel: "Acquirer / Adquirente",
    parteAutoraPlaceholder: "Empresa adquirente / investidora",
    parteReLabel: "Target / Empresa-Alvo",
    parteRePlaceholder: "Empresa-alvo da due diligence",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Scope of Due Diligence *",
    fatosPlaceholder: "Areas to be investigated: financial, legal, environmental, operational...",
    pedidosLabel: "Key Findings / Achados",
    pedidosPlaceholder: "Known issues, risks identified, information requested...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "term-sheet": {
    parteAutoraLabel: "Investor / Investidor",
    parteAutoraPlaceholder: "Investidor ou parte proponente",
    parteReLabel: "Company / Empresa",
    parteRePlaceholder: "Empresa receptora do investimento",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Transaction Overview *",
    fatosPlaceholder: "Type of transaction, valuation, investment amount...",
    pedidosLabel: "Key Terms",
    pedidosPlaceholder: "Equity stake, governance rights, liquidation preferences, anti-dilution...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "power-of-attorney-internacional": {
    parteAutoraLabel: "Grantor / Outorgante",
    parteAutoraPlaceholder: "Person/company granting power",
    parteReLabel: "Attorney-in-Fact / Procurador",
    parteRePlaceholder: "Person/company receiving power",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Powers Granted / Poderes Concedidos *",
    fatosPlaceholder: "Specific powers: sign contracts, represent in court, manage bank accounts...",
    pedidosLabel: "Limitations & Duration",
    pedidosPlaceholder: "Duration, geographic scope, limitations, revocability...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "compliance-report": {
    parteAutoraLabel: "Reporting Entity / Entidade",
    parteAutoraPlaceholder: "Empresa ou entidade reportante",
    parteReLabel: "Regulatory Body / Órgão Regulador",
    parteRePlaceholder: "GDPR Authority, Environmental Agency, etc.",
    showParteAutora: true,
    showParteRe: false,
    fatosLabel: "Compliance Scope *",
    fatosPlaceholder: "Regulations assessed: GDPR, environmental permits, AML, anti-corruption...",
    pedidosLabel: "Findings & Recommendations",
    pedidosPlaceholder: "Compliance gaps, corrective actions, risk mitigation...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },

  "partnership-agreement": {
    parteAutoraLabel: "Partner A",
    parteAutoraPlaceholder: "First partner company",
    parteReLabel: "Partner B",
    parteRePlaceholder: "Second partner company",
    showParteAutora: true,
    showParteRe: true,
    fatosLabel: "Partnership Purpose *",
    fatosPlaceholder: "Strategic objectives, scope of cooperation, market focus...",
    pedidosLabel: "Terms & Governance",
    pedidosPlaceholder: "Profit sharing, decision-making, IP ownership, exit clauses...",
    hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
    autoAreaJuridica: "internacional",
  },
};

export { configs };

// Moved here to break circular dependency with document-type-config.ts
const defaultJudicialConfig: import("./document-type-config").DocumentTypeConfig = {
  parteAutoraLabel: "Parte Autora",
  parteReLabel: "Parte Ré",
  showParteAutora: true,
  showParteRe: true,
  fatosLabel: "Fatos / Descrição do Caso *",
  fatosPlaceholder: "Descreva os fatos relevantes, circunstâncias, cronologia, provas disponíveis...",
  pedidosLabel: "Pedidos / Requerimentos",
  pedidosPlaceholder: "Quais os pedidos: condenação, indenização, obrigação de fazer...",
  hideFields: [],
  autoAreaJuridica: "",
};

export function getDocTypeConfig(tipoId: string): import("./document-type-config").DocumentTypeConfig {
  const specific = configs[tipoId];
  if (specific) {
    return { ...defaultJudicialConfig, ...specific };
  }
  if (tipoId.includes("-trab") || tipoId.includes("trabalhist")) {
    return {
      ...defaultJudicialConfig,
      parteAutoraLabel: "Reclamante",
      parteReLabel: "Reclamada",
      showParteAutora: true,
      showParteRe: true,
      hideFields: trabHide,
      autoAreaJuridica: "trabalhista",
    };
  }
  if (tipoId.includes("-penal") || tipoId.includes("criminal")) {
    return { ...defaultJudicialConfig, ...penalDefesa };
  }
  return defaultJudicialConfig;
}

export function getAutoAreaForCategory(category?: string): string {
  const map: Record<string, string> = { penal: "penal", trabalhista: "trabalhista", internacional: "internacional" };
  return category ? map[category] || "" : "";
}
