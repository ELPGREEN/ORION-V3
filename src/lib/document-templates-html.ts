/**
 * document-templates-html.ts
 * Provides HTML-structured versions of document templates with proper
 * TipTap-compatible formatting: centered headings, justified paragraphs,
 * first-line indents, line-height, and semantic structure.
 *
 * Falls back to converting plain-text templates via `convertPlainToHTML`.
 */

import { getDocumentTemplate, type LawyerInfo } from "./document-templates";
import { getDocumentFormatConfig } from "./document-format-config";

// ─── Paragraph style builder ───

function pStyle(config: ReturnType<typeof getDocumentFormatConfig>, extra?: string): string {
  const parts = [
    `text-align: ${config.textAlign}`,
    `line-height: ${config.lineHeight}`,
  ];
  if (extra) parts.push(extra);
  return parts.join("; ");
}

// ─── HTML Templates for top document types ───

const HTML_TEMPLATES: Record<string, (cfg: ReturnType<typeof getDocumentFormatConfig>) => string> = {
  "peticao-inicial": (cfg) => `
<p style="text-align: center; line-height: ${cfg.lineHeight}"><strong>EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE PORTO ALEGRE/RS</strong></p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}"><strong>{{nome_autor}}</strong>, {{qualificacao_autor}}, inscrito(a) no CPF sob o nº {{cpf_autor}}, portador(a) do RG nº {{rg_autor}}, residente e domiciliado(a) na {{endereco_autor}}, CEP {{cep_autor}}, e-mail: {{email_autor}}, por seu advogado que esta subscreve (procuração anexa), vem, respeitosamente, à presença de Vossa Excelência, propor a presente</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h2 style="text-align: center; line-height: ${cfg.lineHeight}">AÇÃO {{tipo_acao}}</h2>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">em face de <strong>{{nome_reu}}</strong>, {{qualificacao_reu}}, inscrito(a) no CPF/CNPJ sob o nº {{cpf_cnpj_reu}}, com sede/residente na {{endereco_reu}}, CEP {{cep_reu}}, pelos fatos e fundamentos a seguir expostos.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">I – DOS FATOS</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{fatos}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">II – DO DIREITO</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{fundamentacao_juridica}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">III – DOS PEDIDOS</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Ante o exposto, requer:</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">a) A citação do(a) réu/ré para, querendo, contestar a presente ação;</p>
<p style="${pStyle(cfg)}">b) {{pedido_principal}};</p>
<p style="${pStyle(cfg)}">c) A condenação do(a) réu/ré ao pagamento das custas processuais e honorários advocatícios;</p>
<p style="${pStyle(cfg)}">d) A produção de todas as provas admitidas em direito.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">IV – DO VALOR DA CAUSA</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">Dá-se à causa o valor de R$ {{valor_causa}} ({{valor_causa_extenso}}), nos termos do art. 292 do CPC.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Termos em que,</p>
<p style="${pStyle(cfg)}">Pede deferimento.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Porto Alegre/RS, {{data_extenso}}.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">_________________________________</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">[Nome do Advogado]</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">[OAB]</p>`,

  "habeas-corpus": (cfg) => `
<p style="text-align: center; line-height: ${cfg.lineHeight}"><strong>EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) DESEMBARGADOR(A) PRESIDENTE DO TRIBUNAL DE JUSTIÇA DO ESTADO DO RIO GRANDE DO SUL</strong></p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}"><strong>{{nome_impetrante}}</strong>, advogado(a), inscrito(a) na OAB/RS sob o nº {{oab_numero}}, vem, respeitosamente, impetrar</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h2 style="text-align: center; line-height: ${cfg.lineHeight}">ORDEM DE HABEAS CORPUS</h2>
<p style="text-align: center; line-height: ${cfg.lineHeight}">(com pedido de liminar)</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">em favor de <strong>{{nome_paciente}}</strong>, {{qualificacao_paciente}}, inscrito(a) no CPF sob o nº {{cpf_paciente}}, atualmente {{situacao_paciente}},</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">apontando como <strong>AUTORIDADE COATORA</strong> o(a) Exmo(a). Sr(a). Juiz(a) de Direito da {{vara}} da Comarca de {{comarca}}/RS (Processo nº {{numero_processo}}),</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">pelos fatos e fundamentos jurídicos a seguir expostos.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">I – DOS FATOS</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{fatos}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">II – DO CONSTRANGIMENTO ILEGAL</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{constrangimento_ilegal}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">III – DO FUMUS BONI IURIS E DO PERICULUM IN MORA (LIMINAR)</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{fumus_periculum}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">IV – DO PEDIDO</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Ante o exposto, requer:</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">a) A concessão de LIMINAR para determinar a imediata expedição de alvará de soltura em favor do paciente;</p>
<p style="${pStyle(cfg)}">b) A notificação da autoridade coatora para prestar informações no prazo legal;</p>
<p style="${pStyle(cfg)}">c) A oitiva do Ministério Público;</p>
<p style="${pStyle(cfg)}">d) No mérito, a CONCESSÃO DEFINITIVA DA ORDEM;</p>
<p style="${pStyle(cfg)}">e) Subsidiariamente, a aplicação de medidas cautelares alternativas (art. 319 do CPP).</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Termos em que,</p>
<p style="${pStyle(cfg)}">Pede deferimento.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Porto Alegre/RS, {{data_extenso}}.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">_________________________________</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">[Nome do Advogado]</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">[OAB]</p>`,

  "contestacao": (cfg) => `
<p style="text-align: center; line-height: ${cfg.lineHeight}"><strong>EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE PORTO ALEGRE/RS</strong></p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Processo nº {{numero_processo}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}"><strong>{{nome_reu}}</strong>, já qualificado(a) nos autos da ação {{tipo_acao}} que lhe move <strong>{{nome_autor}}</strong>, vem, por seu advogado que esta subscreve, apresentar</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h2 style="text-align: center; line-height: ${cfg.lineHeight}">CONTESTAÇÃO</h2>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">nos termos do art. 335 e seguintes do CPC, pelos fatos e fundamentos a seguir expostos.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">I – SÍNTESE DA DEMANDA</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{sintese_demanda}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">II – PRELIMINARES</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{preliminares}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">III – DO MÉRITO</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{merito}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">IV – DOS PEDIDOS</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Ante o exposto, requer:</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">a) O acolhimento das preliminares arguidas, com a extinção do feito sem resolução do mérito;</p>
<p style="${pStyle(cfg)}">b) Subsidiariamente, a total improcedência dos pedidos autorais;</p>
<p style="${pStyle(cfg)}">c) A condenação do(a) autor(a) ao pagamento das custas processuais e honorários advocatícios.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Termos em que,</p>
<p style="${pStyle(cfg)}">Pede deferimento.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Porto Alegre/RS, {{data_extenso}}.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">_________________________________</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">[Nome do Advogado]</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">[OAB]</p>`,

  "recurso-apelacao": (cfg) => `
<p style="text-align: center; line-height: ${cfg.lineHeight}"><strong>EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) DESEMBARGADOR(A) PRESIDENTE DO TRIBUNAL DE JUSTIÇA DO ESTADO DO RIO GRANDE DO SUL</strong></p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Processo nº {{numero_processo}}</p>
<p style="${pStyle(cfg)}">Origem: ___ Vara Cível da Comarca de {{comarca}}/RS</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}"><strong>{{nome_apelante}}</strong>, já qualificado(a) nos autos, inconformado(a) com a r. sentença de fls. {{folhas}}, vem, respeitosamente, interpor</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h2 style="text-align: center; line-height: ${cfg.lineHeight}">RECURSO DE APELAÇÃO</h2>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">com fundamento no art. 1.009 e seguintes do CPC, requerendo seja recebido e processado, com a reforma da decisão recorrida, pelas razões que passa a expor.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h2 style="text-align: center; line-height: ${cfg.lineHeight}">RAZÕES DE APELAÇÃO</h2>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">I – DOS FATOS E DA SENTENÇA RECORRIDA</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{fatos_sentenca}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">II – DAS RAZÕES PARA REFORMA</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{razoes_reforma}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">III – DO PEDIDO</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Ante o exposto, requer o conhecimento e provimento do presente recurso para reformar a r. sentença, {{pedido_reforma}}.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Termos em que,</p>
<p style="${pStyle(cfg)}">Pede deferimento.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Porto Alegre/RS, {{data_extenso}}.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">_________________________________</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">[Nome do Advogado]</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">[OAB]</p>`,

  "reclamacao-trabalhista": (cfg) => `
<p style="text-align: center; line-height: ${cfg.lineHeight}"><strong>AO JUÍZO DA ___ VARA DO TRABALHO DE PORTO ALEGRE/RS</strong></p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}"><strong>{{nome_reclamante}}</strong>, {{qualificacao_reclamante}}, inscrito(a) no CPF sob o nº {{cpf_reclamante}}, portador(a) do CTPS nº {{ctps}}, residente e domiciliado(a) na {{endereco_reclamante}}, CEP {{cep}}, e-mail: {{email}}, por seu advogado que esta subscreve (procuração anexa), vem, respeitosamente, propor a presente</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h2 style="text-align: center; line-height: ${cfg.lineHeight}">RECLAMAÇÃO TRABALHISTA</h2>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">em face de <strong>{{nome_reclamada}}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{cnpj}}, com sede na {{endereco_reclamada}}, CEP {{cep_reclamada}}, pelos fatos e fundamentos a seguir expostos.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">I – DO CONTRATO DE TRABALHO</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Data de admissão: {{data_admissao}}</p>
<p style="${pStyle(cfg)}">Data de demissão: {{data_demissao}}</p>
<p style="${pStyle(cfg)}">Função exercida: {{funcao}}</p>
<p style="${pStyle(cfg)}">Último salário: R$ {{ultimo_salario}}</p>
<p style="${pStyle(cfg)}">Jornada de trabalho: {{jornada}}</p>
<p style="${pStyle(cfg)}">Forma de rescisão: {{forma_rescisao}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">II – DOS FATOS</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{fatos}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">III – DO DIREITO</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{fundamentacao_juridica}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">IV – DOS PEDIDOS</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Ante o exposto, requer:</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">a) A notificação da reclamada para comparecer em audiência e apresentar defesa;</p>
<p style="${pStyle(cfg)}">b) {{pedidos_trabalhistas}};</p>
<p style="${pStyle(cfg)}">c) Honorários advocatícios;</p>
<p style="${pStyle(cfg)}">d) Justiça gratuita (se aplicável);</p>
<p style="${pStyle(cfg)}">e) Produção de todas as provas admitidas em direito.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">V – DO VALOR DA CAUSA</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">Dá-se à causa o valor de R$ {{valor_causa}} ({{valor_causa_extenso}}).</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Termos em que,</p>
<p style="${pStyle(cfg)}">Pede deferimento.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Porto Alegre/RS, {{data_extenso}}.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">_________________________________</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">[Nome do Advogado]</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">[OAB]</p>`,

  "contrato-servicos": (cfg) => `
<h2 style="text-align: center; line-height: ${cfg.lineHeight}">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Pelo presente instrumento particular, as partes abaixo qualificadas:</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}"><strong>CONTRATANTE:</strong> {{nome_contratante}}, {{qualificacao_contratante}}, inscrito(a) no CPF sob o nº {{cpf_contratante}}, residente e domiciliado(a) na {{endereco_contratante}}, CEP {{cep}}, e-mail: {{email_contratante}};</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}"><strong>CONTRATADA:</strong> {{nome_contratada}}, inscrita no CPF/CNPJ sob o nº {{cnpj_contratada}}, com sede na {{endereco_contratada}}, CEP {{cep_contratada}}, neste ato representada por {{representante}}, e-mail: {{email_contratada}};</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Têm entre si justo e acordado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas e condições seguintes:</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">CLÁUSULA PRIMEIRA – DO OBJETO</h3>
<p style="${pStyle(cfg)}">{{objeto_contrato}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DA CONTRATADA</h3>
<p style="${pStyle(cfg)}">{{obrigacoes_contratada}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE</h3>
<p style="${pStyle(cfg)}">{{obrigacoes_contratante}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">CLÁUSULA QUARTA – DO PRAZO</h3>
<p style="${pStyle(cfg)}">O presente contrato terá vigência de {{prazo}}, com início em {{data_inicio}} e término em {{data_termino}}, podendo ser prorrogado mediante acordo escrito entre as partes.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">CLÁUSULA QUINTA – DO VALOR E FORMA DE PAGAMENTO</h3>
<p style="${pStyle(cfg)}">Pela prestação dos serviços, o CONTRATANTE pagará à CONTRATADA o valor de R$ {{valor}} ({{valor_extenso}}), a ser pago {{forma_pagamento}}.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">CLÁUSULA SEXTA – DAS PENALIDADES</h3>
<p style="${pStyle(cfg)}">{{penalidades}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">CLÁUSULA SÉTIMA – DA RESCISÃO</h3>
<p style="${pStyle(cfg)}">{{condicoes_rescisao}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">CLÁUSULA OITAVA – DA CONFIDENCIALIDADE</h3>
<p style="${pStyle(cfg)}">As partes se comprometem a manter sigilo sobre todas as informações obtidas em razão deste contrato.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">CLÁUSULA NONA – DAS DISPOSIÇÕES GERAIS</h3>
<p style="${pStyle(cfg)}">{{disposicoes_gerais}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">CLÁUSULA DÉCIMA – DO FORO</h3>
<p style="${pStyle(cfg)}">Fica eleito o Foro da Comarca de Porto Alegre/RS para dirimir quaisquer dúvidas oriundas do presente contrato.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Porto Alegre/RS, {{data_extenso}}.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">_________________________________</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">CONTRATANTE: {{nome_contratante}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">_________________________________</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">CONTRATADA: {{nome_contratada}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">TESTEMUNHAS:</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">1. _________________________________ Nome: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CPF:</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">2. _________________________________ Nome: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CPF:</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">_________________________________</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">[Nome do Advogado] – [OAB]</p>`,

  "mandado-seguranca": (cfg) => `
<p style="text-align: center; line-height: ${cfg.lineHeight}"><strong>EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA DA FAZENDA PÚBLICA DA COMARCA DE PORTO ALEGRE/RS</strong></p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}"><strong>{{nome_impetrante}}</strong>, {{qualificacao_impetrante}}, por seu advogado que esta subscreve, vem, respeitosamente, impetrar</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h2 style="text-align: center; line-height: ${cfg.lineHeight}">MANDADO DE SEGURANÇA</h2>
<p style="text-align: center; line-height: ${cfg.lineHeight}">(com pedido de liminar)</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">em face de ato ilegal e abusivo praticado por <strong>{{autoridade_coatora}}</strong> — {{cargo_orgao}}, pelos fatos e fundamentos a seguir expostos.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">I – DA AUTORIDADE COATORA E DO ATO IMPUGNADO</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{ato_impugnado}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">II – DO DIREITO LÍQUIDO E CERTO</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{direito_liquido_certo}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">III – DA LIMINAR (ART. 7º, III, DA LEI 12.016/09)</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg, "text-indent: 47px")}">{{fumus_periculum}}</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<h3 style="text-align: left; line-height: ${cfg.lineHeight}">IV – DOS PEDIDOS</h3>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Ante o exposto, requer:</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">a) A concessão de LIMINAR para suspender o ato coator;</p>
<p style="${pStyle(cfg)}">b) A notificação da autoridade coatora para prestar informações;</p>
<p style="${pStyle(cfg)}">c) A oitiva do Ministério Público;</p>
<p style="${pStyle(cfg)}">d) A CONCESSÃO DEFINITIVA DA SEGURANÇA.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Dá-se à causa o valor de R$ {{valor_causa}}.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Termos em que,</p>
<p style="${pStyle(cfg)}">Pede deferimento.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="${pStyle(cfg)}">Porto Alegre/RS, {{data_extenso}}.</p>
<p style="${pStyle(cfg)}">&nbsp;</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">_________________________________</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">[Nome do Advogado]</p>
<p style="text-align: center; line-height: ${cfg.lineHeight}">[OAB]</p>`,
};

// ─── Smart plain-text → HTML converter ───

function convertPlainToHTML(
  text: string,
  config: ReturnType<typeof getDocumentFormatConfig>
): string {
  const lines = text.split("\n");
  const htmlLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      htmlLines.push(`<p style="${pStyle(config)}">&nbsp;</p>`);
      continue;
    }

    // Detect centered headings (EXCELENTÍSSIMO, TÍTULO DO DOCUMENTO, AÇÃO, RECURSO etc.)
    const isAddressing = /^EXCELENTÍSSIM|^AO JUÍZO|^AO TRIBUNAL|^AO SENHOR|^À SENHORA/i.test(trimmed);
    const isTitle = /^(ORDEM DE|MANDADO DE|RECURSO|APELAÇÃO|CONTESTAÇÃO|PETIÇÃO|RECLAMAÇÃO|QUEIXA|RESPOSTA|CONTRATO|NOTIFICAÇÃO|PROCURAÇÃO|ACORDO|TERMO)/i.test(trimmed)
      && trimmed.length < 80;
    const isSubtitle = /^\(com pedido|^\(art\.|^\(título/i.test(trimmed);

    // Section headings: "I – ", "II – ", "CLÁUSULA PRIMEIRA", etc.
    const isSectionHeading = /^(I{1,3}|IV|V|VI{0,3}|IX|X)\s*[–—-]\s+/i.test(trimmed)
      || /^CLÁUSULA\s+(PRIMEIRA|SEGUNDA|TERCEIRA|QUARTA|QUINTA|SEXTA|SÉTIMA|OITAVA|NONA|DÉCIMA)/i.test(trimmed)
      || /^RAZÕES DE/i.test(trimmed);

    // Signature line
    const isSignature = /^_{5,}/.test(trimmed) || /^Dr\.\s|^OAB\//i.test(trimmed);
    const isPartyLabel = /^(CONTRATANTE|CONTRATADA|OUTORGANTE|OUTORGADO|PARTE\s+\d|TESTEMUNHA)/i.test(trimmed);

    if (isAddressing) {
      htmlLines.push(`<p style="text-align: center; line-height: ${config.lineHeight}"><strong>${trimmed}</strong></p>`);
    } else if (isTitle) {
      htmlLines.push(`<h2 style="text-align: center; line-height: ${config.lineHeight}">${trimmed}</h2>`);
    } else if (isSubtitle) {
      htmlLines.push(`<p style="text-align: center; line-height: ${config.lineHeight}">${trimmed}</p>`);
    } else if (isSectionHeading) {
      htmlLines.push(`<h3 style="text-align: left; line-height: ${config.lineHeight}">${trimmed}</h3>`);
    } else if (isSignature || isPartyLabel) {
      htmlLines.push(`<p style="text-align: center; line-height: ${config.lineHeight}">${trimmed}</p>`);
    } else {
      // Regular paragraph
      htmlLines.push(`<p style="${pStyle(config)}">${trimmed}</p>`);
    }
  }

  return htmlLines.join("\n");
}

// ─── Public API ───

/**
 * Get an HTML-structured template for a document type.
 * Uses hand-crafted HTML for top types, falls back to smart conversion of plain-text templates.
 */
export function getDocumentTemplateHTML(
  tipoId: string,
  category?: string,
  lawyer?: LawyerInfo
): string {
  const config = getDocumentFormatConfig(tipoId, category);

  // Check for hand-crafted HTML template
  const htmlFactory = HTML_TEMPLATES[tipoId];
  if (htmlFactory) {
    let html = htmlFactory(config).trim();
    if (lawyer) {
      html = html
        .replace(/\[Nome do Advogado\]/gi, lawyer.nome)
        .replace(/\[OAB\]/g, lawyer.oab);
    }
    return html;
  }

  // Fall back to converting the plain-text template (applyLawyerInfo handled inside)
  const plainText = getDocumentTemplate(tipoId, lawyer);
  return convertPlainToHTML(plainText, config);
}
