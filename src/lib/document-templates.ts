// Pre-built legal document templates for manual writing mode
// Each template provides a structured starting point that the lawyer can edit

export type TemplateId = string;

export interface LawyerInfo {
  nome: string;
  oab: string;
}

function applyLawyerInfo(template: string, lawyer?: LawyerInfo): string {
  if (!lawyer) return template;
  return template
    .replace(/\[Nome do Advogado\]/gi, lawyer.nome)
    .replace(/\[NOME DO ADVOGADO\]/g, lawyer.nome.toUpperCase())
    .replace(/\[OAB\]/g, lawyer.oab)
    .replace(/\[Nome do Escritório\]/g, lawyer.nome.includes('Advocacia') ? lawyer.nome : `${lawyer.nome} Advocacia`);
}



export function getDocumentTemplate(tipoId: string, lawyer?: LawyerInfo): string {
  const templates: Record<string, string> = {

    // ══════════════════════════════════════════════════════
    // PENAL
    // ══════════════════════════════════════════════════════

    "habeas-corpus": `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) DESEMBARGADOR(A) PRESIDENTE DO TRIBUNAL DE JUSTIÇA DO ESTADO DO RIO GRANDE DO SUL


[NOME DO IMPETRANTE], advogado(a), inscrito(a) na OAB/RS sob o nº [OAB], vem, respeitosamente, impetrar

ORDEM DE HABEAS CORPUS
(com pedido de liminar)

em favor de [NOME DO PACIENTE], [nacionalidade], [estado civil], [profissão], inscrito(a) no CPF sob o nº [CPF], portador(a) do RG nº [RG], atualmente [preso/recolhido no estabelecimento prisional X / ameaçado de prisão],

apontando como AUTORIDADE COATORA o(a) Exmo(a). Sr(a). Juiz(a) de Direito da [___] Vara Criminal da Comarca de [___]/RS (Processo nº [número]),

pelos fatos e fundamentos jurídicos a seguir expostos.


I – DOS FATOS

[Descreva os fatos que configuram o constrangimento ilegal sofrido pelo paciente: ilegalidade da prisão, ausência de fundamentação idônea, excesso de prazo para formação de culpa, prisão preventiva desnecessária, etc.]


II – DO CONSTRANGIMENTO ILEGAL

[Fundamente juridicamente o constrangimento ilegal, citando art. 5º, LXVIII, da CF; arts. 647 e 648 do CPP; jurisprudência do STF e STJ sobre ilegalidade de prisão.]


III – DO FUMUS BONI IURIS E DO PERICULUM IN MORA (LIMINAR)

[Demonstre a probabilidade do direito e o perigo da demora que justificam a concessão de liminar.]


IV – DO PEDIDO

Ante o exposto, requer:

a) A concessão de LIMINAR para determinar a imediata expedição de alvará de soltura / salvo-conduto em favor do paciente;
b) A notificação da autoridade coatora para prestar informações no prazo legal;
c) A oitiva do Ministério Público;
d) No mérito, a CONCESSÃO DEFINITIVA DA ORDEM para [relaxar a prisão ilegal / revogar a prisão preventiva / trancar a ação penal / cessar o constrangimento ilegal];
e) Subsidiariamente, a aplicação de medidas cautelares alternativas (art. 319 do CPP).

Termos em que,
Pede deferimento.

Porto Alegre/RS, [data por extenso].


_________________________________
[Nome do Advogado]
[OAB]`,

    "queixa-crime": `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CRIMINAL DA COMARCA DE PORTO ALEGRE/RS


[NOME DO QUERELANTE], [nacionalidade], [estado civil], [profissão], inscrito(a) no CPF sob o nº [CPF], portador(a) do RG nº [RG], residente e domiciliado(a) na [endereço completo], por seu advogado que esta subscreve, vem, respeitosamente, oferecer

QUEIXA-CRIME

em face de [NOME DO QUERELADO], [qualificação completa], pelos fatos e fundamentos a seguir expostos.


I – DOS FATOS

[Descreva os fatos criminosos com data, hora, local e circunstâncias. Crimes de ação penal privada: calúnia (art. 138 CP), difamação (art. 139 CP), injúria (art. 140 CP), etc.]


II – DA TIPIFICAÇÃO

[Tipifique a conduta nas normas penais aplicáveis.]


III – DAS PROVAS

[Indique as provas documentais, testemunhais e periciais.]


IV – DOS PEDIDOS

Ante o exposto, requer:

a) O recebimento da presente queixa-crime;
b) A citação do querelado para responder à acusação;
c) A condenação nas penas do art. [___] do Código Penal;
d) A produção de todas as provas admitidas em direito.

Dá-se à causa o valor de R$ [valor].

Termos em que,
Pede deferimento.

Porto Alegre/RS, [data por extenso].


_________________________________
[Nome do Advogado]
[OAB]`,

    "resposta-acusacao": `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CRIMINAL DA COMARCA DE PORTO ALEGRE/RS

Processo nº [número do processo]


[NOME DO ACUSADO], já qualificado(a) nos autos da ação penal que lhe move o MINISTÉRIO PÚBLICO DO ESTADO DO RIO GRANDE DO SUL, vem, por seu advogado que esta subscreve, apresentar

RESPOSTA À ACUSAÇÃO
(Art. 396-A do CPP)

nos termos e prazos legais, pelos fatos e fundamentos a seguir expostos.


I – SÍNTESE DA ACUSAÇÃO

[Resuma brevemente os termos da denúncia.]


II – PRELIMINARES

[Se houver: inépcia da denúncia, incompetência do juízo, ilegitimidade de parte, litispendência, coisa julgada, falta de condição de procedibilidade.]


III – PEDIDO DE ABSOLVIÇÃO SUMÁRIA (ART. 397 CPP)

[Se cabível: existência manifesta de causa excludente da ilicitude, existência manifesta de causa excludente da culpabilidade, atipicidade evidente, causa de extinção da punibilidade.]


IV – DO MÉRITO

[Conteste ponto a ponto as alegações acusatórias. Teses defensivas: negativa de autoria, álibi, legítima defesa, estado de necessidade, erro de tipo, princípio da insignificância, etc.]


V – DAS PROVAS

Requer a produção das seguintes provas:
a) Oitiva das testemunhas arroladas abaixo;
b) [Outras provas: perícia, acareação, etc.]


VI – ROL DE TESTEMUNHAS

1. [Nome], [qualificação], [endereço];
2. [Nome], [qualificação], [endereço];
3. [Nome], [qualificação], [endereço].


VII – DOS PEDIDOS

Ante o exposto, requer:

a) O acolhimento das preliminares arguidas;
b) Subsidiariamente, a absolvição sumária (art. 397 CPP);
c) No mérito, a improcedência total da ação penal com a absolvição do acusado;
d) A produção de todas as provas requeridas.

Termos em que,
Pede deferimento.

Porto Alegre/RS, [data por extenso].


_________________________________
[Nome do Advogado]
[OAB]`,

    // ══════════════════════════════════════════════════════
    // CIVIL
    // ══════════════════════════════════════════════════════

    "peticao-inicial": `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE PORTO ALEGRE/RS


[NOME DO(A) AUTOR(A)], [nacionalidade], [estado civil], [profissão], inscrito(a) no CPF sob o nº [CPF], portador(a) do RG nº [RG], residente e domiciliado(a) na [endereço completo], CEP [CEP], e-mail: [e-mail], por seu advogado que esta subscreve (procuração anexa), vem, respeitosamente, à presença de Vossa Excelência, propor a presente

AÇÃO [TIPO DA AÇÃO]

em face de [NOME DO(A) RÉU/RÉ], [nacionalidade], [estado civil], [profissão], inscrito(a) no CPF/CNPJ sob o nº [CPF/CNPJ], com sede/residente na [endereço completo], CEP [CEP], pelos fatos e fundamentos a seguir expostos.


I – DOS FATOS

[Descreva aqui os fatos relevantes em ordem cronológica. Inclua datas, circunstâncias, documentos comprobatórios e demais elementos que fundamentam a pretensão.]


II – DO DIREITO

[Fundamente juridicamente o pedido, citando artigos de lei (CPC, CC, CF, CDC, CLT etc.), jurisprudência do STF, STJ e TJ-RS, e doutrina quando pertinente.]


III – DOS PEDIDOS

Ante o exposto, requer:

a) A citação do(a) réu/ré para, querendo, contestar a presente ação;
b) [Pedido principal];
c) [Pedidos subsidiários];
d) A condenação do(a) réu/ré ao pagamento das custas processuais e honorários advocatícios;
e) A produção de todas as provas admitidas em direito.


IV – DO VALOR DA CAUSA

Dá-se à causa o valor de R$ [valor] ([valor por extenso]), nos termos do art. 292 do CPC.

Termos em que,
Pede deferimento.

Porto Alegre/RS, [data por extenso].


_________________________________
[Nome do Advogado]
[OAB]`,

    "contestacao": `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE PORTO ALEGRE/RS

Processo nº [número do processo]


[NOME DO(A) RÉU/RÉ], já qualificado(a) nos autos da ação [tipo da ação] que lhe move [NOME DO(A) AUTOR(A)], vem, por seu advogado que esta subscreve, apresentar

CONTESTAÇÃO

nos termos do art. 335 e seguintes do CPC, pelos fatos e fundamentos a seguir expostos.


I – SÍNTESE DA DEMANDA

[Resuma brevemente os fatos e pedidos do(a) autor(a).]


II – PRELIMINARES

[Se houver, exponha as preliminares: inépcia da inicial, ilegitimidade, falta de interesse processual, litispendência, coisa julgada etc.]


III – DO MÉRITO

[Conteste ponto a ponto as alegações do(a) autor(a), com fundamentação jurídica.]


IV – DOS PEDIDOS

Ante o exposto, requer:

a) O acolhimento das preliminares arguidas, com a extinção do feito sem resolução do mérito;
b) Subsidiariamente, a total improcedência dos pedidos autorais;
c) A condenação do(a) autor(a) ao pagamento das custas processuais e honorários advocatícios.

Termos em que,
Pede deferimento.

Porto Alegre/RS, [data por extenso].


_________________________________
[Nome do Advogado]
[OAB]`,

    "recurso-apelacao": `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) DESEMBARGADOR(A) PRESIDENTE DO TRIBUNAL DE JUSTIÇA DO ESTADO DO RIO GRANDE DO SUL

Processo nº [número do processo]
Origem: ___ Vara Cível da Comarca de Porto Alegre/RS


[NOME DO(A) APELANTE], já qualificado(a) nos autos, inconformado(a) com a r. sentença de fls. [fls.], vem, respeitosamente, interpor

RECURSO DE APELAÇÃO

com fundamento no art. 1.009 e seguintes do CPC, requerendo seja recebido e processado, com a reforma da decisão recorrida, pelas razões que passa a expor.


RAZÕES DE APELAÇÃO

I – DOS FATOS E DA SENTENÇA RECORRIDA

[Resuma os fatos e o teor da sentença.]


II – DAS RAZÕES PARA REFORMA

[Fundamente os motivos para reforma da sentença.]


III – DO PEDIDO

Ante o exposto, requer o conhecimento e provimento do presente recurso para reformar a r. sentença, [especificar o que se pretende].

Termos em que,
Pede deferimento.

Porto Alegre/RS, [data por extenso].


_________________________________
[Nome do Advogado]
[OAB]`,

    "mandado-seguranca": `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA DA FAZENDA PÚBLICA DA COMARCA DE PORTO ALEGRE/RS


[NOME DO IMPETRANTE], [qualificação completa], por seu advogado que esta subscreve, vem, respeitosamente, impetrar

MANDADO DE SEGURANÇA
(com pedido de liminar)

em face de ato ilegal e abusivo praticado por [AUTORIDADE COATORA] — [cargo, órgão e endereço funcional], pelos fatos e fundamentos a seguir expostos.


I – DA AUTORIDADE COATORA E DO ATO IMPUGNADO

[Identifique a autoridade e descreva o ato coator.]


II – DO DIREITO LÍQUIDO E CERTO

[Demonstre a existência de direito líquido e certo violado, com prova pré-constituída.]


III – DA LIMINAR (ART. 7º, III, DA LEI 12.016/09)

[Demonstre o fumus boni iuris e o periculum in mora.]


IV – DOS PEDIDOS

Ante o exposto, requer:

a) A concessão de LIMINAR para suspender o ato coator;
b) A notificação da autoridade coatora para prestar informações;
c) A oitiva do Ministério Público;
d) A CONCESSÃO DEFINITIVA DA SEGURANÇA para [especificar].

Dá-se à causa o valor de R$ [valor].

Termos em que,
Pede deferimento.

Porto Alegre/RS, [data por extenso].


_________________________________
[Nome do Advogado]
[OAB]`,

    // ══════════════════════════════════════════════════════
    // TRABALHISTA
    // ══════════════════════════════════════════════════════

    "reclamacao-trabalhista": `AO JUÍZO DA ___ VARA DO TRABALHO DE PORTO ALEGRE/RS


[NOME DO(A) RECLAMANTE], [nacionalidade], [estado civil], [profissão], inscrito(a) no CPF sob o nº [CPF], portador(a) do CTPS nº [CTPS], residente e domiciliado(a) na [endereço completo], CEP [CEP], e-mail: [e-mail], por seu advogado que esta subscreve (procuração anexa), vem, respeitosamente, propor a presente

RECLAMAÇÃO TRABALHISTA

em face de [NOME DA RECLAMADA], pessoa jurídica de direito privado, inscrita no CNPJ sob o nº [CNPJ], com sede na [endereço completo], CEP [CEP], pelos fatos e fundamentos a seguir expostos.


I – DO CONTRATO DE TRABALHO

Data de admissão: [data]
Data de demissão: [data]
Função exercida: [função]
Último salário: R$ [valor]
Jornada de trabalho: [horários]
Forma de rescisão: [demissão sem justa causa / pedido de demissão / rescisão indireta / etc.]


II – DOS FATOS

[Descreva os fatos relevantes da relação de emprego, irregularidades, descumprimentos contratuais e legais.]


III – DO DIREITO

[Fundamente juridicamente os pedidos, citando artigos da CLT, CF, súmulas do TST e TRT-4.]


IV – DOS PEDIDOS

Ante o exposto, requer:

a) A notificação da reclamada para comparecer em audiência e apresentar defesa;
b) [Verbas rescisórias: saldo de salário, aviso prévio, 13º proporcional, férias + 1/3, FGTS + 40%];
c) [Horas extras, adicional noturno, insalubridade/periculosidade];
d) [Dano moral / assédio moral, se aplicável];
e) [Demais pedidos específicos];
f) Honorários advocatícios;
g) Justiça gratuita (se aplicável);
h) Produção de todas as provas admitidas em direito.


V – DO VALOR DA CAUSA

Dá-se à causa o valor de R$ [valor] ([valor por extenso]).

Termos em que,
Pede deferimento.

Porto Alegre/RS, [data por extenso].


_________________________________
[Nome do Advogado]
[OAB]`,

    "contestacao-trabalhista": `AO JUÍZO DA ___ VARA DO TRABALHO DE PORTO ALEGRE/RS

Processo nº [número do processo]


[NOME DA RECLAMADA], já qualificada nos autos da reclamação trabalhista que lhe move [NOME DO(A) RECLAMANTE], vem, por seu advogado que esta subscreve, apresentar

CONTESTAÇÃO

nos termos do art. 847 da CLT, pelos fatos e fundamentos a seguir expostos.


I – SÍNTESE DA RECLAMAÇÃO

[Resuma brevemente os fatos e pedidos do(a) reclamante.]


II – PRELIMINARES

[Se houver: prescrição (bienal/quinquenal), inépcia da inicial, incompetência, ilegitimidade.]


III – DO MÉRITO

[Conteste ponto a ponto os pedidos, com fundamentação na CLT, súmulas do TST e jurisprudência.]


IV – DOS PEDIDOS

Ante o exposto, requer:

a) O acolhimento das preliminares arguidas;
b) A total improcedência dos pedidos;
c) A condenação do(a) reclamante ao pagamento de honorários sucumbenciais.

Termos em que,
Pede deferimento.

Porto Alegre/RS, [data por extenso].


_________________________________
[Nome do Advogado]
[OAB]`,

    // ══════════════════════════════════════════════════════
    // CONTRATOS / EXTRAJUDICIAL
    // ══════════════════════════════════════════════════════

    "contrato-servicos": `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Pelo presente instrumento particular, as partes abaixo qualificadas:

CONTRATANTE: [Nome completo], [nacionalidade], [estado civil], [profissão], inscrito(a) no CPF sob o nº [CPF], portador(a) do RG nº [RG], residente e domiciliado(a) na [endereço completo], CEP [CEP], e-mail: [e-mail];

CONTRATADA: [Nome completo / Razão Social], inscrita no CPF/CNPJ sob o nº [CPF/CNPJ], com sede na [endereço completo], CEP [CEP], neste ato representada por [nome do representante], e-mail: [e-mail];

Têm entre si justo e acordado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas e condições seguintes:


CLÁUSULA PRIMEIRA – DO OBJETO
[Descreva o objeto da prestação de serviços.]


CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DA CONTRATADA
[Liste as obrigações da contratada.]


CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE
[Liste as obrigações do contratante.]


CLÁUSULA QUARTA – DO PRAZO
O presente contrato terá vigência de [prazo], com início em [data] e término em [data], podendo ser prorrogado mediante acordo escrito entre as partes.


CLÁUSULA QUINTA – DO VALOR E FORMA DE PAGAMENTO
Pela prestação dos serviços, o CONTRATANTE pagará à CONTRATADA o valor de R$ [valor] ([valor por extenso]), a ser pago [forma de pagamento].


CLÁUSULA SEXTA – DAS PENALIDADES
[Defina multas e penalidades por descumprimento.]


CLÁUSULA SÉTIMA – DA RESCISÃO
[Condições de rescisão contratual.]


CLÁUSULA OITAVA – DA CONFIDENCIALIDADE
As partes se comprometem a manter sigilo sobre todas as informações obtidas em razão deste contrato.


CLÁUSULA NONA – DAS DISPOSIÇÕES GERAIS
[Disposições complementares.]


CLÁUSULA DÉCIMA – DO FORO
Fica eleito o Foro da Comarca de Porto Alegre/RS para dirimir quaisquer dúvidas oriundas do presente contrato.

Porto Alegre/RS, [data por extenso].


_________________________________
CONTRATANTE: [Nome]


_________________________________
CONTRATADA: [Nome]


TESTEMUNHAS:

1. _________________________________
   Nome:                CPF:

2. _________________________________
   Nome:                CPF:


_________________________________
[Nome do Advogado] – [OAB]`,

    "contrato-honorarios": `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS E HONORÁRIOS

Pelo presente instrumento particular, as partes:

CONTRATANTE: [Nome completo], [qualificação completa];

CONTRATADO: [Nome do Advogado], advogado, inscrito na [OAB] sob o nº [número], com escritório na [endereço];

Celebram o presente contrato nos seguintes termos:


CLÁUSULA PRIMEIRA – DO OBJETO
O presente contrato tem por objeto a prestação de serviços advocatícios para [descrever o serviço].


CLÁUSULA SEGUNDA – DOS HONORÁRIOS
Os honorários advocatícios ficam fixados em R$ [valor] ([valor por extenso]), a serem pagos [forma de pagamento].


CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO ADVOGADO
[Listar obrigações profissionais.]


CLÁUSULA QUARTA – DAS OBRIGAÇÕES DO CONTRATANTE
[Listar obrigações do cliente.]


CLÁUSULA QUINTA – DO PRAZO
[Definir prazo de vigência.]


CLÁUSULA SEXTA – DA RESCISÃO
[Condições de rescisão e consequências.]


CLÁUSULA SÉTIMA – DO FORO
Foro da Comarca de Porto Alegre/RS.

Porto Alegre/RS, [data por extenso].


_________________________________
CONTRATANTE


_________________________________
[Nome do Advogado] – [OAB]


TESTEMUNHAS:

1. _________________________________
   Nome:                CPF:

2. _________________________________
   Nome:                CPF:`,

    "notificacao-extrajudicial": `NOTIFICAÇÃO EXTRAJUDICIAL

NOTIFICANTE: [Nome completo], [qualificação completa];

NOTIFICADO(A): [Nome completo], [qualificação completa];


Senhor(a) [Nome],

Pelo presente instrumento, e na qualidade de advogado constituído pelo(a) NOTIFICANTE, venho, com fundamento no art. 726 do Código de Processo Civil, NOTIFICAR Vossa Senhoria acerca dos seguintes fatos:


I – DOS FATOS

[Descreva os fatos que motivam a notificação.]


II – DO FUNDAMENTO LEGAL

[Cite a base legal que fundamenta a pretensão.]


III – DA NOTIFICAÇÃO

Diante do exposto, NOTIFICO Vossa Senhoria para que, no prazo de [prazo] dias úteis, a contar do recebimento desta, [descreva a providência requerida].


IV – DAS CONSEQUÊNCIAS

O não atendimento da presente notificação no prazo estipulado ensejará a adoção das medidas judiciais cabíveis, sem prejuízo de perdas e danos.

A presente notificação tem caráter pré-processual e serve como prova inequívoca de ciência.

Porto Alegre/RS, [data por extenso].


_________________________________
[Nome do Advogado]
[OAB]`,

    "acordo-extrajudicial": `ACORDO EXTRAJUDICIAL
(Título Executivo Extrajudicial – art. 784, III, do CPC)

Pelo presente instrumento particular, as partes abaixo qualificadas:

PARTE 1: [Nome completo], [qualificação completa];

PARTE 2: [Nome completo], [qualificação completa];

Resolvem, de comum acordo e por livre vontade, celebrar o presente ACORDO EXTRAJUDICIAL, nos seguintes termos:


CLÁUSULA PRIMEIRA – DO OBJETO
[Descreva o objeto do acordo.]


CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES
[Defina as obrigações de cada parte.]


CLÁUSULA TERCEIRA – DOS VALORES
[Defina valores, formas e prazos de pagamento.]


CLÁUSULA QUARTA – DO INADIMPLEMENTO
[Penalidades por descumprimento.]


CLÁUSULA QUINTA – DA CONFISSÃO DE DÍVIDA
[Se aplicável, inclua confissão de dívida.]


CLÁUSULA SEXTA – DISPOSIÇÕES GERAIS
[Disposições complementares.]


CLÁUSULA SÉTIMA – DO FORO
Foro da Comarca de Porto Alegre/RS.

As partes declaram que o presente acordo constitui título executivo extrajudicial, nos termos do art. 784, III, do CPC.

Porto Alegre/RS, [data por extenso].


_________________________________
PARTE 1: [Nome]


_________________________________
PARTE 2: [Nome]


TESTEMUNHAS:

1. _________________________________
   Nome:                CPF:

2. _________________________________
   Nome:                CPF:


_________________________________
[Nome do Advogado] – [OAB]`,

    "procuracao-ad-judicia": `PROCURAÇÃO AD JUDICIA

OUTORGANTE: [Nome completo], [nacionalidade], [estado civil], [profissão], inscrito(a) no CPF sob o nº [CPF], portador(a) do RG nº [RG], residente e domiciliado(a) na [endereço completo];

OUTORGADO: [NOME DO ADVOGADO], advogado, inscrito na [OAB] sob o nº [número], com escritório profissional na [endereço do escritório];

PODERES: Pelo presente instrumento particular de procuração, o(a) OUTORGANTE nomeia e constitui como seu bastante procurador o OUTORGADO, a quem confere amplos poderes para o foro em geral, com a cláusula "ad judicia et extra", em qualquer Juízo, Instância ou Tribunal, podendo propor contra quem de direito as ações competentes e defendê-lo(a) nas contrárias, seguindo umas e outras até final decisão, usando os recursos legais e acompanhando-os, conferindo-lhe, ainda, poderes especiais para confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre o qual se funda a ação, receber, dar quitação, firmar compromissos, substabelecer esta com ou sem reserva de iguais poderes, podendo o substabelecido exercer todos os poderes aqui conferidos.

Porto Alegre/RS, [data por extenso].


_________________________________
OUTORGANTE: [Nome]
CPF: [CPF]`,

    "procuracao-ad-negotia": `PROCURAÇÃO AD NEGOTIA

OUTORGANTE: [Nome completo], [qualificação completa];

OUTORGADO: [Nome completo], [qualificação completa];

PODERES: Pelo presente instrumento particular, o(a) OUTORGANTE nomeia e constitui como seu bastante procurador o(a) OUTORGADO(A), conferindo-lhe poderes para, em seu nome, [descrever os poderes específicos outorgados].

A presente procuração é válida pelo prazo de [prazo] a contar desta data.

Porto Alegre/RS, [data por extenso].


_________________________________
OUTORGANTE: [Nome]
CPF: [CPF]`,

    "termo-confidencialidade": `TERMO DE CONFIDENCIALIDADE E NÃO DIVULGAÇÃO (NDA)

Pelo presente instrumento, as partes:

PARTE REVELADORA: [Nome/Razão Social], [qualificação completa];

PARTE RECEPTORA: [Nome/Razão Social], [qualificação completa];

Celebram o presente Termo de Confidencialidade e Não Divulgação (NDA):


CLÁUSULA PRIMEIRA – DO OBJETO
O presente termo tem por objeto a proteção das informações confidenciais compartilhadas entre as partes no âmbito de [descrever o contexto].


CLÁUSULA SEGUNDA – DEFINIÇÃO DE INFORMAÇÃO CONFIDENCIAL
[Definir o que constitui informação confidencial.]


CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES
[Obrigações de sigilo e proteção.]


CLÁUSULA QUARTA – DAS EXCEÇÕES
[Exceções à confidencialidade.]


CLÁUSULA QUINTA – DO PRAZO
[Prazo de vigência da confidencialidade.]


CLÁUSULA SEXTA – DAS PENALIDADES
[Multa e indenização por violação.]


CLÁUSULA SÉTIMA – DO FORO
Foro da Comarca de Porto Alegre/RS.

Porto Alegre/RS, [data por extenso].


_________________________________
PARTE REVELADORA


_________________________________
PARTE RECEPTORA


TESTEMUNHAS:

1. _________________________________
   Nome:                CPF:

2. _________________________________
   Nome:                CPF:`,

    // ══════════════════════════════════════════════════════
    // ACADÊMICO — ABNT NBR 14724
    // ══════════════════════════════════════════════════════

    "monografia-juridica": [
      "[NOME DA INSTITUIÇÃO]",
      "[CENTRO / FACULDADE]",
      "[CURSO]",
      "",
      "",
      "[NOME DO(A) AUTOR(A)]",
      "",
      "",
      "[TÍTULO DA MONOGRAFIA]:",
      "[subtítulo, se houver]",
      "",
      "",
      "",
      "",
      "Porto Alegre/RS",
      "[Ano]",
      "",
      "---",
      "",
      "[NOME DO(A) AUTOR(A)]",
      "",
      "",
      "[TÍTULO DA MONOGRAFIA]:",
      "[subtítulo, se houver]",
      "",
      "",
      "Monografia apresentada ao Curso de [nome do curso] da [nome da instituição], como requisito parcial para obtenção do grau de Bacharel em Direito.",
      "",
      "Orientador(a): Prof. Dr./Dra. [nome do orientador]",
      "",
      "",
      "Porto Alegre/RS",
      "[Ano]",
      "",
      "---",
      "",
      "RESUMO",
      "",
      "[O resumo deve conter: objeto, objetivos, metodologia utilizada, problema de pesquisa e principais conclusões. Deve ser composto de frases concisas e afirmativas, em parágrafo único, com até 150 palavras. Usar verbo na voz ativa e terceira pessoa do singular.]",
      "",
      "Palavras-chave: [palavra 1]. [palavra 2]. [palavra 3]. [palavra 4]. [palavra 5].",
      "",
      "---",
      "",
      "ABSTRACT",
      "",
      "[Versão do resumo em língua estrangeira (inglês, espanhol ou francês).]",
      "",
      "Keywords: [keyword 1]. [keyword 2]. [keyword 3]. [keyword 4]. [keyword 5].",
      "",
      "---",
      "",
      "SUMÁRIO",
      "",
      "1 INTRODUÇÃO",
      "2 [TÍTULO DO CAPÍTULO 1 – REVISÃO DA LITERATURA]",
      "3 [TÍTULO DO CAPÍTULO 2 – DESENVOLVIMENTO / ANÁLISE]",
      "4 METODOLOGIA",
      "5 ANÁLISE E DISCUSSÃO DOS RESULTADOS",
      "6 CONCLUSÃO",
      "REFERÊNCIAS",
      "",
      "---",
      "",
      "1 INTRODUÇÃO",
      "",
      "[Apresente: definição do tema, delimitação, localização no espaço e no tempo, justificativa da escolha, objetivos (geral e específicos), indicação da metodologia e estrutura do trabalho.]",
      "",
      "",
      "2 [TÍTULO DO CAPÍTULO – REVISÃO DA LITERATURA]",
      "",
      "[Desenvolva o referencial teórico com citações no formato ABNT NBR 10520. Citações diretas longas (mais de 3 linhas) devem ter recuo de 4cm, fonte 10pt, espaçamento simples.]",
      "",
      "",
      "3 [TÍTULO DO CAPÍTULO – ANÁLISE / DESENVOLVIMENTO]",
      "",
      "[Parte principal do trabalho com análise e discussão.]",
      "",
      "",
      "4 METODOLOGIA",
      "",
      "[Descreva: tipo de pesquisa, método de abordagem, procedimentos e técnicas de pesquisa, critérios de análise de dados.]",
      "",
      "",
      "5 ANÁLISE E DISCUSSÃO DOS RESULTADOS",
      "",
      "[Apresente os achados da pesquisa articulados com a questão de pesquisa e a hipótese.]",
      "",
      "",
      "6 CONCLUSÃO",
      "",
      "[Recapitulação das conclusões parciais, retomada dos objetivos, principais resultados obtidos. Não acrescente dados novos.]",
      "",
      "",
      "REFERÊNCIAS",
      "",
      "[Elaborar conforme ABNT NBR 6023. Referências em ordem alfabética, espaçamento simples, separadas por espaço simples em branco.]",
    ].join("\n"),

    "tcc-direito": [
      "[NOME DA INSTITUIÇÃO]",
      "[CENTRO / FACULDADE]",
      "[CURSO DE DIREITO]",
      "",
      "[NOME DO(A) AUTOR(A)]",
      "",
      "[TÍTULO DO TCC]:",
      "[subtítulo, se houver]",
      "",
      "Trabalho de Conclusão de Curso apresentado ao Curso de Direito da [nome da instituição], como requisito parcial para obtenção do grau de Bacharel em Direito.",
      "",
      "Orientador(a): Prof. Dr./Dra. [nome do orientador]",
      "",
      "Porto Alegre/RS",
      "[Ano]",
      "",
      "---",
      "",
      "RESUMO",
      "",
      "[Resumo com até 150 palavras conforme ABNT NBR 6028.]",
      "",
      "Palavras-chave: [palavra 1]. [palavra 2]. [palavra 3].",
      "",
      "---",
      "",
      "SUMÁRIO",
      "",
      "1 INTRODUÇÃO",
      "2 [CAPÍTULO 1]",
      "3 [CAPÍTULO 2]",
      "4 CONCLUSÃO",
      "REFERÊNCIAS",
      "",
      "---",
      "",
      "1 INTRODUÇÃO",
      "",
      "[Tema, delimitação, justificativa, problema de pesquisa, objetivos e metodologia.]",
      "",
      "",
      "2 [DESENVOLVIMENTO – CAPÍTULO 1]",
      "",
      "[Revisão da literatura e fundamentação teórica.]",
      "",
      "",
      "3 [DESENVOLVIMENTO – CAPÍTULO 2]",
      "",
      "[Análise e discussão dos resultados.]",
      "",
      "",
      "4 CONCLUSÃO",
      "",
      "[Síntese das conclusões e retomada dos objetivos.]",
      "",
      "",
      "REFERÊNCIAS",
      "",
      "[Conforme ABNT NBR 6023.]",
    ].join("\n"),

    "artigo-cientifico": [
      "[TÍTULO DO ARTIGO]",
      "",
      "[Nome do(a) Autor(a)]",
      "",
      "RESUMO",
      "",
      "[Resumo com 100 a 250 palavras conforme ABNT NBR 6028. Deve conter: objeto, objetivos, metodologia e conclusões principais.]",
      "",
      "Palavras-chave: [palavra 1]. [palavra 2]. [palavra 3].",
      "",
      "",
      "ABSTRACT",
      "",
      "[English version of the abstract.]",
      "",
      "Keywords: [keyword 1]. [keyword 2]. [keyword 3].",
      "",
      "",
      "1 INTRODUÇÃO",
      "",
      "[Apresentação do tema, justificativa, problema de pesquisa e objetivos.]",
      "",
      "",
      "2 [DESENVOLVIMENTO / SEÇÃO 1]",
      "",
      "[Fundamentação teórica e revisão da literatura.]",
      "",
      "",
      "3 [DESENVOLVIMENTO / SEÇÃO 2]",
      "",
      "[Análise, argumentação e discussão.]",
      "",
      "",
      "4 CONSIDERAÇÕES FINAIS",
      "",
      "[Síntese dos resultados e conclusões.]",
      "",
      "",
      "REFERÊNCIAS",
      "",
      "[Conforme ABNT NBR 6023.]",
    ].join("\n"),

    "projeto-pesquisa": [
      "PROJETO DE PESQUISA",
      "",
      "",
      "1 TEMA",
      "",
      "[Enunciado do tema de pesquisa.]",
      "",
      "",
      "2 DELIMITAÇÃO DO TEMA",
      "",
      "[Recorte específico do tema, indicando aspectos, período, localidade.]",
      "",
      "",
      "3 JUSTIFICATIVA",
      "",
      "[Exposição das razões teóricas e práticas que tornam importante a pesquisa.]",
      "",
      "",
      "4 PROBLEMA DE PESQUISA",
      "",
      "[Formulado em forma de pergunta. É a questão que orientará a pesquisa.]",
      "",
      "",
      "5 HIPÓTESE",
      "",
      "[Resposta provisória ao problema de pesquisa. Opcional.]",
      "",
      "",
      "6 OBJETIVOS",
      "",
      "6.1 Objetivo Geral",
      "[Visão global e abrangente, ligado ao problema de pesquisa.]",
      "",
      "6.2 Objetivos Específicos",
      "a) [Objetivo específico 1]",
      "b) [Objetivo específico 2]",
      "c) [Objetivo específico 3]",
      "",
      "",
      "7 REVISÃO DA LITERATURA",
      "",
      "[Contextualização teórica do problema e pressupostos teóricos da pesquisa.]",
      "",
      "",
      "8 METODOLOGIA",
      "",
      "[Método de abordagem (indutivo, dedutivo, dialético, hipotético-dedutivo), procedimentos de pesquisa, técnicas e critérios de análise de dados.]",
      "",
      "",
      "9 CRONOGRAMA",
      "",
      "| Etapa | Mês 1-2 | Mês 3-4 | Mês 5-6 | Mês 7-8 | Mês 9-10 |",
      "|-------|---------|---------|---------|---------|----------|",
      "| Revisão bibliográfica | X | X | | | |",
      "| Coleta de dados | | X | X | | |",
      "| Análise dos dados | | | X | X | |",
      "| Redação | | | | X | X |",
      "| Revisão e defesa | | | | | X |",
      "",
      "",
      "10 REFERÊNCIAS",
      "",
      "[Conforme ABNT NBR 6023. Apenas as fontes citadas no projeto.]",
    ].join("\n"),

    // ══════════════════════════════════════════════════════
    // INTERNACIONAL / EMPRESARIAL
    // ══════════════════════════════════════════════════════

    "loi-internacional": `LETTER OF INTENT / CARTA DE INTENÇÃO

Date / Data: [Date]
Reference / Referência: LOI-[Number]

FROM / DE:
[Company A Name], [Registration/CNPJ], [Address, City, Country]
Represented by: [Name, Title]

TO / PARA:
[Company B Name], [Registration/CNPJ], [Address, City, Country]
Represented by: [Name, Title]

RE: Letter of Intent for [Purpose]

1. PURPOSE / OBJETIVO
[Describe the purpose of this LOI and the contemplated transaction or partnership.]

2. KEY TERMS / TERMOS PRINCIPAIS
[Investment amount, timeline, exclusivity period, conditions precedent.]

3. EXCLUSIVITY / EXCLUSIVIDADE
During [__] days from the date hereof, [Company B] agrees not to negotiate with third parties.

4. CONFIDENTIALITY / CONFIDENCIALIDADE
Both parties agree to maintain strict confidentiality regarding all information exchanged.

5. DUE DILIGENCE
[Company A] shall have the right to conduct due diligence during the exclusivity period.

6. NON-BINDING / NÃO VINCULANTE
This LOI is not legally binding, except for Sections 3, 4, and 6.

7. GOVERNING LAW / LEI APLICÁVEL
Governed by the laws of [Jurisdiction]. Disputes resolved by arbitration under ICC Rules.

8. VALIDITY / VALIDADE
Valid for [__] days from execution.

_________________________________
[Company A] — By: [Name, Title]

_________________________________
[Company B] — By: [Name, Title]`,

    "mou-internacional": `MEMORANDUM OF UNDERSTANDING / MEMORANDO DE ENTENDIMENTO

Date / Data: [Date]

BETWEEN: [Party A Name], [registration], [address] ("Party A")
AND: [Party B Name], [registration], [address] ("Party B")

1. SCOPE OF COOPERATION
[Define areas and objectives of mutual cooperation.]

2. RESPONSIBILITIES
Party A shall: [obligations]
Party B shall: [obligations]

3. DURATION
Effective from [date] to [date], renewable by mutual written consent.

4. CONFIDENTIALITY
Both parties agree to maintain confidentiality of all shared information.

5. NON-BINDING NATURE
This MOU does not create legally binding obligations, except for Section 4.

6. GOVERNING LAW
Governed by the laws of [Jurisdiction].

_________________________________
Party A: [Name, Title]

_________________________________
Party B: [Name, Title]`,

    "nda-internacional": `NON-DISCLOSURE AGREEMENT / ACORDO DE CONFIDENCIALIDADE

Date / Data: [Date]

Disclosing Party: [Company Name], [registration], [address]
Receiving Party: [Company Name], [registration], [address]

1. DEFINITION OF CONFIDENTIAL INFORMATION
All information disclosed including trade secrets, business plans, financial data, technical specifications.

2. OBLIGATIONS
Maintain strict confidentiality; use solely for [purpose]; not disclose to third parties.

3. EXCLUSIONS
Publicly available; previously known; independently developed; required by law.

4. DURATION
[__] years from execution.

5. RETURN OF INFORMATION
Upon termination, return or destroy all Confidential Information.

6. GOVERNING LAW
Governed by the laws of [Jurisdiction].

_________________________________
Disclosing Party: [Name, Title]

_________________________________
Receiving Party: [Name, Title]`,

    "joint-venture-agreement": `JOINT VENTURE AGREEMENT

Date: [Date]

Partner A: [Company], [registration], [address]
Partner B: [Company], [registration], [address]

1. PURPOSE
[Detailed description of the JV purpose and business activities.]

2. CAPITAL CONTRIBUTIONS
Partner A: [Amount/Percentage]
Partner B: [Amount/Percentage]

3. PROFIT AND LOSS SHARING
[Equally / in proportion to contributions]

4. MANAGEMENT AND GOVERNANCE
[Management structure, board composition, voting rights.]

5. TERM AND TERMINATION
Commences [date], continues for [period].

6. DISPUTE RESOLUTION
Arbitration under ICC Rules, seated in [city].

7. GOVERNING LAW
Governed by the laws of [Jurisdiction].

_________________________________
Partner A: [Name, Title]

_________________________________
Partner B: [Name, Title]`,

    "term-sheet": `TERM SHEET (Non-Binding)

Date: [Date]

Investor: [Name], [address]
Company: [Name], [registration], [address]

1. Transaction: [Equity Investment / Acquisition]
2. Amount: [Currency] [Amount]
3. Valuation: [Pre-money Amount]
4. Equity Stake: [__]%
5. Governance: [Board seats, veto rights]
6. Liquidation Preference: [1x non-participating]
7. Anti-Dilution: [Weighted average]
8. Conditions: [Due diligence, regulatory approvals]
9. Exclusivity: [__] days
10. Governing Law: [Jurisdiction]

_________________________________
Investor: [Name, Title]

_________________________________
Company: [Name, Title]`,

    "invoice-proforma": `PROFORMA INVOICE

No.: PI-[Number]
Date: [Date]

EXPORTER: [Company], [Address], [CNPJ], [Contact]
IMPORTER: [Company], [Address], [Registration], [Contact]

ITEMS:
| # | Description | HS Code | Qty | Unit Price | Total |
|---|------------|---------|-----|------------|-------|
| 1 | [Product]  | [Code]  | [Q] | [Price]    | [Tot] |

SUBTOTAL: [Amount]
FREIGHT: [Amount]
TOTAL: [Currency] [Amount]

INCOTERMS: [FOB/CIF/EXW] [Port]
PAYMENT: [T/T, L/C]
DELIVERY: [Date]
ORIGIN: [Country]

BANK: [Name], SWIFT: [Code], IBAN: [Number]

_________________________________
Authorized Signature`,

  };

  // Return specific template or a generic one, with dynamic lawyer info
  const raw = templates[tipoId] || getGenericTemplate(tipoId);
  return applyLawyerInfo(raw, lawyer);
}

function getGenericTemplate(tipoId: string): string {
  return `[TÍTULO DO DOCUMENTO]

Pelo presente instrumento, as partes abaixo qualificadas:

PARTE 1: [Nome completo], [nacionalidade], [estado civil], [profissão], inscrito(a) no CPF sob o nº [CPF], residente e domiciliado(a) na [endereço completo];

PARTE 2: [Nome completo], [nacionalidade], [estado civil], [profissão], inscrito(a) no CPF/CNPJ sob o nº [CPF/CNPJ], com sede/residente na [endereço completo];

Celebram o presente instrumento nos seguintes termos:


CLÁUSULA PRIMEIRA – DO OBJETO
[Descreva o objeto.]


CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES
[Defina as obrigações.]


CLÁUSULA TERCEIRA – DO PRAZO
[Defina o prazo.]


CLÁUSULA QUARTA – DO VALOR
[Defina valores e pagamento.]


CLÁUSULA QUINTA – DAS PENALIDADES
[Defina penalidades por descumprimento.]


CLÁUSULA SEXTA – DA RESCISÃO
[Condições de rescisão.]


CLÁUSULA SÉTIMA – DAS DISPOSIÇÕES GERAIS
[Disposições complementares.]


CLÁUSULA OITAVA – DO FORO
Foro da Comarca de Porto Alegre/RS.

Porto Alegre/RS, [data por extenso].


_________________________________
PARTE 1: [Nome]


_________________________________
PARTE 2: [Nome]


TESTEMUNHAS:

1. _________________________________
   Nome:                CPF:

2. _________________________________
   Nome:                CPF:


_________________________________
[Nome do Advogado] – [OAB]`;
}
