import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// LEGISLAÇÃO FEDERAL — Senado + Câmara + LexML + Planalto
// APIs Públicas, sem autenticação
// Cobertura COMPLETA da API Dados Abertos do Senado Federal
// ═══════════════════════════════════════════════════════════════

const SENADO_BASE = "https://legis.senado.leg.br/dadosabertos";
const CAMARA_BASE = "https://dadosabertos.camara.leg.br/api/v2";
const HEADERS_JSON = { Accept: "application/json" };

// ─── Generic Senado fetcher with retry ───
async function senadoGet(path: string, timeout = 20000, retries = 2): Promise<any> {
  const url = path.startsWith("http") ? path : `${SENADO_BASE}${path}`;
  const finalUrl = url.includes(".json") ? url : url + ".json";
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(finalUrl, { headers: HEADERS_JSON, signal: AbortSignal.timeout(timeout) });
      if (!res.ok) {
        if (attempt < retries && res.status >= 500) continue;
        throw new Error(`Senado ${path} → ${res.status}`);
      }
      return res.json();
    } catch (e) {
      if (attempt < retries && (e instanceof DOMException || (e as any)?.name === "TimeoutError")) {
        console.warn(`[senado] retry ${attempt + 1} for ${path}`);
        continue;
      }
      throw e;
    }
  }
}

// ─── Generic Câmara fetcher with retry ───
async function camaraGet(path: string, params: Record<string, string> = {}, timeout = 20000, retries = 1): Promise<any> {
  const qs = new URLSearchParams(params);
  const url = `${CAMARA_BASE}${path}?${qs}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS_JSON, signal: AbortSignal.timeout(timeout) });
      if (!res.ok) {
        if (attempt < retries && res.status >= 500) continue;
        throw new Error(`Câmara ${path} → ${res.status}`);
      }
      return res.json();
    } catch (e) {
      if (attempt < retries && (e instanceof DOMException || (e as any)?.name === "TimeoutError")) {
        console.warn(`[camara] retry ${attempt + 1} for ${path}`);
        continue;
      }
      throw e;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CATÁLOGO COMPLETO DE CÓDIGOS E LEIS BRASILEIRAS
// ═══════════════════════════════════════════════════════════════

interface CodigoLei {
  sigla: string; nome: string; tipo: string; numero?: string; ano?: string;
  area: string; descricao: string; url: string; palavrasChave: string[];
}

const CATALOGO_LEIS: CodigoLei[] = [
  // ── CONSTITUIÇÃO ──
  { sigla: "CF/88", nome: "Constituição Federal de 1988", tipo: "CFE", area: "constitucional", descricao: "Constituição da República Federativa do Brasil de 1988. Lei fundamental e suprema do Brasil, servindo de parâmetro de validade a todas as demais espécies normativas.", url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm", palavrasChave: ["constituição", "direitos fundamentais", "organização do estado", "emendas constitucionais"] },
  // ── DIREITO CIVIL ──
  { sigla: "CC/2002", nome: "Código Civil - Lei 10.406/2002", tipo: "LEI", numero: "10406", ano: "2002", area: "civil", descricao: "Código Civil Brasileiro. Regula direitos e obrigações de ordem privada: pessoas, bens, obrigações, contratos, família, sucessões, responsabilidade civil.", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm", palavrasChave: ["código civil", "contratos", "obrigações", "família", "sucessões", "responsabilidade civil"] },
  { sigla: "CPC/2015", nome: "Código de Processo Civil - Lei 13.105/2015", tipo: "LEI", numero: "13105", ano: "2015", area: "processo civil", descricao: "Código de Processo Civil. Regula o processo civil brasileiro: petição inicial, contestação, audiências, provas, recursos, execução, cumprimento de sentença.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm", palavrasChave: ["processo civil", "petição inicial", "contestação", "recurso", "execução"] },
  // ── DIREITO PENAL ──
  { sigla: "CP", nome: "Código Penal - Decreto-Lei 2.848/1940", tipo: "DEC", numero: "2848", ano: "1940", area: "penal", descricao: "Código Penal Brasileiro. Define crimes e contravenções penais, penas, medidas de segurança.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm", palavrasChave: ["código penal", "crime", "pena", "homicídio", "furto", "roubo"] },
  { sigla: "CPP", nome: "Código de Processo Penal - Decreto-Lei 3.689/1941", tipo: "DEC", numero: "3689", ano: "1941", area: "processo penal", descricao: "Código de Processo Penal. Regula o inquérito policial, ação penal, provas, prisão, liberdade provisória, recursos criminais, júri, habeas corpus.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm", palavrasChave: ["processo penal", "inquérito", "prisão", "habeas corpus", "júri"] },
  { sigla: "LEP", nome: "Lei de Execução Penal - Lei 7.210/1984", tipo: "LEI", numero: "7210", ano: "1984", area: "penal", descricao: "Lei de Execução Penal. Progressão de regime, livramento condicional, remição.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7210.htm", palavrasChave: ["execução penal", "progressão de regime", "livramento condicional"] },
  { sigla: "Lei Maria da Penha", nome: "Lei 11.340/2006", tipo: "LEI", numero: "11340", ano: "2006", area: "penal", descricao: "Mecanismos para coibir a violência doméstica e familiar contra a mulher. Medidas protetivas de urgência.", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm", palavrasChave: ["violência doméstica", "mulher", "medida protetiva"] },
  { sigla: "Lei Drogas", nome: "Lei 11.343/2006", tipo: "LEI", numero: "11343", ano: "2006", area: "penal", descricao: "Sistema Nacional de Políticas Públicas sobre Drogas. Tráfico, uso, porte.", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm", palavrasChave: ["drogas", "tráfico", "porte"] },
  { sigla: "Lei Anticrime", nome: "Lei 13.964/2019", tipo: "LEI", numero: "13964", ano: "2019", area: "penal", descricao: "Pacote Anticrime. Acordo de não persecução penal, juiz de garantias.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/L13964.htm", palavrasChave: ["anticrime", "acordo de não persecução"] },
  // ── DIREITO DO TRABALHO ──
  { sigla: "CLT", nome: "CLT - Decreto-Lei 5.452/1943", tipo: "DEC", numero: "5452", ano: "1943", area: "trabalhista", descricao: "Consolidação das Leis do Trabalho. Contrato, jornada, férias, FGTS, rescisão.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm", palavrasChave: ["CLT", "trabalho", "empregado", "jornada", "férias", "FGTS"] },
  { sigla: "Reforma Trabalhista", nome: "Lei 13.467/2017", tipo: "LEI", numero: "13467", ano: "2017", area: "trabalhista", descricao: "Reforma Trabalhista. Teletrabalho, trabalho intermitente.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13467.htm", palavrasChave: ["reforma trabalhista", "teletrabalho"] },
  // ── CONSUMIDOR ──
  { sigla: "CDC", nome: "CDC - Lei 8.078/1990", tipo: "LEI", numero: "8078", ano: "1990", area: "consumidor", descricao: "Código de Defesa do Consumidor. Proteção do consumidor, responsabilidade do fornecedor.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm", palavrasChave: ["consumidor", "fornecedor", "produto defeituoso"] },
  // ── TRIBUTÁRIO ──
  { sigla: "CTN", nome: "CTN - Lei 5.172/1966", tipo: "LEI", numero: "5172", ano: "1966", area: "tributário", descricao: "Código Tributário Nacional. Impostos, taxas, contribuições.", url: "https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm", palavrasChave: ["tributo", "imposto", "taxa", "contribuição"] },
  { sigla: "Lei Execução Fiscal", nome: "Lei 6.830/1980", tipo: "LEI", numero: "6830", ano: "1980", area: "tributário", descricao: "Cobrança judicial da Dívida Ativa. Execução fiscal, penhora.", url: "https://www.planalto.gov.br/ccivil_03/leis/l6830.htm", palavrasChave: ["execução fiscal", "dívida ativa"] },
  // ── ADMINISTRATIVO ──
  { sigla: "Lei Proc Adm", nome: "Lei 9.784/1999", tipo: "LEI", numero: "9784", ano: "1999", area: "administrativo", descricao: "Processo Administrativo Federal.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9784.htm", palavrasChave: ["processo administrativo", "ato administrativo"] },
  { sigla: "Lei Licitações", nome: "Lei 14.133/2021", tipo: "LEI", numero: "14133", ano: "2021", area: "administrativo", descricao: "Nova Lei de Licitações e Contratos.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm", palavrasChave: ["licitação", "contrato administrativo", "pregão"] },
  { sigla: "Lei Improbidade", nome: "Lei 8.429/1992", tipo: "LEI", numero: "8429", ano: "1992", area: "administrativo", descricao: "Improbidade Administrativa. Enriquecimento ilícito.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8429.htm", palavrasChave: ["improbidade", "enriquecimento ilícito"] },
  { sigla: "Lei ACP", nome: "Lei 7.347/1985", tipo: "LEI", numero: "7347", ano: "1985", area: "administrativo", descricao: "Ação Civil Pública.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7347orig.htm", palavrasChave: ["ação civil pública", "meio ambiente"] },
  // ── PREVIDENCIÁRIO ──
  { sigla: "Lei INSS", nome: "Lei 8.213/1991", tipo: "LEI", numero: "8213", ano: "1991", area: "previdenciário", descricao: "Plano de Benefícios da Previdência Social. Aposentadoria, auxílio-doença, pensão por morte.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8213cons.htm", palavrasChave: ["previdência", "aposentadoria", "INSS", "BPC"] },
  { sigla: "Lei Custeio", nome: "Lei 8.212/1991", tipo: "LEI", numero: "8212", ano: "1991", area: "previdenciário", descricao: "Custeio da Seguridade Social.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8212cons.htm", palavrasChave: ["contribuição previdenciária", "seguridade"] },
  { sigla: "EC 103/2019", nome: "Reforma da Previdência", tipo: "EMC", ano: "2019", area: "previdenciário", descricao: "Reforma da Previdência. Novas regras de aposentadoria.", url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc103.htm", palavrasChave: ["reforma previdência", "idade mínima"] },
  // ── ECA / IDOSO / AMBIENTAL / EMPRESARIAL / ELEITORAL / DIGITAL / IMOBILIÁRIO / MILITAR / INTERNACIONAL ──
  { sigla: "ECA", nome: "Lei 8.069/1990", tipo: "LEI", numero: "8069", ano: "1990", area: "família", descricao: "Estatuto da Criança e do Adolescente.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8069.htm", palavrasChave: ["criança", "adolescente", "guarda", "adoção"] },
  { sigla: "Estatuto Idoso", nome: "Lei 10.741/2003", tipo: "LEI", numero: "10741", ano: "2003", area: "civil", descricao: "Estatuto do Idoso.", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.741.htm", palavrasChave: ["idoso", "pessoa idosa"] },
  { sigla: "Lei Crimes Amb", nome: "Lei 9.605/1998", tipo: "LEI", numero: "9605", ano: "1998", area: "ambiental", descricao: "Crimes Ambientais.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm", palavrasChave: ["crime ambiental", "poluição", "fauna", "flora"] },
  { sigla: "Código Florestal", nome: "Lei 12.651/2012", tipo: "LEI", numero: "12651", ano: "2012", area: "ambiental", descricao: "Código Florestal Brasileiro.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651.htm", palavrasChave: ["código florestal", "APP", "reserva legal"] },
  { sigla: "Lei Falências", nome: "Lei 11.101/2005", tipo: "LEI", numero: "11101", ano: "2005", area: "empresarial", descricao: "Recuperação Judicial e Falência.", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11101.htm", palavrasChave: ["falência", "recuperação judicial"] },
  { sigla: "Lei SA", nome: "Lei 6.404/1976", tipo: "LEI", numero: "6404", ano: "1976", area: "empresarial", descricao: "Sociedades por Ações.", url: "https://www.planalto.gov.br/ccivil_03/leis/l6404consol.htm", palavrasChave: ["sociedade anônima", "ações"] },
  { sigla: "Código Eleitoral", nome: "Lei 4.737/1965", tipo: "LEI", numero: "4737", ano: "1965", area: "eleitoral", descricao: "Código Eleitoral Brasileiro.", url: "https://www.planalto.gov.br/ccivil_03/leis/l4737.htm", palavrasChave: ["eleição", "voto", "partido político"] },
  { sigla: "LGPD", nome: "Lei 13.709/2018", tipo: "LEI", numero: "13709", ano: "2018", area: "digital", descricao: "Lei Geral de Proteção de Dados.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm", palavrasChave: ["LGPD", "dados pessoais", "privacidade"] },
  { sigla: "Marco Civil", nome: "Lei 12.965/2014", tipo: "LEI", numero: "12965", ano: "2014", area: "digital", descricao: "Marco Civil da Internet.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm", palavrasChave: ["internet", "neutralidade", "marco civil"] },
  { sigla: "Lei Inquilinato", nome: "Lei 8.245/1991", tipo: "LEI", numero: "8245", ano: "1991", area: "imobiliário", descricao: "Locações de imóveis urbanos.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8245.htm", palavrasChave: ["locação", "aluguel", "despejo"] },
  { sigla: "Lei Registros", nome: "Lei 6.015/1973", tipo: "LEI", numero: "6015", ano: "1973", area: "imobiliário", descricao: "Registros Públicos.", url: "https://www.planalto.gov.br/ccivil_03/leis/l6015compilada.htm", palavrasChave: ["registro de imóveis", "matrícula"] },
  { sigla: "CPM", nome: "Decreto-Lei 1.001/1969", tipo: "DEC", numero: "1001", ano: "1969", area: "militar", descricao: "Código Penal Militar.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del1001.htm", palavrasChave: ["crime militar", "deserção"] },
  { sigla: "CPPM", nome: "Decreto-Lei 1.002/1969", tipo: "DEC", numero: "1002", ano: "1969", area: "militar", descricao: "Código de Processo Penal Militar.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del1002.htm", palavrasChave: ["processo penal militar"] },
  { sigla: "LINDB", nome: "Decreto-Lei 4.657/1942", tipo: "DEC", numero: "4657", ano: "1942", area: "internacional", descricao: "Lei de Introdução às Normas do Direito Brasileiro.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del4657compilado.htm", palavrasChave: ["LINDB", "vigência", "aplicação da lei"] },
  { sigla: "Lei MS", nome: "Lei 12.016/2009", tipo: "LEI", numero: "12016", ano: "2009", area: "constitucional", descricao: "Mandado de Segurança.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12016.htm", palavrasChave: ["mandado de segurança", "direito líquido e certo"] },
  { sigla: "Lei Juizados", nome: "Lei 9.099/1995", tipo: "LEI", numero: "9099", ano: "1995", area: "processo civil", descricao: "Juizados Especiais Cíveis e Criminais.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9099.htm", palavrasChave: ["juizado especial", "pequenas causas"] },
  { sigla: "Lei Arbitragem", nome: "Lei 9.307/1996", tipo: "LEI", numero: "9307", ano: "1996", area: "processo civil", descricao: "Arbitragem.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9307.htm", palavrasChave: ["arbitragem", "árbitro"] },
  { sigla: "Lei Lavagem", nome: "Lei 9.613/1998", tipo: "LEI", numero: "9613", ano: "1998", area: "penal", descricao: "Lavagem de Dinheiro. COAF.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9613.htm", palavrasChave: ["lavagem de dinheiro", "COAF"] },
  { sigla: "Lei Org Crime", nome: "Lei 12.850/2013", tipo: "LEI", numero: "12850", ano: "2013", area: "penal", descricao: "Organizações Criminosas. Colaboração premiada.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12850.htm", palavrasChave: ["organização criminosa", "colaboração premiada", "delação"] },
  { sigla: "Lei Abuso Aut", nome: "Lei 13.869/2019", tipo: "LEI", numero: "13869", ano: "2019", area: "penal", descricao: "Abuso de Autoridade.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/L13869.htm", palavrasChave: ["abuso de autoridade"] },
  { sigla: "Estatuto Deficiência", nome: "Lei 13.146/2015", tipo: "LEI", numero: "13146", ano: "2015", area: "civil", descricao: "Estatuto da Pessoa com Deficiência.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm", palavrasChave: ["deficiência", "inclusão", "acessibilidade"] },
  { sigla: "LAI", nome: "Lei 12.527/2011", tipo: "LEI", numero: "12527", ano: "2011", area: "administrativo", descricao: "Lei de Acesso à Informação.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm", palavrasChave: ["acesso à informação", "transparência"] },
  { sigla: "Lei Anticorrupção", nome: "Lei 12.846/2013", tipo: "LEI", numero: "12846", ano: "2013", area: "administrativo", descricao: "Lei Anticorrupção Empresarial.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12846.htm", palavrasChave: ["anticorrupção", "compliance"] },
  { sigla: "CTB", nome: "Lei 9.503/1997", tipo: "LEI", numero: "9503", ano: "1997", area: "administrativo", descricao: "Código de Trânsito Brasileiro.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm", palavrasChave: ["trânsito", "infração", "multa"] },
  { sigla: "Lei Migração", nome: "Lei 13.445/2017", tipo: "LEI", numero: "13445", ano: "2017", area: "internacional", descricao: "Lei de Migração.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13445.htm", palavrasChave: ["migração", "estrangeiro", "refúgio"] },
  { sigla: "Estatuto Racial", nome: "Lei 12.288/2010", tipo: "LEI", numero: "12288", ano: "2010", area: "civil", descricao: "Estatuto da Igualdade Racial.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12288.htm", palavrasChave: ["igualdade racial", "discriminação", "racismo"] },
  { sigla: "Lei Habeas Data", nome: "Lei 9.507/1997", tipo: "LEI", numero: "9507", ano: "1997", area: "constitucional", descricao: "Habeas Data.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9507.htm", palavrasChave: ["habeas data"] },
  { sigla: "Lei Ação Popular", nome: "Lei 4.717/1965", tipo: "LEI", numero: "4717", ano: "1965", area: "constitucional", descricao: "Ação Popular.", url: "https://www.planalto.gov.br/ccivil_03/leis/l4717.htm", palavrasChave: ["ação popular", "patrimônio público"] },

  // ═══ CONSTITUCIONAL (expansão) ═══
  { sigla: "EC 45/2004", nome: "Reforma do Judiciário - EC 45/2004", tipo: "EMC", ano: "2004", area: "constitucional", descricao: "Reforma do Judiciário. CNJ, súmula vinculante, repercussão geral.", url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc45.htm", palavrasChave: ["reforma judiciário", "CNJ", "súmula vinculante"] },
  { sigla: "EC 19/1998", nome: "Reforma Administrativa - EC 19/1998", tipo: "EMC", ano: "1998", area: "constitucional", descricao: "Reforma Administrativa. Eficiência, contrato de gestão.", url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc19.htm", palavrasChave: ["reforma administrativa", "eficiência"] },
  { sigla: "EC 95/2016", nome: "Teto de Gastos - EC 95/2016", tipo: "EMC", ano: "2016", area: "constitucional", descricao: "Novo Regime Fiscal. Teto de gastos públicos.", url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc95.htm", palavrasChave: ["teto de gastos", "regime fiscal"] },
  { sigla: "EC 132/2023", nome: "Reforma Tributária - EC 132/2023", tipo: "EMC", ano: "2023", area: "constitucional", descricao: "Reforma Tributária. IBS, CBS, Imposto Seletivo.", url: "https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm", palavrasChave: ["reforma tributária", "IBS", "CBS"] },
  { sigla: "LC 64/1990", nome: "Lei de Inelegibilidade - LC 64/1990", tipo: "LCP", numero: "64", ano: "1990", area: "constitucional", descricao: "Casos de inelegibilidade.", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp64.htm", palavrasChave: ["inelegibilidade", "candidato"] },
  { sigla: "Lei Ficha Limpa", nome: "LC 135/2010", tipo: "LCP", numero: "135", ano: "2010", area: "constitucional", descricao: "Ficha Limpa. Amplia casos de inelegibilidade.", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp135.htm", palavrasChave: ["ficha limpa", "inelegibilidade"] },
  { sigla: "Lei ADPF", nome: "Lei 9.882/1999", tipo: "LEI", numero: "9882", ano: "1999", area: "constitucional", descricao: "Arguição de Descumprimento de Preceito Fundamental.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9882.htm", palavrasChave: ["ADPF", "preceito fundamental"] },
  { sigla: "Lei ADI/ADC", nome: "Lei 9.868/1999", tipo: "LEI", numero: "9868", ano: "1999", area: "constitucional", descricao: "Ação Direta de Inconstitucionalidade e Ação Declaratória de Constitucionalidade.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9868.htm", palavrasChave: ["ADI", "ADC", "inconstitucionalidade"] },

  // ═══ CIVIL (expansão) ═══
  { sigla: "Estatuto Cidade", nome: "Lei 10.257/2001 - Estatuto da Cidade", tipo: "LEI", numero: "10257", ano: "2001", area: "civil", descricao: "Política urbana. Usucapião urbano, plano diretor, IPTU progressivo.", url: "https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10257.htm", palavrasChave: ["estatuto cidade", "usucapião urbano", "plano diretor"] },
  { sigla: "Lei Condomínio", nome: "Lei 4.591/1964", tipo: "LEI", numero: "4591", ano: "1964", area: "civil", descricao: "Condomínio em edificações e incorporações imobiliárias.", url: "https://www.planalto.gov.br/ccivil_03/leis/l4591.htm", palavrasChave: ["condomínio", "incorporação imobiliária"] },
  { sigla: "Lei Dir Autoral", nome: "Lei 9.610/1998", tipo: "LEI", numero: "9610", ano: "1998", area: "civil", descricao: "Direitos Autorais.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9610.htm", palavrasChave: ["direito autoral", "copyright", "obra intelectual"] },
  { sigla: "Lei Prop Industrial", nome: "Lei 9.279/1996", tipo: "LEI", numero: "9279", ano: "1996", area: "civil", descricao: "Propriedade Industrial. Patentes, marcas.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9279.htm", palavrasChave: ["patente", "marca", "propriedade industrial"] },
  { sigla: "Lei Software", nome: "Lei 9.609/1998", tipo: "LEI", numero: "9609", ano: "1998", area: "civil", descricao: "Proteção da propriedade intelectual de programa de computador.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9609.htm", palavrasChave: ["software", "programa de computador"] },
  { sigla: "Lei Alien Parental", nome: "Lei 12.318/2010", tipo: "LEI", numero: "12318", ano: "2010", area: "civil", descricao: "Alienação Parental.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12318.htm", palavrasChave: ["alienação parental"] },
  { sigla: "Lei Guarda Comp", nome: "Lei 13.058/2014", tipo: "LEI", numero: "13058", ano: "2014", area: "civil", descricao: "Guarda Compartilhada.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l13058.htm", palavrasChave: ["guarda compartilhada"] },
  { sigla: "Lei Multipropriedade", nome: "Lei 13.777/2018", tipo: "LEI", numero: "13777", ano: "2018", area: "civil", descricao: "Regime de multipropriedade (time-sharing).", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13777.htm", palavrasChave: ["multipropriedade", "time-sharing"] },
  { sigla: "Lei Distrato", nome: "Lei 13.786/2018", tipo: "LEI", numero: "13786", ano: "2018", area: "civil", descricao: "Distrato de incorporações imobiliárias.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13786.htm", palavrasChave: ["distrato imobiliário"] },
  { sigla: "Lei Lib Econômica", nome: "Lei 13.874/2019", tipo: "LEI", numero: "13874", ano: "2019", area: "civil", descricao: "Declaração de Direitos de Liberdade Econômica.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/L13874.htm", palavrasChave: ["liberdade econômica", "desburocratização"] },

  // ═══ PENAL (expansão) ═══
  { sigla: "Lei Tortura", nome: "Lei 9.455/1997", tipo: "LEI", numero: "9455", ano: "1997", area: "penal", descricao: "Crime de Tortura.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9455.htm", palavrasChave: ["tortura"] },
  { sigla: "Lei Intercept Tel", nome: "Lei 9.296/1996", tipo: "LEI", numero: "9296", ano: "1996", area: "penal", descricao: "Interceptação de comunicações telefônicas.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9296.htm", palavrasChave: ["interceptação telefônica", "escuta"] },
  { sigla: "Lei Crimes Hediondos", nome: "Lei 8.072/1990", tipo: "LEI", numero: "8072", ano: "1990", area: "penal", descricao: "Crimes Hediondos. Regime inicialmente fechado.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8072.htm", palavrasChave: ["crime hediondo", "latrocínio", "estupro"] },
  { sigla: "Lei Racismo", nome: "Lei 7.716/1989", tipo: "LEI", numero: "7716", ano: "1989", area: "penal", descricao: "Crimes resultantes de preconceito de raça ou de cor.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7716.htm", palavrasChave: ["racismo", "preconceito", "discriminação"] },
  { sigla: "Lei Stalking", nome: "Lei 14.132/2021", tipo: "LEI", numero: "14132", ano: "2021", area: "penal", descricao: "Crime de perseguição (stalking).", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14132.htm", palavrasChave: ["stalking", "perseguição"] },
  { sigla: "Lei Imp Sexual", nome: "Lei 13.718/2018", tipo: "LEI", numero: "13718", ano: "2018", area: "penal", descricao: "Importunação sexual. Divulgação de cena de estupro.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13718.htm", palavrasChave: ["importunação sexual"] },
  { sigla: "Est Desarmamento", nome: "Lei 10.826/2003", tipo: "LEI", numero: "10826", ano: "2003", area: "penal", descricao: "Estatuto do Desarmamento. Posse e porte de arma de fogo.", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm", palavrasChave: ["arma de fogo", "desarmamento", "porte"] },
  { sigla: "Lei Ident Criminal", nome: "Lei 12.037/2009", tipo: "LEI", numero: "12037", ano: "2009", area: "penal", descricao: "Identificação Criminal.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12037.htm", palavrasChave: ["identificação criminal"] },
  { sigla: "Lei Prot Testemunha", nome: "Lei 9.807/1999", tipo: "LEI", numero: "9807", ano: "1999", area: "penal", descricao: "Proteção a vítimas e testemunhas ameaçadas.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9807.htm", palavrasChave: ["proteção testemunha", "delação"] },
  { sigla: "Lei Contrav Penais", nome: "Decreto-Lei 3.688/1941", tipo: "DEC", numero: "3688", ano: "1941", area: "penal", descricao: "Lei das Contravenções Penais.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3688.htm", palavrasChave: ["contravenção penal", "vias de fato", "perturbação"] },

  // ═══ TRABALHISTA (expansão) ═══
  { sigla: "LC 150/2015", nome: "Lei do Trabalho Doméstico - LC 150/2015", tipo: "LCP", numero: "150", ano: "2015", area: "trabalhista", descricao: "Trabalho doméstico. Direitos do empregado doméstico.", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp150.htm", palavrasChave: ["empregado doméstico", "trabalho doméstico"] },
  { sigla: "Lei FGTS", nome: "Lei 8.036/1990", tipo: "LEI", numero: "8036", ano: "1990", area: "trabalhista", descricao: "Fundo de Garantia do Tempo de Serviço.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8036consol.htm", palavrasChave: ["FGTS", "fundo de garantia"] },
  { sigla: "Lei Greve", nome: "Lei 7.783/1989", tipo: "LEI", numero: "7783", ano: "1989", area: "trabalhista", descricao: "Direito de greve.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7783.htm", palavrasChave: ["greve", "paralisação"] },
  { sigla: "Lei Seg Desemprego", nome: "Lei 7.998/1990", tipo: "LEI", numero: "7998", ano: "1990", area: "trabalhista", descricao: "Seguro-Desemprego e abono salarial.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7998.htm", palavrasChave: ["seguro-desemprego", "abono salarial"] },
  { sigla: "Lei Estágio", nome: "Lei 11.788/2008", tipo: "LEI", numero: "11788", ano: "2008", area: "trabalhista", descricao: "Lei do Estágio.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2008/lei/l11788.htm", palavrasChave: ["estágio", "estagiário"] },

  // ═══ TRIBUTÁRIO (expansão) ═══
  { sigla: "LC 123/2006", nome: "Simples Nacional - LC 123/2006", tipo: "LCP", numero: "123", ano: "2006", area: "tributário", descricao: "Estatuto Nacional da Microempresa e Empresa de Pequeno Porte. Simples Nacional, MEI.", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm", palavrasChave: ["simples nacional", "MEI", "microempresa"] },
  { sigla: "LRF", nome: "Lei de Responsabilidade Fiscal - LC 101/2000", tipo: "LCP", numero: "101", ano: "2000", area: "tributário", descricao: "Responsabilidade na gestão fiscal.", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm", palavrasChave: ["responsabilidade fiscal", "orçamento público"] },
  { sigla: "Lei Kandir", nome: "LC 87/1996 - Lei Kandir", tipo: "LCP", numero: "87", ano: "1996", area: "tributário", descricao: "ICMS. Imposto sobre operações relativas à circulação de mercadorias.", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp87.htm", palavrasChave: ["ICMS", "circulação mercadorias"] },
  { sigla: "Lei ISS", nome: "LC 116/2003", tipo: "LCP", numero: "116", ano: "2003", area: "tributário", descricao: "ISS. Imposto sobre serviços de qualquer natureza.", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm", palavrasChave: ["ISS", "imposto serviços"] },
  { sigla: "Lei Refis", nome: "Lei 11.941/2009", tipo: "LEI", numero: "11941", ano: "2009", area: "tributário", descricao: "REFIS. Parcelamento de débitos tributários.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l11941.htm", palavrasChave: ["REFIS", "parcelamento tributário", "CARF"] },

  // ═══ ADMINISTRATIVO (expansão) ═══
  { sigla: "Lei 8.112/1990", nome: "Regime Jurídico Servidores - Lei 8.112/1990", tipo: "LEI", numero: "8112", ano: "1990", area: "administrativo", descricao: "Regime jurídico dos servidores públicos civis da União.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm", palavrasChave: ["servidor público", "concurso", "estabilidade"] },
  { sigla: "Lei Pregão", nome: "Lei 10.520/2002", tipo: "LEI", numero: "10520", ano: "2002", area: "administrativo", descricao: "Pregão para aquisição de bens e serviços comuns.", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10520.htm", palavrasChave: ["pregão", "licitação"] },
  { sigla: "Lei Concessões", nome: "Lei 8.987/1995", tipo: "LEI", numero: "8987", ano: "1995", area: "administrativo", descricao: "Regime de concessão e permissão de serviços públicos.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8987cons.htm", palavrasChave: ["concessão", "serviço público", "permissão"] },
  { sigla: "Lei PPP", nome: "Lei 11.079/2004", tipo: "LEI", numero: "11079", ano: "2004", area: "administrativo", descricao: "Parceria Público-Privada.", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l11079.htm", palavrasChave: ["PPP", "parceria público-privada"] },
  { sigla: "Lei Consórcio Púb", nome: "Lei 11.107/2005", tipo: "LEI", numero: "11107", ano: "2005", area: "administrativo", descricao: "Consórcios Públicos.", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11107.htm", palavrasChave: ["consórcio público"] },
  { sigla: "Lei Ag Reguladoras", nome: "Lei 13.848/2019", tipo: "LEI", numero: "13848", ano: "2019", area: "administrativo", descricao: "Lei das Agências Reguladoras.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/L13848.htm", palavrasChave: ["agência reguladora", "ANATEL", "ANVISA", "ANS"] },
  { sigla: "Lei OSCIP", nome: "Lei 9.790/1999", tipo: "LEI", numero: "9790", ano: "1999", area: "administrativo", descricao: "Organizações da Sociedade Civil de Interesse Público.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9790.htm", palavrasChave: ["OSCIP", "terceiro setor"] },

  // ═══ PREVIDENCIÁRIO (expansão) ═══
  { sigla: "LOAS", nome: "Lei 8.742/1993 - LOAS", tipo: "LEI", numero: "8742", ano: "1993", area: "previdenciário", descricao: "Lei Orgânica da Assistência Social. BPC/LOAS.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8742compilado.htm", palavrasChave: ["LOAS", "BPC", "assistência social"] },
  { sigla: "LC 109/2001", nome: "Previdência Complementar - LC 109/2001", tipo: "LCP", numero: "109", ano: "2001", area: "previdenciário", descricao: "Regime de Previdência Complementar.", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp109.htm", palavrasChave: ["previdência complementar", "fundo de pensão"] },

  // ═══ SAÚDE (nova área) ═══
  { sigla: "Lei SUS", nome: "Lei 8.080/1990 - SUS", tipo: "LEI", numero: "8080", ano: "1990", area: "saúde", descricao: "Sistema Único de Saúde. Organização dos serviços de saúde.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8080.htm", palavrasChave: ["SUS", "saúde pública", "vigilância sanitária"] },
  { sigla: "Lei Planos Saúde", nome: "Lei 9.656/1998", tipo: "LEI", numero: "9656", ano: "1998", area: "saúde", descricao: "Planos e Seguros Privados de Assistência à Saúde.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9656.htm", palavrasChave: ["plano de saúde", "ANS", "cobertura"] },
  { sigla: "Lei Ato Médico", nome: "Lei 12.842/2013", tipo: "LEI", numero: "12842", ano: "2013", area: "saúde", descricao: "Exercício da Medicina (Ato Médico).", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12842.htm", palavrasChave: ["ato médico", "exercício medicina"] },
  { sigla: "Lei Biossegurança", nome: "Lei 11.105/2005", tipo: "LEI", numero: "11105", ano: "2005", area: "saúde", descricao: "Biossegurança. OGMs, células-tronco.", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2005/lei/l11105.htm", palavrasChave: ["biossegurança", "transgênico", "OGM"] },
  { sigla: "Lei Genéricos", nome: "Lei 9.787/1999", tipo: "LEI", numero: "9787", ano: "1999", area: "saúde", descricao: "Medicamentos Genéricos.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9787.htm", palavrasChave: ["medicamento genérico", "ANVISA"] },

  // ═══ EDUCAÇÃO (nova área) ═══
  { sigla: "LDB", nome: "Lei 9.394/1996 - LDB", tipo: "LEI", numero: "9394", ano: "1996", area: "educação", descricao: "Lei de Diretrizes e Bases da Educação Nacional.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9394.htm", palavrasChave: ["educação", "ensino", "escola", "universidade"] },
  { sigla: "Lei FUNDEB", nome: "Lei 14.113/2020", tipo: "LEI", numero: "14113", ano: "2020", area: "educação", descricao: "FUNDEB permanente. Financiamento da educação básica.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/L14113.htm", palavrasChave: ["FUNDEB", "financiamento educação"] },
  { sigla: "Lei Cotas", nome: "Lei 12.711/2012", tipo: "LEI", numero: "12711", ano: "2012", area: "educação", descricao: "Cotas em universidades federais e institutos.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12711.htm", palavrasChave: ["cotas", "universidade", "ações afirmativas"] },
  { sigla: "Marco Prim Infância", nome: "Lei 13.257/2016", tipo: "LEI", numero: "13257", ano: "2016", area: "educação", descricao: "Marco Legal da Primeira Infância.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13257.htm", palavrasChave: ["primeira infância", "criança"] },

  // ═══ AGRÁRIO (nova área) ═══
  { sigla: "Estatuto Terra", nome: "Lei 4.504/1964 - Estatuto da Terra", tipo: "LEI", numero: "4504", ano: "1964", area: "agrário", descricao: "Estatuto da Terra. Reforma agrária, política agrícola.", url: "https://www.planalto.gov.br/ccivil_03/leis/l4504.htm", palavrasChave: ["reforma agrária", "terra", "rural"] },
  { sigla: "LC 76/1993", nome: "Desapropriação Reforma Agrária - LC 76/1993", tipo: "LCP", numero: "76", ano: "1993", area: "agrário", descricao: "Procedimento de desapropriação para fins de reforma agrária.", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp76.htm", palavrasChave: ["desapropriação", "reforma agrária"] },
  { sigla: "Lei Usucapião Rural", nome: "Lei 6.969/1981", tipo: "LEI", numero: "6969", ano: "1981", area: "agrário", descricao: "Usucapião especial de imóvel rural (pro labore).", url: "https://www.planalto.gov.br/ccivil_03/leis/l6969.htm", palavrasChave: ["usucapião rural", "pro labore"] },

  // ═══ MARÍTIMO/AERONÁUTICO (nova área) ═══
  { sigla: "CBA", nome: "Lei 7.565/1986 - Código Brasileiro de Aeronáutica", tipo: "LEI", numero: "7565", ano: "1986", area: "marítimo", descricao: "Código Brasileiro de Aeronáutica. Transporte aéreo, aviação civil.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7565.htm", palavrasChave: ["aeronáutica", "aviação", "transporte aéreo"] },
  { sigla: "Lei Portos", nome: "Lei 12.815/2013", tipo: "LEI", numero: "12815", ano: "2013", area: "marítimo", descricao: "Exploração de portos e instalações portuárias.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12815.htm", palavrasChave: ["porto", "navegação", "marítimo"] },
  { sigla: "Lei Transp Aqua", nome: "Lei 9.432/1997", tipo: "LEI", numero: "9432", ano: "1997", area: "marítimo", descricao: "Transporte aquaviário. Navegação de cabotagem.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9432.htm", palavrasChave: ["transporte aquaviário", "cabotagem"] },

  // ═══ BANCÁRIO/FINANCEIRO (nova área) ═══
  { sigla: "Lei SFN", nome: "Lei 4.595/1964", tipo: "LEI", numero: "4595", ano: "1964", area: "bancário", descricao: "Sistema Financeiro Nacional. Banco Central, CMN.", url: "https://www.planalto.gov.br/ccivil_03/leis/l4595.htm", palavrasChave: ["sistema financeiro", "banco central", "CMN"] },
  { sigla: "Lei Mercado Capitais", nome: "Lei 6.385/1976", tipo: "LEI", numero: "6385", ano: "1976", area: "bancário", descricao: "Mercado de valores mobiliários. CVM.", url: "https://www.planalto.gov.br/ccivil_03/leis/l6385.htm", palavrasChave: ["CVM", "valores mobiliários", "bolsa"] },
  { sigla: "Lei Cheque", nome: "Lei 7.357/1985", tipo: "LEI", numero: "7357", ano: "1985", area: "bancário", descricao: "Cheque.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7357.htm", palavrasChave: ["cheque", "título de crédito"] },
  { sigla: "Lei Duplicata", nome: "Lei 5.474/1968", tipo: "LEI", numero: "5474", ano: "1968", area: "bancário", descricao: "Duplicata.", url: "https://www.planalto.gov.br/ccivil_03/leis/l5474.htm", palavrasChave: ["duplicata", "título de crédito"] },
  { sigla: "Lei Nota Promissória", nome: "Decreto 2.044/1908", tipo: "DEC", numero: "2044", ano: "1908", area: "bancário", descricao: "Letra de câmbio e nota promissória.", url: "https://www.planalto.gov.br/ccivil_03/decreto/historicos/dpl/DPL2044-1908.htm", palavrasChave: ["nota promissória", "letra de câmbio"] },

  // ═══ ESPORTE (nova área) ═══
  { sigla: "Est Torcedor", nome: "Lei 10.671/2003 - Estatuto do Torcedor", tipo: "LEI", numero: "10671", ano: "2003", area: "esporte", descricao: "Estatuto de Defesa do Torcedor.", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.671.htm", palavrasChave: ["torcedor", "esporte", "futebol"] },
  { sigla: "Lei Geral Esporte", nome: "Lei 14.597/2023", tipo: "LEI", numero: "14597", ano: "2023", area: "esporte", descricao: "Lei Geral do Esporte.", url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/L14597.htm", palavrasChave: ["esporte", "atleta", "competição"] },

  // ═══ ENERGIA/MINERAÇÃO (nova área) ═══
  { sigla: "Cód Mineração", nome: "Decreto-Lei 227/1967 - Código de Mineração", tipo: "DEC", numero: "227", ano: "1967", area: "energia", descricao: "Código de Mineração.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del0227.htm", palavrasChave: ["mineração", "minério", "jazida"] },
  { sigla: "Lei Petróleo", nome: "Lei 9.478/1997", tipo: "LEI", numero: "9478", ano: "1997", area: "energia", descricao: "Política energética nacional. ANP, petróleo, gás natural.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9478.htm", palavrasChave: ["petróleo", "ANP", "energia"] },
  { sigla: "Marco Saneamento", nome: "Lei 14.026/2020", tipo: "LEI", numero: "14026", ano: "2020", area: "energia", descricao: "Marco Legal do Saneamento Básico.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/L14026.htm", palavrasChave: ["saneamento", "água", "esgoto"] },

  // ═══ OUTROS RELEVANTES ═══
  { sigla: "Lei Alimentos", nome: "Lei 5.478/1968", tipo: "LEI", numero: "5478", ano: "1968", area: "família", descricao: "Ação de Alimentos.", url: "https://www.planalto.gov.br/ccivil_03/leis/l5478.htm", palavrasChave: ["alimentos", "pensão alimentícia"] },
  { sigla: "Lei Adoção", nome: "Lei 13.509/2017", tipo: "LEI", numero: "13509", ano: "2017", area: "família", descricao: "Adoção. Apadrinhamento afetivo.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13509.htm", palavrasChave: ["adoção", "apadrinhamento"] },
  { sigla: "Lei Anti-Bullying", nome: "Lei 13.185/2015", tipo: "LEI", numero: "13185", ano: "2015", area: "civil", descricao: "Programa de Combate à Intimidação Sistemática (Bullying).", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13185.htm", palavrasChave: ["bullying", "intimidação"] },
  { sigla: "Marco Startups", nome: "LC 182/2021", tipo: "LCP", numero: "182", ano: "2021", area: "empresarial", descricao: "Marco Legal das Startups e Empreendedorismo Inovador.", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp182.htm", palavrasChave: ["startup", "inovação", "empreendedorismo"] },
  { sigla: "Lei Franquia", nome: "Lei 13.966/2019", tipo: "LEI", numero: "13966", ano: "2019", area: "empresarial", descricao: "Sistema de franquia empresarial.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/L13966.htm", palavrasChave: ["franquia", "franchising"] },
  { sigla: "Lei Cooperativas", nome: "Lei 5.764/1971", tipo: "LEI", numero: "5764", ano: "1971", area: "empresarial", descricao: "Política Nacional de Cooperativismo.", url: "https://www.planalto.gov.br/ccivil_03/leis/l5764.htm", palavrasChave: ["cooperativa", "cooperativismo"] },
  { sigla: "Lei Crimes Digit", nome: "Lei 12.737/2012", tipo: "LEI", numero: "12737", ano: "2012", area: "digital", descricao: "Crimes informáticos (Lei Carolina Dieckmann).", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12737.htm", palavrasChave: ["crime informático", "invasão dispositivo", "hacker"] },
  { sigla: "Lei Juiz Fed", nome: "Lei 9.099/1995", tipo: "LEI", numero: "10259", ano: "2001", area: "processo civil", descricao: "Juizados Especiais Federais Cíveis e Criminais.", url: "https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10259.htm", palavrasChave: ["juizado federal", "pequenas causas federal"] },
  { sigla: "Lei Mandado Inj", nome: "Lei 13.300/2016", tipo: "LEI", numero: "13300", ano: "2016", area: "constitucional", descricao: "Mandado de Injunção.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13300.htm", palavrasChave: ["mandado de injunção"] },
  { sigla: "Lei Mediação", nome: "Lei 13.140/2015", tipo: "LEI", numero: "13140", ano: "2015", area: "processo civil", descricao: "Mediação entre particulares e autocomposição de conflitos.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13140.htm", palavrasChave: ["mediação", "autocomposição", "conciliação"] },
  { sigla: "Lei Notários", nome: "Lei 8.935/1994", tipo: "LEI", numero: "8935", ano: "1994", area: "civil", descricao: "Serviços notariais e de registro.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8935.htm", palavrasChave: ["cartório", "notário", "registro"] },
  { sigla: "Lei Usura", nome: "Decreto 22.626/1933", tipo: "DEC", numero: "22626", ano: "1933", area: "bancário", descricao: "Lei de Usura. Limitação de juros.", url: "https://www.planalto.gov.br/ccivil_03/decreto/d22626.htm", palavrasChave: ["usura", "juros", "taxa de juros"] },

  // ═══ PENAL (expansão massiva) ═══
  { sigla: "Lei Feminicídio", nome: "Lei 13.104/2015", tipo: "LEI", numero: "13104", ano: "2015", area: "penal", descricao: "Feminicídio como qualificadora do homicídio.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13104.htm", palavrasChave: ["feminicídio", "homicídio qualificado", "violência gênero"] },
  { sigla: "Lei Cyberbullying", nome: "Lei 14.811/2024", tipo: "LEI", numero: "14811", ano: "2024", area: "penal", descricao: "Criminalização do bullying e cyberbullying.", url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/L14811.htm", palavrasChave: ["cyberbullying", "bullying", "intimidação virtual"] },
  { sigla: "Lei Mariana Ferrer", nome: "Lei 14.245/2021", tipo: "LEI", numero: "14245", ano: "2021", area: "penal", descricao: "Violência institucional contra vítima de crimes sexuais em audiência.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14245.htm", palavrasChave: ["violência institucional", "vítima", "audiência"] },
  { sigla: "Lei Saidinha", nome: "Lei 14.843/2024", tipo: "LEI", numero: "14843", ano: "2024", area: "penal", descricao: "Restringe saída temporária de presos.", url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/L14843.htm", palavrasChave: ["saída temporária", "preso", "execução penal"] },
  { sigla: "Lei Sansão", nome: "Lei 14.064/2020", tipo: "LEI", numero: "14064", ano: "2020", area: "penal", descricao: "Aumenta pena para maus-tratos contra cães e gatos.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/L14064.htm", palavrasChave: ["maus-tratos", "animais", "cão", "gato"] },
  { sigla: "Lei Crimes Fiscais", nome: "Lei 8.137/1990", tipo: "LEI", numero: "8137", ano: "1990", area: "penal", descricao: "Crimes contra a ordem tributária, econômica e relações de consumo.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8137.htm", palavrasChave: ["crime tributário", "sonegação", "nota fria"] },
  { sigla: "Lei Prisão Temporária", nome: "Lei 7.960/1989", tipo: "LEI", numero: "7960", ano: "1989", area: "penal", descricao: "Prisão temporária.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7960.htm", palavrasChave: ["prisão temporária", "investigação"] },
  { sigla: "Lei Genocídio", nome: "Lei 2.889/1956", tipo: "LEI", numero: "2889", ano: "1956", area: "penal", descricao: "Crime de genocídio.", url: "https://www.planalto.gov.br/ccivil_03/leis/l2889.htm", palavrasChave: ["genocídio", "extermínio"] },
  { sigla: "Lei Monitoramento", nome: "Lei 12.258/2010", tipo: "LEI", numero: "12258", ano: "2010", area: "penal", descricao: "Monitoramento eletrônico do apenado.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12258.htm", palavrasChave: ["monitoramento eletrônico", "tornozeleira"] },
  { sigla: "Lei Viol Política", nome: "Lei 14.192/2021", tipo: "LEI", numero: "14192", ano: "2021", area: "penal", descricao: "Violência política contra a mulher.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14192.htm", palavrasChave: ["violência política", "mulher candidata"] },
  { sigla: "Lei Econ Popular", nome: "Lei 1.521/1951", tipo: "LEI", numero: "1521", ano: "1951", area: "penal", descricao: "Crimes contra a economia popular.", url: "https://www.planalto.gov.br/ccivil_03/leis/l1521.htm", palavrasChave: ["economia popular", "usura", "fraude"] },
  { sigla: "Lei Seg Nacional", nome: "Lei 14.197/2021", tipo: "LEI", numero: "14197", ano: "2021", area: "penal", descricao: "Crimes contra o Estado Democrático de Direito.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14197.htm", palavrasChave: ["segurança nacional", "estado democrático", "golpe"] },
  { sigla: "Lei Henry Borel", nome: "Lei 14.344/2022", tipo: "LEI", numero: "14344", ano: "2022", area: "penal", descricao: "Violência doméstica e familiar contra criança e adolescente.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/L14344.htm", palavrasChave: ["violência criança", "Henry Borel", "maus-tratos"] },
  { sigla: "Lei Injúria Racial", nome: "Lei 14.532/2023", tipo: "LEI", numero: "14532", ano: "2023", area: "penal", descricao: "Equipara injúria racial ao crime de racismo.", url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/L14532.htm", palavrasChave: ["injúria racial", "racismo", "discriminação"] },
  { sigla: "Lei Jogos Azar", nome: "Decreto-Lei 9.215/1946", tipo: "DEC", numero: "9215", ano: "1946", area: "penal", descricao: "Proibição de jogos de azar no Brasil.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del9215.htm", palavrasChave: ["jogo de azar", "cassino", "aposta"] },
  { sigla: "Lei Fraude Elet", nome: "Lei 14.155/2021", tipo: "LEI", numero: "14155", ano: "2021", area: "penal", descricao: "Fraude eletrônica, estelionato digital.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14155.htm", palavrasChave: ["fraude eletrônica", "estelionato digital", "golpe online"] },
  { sigla: "Lei Viol Instit", nome: "Lei 14.321/2022", tipo: "LEI", numero: "14321", ano: "2022", area: "penal", descricao: "Violência institucional contra a vítima.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/L14321.htm", palavrasChave: ["violência institucional", "vítima", "revitimização"] },
  { sigla: "Lei Cautelares", nome: "Lei 12.403/2011", tipo: "LEI", numero: "12403", ano: "2011", area: "penal", descricao: "Medidas cautelares diversas da prisão.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12403.htm", palavrasChave: ["medida cautelar", "prisão preventiva", "fiança"] },

  // ═══ CIVIL (expansão massiva) ═══
  { sigla: "Lei União Estável", nome: "Lei 9.278/1996", tipo: "LEI", numero: "9278", ano: "1996", area: "civil", descricao: "Regula a união estável.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9278.htm", palavrasChave: ["união estável", "convivência", "companheiro"] },
  { sigla: "Lei Invent Extrajud", nome: "Lei 11.441/2007", tipo: "LEI", numero: "11441", ano: "2007", area: "civil", descricao: "Inventário, partilha, separação e divórcio extrajudiciais.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/lei/l11441.htm", palavrasChave: ["inventário extrajudicial", "divórcio cartório", "partilha"] },
  { sigla: "Lei Superendivid", nome: "Lei 14.181/2021", tipo: "LEI", numero: "14181", ano: "2021", area: "civil", descricao: "Prevenção e tratamento do superendividamento do consumidor.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14181.htm", palavrasChave: ["superendividamento", "consumidor", "mínimo existencial"] },
  { sigla: "Lei Tombamento", nome: "Decreto-Lei 25/1937", tipo: "DEC", numero: "25", ano: "1937", area: "civil", descricao: "Proteção do Patrimônio Histórico e Artístico Nacional.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del0025.htm", palavrasChave: ["tombamento", "patrimônio histórico", "IPHAN"] },
  { sigla: "Lei Desapropriação", nome: "Decreto-Lei 3.365/1941", tipo: "DEC", numero: "3365", ano: "1941", area: "civil", descricao: "Desapropriação por utilidade pública.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3365.htm", palavrasChave: ["desapropriação", "utilidade pública", "indenização"] },
  { sigla: "Lei Bem Família", nome: "Lei 8.009/1990", tipo: "LEI", numero: "8009", ano: "1990", area: "civil", descricao: "Impenhorabilidade do bem de família.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8009.htm", palavrasChave: ["bem de família", "impenhorabilidade", "moradia"] },
  { sigla: "Lei Alien Fid Imóvel", nome: "Lei 9.514/1997", tipo: "LEI", numero: "9514", ano: "1997", area: "civil", descricao: "Alienação fiduciária de imóvel. SFI.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9514.htm", palavrasChave: ["alienação fiduciária", "imóvel", "financiamento"] },
  { sigla: "Dec Marco Civil Reg", nome: "Decreto 8.771/2016", tipo: "DEC", numero: "8771", ano: "2016", area: "civil", descricao: "Regulamentação do Marco Civil da Internet.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/decreto/d8771.htm", palavrasChave: ["marco civil", "internet", "neutralidade rede"] },

  // ═══ TRABALHISTA (expansão massiva) ═══
  { sigla: "Lei Part Lucros", nome: "Lei 10.101/2000", tipo: "LEI", numero: "10101", ano: "2000", area: "trabalhista", descricao: "Participação dos trabalhadores nos lucros ou resultados (PLR).", url: "https://www.planalto.gov.br/ccivil_03/leis/l10101.htm", palavrasChave: ["PLR", "participação lucros", "resultados"] },
  { sigla: "Lei Trab Temporário", nome: "Lei 6.019/1974", tipo: "LEI", numero: "6019", ano: "1974", area: "trabalhista", descricao: "Trabalho temporário em empresas urbanas.", url: "https://www.planalto.gov.br/ccivil_03/leis/l6019.htm", palavrasChave: ["trabalho temporário", "contrato temporário"] },
  { sigla: "Lei Terceirização", nome: "Lei 13.429/2017", tipo: "LEI", numero: "13429", ano: "2017", area: "trabalhista", descricao: "Terceirização de serviços.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13429.htm", palavrasChave: ["terceirização", "prestação de serviços"] },
  { sigla: "Lei Vale-Transporte", nome: "Lei 7.418/1985", tipo: "LEI", numero: "7418", ano: "1985", area: "trabalhista", descricao: "Vale-transporte ao trabalhador.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7418.htm", palavrasChave: ["vale-transporte", "transporte trabalho"] },
  { sigla: "Lei PAT", nome: "Lei 6.321/1976", tipo: "LEI", numero: "6321", ano: "1976", area: "trabalhista", descricao: "Programa de Alimentação do Trabalhador (PAT).", url: "https://www.planalto.gov.br/ccivil_03/leis/l6321.htm", palavrasChave: ["PAT", "alimentação trabalhador", "vale-refeição"] },
  { sigla: "Lei Aprendizagem", nome: "Lei 10.097/2000", tipo: "LEI", numero: "10097", ano: "2000", area: "trabalhista", descricao: "Contrato de aprendizagem. Jovem aprendiz.", url: "https://www.planalto.gov.br/ccivil_03/leis/l10097.htm", palavrasChave: ["aprendiz", "jovem aprendiz", "menor aprendiz"] },
  { sigla: "Lei Trab Rural", nome: "Lei 5.889/1973", tipo: "LEI", numero: "5889", ano: "1973", area: "trabalhista", descricao: "Trabalho rural.", url: "https://www.planalto.gov.br/ccivil_03/leis/l5889.htm", palavrasChave: ["trabalho rural", "empregado rural"] },
  { sigla: "EAOAB", nome: "Lei 8.906/1994", tipo: "LEI", numero: "8906", ano: "1994", area: "trabalhista", descricao: "Estatuto da Advocacia e da OAB.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8906.htm", palavrasChave: ["OAB", "advogado", "estatuto advocacia"] },
  { sigla: "Lei Prof Motorista", nome: "Lei 13.103/2015", tipo: "LEI", numero: "13103", ano: "2015", area: "trabalhista", descricao: "Exercício da profissão de motorista.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13103.htm", palavrasChave: ["motorista", "caminhoneiro", "jornada motorista"] },
  { sigla: "Lei Prof Enfermagem", nome: "Lei 7.498/1986", tipo: "LEI", numero: "7498", ano: "1986", area: "trabalhista", descricao: "Exercício da enfermagem.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7498.htm", palavrasChave: ["enfermagem", "enfermeiro", "técnico enfermagem"] },
  { sigla: "Lei Piso Enfermagem", nome: "Lei 14.434/2022", tipo: "LEI", numero: "14434", ano: "2022", area: "trabalhista", descricao: "Piso salarial da enfermagem.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/L14434.htm", palavrasChave: ["piso enfermagem", "salário enfermeiro"] },
  { sigla: "Lei Teletrabalho", nome: "Lei 14.442/2022", tipo: "LEI", numero: "14442", ano: "2022", area: "trabalhista", descricao: "Teletrabalho e auxílio-alimentação.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/L14442.htm", palavrasChave: ["teletrabalho", "home office", "trabalho remoto"] },
  { sigla: "Lei Emerg Emprego", nome: "Lei 14.020/2020", tipo: "LEI", numero: "14020", ano: "2020", area: "trabalhista", descricao: "Programa Emergencial de Manutenção do Emprego e Renda.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/L14020.htm", palavrasChave: ["emprego emergencial", "COVID", "redução jornada"] },
  { sigla: "Lei Trab Portuário", nome: "Lei 12.815/2013", tipo: "LEI", numero: "12815", ano: "2013", area: "trabalhista", descricao: "Trabalho portuário e exploração de portos.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12815.htm", palavrasChave: ["trabalho portuário", "porto", "estivador"] },

  // ═══ CONSUMIDOR (expansão massiva) ═══
  { sigla: "Dec Com Eletrônico", nome: "Decreto 7.962/2013", tipo: "DEC", numero: "7962", ano: "2013", area: "consumidor", descricao: "Regulamentação do comércio eletrônico.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm", palavrasChave: ["comércio eletrônico", "e-commerce", "compra online"] },
  { sigla: "Dec SAC", nome: "Decreto 11.034/2022", tipo: "DEC", numero: "11034", ano: "2022", area: "consumidor", descricao: "Serviço de Atendimento ao Consumidor (SAC).", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/D11034.htm", palavrasChave: ["SAC", "atendimento consumidor", "call center"] },
  { sigla: "Lei Cadastro Positivo", nome: "Lei 12.414/2011", tipo: "LEI", numero: "12414", ano: "2011", area: "consumidor", descricao: "Cadastro Positivo. Banco de dados de adimplentes.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12414.htm", palavrasChave: ["cadastro positivo", "score crédito", "adimplente"] },
  { sigla: "Lei Créd Consignado", nome: "Lei 10.820/2003", tipo: "LEI", numero: "10820", ano: "2003", area: "consumidor", descricao: "Empréstimo consignado em folha de pagamento.", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.820.htm", palavrasChave: ["consignado", "empréstimo", "desconto folha"] },
  { sigla: "Dec Recall", nome: "Decreto 10.742/2021", tipo: "DEC", numero: "10742", ano: "2021", area: "consumidor", descricao: "Procedimento de recall de produtos.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/decreto/D10742.htm", palavrasChave: ["recall", "produto defeituoso", "chamamento"] },

  // ═══ TRIBUTÁRIO (expansão massiva) ═══
  { sigla: "Lei IR", nome: "Lei 7.713/1988", tipo: "LEI", numero: "7713", ano: "1988", area: "tributário", descricao: "Imposto de Renda sobre rendimentos de pessoas físicas.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7713.htm", palavrasChave: ["imposto de renda", "IRPF", "declaração"] },
  { sigla: "Lei PIS", nome: "Lei 10.637/2002", tipo: "LEI", numero: "10637", ano: "2002", area: "tributário", descricao: "PIS/Pasep não cumulativo.", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10637.htm", palavrasChave: ["PIS", "Pasep", "contribuição"] },
  { sigla: "Lei COFINS", nome: "Lei 10.833/2003", tipo: "LEI", numero: "10833", ano: "2003", area: "tributário", descricao: "COFINS não cumulativa.", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm", palavrasChave: ["COFINS", "contribuição social"] },
  { sigla: "Lei CSLL", nome: "Lei 7.689/1988", tipo: "LEI", numero: "7689", ano: "1988", area: "tributário", descricao: "Contribuição Social sobre o Lucro Líquido.", url: "https://www.planalto.gov.br/ccivil_03/leis/l7689.htm", palavrasChave: ["CSLL", "contribuição social", "lucro líquido"] },
  { sigla: "Dec IPI-RIPI", nome: "Decreto 7.212/2010", tipo: "DEC", numero: "7212", ano: "2010", area: "tributário", descricao: "Regulamento do IPI (RIPI).", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/decreto/d7212.htm", palavrasChave: ["IPI", "imposto produtos industrializados"] },
  { sigla: "Dec IOF", nome: "Decreto 6.306/2007", tipo: "DEC", numero: "6306", ano: "2007", area: "tributário", descricao: "Regulamento do IOF.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/decreto/d6306.htm", palavrasChave: ["IOF", "operações financeiras", "câmbio"] },

  // ═══ ADMINISTRATIVO (expansão massiva) ═══
  { sigla: "DL 200/1967", nome: "Decreto-Lei 200/1967", tipo: "DEC", numero: "200", ano: "1967", area: "administrativo", descricao: "Organização da Administração Federal. Autarquias, fundações.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del0200.htm", palavrasChave: ["administração federal", "autarquia", "fundação pública"] },
  { sigla: "Lei RDC", nome: "Lei 12.462/2011", tipo: "LEI", numero: "12462", ano: "2011", area: "administrativo", descricao: "Regime Diferenciado de Contratações Públicas (RDC).", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12462.htm", palavrasChave: ["RDC", "contratação pública", "licitação"] },
  { sigla: "Lei Estatais", nome: "Lei 13.303/2016", tipo: "LEI", numero: "13303", ano: "2016", area: "administrativo", descricao: "Estatuto jurídico das empresas estatais.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13303.htm", palavrasChave: ["empresa estatal", "sociedade economia mista"] },
  { sigla: "Lei CADE", nome: "Lei 12.529/2011", tipo: "LEI", numero: "12529", ano: "2011", area: "administrativo", descricao: "Defesa da Concorrência. CADE, SBDC.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12529.htm", palavrasChave: ["CADE", "concorrência", "antitruste", "monopólio"] },
  { sigla: "Lei Gov Digital", nome: "Lei 14.129/2021", tipo: "LEI", numero: "14129", ano: "2021", area: "administrativo", descricao: "Governo Digital. Serviços públicos digitais.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14129.htm", palavrasChave: ["governo digital", "serviço público digital", "desburocratização"] },

  // ═══ PREVIDENCIÁRIO (expansão massiva) ═══
  { sigla: "LC 142/2013", nome: "Aposentadoria PcD - LC 142/2013", tipo: "LCP", numero: "142", ano: "2013", area: "previdenciário", descricao: "Aposentadoria da pessoa com deficiência (PcD).", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp142.htm", palavrasChave: ["aposentadoria PcD", "deficiência", "tempo contribuição"] },
  { sigla: "Lei Auxílio-Reclusão", nome: "Lei 13.846/2019", tipo: "LEI", numero: "13846", ano: "2019", area: "previdenciário", descricao: "Auxílio-reclusão e pente-fino INSS.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/L13846.htm", palavrasChave: ["auxílio-reclusão", "pente-fino", "INSS"] },
  { sigla: "Lei Pensão Morte", nome: "Lei 13.135/2015", tipo: "LEI", numero: "13135", ano: "2015", area: "previdenciário", descricao: "Novas regras de pensão por morte e auxílio-reclusão.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13135.htm", palavrasChave: ["pensão por morte", "dependente", "cônjuge"] },

  // ═══ FAMÍLIA (expansão massiva) ═══
  { sigla: "Lei Invest Paternid", nome: "Lei 8.560/1992", tipo: "LEI", numero: "8560", ano: "1992", area: "família", descricao: "Investigação de paternidade.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8560.htm", palavrasChave: ["investigação paternidade", "DNA", "filiação"] },
  { sigla: "Lei Visitação Avós", nome: "Lei 12.398/2011", tipo: "LEI", numero: "12398", ano: "2011", area: "família", descricao: "Direito de visita dos avós.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12398.htm", palavrasChave: ["avós", "visita", "convivência familiar"] },
  { sigla: "Lei Dep Especial", nome: "Lei 13.431/2017", tipo: "LEI", numero: "13431", ano: "2017", area: "família", descricao: "Depoimento especial de criança e adolescente vítima.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13431.htm", palavrasChave: ["depoimento especial", "escuta especializada", "criança vítima"] },
  { sigla: "Lei Parentalidade", nome: "Lei 14.826/2024", tipo: "LEI", numero: "14826", ano: "2024", area: "família", descricao: "Parentalidade positiva e cuidado integral da criança.", url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/L14826.htm", palavrasChave: ["parentalidade positiva", "cuidado integral"] },

  // ═══ AMBIENTAL (expansão massiva) ═══
  { sigla: "Lei PNMA", nome: "Lei 6.938/1981", tipo: "LEI", numero: "6938", ano: "1981", area: "ambiental", descricao: "Política Nacional do Meio Ambiente. CONAMA, IBAMA.", url: "https://www.planalto.gov.br/ccivil_03/leis/l6938.htm", palavrasChave: ["meio ambiente", "CONAMA", "IBAMA", "licenciamento"] },
  { sigla: "Lei Rec Hídricos", nome: "Lei 9.433/1997", tipo: "LEI", numero: "9433", ano: "1997", area: "ambiental", descricao: "Política Nacional de Recursos Hídricos.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9433.htm", palavrasChave: ["recursos hídricos", "água", "bacia hidrográfica"] },
  { sigla: "Lei SNUC", nome: "Lei 9.985/2000", tipo: "LEI", numero: "9985", ano: "2000", area: "ambiental", descricao: "Sistema Nacional de Unidades de Conservação (SNUC).", url: "https://www.planalto.gov.br/ccivil_03/leis/l9985.htm", palavrasChave: ["unidade conservação", "parque nacional", "reserva"] },
  { sigla: "Lei Fauna", nome: "Lei 5.197/1967", tipo: "LEI", numero: "5197", ano: "1967", area: "ambiental", descricao: "Proteção à fauna silvestre.", url: "https://www.planalto.gov.br/ccivil_03/leis/l5197.htm", palavrasChave: ["fauna", "animal silvestre", "caça"] },
  { sigla: "Lei Agrotóxicos", nome: "Lei 14.785/2023", tipo: "LEI", numero: "14785", ano: "2023", area: "ambiental", descricao: "Nova lei de agrotóxicos e pesticidas.", url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/L14785.htm", palavrasChave: ["agrotóxico", "pesticida", "defensivo agrícola"] },
  { sigla: "Lei Pesca", nome: "Lei 11.959/2009", tipo: "LEI", numero: "11959", ano: "2009", area: "ambiental", descricao: "Política Nacional de Pesca e Aquicultura.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l11959.htm", palavrasChave: ["pesca", "aquicultura", "pesca artesanal"] },
  { sigla: "Lei Serv Ambientais", nome: "Lei 14.119/2021", tipo: "LEI", numero: "14119", ano: "2021", area: "ambiental", descricao: "Pagamento por Serviços Ambientais.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14119.htm", palavrasChave: ["serviços ambientais", "PSA", "carbono"] },
  { sigla: "Lei PNRS", nome: "Lei 12.305/2010", tipo: "LEI", numero: "12305", ano: "2010", area: "ambiental", descricao: "Política Nacional de Resíduos Sólidos.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12305.htm", palavrasChave: ["resíduos sólidos", "reciclagem", "logística reversa"] },

  // ═══ ELEITORAL (expansão massiva) ═══
  { sigla: "Lei Partidos", nome: "Lei 9.096/1995", tipo: "LEI", numero: "9096", ano: "1995", area: "eleitoral", descricao: "Partidos Políticos.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9096.htm", palavrasChave: ["partido político", "filiação", "fundo partidário"] },
  { sigla: "Lei Eleições", nome: "Lei 9.504/1997", tipo: "LEI", numero: "9504", ano: "1997", area: "eleitoral", descricao: "Normas para as eleições.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9504.htm", palavrasChave: ["eleição", "candidatura", "propaganda eleitoral"] },
  { sigla: "Lei Mini-Ref Eleit", nome: "Lei 13.488/2017", tipo: "LEI", numero: "13488", ano: "2017", area: "eleitoral", descricao: "Fundo Especial de Financiamento de Campanha.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13488.htm", palavrasChave: ["fundo eleitoral", "financiamento campanha"] },
  { sigla: "Lei Finc Campanhas", nome: "Lei 13.487/2017", tipo: "LEI", numero: "13487", ano: "2017", area: "eleitoral", descricao: "Fim da doação empresarial para campanhas.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13487.htm", palavrasChave: ["financiamento campanha", "doação eleitoral"] },
  { sigla: "Lei Prop Internet", nome: "Lei 12.034/2009", tipo: "LEI", numero: "12034", ano: "2009", area: "eleitoral", descricao: "Propaganda eleitoral na internet.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12034.htm", palavrasChave: ["propaganda internet", "campanha online"] },

  // ═══ DIGITAL (expansão massiva) ═══
  { sigla: "Lei Assin Eletrônica", nome: "Lei 14.063/2020", tipo: "LEI", numero: "14063", ano: "2020", area: "digital", descricao: "Assinaturas eletrônicas em interações com entes públicos.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/L14063.htm", palavrasChave: ["assinatura eletrônica", "certificado digital", "ICP-Brasil"] },
  { sigla: "Dec Cadastro Base", nome: "Decreto 10.046/2019", tipo: "DEC", numero: "10046", ano: "2019", area: "digital", descricao: "Cadastro Base do Cidadão e Comitê Central de Governança de Dados.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/decreto/D10046.htm", palavrasChave: ["cadastro cidadão", "dados governo", "CPF"] },
  { sigla: "LGT", nome: "Lei 9.472/1997", tipo: "LEI", numero: "9472", ano: "1997", area: "digital", descricao: "Lei Geral de Telecomunicações. ANATEL.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9472.htm", palavrasChave: ["telecomunicações", "ANATEL", "telefonia"] },

  // ═══ IMOBILIÁRIO (expansão massiva) ═══
  { sigla: "Lei Patrim Afetação", nome: "Lei 10.931/2004", tipo: "LEI", numero: "10931", ano: "2004", area: "imobiliário", descricao: "Patrimônio de afetação. Cédula de crédito bancário.", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10.931.htm", palavrasChave: ["patrimônio afetação", "incorporação", "cédula crédito"] },
  { sigla: "Lei Reurb", nome: "Lei 13.465/2017", tipo: "LEI", numero: "13465", ano: "2017", area: "imobiliário", descricao: "Regularização Fundiária Urbana (Reurb).", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13465.htm", palavrasChave: ["regularização fundiária", "Reurb", "usucapião extrajudicial"] },
  { sigla: "Lei Parcel Solo", nome: "Lei 6.766/1979", tipo: "LEI", numero: "6766", ano: "1979", area: "imobiliário", descricao: "Parcelamento do solo urbano. Loteamento.", url: "https://www.planalto.gov.br/ccivil_03/leis/l6766.htm", palavrasChave: ["parcelamento solo", "loteamento", "desmembramento"] },

  // ═══ MILITAR (expansão massiva) ═══
  { sigla: "Est Militares", nome: "Lei 6.880/1980", tipo: "LEI", numero: "6880", ano: "1980", area: "militar", descricao: "Estatuto dos Militares.", url: "https://www.planalto.gov.br/ccivil_03/leis/l6880.htm", palavrasChave: ["militar", "forças armadas", "estatuto militar"] },
  { sigla: "Lei Serv Militar", nome: "Lei 4.375/1964", tipo: "LEI", numero: "4375", ano: "1964", area: "militar", descricao: "Serviço Militar obrigatório.", url: "https://www.planalto.gov.br/ccivil_03/leis/l4375.htm", palavrasChave: ["serviço militar", "alistamento", "conscrição"] },
  { sigla: "Lei Pensão Militar", nome: "Lei 3.765/1960", tipo: "LEI", numero: "3765", ano: "1960", area: "militar", descricao: "Pensões militares.", url: "https://www.planalto.gov.br/ccivil_03/leis/l3765.htm", palavrasChave: ["pensão militar", "dependente militar"] },

  // ═══ INTERNACIONAL (expansão massiva) ═══
  { sigla: "Lei Refúgio", nome: "Lei 9.474/1997", tipo: "LEI", numero: "9474", ano: "1997", area: "internacional", descricao: "Mecanismos para implementação do Estatuto dos Refugiados.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9474.htm", palavrasChave: ["refugiado", "asilo", "CONARE"] },
  { sigla: "Dec Conv Haia", nome: "Decreto 3.413/2000", tipo: "DEC", numero: "3413", ano: "2000", area: "internacional", descricao: "Convenção da Haia sobre sequestro internacional de crianças.", url: "https://www.planalto.gov.br/ccivil_03/decreto/d3413.htm", palavrasChave: ["Haia", "sequestro criança", "subtração internacional"] },
  { sigla: "Dec Conv NY Aliment", nome: "Decreto 56.826/1965", tipo: "DEC", numero: "56826", ano: "1965", area: "internacional", descricao: "Convenção de Nova York sobre prestação de alimentos no estrangeiro.", url: "https://www.planalto.gov.br/ccivil_03/decreto/1950-1969/D56826.htm", palavrasChave: ["alimentos estrangeiro", "pensão internacional", "Nova York"] },

  // ═══ SAÚDE (expansão massiva) ═══
  { sigla: "Lei Transplantes", nome: "Lei 9.434/1997", tipo: "LEI", numero: "9434", ano: "1997", area: "saúde", descricao: "Remoção de órgãos, tecidos e partes do corpo humano para transplante.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9434.htm", palavrasChave: ["transplante", "doação órgãos", "doador"] },
  { sigla: "Lei ANVISA", nome: "Lei 9.782/1999", tipo: "LEI", numero: "9782", ano: "1999", area: "saúde", descricao: "Sistema Nacional de Vigilância Sanitária. ANVISA.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9782.htm", palavrasChave: ["ANVISA", "vigilância sanitária", "medicamento"] },
  { sigla: "Lei Sangue", nome: "Lei 10.205/2001", tipo: "LEI", numero: "10205", ano: "2001", area: "saúde", descricao: "Coleta, processamento, estocagem e distribuição de sangue.", url: "https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10205.htm", palavrasChave: ["sangue", "hemoterapia", "doação sangue"] },
  { sigla: "Lei ANS", nome: "Lei 9.961/2000", tipo: "LEI", numero: "9961", ano: "2000", area: "saúde", descricao: "Agência Nacional de Saúde Suplementar (ANS).", url: "https://www.planalto.gov.br/ccivil_03/leis/l9961.htm", palavrasChave: ["ANS", "saúde suplementar", "plano saúde"] },
  { sigla: "Lei Vacinas", nome: "Lei 6.259/1975", tipo: "LEI", numero: "6259", ano: "1975", area: "saúde", descricao: "Programa Nacional de Imunizações. Vacinação obrigatória.", url: "https://www.planalto.gov.br/ccivil_03/leis/l6259.htm", palavrasChave: ["vacina", "imunização", "vacinação obrigatória"] },
  { sigla: "Lei Saúde Mental", nome: "Lei 10.216/2001", tipo: "LEI", numero: "10216", ano: "2001", area: "saúde", descricao: "Proteção dos direitos das pessoas com transtornos mentais.", url: "https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10216.htm", palavrasChave: ["saúde mental", "transtorno mental", "internação psiquiátrica"] },

  // ═══ EDUCAÇÃO (expansão massiva) ═══
  { sigla: "Lei Piso Professor", nome: "Lei 11.738/2008", tipo: "LEI", numero: "11738", ano: "2008", area: "educação", descricao: "Piso salarial nacional do magistério público.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2008/lei/l11738.htm", palavrasChave: ["piso professor", "magistério", "salário professor"] },
  { sigla: "Lei Libras", nome: "Lei 10.436/2002", tipo: "LEI", numero: "10436", ano: "2002", area: "educação", descricao: "Língua Brasileira de Sinais (Libras).", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10436.htm", palavrasChave: ["Libras", "língua de sinais", "surdo"] },
  { sigla: "Lei Pronatec", nome: "Lei 12.513/2011", tipo: "LEI", numero: "12513", ano: "2011", area: "educação", descricao: "Programa Nacional de Acesso ao Ensino Técnico e Emprego.", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12513.htm", palavrasChave: ["Pronatec", "ensino técnico", "capacitação"] },
  { sigla: "Lei Educ Ambiental", nome: "Lei 9.795/1999", tipo: "LEI", numero: "9795", ano: "1999", area: "educação", descricao: "Política Nacional de Educação Ambiental.", url: "https://www.planalto.gov.br/ccivil_03/leis/l9795.htm", palavrasChave: ["educação ambiental", "meio ambiente", "sustentabilidade"] },

  // ═══ BANCÁRIO/FINANCEIRO (expansão massiva) ═══
  { sigla: "Lei Consórcio", nome: "Lei 11.795/2008", tipo: "LEI", numero: "11795", ano: "2008", area: "bancário", descricao: "Sistema de Consórcios.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2008/lei/l11795.htm", palavrasChave: ["consórcio", "grupo consórcio", "cota"] },
  { sigla: "Lei Alien Fid Móvel", nome: "Decreto-Lei 911/1969", tipo: "DEC", numero: "911", ano: "1969", area: "bancário", descricao: "Alienação fiduciária de bens móveis.", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/1965-1988/Del0911.htm", palavrasChave: ["alienação fiduciária", "busca e apreensão", "bem móvel"] },
  { sigla: "LC Coop Crédito", nome: "LC 130/2009", tipo: "LCP", numero: "130", ano: "2009", area: "bancário", descricao: "Cooperativas de crédito.", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp130.htm", palavrasChave: ["cooperativa crédito", "Sicoob", "Sicredi"] },

  // ═══ ENERGIA/MINERAÇÃO (expansão massiva) ═══
  { sigla: "Lei ANEEL", nome: "Lei 9.427/1996", tipo: "LEI", numero: "9427", ano: "1996", area: "energia", descricao: "Agência Nacional de Energia Elétrica (ANEEL).", url: "https://www.planalto.gov.br/ccivil_03/leis/l9427cons.htm", palavrasChave: ["ANEEL", "energia elétrica", "tarifa"] },
  { sigla: "Lei Ener Renovável", nome: "Lei 14.300/2022", tipo: "LEI", numero: "14300", ano: "2022", area: "energia", descricao: "Marco legal da geração distribuída e energia renovável.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/L14300.htm", palavrasChave: ["energia solar", "geração distribuída", "energia renovável"] },
  { sigla: "Lei Gás Natural", nome: "Lei 14.134/2021", tipo: "LEI", numero: "14134", ano: "2021", area: "energia", descricao: "Nova Lei do Gás Natural.", url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14134.htm", palavrasChave: ["gás natural", "gasoduto", "GNL"] },
  { sigla: "Lei Pré-Sal", nome: "Lei 12.351/2010", tipo: "LEI", numero: "12351", ano: "2010", area: "energia", descricao: "Exploração do pré-sal. Partilha de produção, Fundo Social.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12351.htm", palavrasChave: ["pré-sal", "petróleo", "royalties", "partilha"] },

  // ═══ ESPORTE (expansão massiva) ═══
  { sigla: "Lei Inc Esporte", nome: "Lei 11.438/2006", tipo: "LEI", numero: "11438", ano: "2006", area: "esporte", descricao: "Incentivo fiscal ao esporte.", url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11438.htm", palavrasChave: ["incentivo esporte", "patrocínio", "dedução fiscal"] },
  { sigla: "Lei Viol Esporte", nome: "Lei 12.299/2010", tipo: "LEI", numero: "12299", ano: "2010", area: "esporte", descricao: "Prevenção e repressão a violência em eventos esportivos.", url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12299.htm", palavrasChave: ["violência esporte", "torcida organizada", "estádio"] },

  // ═══ AGRÁRIO (expansão) ═══
  { sigla: "Lei ITR", nome: "Lei 9.393/1996", tipo: "LEI", numero: "9393", ano: "1996", area: "agrário", descricao: "Imposto Territorial Rural (ITR).", url: "https://www.planalto.gov.br/ccivil_03/leis/l9393.htm", palavrasChave: ["ITR", "imposto rural", "propriedade rural"] },
  { sigla: "Lei Prod Orgânicos", nome: "Lei 10.831/2003", tipo: "LEI", numero: "10831", ano: "2003", area: "agrário", descricao: "Agricultura orgânica.", url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.831.htm", palavrasChave: ["orgânico", "agricultura orgânica", "agroecologia"] },

  // ═══ EMPRESARIAL (expansão) ═══
  { sigla: "Lei EIRELI/SLU", nome: "Lei 12.441/2011", tipo: "LEI", numero: "12441", ano: "2011", area: "empresarial", descricao: "Empresa Individual de Responsabilidade Limitada (EIRELI).", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12441.htm", palavrasChave: ["EIRELI", "empresa individual", "sociedade limitada unipessoal"] },
  { sigla: "Lei Registro Empr", nome: "Lei 8.934/1994", tipo: "LEI", numero: "8934", ano: "1994", area: "empresarial", descricao: "Registro público de empresas mercantis.", url: "https://www.planalto.gov.br/ccivil_03/leis/l8934.htm", palavrasChave: ["junta comercial", "registro empresa", "CNPJ"] },
  { sigla: "Lei Microempreend", nome: "LC 128/2008", tipo: "LCP", numero: "128", ano: "2008", area: "empresarial", descricao: "Microempreendedor Individual (MEI).", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp128.htm", palavrasChave: ["MEI", "microempreendedor", "formalização"] }
];

// ═══════════════════════════════════════════════════════════════
// SENADO FEDERAL — COBERTURA COMPLETA DA API DADOS ABERTOS
// Todos os endpoints: Comissão, Composição, Discurso, Legislação,
// Orçamento, Parlamentar, Plenário, Processo, Votação, Taquigrafia
// ═══════════════════════════════════════════════════════════════

// ──────────────────── COMISSÃO ────────────────────
async function comissaoDetalhe(codigo: string) { return senadoGet(`/comissao/${codigo}`); }
async function comissaoAgendaPeriodo(dataInicio: string, dataFim: string) { return senadoGet(`/comissao/agenda/${dataInicio}/${dataFim}`); }
async function comissaoAgendaData(data: string) { return senadoGet(`/comissao/agenda/${data}`); }
async function comissaoAgendaMes(mes: string) { return senadoGet(`/comissao/agenda/mes/${mes}`); }
async function comissaoCpiRequerimentos(sigla: string, pagina = 0, tamanho = 20) {
  const url = `${SENADO_BASE}/comissao/cpi/${sigla}/requerimentos?pagina=${pagina}&tamanho=${tamanho}`;
  const res = await fetch(url, { headers: HEADERS_JSON, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`CPI req ${res.status}`);
  return res.json();
}
async function comissaoLista(tipo: string) { return senadoGet(`/comissao/lista/${tipo}`); }
async function comissaoListaColegiados() { return senadoGet(`/comissao/lista/colegiados`); }
async function comissaoListaMistas() { return senadoGet(`/comissao/lista/mistas`); }
async function comissaoListaTiposColegiado() { return senadoGet(`/comissao/lista/tiposColegiado`); }
async function comissaoReuniaoDetalhe(codigo: string) { return senadoGet(`/comissao/reuniao/${codigo}`); }
async function comissaoReuniaoNotas(codigo: string) { return senadoGet(`/comissao/reuniao/notas/${codigo}`); }

// ──────────────────── COMPOSIÇÃO ────────────────────
async function composicaoBloco(codigo: string) { return senadoGet(`/composicao/bloco/${codigo}`); }
async function composicaoComissao(codigo: string) { return senadoGet(`/composicao/comissao/${codigo}`); }
async function composicaoComissaoMista(codigo: string) { return senadoGet(`/composicao/comissao/atual/mista/${codigo}`); }
async function composicaoLideranca() { return senadoGet(`/composicao/lideranca`); }
async function composicaoLiderancaTipos() { return senadoGet(`/composicao/lideranca/tipos`); }
async function composicaoLiderancaTiposUnidade() { return senadoGet(`/composicao/lideranca/tipos-unidade`); }
async function composicaoListaPorTipo(tipo: string) { return senadoGet(`/composicao/lista/${tipo}`); }
async function composicaoBlocos() { return senadoGet(`/composicao/lista/blocos`); }
async function composicaoListaCN(tipo: string) { return senadoGet(`/composicao/lista/cn/${tipo}`); }
async function composicaoPartidos() { return senadoGet(`/composicao/lista/partidos`); }
async function composicaoTiposCargo() { return senadoGet(`/composicao/lista/tiposCargo`); }
async function composicaoMesaCN() { return senadoGet(`/composicao/mesaCN`); }
async function composicaoMesaSF() { return senadoGet(`/composicao/mesaSF`); }

// ──────────────────── DISCURSO / TAQUIGRAFIA ────────────────────
async function discursoTextoIntegral(codigo: string) { return senadoGet(`/discurso/texto-integral/${codigo}`); }
async function senadorApartes(codigo: string) { return senadoGet(`/senador/${codigo}/apartes`); }
async function senadorDiscursos(codigo: string) { return senadoGet(`/senador/${codigo}/discursos`); }
async function senadorTiposUsoPalavra() { return senadoGet(`/senador/lista/tiposUsoPalavra`); }
async function taquigrafiaNotasReuniao(id: string) { return senadoGet(`/taquigrafia/notas/reuniao/${id}`); }
async function taquigrafiaNotasSessao(id: string) { return senadoGet(`/taquigrafia/notas/sessao/${id}`); }
async function taquigrafiaVideosReuniao(id: string) { return senadoGet(`/taquigrafia/videos/reuniao/${id}`); }
async function taquigrafiaVideosSessao(id: string) { return senadoGet(`/taquigrafia/videos/sessao/${id}`); }

// ──────────────────── LEGISLAÇÃO ────────────────────
async function legislacaoDetalhe(codigo: string) { return senadoGet(`/legislacao/${codigo}`); }
async function legislacaoPorId(tipo: string, numdata: string, anoseq: string) { return senadoGet(`/legislacao/${tipo}/${numdata}/${anoseq}`); }
async function legislacaoClasses() { return senadoGet(`/legislacao/classes`); }
async function legislacaoLista(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/legislacao/lista?${qs}`);
}
async function legislacaoTermos(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/legislacao/termos?${qs}`);
}
async function legislacaoTiposDeclaracao() { return senadoGet(`/legislacao/tiposdeclaracao/detalhe`); }
async function legislacaoTiposNorma() { return senadoGet(`/legislacao/tiposNorma`); }
async function legislacaoTiposPublicacao() { return senadoGet(`/legislacao/tiposPublicacao`); }
async function legislacaoTiposVide() { return senadoGet(`/legislacao/tiposVide`); }
async function legislacaoUrn(urn: string) {
  const url = `${SENADO_BASE}/legislacao/urn.json?urn=${encodeURIComponent(urn)}`;
  const res = await fetch(url, { headers: HEADERS_JSON, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Legislacao URN ${res.status}`);
  return res.json();
}

// ──────────────────── ORÇAMENTO ────────────────────
async function orcamentoLista() { return senadoGet(`/orcamento/lista`); }
async function orcamentoOficios() { return senadoGet(`/orcamento/oficios`); }
async function orcamentoOficioDetalhe(numero: string) { return senadoGet(`/orcamento/oficios/${numero}`); }

// ──────────────────── PARLAMENTAR (SENADOR) ────────────────────
async function senadorDetalhe(codigo: string) { return senadoGet(`/senador/${codigo}`); }
async function senadorAutorias(codigo: string) { return senadoGet(`/senador/${codigo}/autorias`); }
async function senadorCargos(codigo: string) { return senadoGet(`/senador/${codigo}/cargos`); }
async function senadorComissoes(codigo: string) { return senadoGet(`/senador/${codigo}/comissoes`); }
async function senadorFiliacoes(codigo: string) { return senadoGet(`/senador/${codigo}/filiacoes`); }
async function senadorHistoricoAcademico(codigo: string) { return senadoGet(`/senador/${codigo}/historicoAcademico`); }
async function senadorLicencas(codigo: string) { return senadoGet(`/senador/${codigo}/licencas`); }
async function senadorMandatos(codigo: string) { return senadoGet(`/senador/${codigo}/mandatos`); }
async function senadorProfissao(codigo: string) { return senadoGet(`/senador/${codigo}/profissao`); }
async function senadorRelatorias(codigo: string) { return senadoGet(`/senador/${codigo}/relatorias`); }
async function senadorVotacoes(codigo: string) { return senadoGet(`/senador/${codigo}/votacoes`); }
async function senadorAfastados() { return senadoGet(`/senador/afastados`); }
async function senadorListaAtual() { return senadoGet(`/senador/lista/atual`); }
async function senadorListaLegislatura(leg: string) { return senadoGet(`/senador/lista/legislatura/${leg}`); }
async function senadorListaLegislaturaIntervalo(ini: string, fim: string) { return senadoGet(`/senador/lista/legislatura/${ini}/${fim}`); }
async function senadorPartidos() { return senadoGet(`/senador/partidos`); }

// ──────────────────── PLENÁRIO ────────────────────
async function plenarioAgendaDia(data: string) { return senadoGet(`/plenario/agenda/dia/${data}`); }
async function plenarioAgendaMes(data: string) { return senadoGet(`/plenario/agenda/mes/${data}`); }
async function plenarioAgendaCN(data: string) { return senadoGet(`/plenario/agenda/cn/${data}`); }
async function plenarioAgendaCNPeriodo(ini: string, fim: string) { return senadoGet(`/plenario/agenda/cn/${ini}/${fim}`); }
async function plenarioEncontro(codigo: string) { return senadoGet(`/plenario/encontro/${codigo}`); }
async function plenarioEncontroPauta(codigo: string) { return senadoGet(`/plenario/encontro/${codigo}/pauta`); }
async function plenarioEncontroResultado(codigo: string) { return senadoGet(`/plenario/encontro/${codigo}/resultado`); }
async function plenarioEncontroResumo(codigo: string) { return senadoGet(`/plenario/encontro/${codigo}/resumo`); }
async function plenarioLegislatura(data: string) { return senadoGet(`/plenario/legislatura/${data}`); }
async function plenarioDiscursos(dataInicio: string, dataFim: string) { return senadoGet(`/plenario/lista/discursos/${dataInicio}/${dataFim}`); }
async function plenarioLegislaturas() { return senadoGet(`/plenario/lista/legislaturas`); }
async function plenarioTiposComparecimento() { return senadoGet(`/plenario/lista/tiposComparecimento`); }
async function plenarioResultado(data: string) { return senadoGet(`/plenario/resultado/${data}`); }
async function plenarioResultadoCN(data: string) { return senadoGet(`/plenario/resultado/cn/${data}`); }
async function plenarioResultadoMes(data: string) { return senadoGet(`/plenario/resultado/mes/${data}`); }
async function plenarioResultadoVeto(codigo: string) { return senadoGet(`/plenario/resultado/veto/${codigo}`); }
async function plenarioResultadoVetoDispositivo(codigo: string) { return senadoGet(`/plenario/resultado/veto/dispositivo/${codigo}`); }
async function plenarioResultadoVetoMateria(codigo: string) { return senadoGet(`/plenario/resultado/veto/materia/${codigo}`); }
async function plenarioTiposSessao() { return senadoGet(`/plenario/tiposSessao`); }
async function plenarioOrientacaoPeriodo(ini: string, fim: string) { return senadoGet(`/plenario/votacao/orientacaoBancada/${ini}/${fim}`); }
async function plenarioOrientacaoData(data: string) { return senadoGet(`/plenario/votacao/orientacaoBancada/${data}`); }

// ──────────────────── PROCESSO LEGISLATIVO (v3) ────────────────────
async function processoLista(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/processo?${qs}`);
}
async function processoDetalhe(id: string) { return senadoGet(`/processo/${id}`); }
async function processoAssuntos() { return senadoGet(`/processo/assuntos`); }
async function processoClasses() { return senadoGet(`/processo/classes`); }
async function processoDestinos() { return senadoGet(`/processo/destinos`); }
async function processoDocumento(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/processo/documento?${qs}`);
}
async function processoDocumentoTipos() { return senadoGet(`/processo/documento/tipos`); }
async function processoDocumentoTiposConteudo() { return senadoGet(`/processo/documento/tipos-conteudo`); }
async function processoEmenda(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/processo/emenda?${qs}`);
}
async function processoEntes() { return senadoGet(`/processo/entes`); }
async function processoPrazo(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/processo/prazo?${qs}`);
}
async function processoPrazoTipos() { return senadoGet(`/processo/prazo/tipos`); }
async function processoRelatoria(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/processo/relatoria?${qs}`);
}
async function processoSiglas() { return senadoGet(`/processo/siglas`); }
async function processoTiposAtualizacao() { return senadoGet(`/processo/tipos-atualizacao`); }
async function processoTiposAutor() { return senadoGet(`/processo/tipos-autor`); }
async function processoTiposDecisao() { return senadoGet(`/processo/tipos-decisao`); }
async function processoTiposSituacao() { return senadoGet(`/processo/tipos-situacao`); }
async function autorListaAtual() { return senadoGet(`/autor/lista/atual`); }

// ──────────────────── VOTAÇÃO ────────────────────
async function votacao(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/votacao?${qs}`);
}
async function votacaoComissao(sigla: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/votacaoComissao/comissao/${sigla}?${qs}`);
}
async function votacaoComissaoMateria(sigla: string, numero: string, ano: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/votacaoComissao/materia/${sigla}/${numero}/${ano}?${qs}`);
}
async function votacaoComissaoParlamentar(codigo: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/votacaoComissao/parlamentar/${codigo}?${qs}`);
}

// ──────────────────── PLENÁRIO — Agenda iCal ────────────────────
async function plenarioAgendaIcal(): Promise<string> {
  const res = await fetch(`${SENADO_BASE}/plenario/agenda/atual/iCal`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Plenario iCal ${res.status}`);
  return res.text();
}

// ──────────────────── MATÉRIA (legacy + active endpoints) ────────────────────
async function materiaListaTramitacao() { return senadoGet(`/materia/lista/tramitacao`); }
async function materiaVetos(ano: string) { return senadoGet(`/materia/vetos/${ano}`); }
async function materiaDistribuicaoAutoria(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/materia/distribuicao/autoria?${qs}`);
}
async function materiaDistribuicaoRelatoria(sigla: string) {
  return senadoGet(`/materia/distribuicao/relatoria/${sigla}`);
}
// Legacy matéria endpoints (deprecated but still active per v3 docs)
async function materiaDetalhe(codigo: string) { return senadoGet(`/materia/${codigo}`); }
async function materiaDetalheSigla(sigla: string, numero: string, ano: string, comissao?: string) {
  const qs = comissao ? `?comissao=${comissao}` : "";
  return senadoGet(`/materia/${sigla}/${numero}/${ano}${qs}`);
}
async function materiaVotacoes(codigo: string) { return senadoGet(`/materia/votacoes/${codigo}`); }
async function materiaMovimentacoes(codigo: string, dataref?: string) {
  const qs = dataref ? `?dataref=${dataref}` : "";
  return senadoGet(`/materia/movimentacoes/${codigo}${qs}`);
}
async function materiaDocumentos(codigo: string) { return senadoGet(`/materia/documentos/${codigo}`); }
async function materiaSituacaoAtual(codigo: string) { return senadoGet(`/materia/situacaoatual/${codigo}`); }
async function materiaSituacaoTramitacao(data: string) { return senadoGet(`/materia/situacaoatual/tramitacao/${data}`); }
async function materiaRelatorias(codigo: string) { return senadoGet(`/materia/relatorias/${codigo}`); }
async function materiaOrdia(codigo: string) { return senadoGet(`/materia/ordia/${codigo}`); }
async function materiaPesquisaLista(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/materia/pesquisa/lista?${qs}`);
}
async function materiaListaComissao(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/materia/lista/comissao?${qs}`);
}
async function materiaListaPrazo(codPrazo: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params);
  return senadoGet(`/materia/lista/prazo/${codPrazo}?${qs}`);
}
async function materiaSubtipos() { return senadoGet(`/materia/subtipos`); }
async function materiaSituacoes() { return senadoGet(`/materia/situacoes`); }
async function materiaClasses() { return senadoGet(`/materia/classes`); }
async function materiaLocais() { return senadoGet(`/materia/locais`); }
async function materiaTiposEmendas() { return senadoGet(`/materia/tiposEmendas`); }
async function materiaTiposPrazo() { return senadoGet(`/materia/tiposPrazo`); }
async function materiaTiposNatureza() { return senadoGet(`/materia/tiposNatureza`); }
async function materiaTiposTurnoApresentacao() { return senadoGet(`/materia/tiposTurnoApresentacao`); }
async function materiaTiposAtualizacoes() { return senadoGet(`/materia/tiposatu`); }

// ═══════════════════════════════════════════════════════════════
// SENADO ADMINISTRATIVO — adm.senado.leg.br/adm-dadosabertos/api/v1
// Contratações, Servidores, Transparência Financeira
// ═══════════════════════════════════════════════════════════════

const ADM_BASE = "https://adm.senado.leg.br/adm-dadosabertos/api/v1";

async function admGet(path: string, format: "json" | "csv" = "json", timeout = 15000): Promise<any> {
  const url = `${ADM_BASE}${path}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`ADM ${path} → ${res.status}`);
  if (format === "csv") {
    const text = await res.text();
    // Parse CSV to array of objects
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) return [];
    const strip = (s: string) => s.replace(/^[\s"']+|[\s"']+$/g, "");
    const headers = lines[0].split(";").map(h => strip(h.replace(/^\uFEFF/, "")));
    return lines.slice(1, 101).map(line => {
      const vals = line.split(";");
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = strip(vals[i] || ""); });
      return obj;
    });
  }
  return res.json();
}

// ──────────────────── CONTRATAÇÕES ────────────────────
async function admLicitacoes() { return admGet("/contratacoes/licitacoes/csv", "csv"); }
async function admContratos() { return admGet("/contratacoes/contratos/csv", "csv"); }
async function admNotasEmpenho() { return admGet("/contratacoes/notas_empenho/csv", "csv"); }
async function admAtasRegistroPreco() { return admGet("/contratacoes/atas_registro_preco/csv", "csv"); }
async function admEmpresas() { return admGet("/contratacoes/empresas/csv", "csv"); }
async function admTerceirizados() { return admGet("/contratacoes/terceirizados/csv", "csv"); }
async function admJovensAprendizes() { return admGet("/contratacoes/menores_aprendizes"); }

// ──────────────────── SERVIDORES ────────────────────
async function admEstagiarios() { return admGet("/servidores/estagiarios/csv", "csv"); }
async function admPensionistas() { return admGet("/servidores/pensionistas/csv", "csv"); }
async function admPrevisaoAposentadoria() { return admGet("/servidores/previsao-aposentadoria/csv", "csv"); }

// ──────────────────── TRANSPARÊNCIA FINANCEIRA ────────────────────
async function admDespesas(ano?: string) {
  const path = ano ? `/financeiro/despesas/${ano}/csv` : "/financeiro/despesas/csv";
  return admGet(path, "csv");
}
async function admDiarias(ano?: string) {
  const path = ano ? `/financeiro/diarias/${ano}/csv` : "/financeiro/diarias/csv";
  return admGet(path, "csv");
}
async function admPassagens(ano?: string) {
  const path = ano ? `/financeiro/passagens/${ano}/csv` : "/financeiro/passagens/csv";
  return admGet(path, "csv");
}
async function admCeaps(ano?: string) {
  const path = ano ? `/senadores/ceaps/${ano}/csv` : "/senadores/ceaps/csv";
  return admGet(path, "csv");
}
async function admFolhaPagamento(mesAno?: string) {
  const path = mesAno ? `/servidores/folha-pagamento/${mesAno}/csv` : "/servidores/folha-pagamento/csv";
  return admGet(path, "csv");
}

// ═══════════════════════════════════════════════════════════════
// CÂMARA DOS DEPUTADOS — Endpoints
// ═══════════════════════════════════════════════════════════════

async function camaraProposicoes(params: Record<string, string>) {
  return camaraGet("/proposicoes", { ordem: "DESC", ordenarPor: "ano", itens: "15", ...params });
}
async function camaraProposicaoDetalhe(id: string) { return camaraGet(`/proposicoes/${id}`); }
async function camaraDeputados(params: Record<string, string> = {}) {
  return camaraGet("/deputados", { itens: "15", ordem: "ASC", ordenarPor: "nome", ...params });
}
async function camaraDeputadoDetalhe(id: string) { return camaraGet(`/deputados/${id}`); }
async function camaraVotacoes(params: Record<string, string>) {
  return camaraGet("/votacoes", { itens: "15", ordem: "DESC", ordenarPor: "dataHoraRegistro", ...params });
}
async function camaraEventos(params: Record<string, string>) {
  return camaraGet("/eventos", { itens: "15", ordem: "DESC", ordenarPor: "dataHoraInicio", ...params });
}

// ─── LexML Search — Multi-strategy: SRU → HTML Scraping → Catálogo Local ───
// Strategy 1: LexML SRU/CQL (padrão Z39.50/SRU)
// Strategy 2: Scraping da página de busca HTML do portal LexML
// Strategy 3: Catálogo local expandido (fallback offline)

const LEXML_CATALOG = [
  { title: "Código Penal", urn: "urn:lex:br:federal:decreto.lei:1940-12-07;2848", date: "07/12/1940", keywords: ["penal","crime","pena","código penal","homicídio","furto","roubo"] },
  { title: "Código de Processo Penal", urn: "urn:lex:br:federal:decreto.lei:1941-10-03;3689", date: "03/10/1941", keywords: ["processo penal","cpp","inquérito","denúncia"] },
  { title: "Código Civil", urn: "urn:lex:br:federal:lei:2002-01-10;10406", date: "10/01/2002", keywords: ["civil","código civil","cc","contrato","propriedade","obrigação","família"] },
  { title: "Código de Processo Civil", urn: "urn:lex:br:federal:lei:2015-03-16;13105", date: "16/03/2015", keywords: ["processo civil","cpc","petição","recurso","apelação"] },
  { title: "Constituição Federal de 1988", urn: "urn:lex:br:federal:constituicao:1988-10-05;1988", date: "05/10/1988", keywords: ["constituição","cf","constitucional","fundamental","direitos"] },
  { title: "Código de Defesa do Consumidor", urn: "urn:lex:br:federal:lei:1990-09-11;8078", date: "11/09/1990", keywords: ["consumidor","cdc","fornecedor","produto","serviço"] },
  { title: "Consolidação das Leis do Trabalho", urn: "urn:lex:br:federal:decreto.lei:1943-05-01;5452", date: "01/05/1943", keywords: ["trabalho","trabalhista","clt","empregado","rescisão","férias"] },
  { title: "Estatuto da Criança e do Adolescente", urn: "urn:lex:br:federal:lei:1990-07-13;8069", date: "13/07/1990", keywords: ["criança","adolescente","eca","menor","guarda","adoção"] },
  { title: "Lei de Execução Penal", urn: "urn:lex:br:federal:lei:1984-07-11;7210", date: "11/07/1984", keywords: ["execução penal","preso","pena","progressão","regime"] },
  { title: "Lei Maria da Penha", urn: "urn:lex:br:federal:lei:2006-08-07;11340", date: "07/08/2006", keywords: ["maria da penha","violência doméstica","mulher","medida protetiva"] },
  { title: "Código Tributário Nacional", urn: "urn:lex:br:federal:lei:1966-10-25;5172", date: "25/10/1966", keywords: ["tributário","tributo","imposto","ctn","fiscal","taxa"] },
  { title: "Lei de Licitações", urn: "urn:lex:br:federal:lei:2021-04-01;14133", date: "01/04/2021", keywords: ["licitação","licitações","contrato administrativo","pregão"] },
  { title: "LGPD", urn: "urn:lex:br:federal:lei:2018-08-14;13709", date: "14/08/2018", keywords: ["lgpd","dados pessoais","privacidade","proteção de dados"] },
  { title: "Marco Civil da Internet", urn: "urn:lex:br:federal:lei:2014-04-23;12965", date: "23/04/2014", keywords: ["internet","marco civil","digital","rede","neutralidade"] },
  { title: "Estatuto do Idoso", urn: "urn:lex:br:federal:lei:2003-10-01;10741", date: "01/10/2003", keywords: ["idoso","envelhecimento","pessoa idosa"] },
  { title: "Lei de Improbidade Administrativa", urn: "urn:lex:br:federal:lei:1992-06-02;8429", date: "02/06/1992", keywords: ["improbidade","administrativa","agente público","enriquecimento ilícito"] },
  { title: "Código Penal Militar", urn: "urn:lex:br:federal:decreto.lei:1969-10-21;1001", date: "21/10/1969", keywords: ["penal militar","militar","deserção"] },
  { title: "Lei de Drogas", urn: "urn:lex:br:federal:lei:2006-08-23;11343", date: "23/08/2006", keywords: ["drogas","entorpecente","tráfico","porte"] },
  { title: "Código de Trânsito Brasileiro", urn: "urn:lex:br:federal:lei:1997-09-23;9503", date: "23/09/1997", keywords: ["trânsito","ctb","veículo","motorista","infração"] },
  { title: "Lei de Falências", urn: "urn:lex:br:federal:lei:2005-02-09;11101", date: "09/02/2005", keywords: ["falência","recuperação judicial","insolvência","credor"] },
  { title: "Lei de Juizados Especiais", urn: "urn:lex:br:federal:lei:1995-09-26;9099", date: "26/09/1995", keywords: ["juizado especial","pequenas causas","conciliação"] },
  { title: "Lei de Arbitragem", urn: "urn:lex:br:federal:lei:1996-09-23;9307", date: "23/09/1996", keywords: ["arbitragem","árbitro","sentença arbitral"] },
  { title: "Lei do Inquilinato", urn: "urn:lex:br:federal:lei:1991-10-18;8245", date: "18/10/1991", keywords: ["locação","aluguel","despejo","inquilino","inquilinato"] },
  { title: "Lei de Registros Públicos", urn: "urn:lex:br:federal:lei:1973-12-31;6015", date: "31/12/1973", keywords: ["registro","imóvel","matrícula","cartório"] },
  { title: "Lei Anticrime", urn: "urn:lex:br:federal:lei:2019-12-24;13964", date: "24/12/2019", keywords: ["anticrime","acordo de não persecução","juiz de garantias"] },
  { title: "Estatuto da Pessoa com Deficiência", urn: "urn:lex:br:federal:lei:2015-07-06;13146", date: "06/07/2015", keywords: ["deficiência","inclusão","acessibilidade","pessoa com deficiência"] },
  { title: "Lei de Acesso à Informação", urn: "urn:lex:br:federal:lei:2011-11-18;12527", date: "18/11/2011", keywords: ["acesso à informação","transparência","LAI"] },
  { title: "Lei Anticorrupção", urn: "urn:lex:br:federal:lei:2013-08-01;12846", date: "01/08/2013", keywords: ["anticorrupção","compliance","pessoa jurídica"] },
  { title: "Reforma Trabalhista", urn: "urn:lex:br:federal:lei:2017-07-13;13467", date: "13/07/2017", keywords: ["reforma trabalhista","teletrabalho","intermitente"] },
  { title: "Lei dos Crimes Ambientais", urn: "urn:lex:br:federal:lei:1998-02-12;9605", date: "12/02/1998", keywords: ["crime ambiental","meio ambiente","poluição","fauna","flora"] },
  { title: "Código Florestal", urn: "urn:lex:br:federal:lei:2012-05-25;12651", date: "25/05/2012", keywords: ["florestal","APP","reserva legal","desmatamento"] },
  { title: "Lei de Migração", urn: "urn:lex:br:federal:lei:2017-05-24;13445", date: "24/05/2017", keywords: ["migração","estrangeiro","refúgio","visto"] },
  { title: "Lei Orgânica da Assistência Social", urn: "urn:lex:br:federal:lei:1993-12-07;8742", date: "07/12/1993", keywords: ["assistência social","BPC","LOAS","benefício"] },
  { title: "Estatuto da Igualdade Racial", urn: "urn:lex:br:federal:lei:2010-07-20;12288", date: "20/07/2010", keywords: ["igualdade racial","racismo","discriminação"] },
  { title: "Lei do Mandado de Segurança", urn: "urn:lex:br:federal:lei:2009-08-07;12016", date: "07/08/2009", keywords: ["mandado de segurança","direito líquido"] },
  { title: "Código Eleitoral", urn: "urn:lex:br:federal:lei:1965-07-15;4737", date: "15/07/1965", keywords: ["eleição","voto","partido","eleitoral"] },
  { title: "Lei de Sociedades por Ações", urn: "urn:lex:br:federal:lei:1976-12-15;6404", date: "15/12/1976", keywords: ["sociedade anônima","ações","S.A.","empresa"] },
  { title: "Lei de Execução Fiscal", urn: "urn:lex:br:federal:lei:1980-09-22;6830", date: "22/09/1980", keywords: ["execução fiscal","dívida ativa","CDA"] },
  { title: "Lei do Processo Administrativo Federal", urn: "urn:lex:br:federal:lei:1999-01-29;9784", date: "29/01/1999", keywords: ["processo administrativo","ato administrativo"] },
  { title: "LINDB", urn: "urn:lex:br:federal:decreto.lei:1942-09-04;4657", date: "04/09/1942", keywords: ["LINDB","introdução","normas","vigência","aplicação da lei"] },
  { title: "Lei da Lavagem de Dinheiro", urn: "urn:lex:br:federal:lei:1998-03-03;9613", date: "03/03/1998", keywords: ["lavagem de dinheiro","COAF","branqueamento"] },
  { title: "Lei das Organizações Criminosas", urn: "urn:lex:br:federal:lei:2013-08-02;12850", date: "02/08/2013", keywords: ["organização criminosa","colaboração premiada","delação"] },
  { title: "Lei de Abuso de Autoridade", urn: "urn:lex:br:federal:lei:2019-09-05;13869", date: "05/09/2019", keywords: ["abuso de autoridade","agente público"] },
  { title: "Lei do Habeas Data", urn: "urn:lex:br:federal:lei:1997-11-12;9507", date: "12/11/1997", keywords: ["habeas data","informação pessoal"] },
  { title: "Reforma da Previdência", urn: "urn:lex:br:federal:emenda.constitucional:2019-11-12;103", date: "12/11/2019", keywords: ["previdência","aposentadoria","EC 103","idade mínima"] },
  { title: "Lei de Benefícios do INSS", urn: "urn:lex:br:federal:lei:1991-07-24;8213", date: "24/07/1991", keywords: ["INSS","aposentadoria","auxílio-doença","pensão por morte","BPC"] },
  { title: "Ação Civil Pública", urn: "urn:lex:br:federal:lei:1985-07-24;7347", date: "24/07/1985", keywords: ["ação civil pública","interesse difuso","coletivo"] }
];

// Strategy 1: LexML SRU (Z39.50 over HTTP)
async function lexmlSRU(query: string, maxRecords = 10): Promise<any[]> {
  const sruUrl = `https://www.lexml.gov.br/busca/SRU?operation=searchRetrieve&version=1.1&query=${encodeURIComponent(query)}&maximumRecords=${maxRecords}&recordSchema=lexml`;
  try {
    const res = await fetch(sruUrl, { 
      signal: AbortSignal.timeout(8000),
      headers: { "Accept": "application/xml, text/xml", "User-Agent": "DHAdvocacia-Neural/10.0" },
    });
    if (!res.ok) throw new Error(`SRU ${res.status}`);
    const xml = await res.text();
    
    const results: any[] = [];
    const recordRegex = /<srw:recordData>([\s\S]*?)<\/srw:recordData>/g;
    let match;
    while ((match = recordRegex.exec(xml)) !== null && results.length < maxRecords) {
      const rec = match[1];
      const title = rec.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/)?.[1]?.trim().replace(/<[^>]*>/g, '');
      const desc = rec.match(/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/)?.[1]?.trim().replace(/<[^>]*>/g, '');
      const identifier = rec.match(/<dc:identifier[^>]*>([\s\S]*?)<\/dc:identifier>/)?.[1]?.trim();
      const date = rec.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/)?.[1]?.trim();
      const type = rec.match(/<dc:type[^>]*>([\s\S]*?)<\/dc:type>/)?.[1]?.trim();
      if (title) {
        results.push({
          title, content: desc || `${title} — LexML Brasil`, identifier,
          date: date || "", type: type || "Legislação",
          url: identifier ? `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(title)}` : "",
          strategy: "sru",
        });
      }
    }
    if (results.length > 0) {
      console.log(`[lexml:sru] Found ${results.length} results for "${query}"`);
      return results;
    }
  } catch (e) { console.warn(`[lexml:sru] Failed:`, e); }
  return [];
}

// Strategy 2: Scrape LexML HTML search page (works with 300k+ documents)
async function lexmlHTMLScrape(query: string, maxRecords = 10): Promise<any[]> {
  const searchUrl = `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(12000),
      headers: { 
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; DHAdvocacia-Neural/10.0)",
      },
    });
    if (!res.ok) throw new Error(`HTML ${res.status}`);
    const html = await res.text();
    
    const results: any[] = [];
    // Pattern: links to /urn/ with title text — this is the main result pattern
    const urnRegex = /\[([^\]]+)\]\(https:\/\/www\.lexml\.gov\.br\/urn\/(urn:lex:[^\)]+)\)/g;
    // Fallback: raw HTML <a href="/urn/...">Title</a>
    const htmlUrnRegex = /<a[^>]*href="(?:https:\/\/www\.lexml\.gov\.br)?\/urn\/(urn:lex:[^"]+)"[^>]*>([^<]+)<\/a>/gi;
    
    // Try markdown-style first (from fetched content)
    let m;
    const seen = new Set<string>();
    while ((m = htmlUrnRegex.exec(html)) !== null && results.length < maxRecords) {
      const urn = m[1];
      const title = m[2].trim();
      if (title.length > 3 && !seen.has(urn)) {
        seen.add(urn);
        // Extract type and date from surrounding context
        const tipo = urn.includes('jurisprud') ? 'Jurisprudência' : 'Legislação';
        results.push({
          title, content: `${title} — LexML Brasil`,
          identifier: urn, date: '', type: tipo,
          url: `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(title)}`, strategy: 'html_scrape',
        });
      }
    }
    
    if (results.length > 0) {
      console.log(`[lexml:html] Found ${results.length} results for "${query}"`);
      return results;
    }
  } catch (e) { console.warn(`[lexml:html] Failed:`, e); }
  return [];
}

// Strategy 3: Local catalog with scoring (always works offline)
function lexmlCatalogSearch(query: string, maxRecords = 10): any[] {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const terms = q.split(/\s+/).filter(t => t.length > 2);
  
  const scored = LEXML_CATALOG.map(item => {
    const itemText = (item.title + " " + item.keywords.join(" ")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let score = 0;
    for (const term of terms) {
      if (itemText.includes(term)) score += 2;
    }
    for (const kw of item.keywords) {
      const kwNorm = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (q.includes(kwNorm) || kwNorm.includes(q)) score += 5;
    }
    return { ...item, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, maxRecords);

  return scored.map(item => ({
    title: item.title, content: `${item.title} — Legislação Federal Brasileira`,
    identifier: item.urn, date: item.date, type: "Legislação",
    url: `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(item.title)}`, strategy: "catalog",
  }));
}

// Master function: tries all strategies in order
async function searchLexML(query: string, maxRecords = 10): Promise<any[]> {
  // Try SRU first (fastest when available)
  const sruResults = await lexmlSRU(query, maxRecords);
  if (sruResults.length > 0) return sruResults;

  // Try HTML scraping as fallback
  const htmlResults = await lexmlHTMLScrape(query, maxRecords);
  if (htmlResults.length > 0) return htmlResults;

  // Fallback to local catalog (always works)
  const catalogResults = lexmlCatalogSearch(query, maxRecords);
  
  const searchUrl = `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(query)}`;
  
  // Always add portal search links
  catalogResults.push({
    title: `🔍 Buscar "${query}" no LexML Brasil (170.000+ documentos)`,
    content: "Clique para abrir a busca completa no portal LexML com legislação, jurisprudência e doutrina.",
    identifier: "", date: "", type: "Busca", url: searchUrl, strategy: "portal_link",
  });

  console.log(`[lexml] Catalog fallback for "${query}": ${catalogResults.length} results`);
  return catalogResults;
}

// ═══════════════════════════════════════════════════════════════
// BUSCA UNIFICADA: Senado + Câmara + LexML
// ═══════════════════════════════════════════════════════════════

interface LegislacaoResult {
  source: string; sourceLabel: string; title: string; content: string;
  url: string; date: string; tipo: string; metadata: Record<string, unknown>;
}

async function buscaUnificadaLegislacao(query: string): Promise<LegislacaoResult[]> {
  const results: LegislacaoResult[] = [];
  const settled = await Promise.allSettled([
    (async () => {
      const data = await legislacaoLista({ palavraChave: query });
      const normas = data?.PesquisaLegislacao?.Normas?.Norma || data?.ListaLegislacao?.Legislacao?.Norma || [];
      const list = Array.isArray(normas) ? normas : [normas];
      list.filter(Boolean).slice(0, 10).forEach((n: any) => {
        results.push({
          source: "senado_legislacao", sourceLabel: "Senado Federal - Legislação",
          title: n.DescricaoIdentificacao || `${n.SiglaTipoNorma || ""} ${n.NumeroNorma || ""}/${n.AnoNorma || ""}`.trim(),
          content: n.Ementa || n.TextoAssociado || "", url: n.UrlTextoAssociado || `https://legis.senado.leg.br/norma/${n.CodigoNorma || ""}`,
          date: n.DataNorma || "", tipo: "lei", metadata: { codigo: n.CodigoNorma, tipo: n.SiglaTipoNorma },
        });
      });
    })(),
    (async () => {
      const data = await camaraProposicoes({ keywords: query });
      (data?.dados || []).slice(0, 10).forEach((p: any) => {
        results.push({
          source: "camara_proposicoes", sourceLabel: "Câmara dos Deputados",
          title: `${p.siglaTipo} ${p.numero}/${p.ano}`, content: p.ementa || "",
          url: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}`,
          date: p.dataApresentacao || "", tipo: "proposicao", metadata: { id: p.id },
        });
      });
    })(),
    (async () => {
      const lexmlResults = await searchLexML(query, 10);
      lexmlResults.forEach((r) => {
        results.push({
          source: "lexml", sourceLabel: "LexML Brasil",
          title: r.title, content: r.content, url: r.url, date: r.date,
          tipo: r.type?.includes("Jurisprud") ? "jurisprudencia" : "lei",
          metadata: { identifier: r.identifier },
        });
      });
    })(),
    (async () => {
      try {
        const data = await processoLista({ sigla: query.toUpperCase().split(" ")[0] });
        const processos = data?.ListaProcessos?.Processos?.Processo || [];
        const list = Array.isArray(processos) ? processos : [processos];
        list.filter(Boolean).slice(0, 5).forEach((p: any) => {
          results.push({
            source: "senado_processo", sourceLabel: "Senado Federal - Processo",
            title: p.Identificacao || "Processo", content: p.Ementa || "",
            url: p.UrlDetalhe || "", date: p.DataApresentacao || "", tipo: "processo_legislativo",
            metadata: { id: p.CodigoMateria },
          });
        });
      } catch { /* sigla format miss */ }
    })()
  ]);
  settled.forEach((s, i) => {
    if (s.status === "rejected") console.warn(`[busca] source ${i} error:`, s.reason);
  });
  return results;
}

// ─── Auto-index to neural knowledge base ───

async function indexToNeuralKnowledge(supabase: any, results: LegislacaoResult[], userId: string, query: string): Promise<number> {
  if (results.length === 0) return 0;
  let indexed = 0;
  for (const r of results) {
    try {
      const { error } = await supabase.from("neural_knowledge_base").upsert({
        title: r.title, content: `[${r.sourceLabel}] ${r.content}\nFonte: ${r.url}\nData: ${r.date}`,
        source_type: r.source, source_reference: r.url || `${r.source}/${r.title}`,
        tags: ["legislacao", r.tipo, r.source, query.toLowerCase().split(" ")[0]].filter(Boolean),
        user_id: userId, is_processed: false,
      }, { onConflict: "source_reference,user_id", ignoreDuplicates: true });
      if (!error) indexed++;
    } catch { /* dup */ }
  }
  return indexed;
}

async function indexToLegalEmbeddings(supabase: any, results: LegislacaoResult[], query: string): Promise<number> {
  if (results.length === 0) return 0;
  const titles = results.map(r => r.title);
  const { data: existing } = await supabase.from("legal_embeddings").select("title, source").in("title", titles);
  const existingSet = new Set((existing || []).map((e: any) => `${e.title}::${e.source}`));
  const newItems = results.filter(r => !existingSet.has(`${r.title}::${r.source}`)).map(r => ({
    title: r.title, content: r.content.substring(0, 5000), source: r.source, source_label: r.sourceLabel,
    content_type: r.tipo, url: r.url, published_date: r.date || null, metadata: r.metadata, query_origin: query,
  }));
  if (newItems.length === 0) return 0;
  const { error } = await supabase.from("legal_embeddings").insert(newItems);
  if (error) { console.warn("embeddings insert:", error); return 0; }
  return newItems.length;
}

// ═══════════════════════════════════════════════════════════════
// INGESTÃO EM MASSA
// ═══════════════════════════════════════════════════════════════

async function ingestCatalogoLeis(supabase: any, userId: string, areas?: string[]): Promise<{ total: number; indexed: number; errors: string[] }> {
  const leis = areas?.length ? CATALOGO_LEIS.filter(l => areas.includes(l.area)) : CATALOGO_LEIS;
  let indexed = 0;
  const errors: string[] = [];
  for (const lei of leis) {
    try {
      const { error } = await supabase.from("neural_knowledge_base").upsert({
        title: lei.nome, content: `[${lei.sigla}] ${lei.descricao}\nÁrea: ${lei.area}\nURL: ${lei.url}`,
        source_type: "catalogo_leis", source_reference: lei.url,
        tags: ["legislacao", lei.area, lei.sigla.toLowerCase(), ...lei.palavrasChave.slice(0, 3)],
        user_id: userId, is_processed: false,
      }, { onConflict: "source_reference,user_id", ignoreDuplicates: true });
      if (error) { errors.push(`${lei.sigla}: ${error.message}`); continue; }
      const { data: ex } = await supabase.from("legal_embeddings").select("id").eq("title", lei.nome).eq("source", "catalogo_leis").maybeSingle();
      if (!ex) {
        await supabase.from("legal_embeddings").insert({
          title: lei.nome, content: `${lei.descricao}\nSigla: ${lei.sigla}\nÁrea: ${lei.area}`,
          source: "catalogo_leis", source_label: "Catálogo de Leis Brasileiras",
          content_type: "legislacao", url: lei.url,
          metadata: { sigla: lei.sigla, area: lei.area, tipo: lei.tipo }, query_origin: "catalogo_completo",
        });
      }
      indexed++;
    } catch (e) { errors.push(`${lei.sigla}: ${e instanceof Error ? e.message : "err"}`); }
  }
  // Enrich from Senado (fire and forget)
  const promises = leis.slice(0, 15).map(async (lei) => {
    try {
      const params: Record<string, string> = {};
      if (lei.numero) params.numero = lei.numero;
      if (lei.ano) params.ano = lei.ano;
      if (Object.keys(params).length === 0) params.palavraChave = lei.sigla;
      const data = await legislacaoLista(params);
      const normas = data?.PesquisaLegislacao?.Normas?.Norma || data?.ListaLegislacao?.Legislacao?.Norma || [];
      const list = Array.isArray(normas) ? normas : [normas];
      for (const n of list.filter(Boolean).slice(0, 3)) {
        const ementa = n.Ementa || n.TextoAssociado || "";
        if (!ementa) continue;
        await supabase.from("legal_embeddings").upsert({
          title: n.DescricaoIdentificacao || `${n.SiglaTipoNorma} ${n.NumeroNorma}/${n.AnoNorma}`,
          content: ementa.substring(0, 5000), source: "senado_legislacao_enriquecida",
          source_label: "Senado Federal - Enriquecida", content_type: "legislacao",
          url: n.UrlTextoAssociado || `https://legis.senado.leg.br/norma/${n.CodigoNorma || ""}`,
          published_date: n.DataNorma || null, metadata: { area: lei.area, sigla_ref: lei.sigla },
          query_origin: `catalogo_${lei.sigla}`,
        }, { onConflict: "title,source", ignoreDuplicates: true });
      }
    } catch { /* enrichment fail ok */ }
  });
  await Promise.allSettled(promises);
  return { total: leis.length, indexed, errors };
}

// ═══════════════════════════════════════════════════════════════
// ACTION ROUTER — Maps ALL actions to their functions
// ═══════════════════════════════════════════════════════════════

const SENADO_ACTIONS: Record<string, (body: any) => Promise<any>> = {
  // Comissão
  comissao_detalhe: (b) => comissaoDetalhe(b.codigo),
  comissao_agenda_periodo: (b) => comissaoAgendaPeriodo(b.dataInicio, b.dataFim),
  comissao_agenda_data: (b) => comissaoAgendaData(b.data),
  comissao_agenda_mes: (b) => comissaoAgendaMes(b.mes),
  comissao_cpi_requerimentos: (b) => comissaoCpiRequerimentos(b.sigla, b.pagina, b.tamanho),
  comissao_lista: (b) => comissaoLista(b.tipo || "permanente"),
  comissao_lista_colegiados: () => comissaoListaColegiados(),
  comissao_lista_mistas: () => comissaoListaMistas(),
  comissao_lista_tipos_colegiado: () => comissaoListaTiposColegiado(),
  comissao_reuniao_detalhe: (b) => comissaoReuniaoDetalhe(b.codigo),
  comissao_reuniao_notas: (b) => comissaoReuniaoNotas(b.codigo),
  // Composição
  composicao_bloco: (b) => composicaoBloco(b.codigo),
  composicao_comissao: (b) => composicaoComissao(b.codigo),
  composicao_comissao_mista: (b) => composicaoComissaoMista(b.codigo),
  composicao_lideranca: () => composicaoLideranca(),
  composicao_lideranca_tipos: () => composicaoLiderancaTipos(),
  composicao_lideranca_tipos_unidade: () => composicaoLiderancaTiposUnidade(),
  composicao_lista_tipo: (b) => composicaoListaPorTipo(b.tipo || "permanente"),
  composicao_blocos: () => composicaoBlocos(),
  composicao_lista_cn: (b) => composicaoListaCN(b.tipo || "permanente"),
  composicao_partidos: () => composicaoPartidos(),
  composicao_tipos_cargo: () => composicaoTiposCargo(),
  composicao_mesa_cn: () => composicaoMesaCN(),
  composicao_mesa_sf: () => composicaoMesaSF(),
  // Discurso / Taquigrafia
  discurso_texto_integral: (b) => discursoTextoIntegral(b.codigo),
  senador_apartes: (b) => senadorApartes(b.codigo),
  senador_discursos: (b) => senadorDiscursos(b.codigo),
  senador_tipos_uso_palavra: () => senadorTiposUsoPalavra(),
  taquigrafia_notas_reuniao: (b) => taquigrafiaNotasReuniao(b.id),
  taquigrafia_notas_sessao: (b) => taquigrafiaNotasSessao(b.id),
  taquigrafia_videos_reuniao: (b) => taquigrafiaVideosReuniao(b.id),
  taquigrafia_videos_sessao: (b) => taquigrafiaVideosSessao(b.id),
  // Legislação
  senado_legislacao_lista: (b) => legislacaoLista(b.params || b),
  senado_legislacao_detalhe: (b) => legislacaoDetalhe(b.codigo),
  senado_legislacao_identificacao: (b) => legislacaoPorId(b.tipo, b.numdata, b.anoseq),
  senado_legislacao_classes: () => legislacaoClasses(),
  senado_legislacao_termos: (b) => legislacaoTermos(b.params || {}),
  senado_legislacao_tipos_declaracao: () => legislacaoTiposDeclaracao(),
  senado_tipos_norma: () => legislacaoTiposNorma(),
  senado_legislacao_tipos_publicacao: () => legislacaoTiposPublicacao(),
  senado_legislacao_tipos_vide: () => legislacaoTiposVide(),
  senado_legislacao_urn: (b) => legislacaoUrn(b.urn),
  // Orçamento
  orcamento_lista: () => orcamentoLista(),
  orcamento_oficios: () => orcamentoOficios(),
  orcamento_oficio_detalhe: (b) => orcamentoOficioDetalhe(b.numero),
  // Parlamentar (Senador)
  senado_senadores: () => senadorListaAtual(),
  senado_senador_detalhe: (b) => senadorDetalhe(b.codigo),
  senador_autorias: (b) => senadorAutorias(b.codigo),
  senador_cargos: (b) => senadorCargos(b.codigo),
  senador_comissoes: (b) => senadorComissoes(b.codigo),
  senador_filiacoes: (b) => senadorFiliacoes(b.codigo),
  senador_historico_academico: (b) => senadorHistoricoAcademico(b.codigo),
  senador_licencas: (b) => senadorLicencas(b.codigo),
  senador_mandatos: (b) => senadorMandatos(b.codigo),
  senador_profissao: (b) => senadorProfissao(b.codigo),
  senador_relatorias: (b) => senadorRelatorias(b.codigo),
  senador_votacoes_parlamentar: (b) => senadorVotacoes(b.codigo),
  senador_afastados: () => senadorAfastados(),
  senador_lista_legislatura: (b) => senadorListaLegislatura(b.legislatura),
  senador_lista_legislatura_intervalo: (b) => senadorListaLegislaturaIntervalo(b.inicio, b.fim),
  senador_partidos: () => senadorPartidos(),
  autor_lista_atual: () => autorListaAtual(),
  // Plenário
  senado_plenario: (b) => plenarioAgendaDia(b.data || new Date().toISOString().split("T")[0].replace(/-/g, "")),
  plenario_agenda_dia: (b) => plenarioAgendaDia(b.data),
  plenario_agenda_mes: (b) => plenarioAgendaMes(b.data),
  plenario_agenda_cn: (b) => plenarioAgendaCN(b.data),
  plenario_agenda_cn_periodo: (b) => plenarioAgendaCNPeriodo(b.inicio, b.fim),
  plenario_agenda_ical: () => plenarioAgendaIcal(),
  plenario_encontro: (b) => plenarioEncontro(b.codigo),
  plenario_encontro_pauta: (b) => plenarioEncontroPauta(b.codigo),
  plenario_encontro_resultado: (b) => plenarioEncontroResultado(b.codigo),
  plenario_encontro_resumo: (b) => plenarioEncontroResumo(b.codigo),
  plenario_legislatura: (b) => plenarioLegislatura(b.data),
  plenario_discursos: (b) => plenarioDiscursos(b.dataInicio, b.dataFim),
  plenario_legislaturas: () => plenarioLegislaturas(),
  plenario_tipos_comparecimento: () => plenarioTiposComparecimento(),
  plenario_resultado: (b) => plenarioResultado(b.data),
  plenario_resultado_cn: (b) => plenarioResultadoCN(b.data),
  plenario_resultado_mes: (b) => plenarioResultadoMes(b.data),
  plenario_resultado_veto: (b) => plenarioResultadoVeto(b.codigo),
  plenario_resultado_veto_dispositivo: (b) => plenarioResultadoVetoDispositivo(b.codigo),
  plenario_resultado_veto_materia: (b) => plenarioResultadoVetoMateria(b.codigo),
  plenario_tipos_sessao: () => plenarioTiposSessao(),
  plenario_orientacao_periodo: (b) => plenarioOrientacaoPeriodo(b.dataInicio, b.dataFim),
  plenario_orientacao_data: (b) => plenarioOrientacaoData(b.data),
  // Processo Legislativo (v3)
  senado_processos: (b) => processoLista(b.params || {}),
  senado_processo_detalhe: (b) => processoDetalhe(b.id),
  processo_assuntos: () => processoAssuntos(),
  processo_classes: () => processoClasses(),
  processo_destinos: () => processoDestinos(),
  processo_documento: (b) => processoDocumento(b.params || {}),
  processo_documento_tipos: () => processoDocumentoTipos(),
  processo_documento_tipos_conteudo: () => processoDocumentoTiposConteudo(),
  processo_emenda: (b) => processoEmenda(b.params || {}),
  processo_entes: () => processoEntes(),
  processo_prazo: (b) => processoPrazo(b.params || {}),
  processo_prazo_tipos: () => processoPrazoTipos(),
  processo_relatoria: (b) => processoRelatoria(b.params || {}),
  processo_siglas: () => processoSiglas(),
  processo_tipos_atualizacao: () => processoTiposAtualizacao(),
  processo_tipos_autor: () => processoTiposAutor(),
  processo_tipos_decisao: () => processoTiposDecisao(),
  processo_tipos_situacao: () => processoTiposSituacao(),
  // Votação
  senado_votacoes: (b) => votacao(b.params || {}),
  votacao_comissao: (b) => votacaoComissao(b.sigla, b.params || {}),
  votacao_comissao_materia: (b) => votacaoComissaoMateria(b.sigla, b.numero, b.ano, b.params || {}),
  votacao_comissao_parlamentar: (b) => votacaoComissaoParlamentar(b.codigo, b.params || {}),
  // Matéria (legacy + active per v3 docs)
  materia_lista_tramitacao: () => materiaListaTramitacao(),
  materia_vetos: (b) => materiaVetos(b.ano),
  materia_distribuicao_autoria: (b) => materiaDistribuicaoAutoria(b.params || {}),
  materia_distribuicao_relatoria: (b) => materiaDistribuicaoRelatoria(b.sigla),
  materia_detalhe: (b) => materiaDetalhe(b.codigo),
  materia_detalhe_sigla: (b) => materiaDetalheSigla(b.sigla, b.numero, b.ano, b.comissao),
  materia_votacoes: (b) => materiaVotacoes(b.codigo),
  materia_movimentacoes: (b) => materiaMovimentacoes(b.codigo, b.dataref),
  materia_documentos: (b) => materiaDocumentos(b.codigo),
  materia_situacao_atual: (b) => materiaSituacaoAtual(b.codigo),
  materia_situacao_tramitacao: (b) => materiaSituacaoTramitacao(b.data),
  materia_relatorias: (b) => materiaRelatorias(b.codigo),
  materia_ordia: (b) => materiaOrdia(b.codigo),
  materia_pesquisa_lista: (b) => materiaPesquisaLista(b.params || {}),
  materia_lista_comissao: (b) => materiaListaComissao(b.params || {}),
  materia_lista_prazo: (b) => materiaListaPrazo(b.codPrazo, b.params || {}),
  materia_subtipos: () => materiaSubtipos(),
  materia_situacoes: () => materiaSituacoes(),
  materia_classes: () => materiaClasses(),
  materia_locais: () => materiaLocais(),
  materia_tipos_emendas: () => materiaTiposEmendas(),
  materia_tipos_prazo: () => materiaTiposPrazo(),
  materia_tipos_natureza: () => materiaTiposNatureza(),
  materia_tipos_turno_apresentacao: () => materiaTiposTurnoApresentacao(),
  materia_tipos_atualizacoes: () => materiaTiposAtualizacoes(),
  // Legacy aliases
  senado_classes: () => legislacaoClasses(),
  senado_mesa: () => composicaoMesaSF(),
  senado_liderancas: () => composicaoLideranca(),
  senado_blocos: () => composicaoBlocos(),
  senado_partidos: () => composicaoPartidos(),
  senado_comissoes: (b) => comissaoLista(b.tipo || "permanente"),
};

const CAMARA_ACTIONS: Record<string, (body: any) => Promise<any>> = {
  camara_proposicoes: (b) => camaraProposicoes(b.params || {}),
  camara_proposicao_detalhe: (b) => camaraProposicaoDetalhe(b.id),
  camara_deputados: (b) => camaraDeputados(b.params || {}),
  camara_deputado_detalhe: (b) => camaraDeputadoDetalhe(b.id),
  camara_votacoes: (b) => camaraVotacoes(b.params || {}),
  camara_eventos: (b) => camaraEventos(b.params || {}),
};

const ADM_ACTIONS: Record<string, (body: any) => Promise<any>> = {
  // Contratações
  adm_licitacoes: () => admLicitacoes(),
  adm_contratos: () => admContratos(),
  adm_notas_empenho: () => admNotasEmpenho(),
  adm_atas_registro_preco: () => admAtasRegistroPreco(),
  adm_empresas: () => admEmpresas(),
  adm_terceirizados: () => admTerceirizados(),
  adm_jovens_aprendizes: () => admJovensAprendizes(),
  // Servidores
  adm_estagiarios: () => admEstagiarios(),
  adm_pensionistas: () => admPensionistas(),
  adm_previsao_aposentadoria: () => admPrevisaoAposentadoria(),
  // Transparência Financeira
  adm_despesas: (b) => admDespesas(b.ano),
  adm_diarias: (b) => admDiarias(b.ano),
  adm_passagens: (b) => admPassagens(b.ano),
  adm_ceaps: (b) => admCeaps(b.ano),
  adm_folha_pagamento: (b) => admFolhaPagamento(b.mesAno),
};

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json();
    const { action } = body;

    // ── Catálogo ──
    if (action === "catalogo") {
      const leis = body.area ? CATALOGO_LEIS.filter(l => l.area === body.area) : CATALOGO_LEIS;
      return json({ success: true, total: leis.length, areas: [...new Set(CATALOGO_LEIS.map(l => l.area))].sort(), leis: leis.map(l => ({ sigla: l.sigla, nome: l.nome, area: l.area, tipo: l.tipo, url: l.url })) });
    }

    // ── Ingestão em massa ──
    if (action === "ingest_codigos" || action === "ingest_catalogo") {
      if (!userId) return json({ error: "Autenticação necessária" }, 401);
      const result = await ingestCatalogoLeis(supabase, userId, body.areas);
      return json({ success: true, ...result });
    }

    // ── Plenário iCal (returns text, not JSON) ──
    if (action === "plenario_agenda_ical") {
      const icalText = await plenarioAgendaIcal();
      return new Response(JSON.stringify({ success: true, format: "ical", data: icalText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LexML ──
    if (action === "lexml") {
      if (!body.query) return json({ error: "Query obrigatória" }, 400);
      const results = await searchLexML(body.query, body.maxRecords || 10);
      return json({ success: true, query: body.query, totalResults: results.length, results });
    }

    // ── Busca unificada ──
    if (action === "busca" || action === "search") {
      if (!body.query) return json({ error: "Query obrigatória" }, 400);
      console.log(`[legislacao-federal] Busca: "${body.query}"`);
      const results = await buscaUnificadaLegislacao(body.query);
      let neuralIndexed = 0, embeddingsIndexed = 0;
      if (userId && results.length > 0) neuralIndexed = await indexToNeuralKnowledge(supabase, results, userId, body.query);
      if (results.length > 0) embeddingsIndexed = await indexToLegalEmbeddings(supabase, results, body.query);
      return json({
        success: true, query: body.query, totalResults: results.length, results,
        indexed: { neural: neuralIndexed, embeddings: embeddingsIndexed },
        sources: ["senado_legislacao", "camara_proposicoes", "lexml", "senado_processo"],
      });
    }

    // ── Senado actions ──
    if (SENADO_ACTIONS[action]) {
      const data = await SENADO_ACTIONS[action](body);
      return json({ success: true, action, data });
    }

    // ── Câmara actions ──
    if (CAMARA_ACTIONS[action]) {
      const data = await CAMARA_ACTIONS[action](body);
      return json({ success: true, action, data });
    }

    // ── Administrativo actions ──
    if (ADM_ACTIONS[action]) {
      const data = await ADM_ACTIONS[action](body);
      return json({ success: true, action, data });
    }

    // ── Action not found ──
    const allActions = [
      ...Object.keys(SENADO_ACTIONS),
      ...Object.keys(CAMARA_ACTIONS),
      ...Object.keys(ADM_ACTIONS),
      "busca", "search", "catalogo", "ingest_codigos", "lexml"
    ].sort();

    return json({
      error: `Ação não reconhecida: ${action}`,
      availableActions: allActions,
      categories: {
        comissao: allActions.filter(a => a.startsWith("comissao_")),
        composicao: allActions.filter(a => a.startsWith("composicao_")),
        discurso_taquigrafia: allActions.filter(a => a.startsWith("discurso_") || a.startsWith("taquigrafia_") || a.startsWith("senador_apartes") || a.startsWith("senador_discursos")),
        legislacao: allActions.filter(a => a.startsWith("senado_legislacao_") || a === "senado_tipos_norma"),
        orcamento: allActions.filter(a => a.startsWith("orcamento_")),
        parlamentar: allActions.filter(a => a.startsWith("senador_") || a === "autor_lista_atual"),
        plenario: allActions.filter(a => a.startsWith("plenario_") || a === "senado_plenario"),
        processo: allActions.filter(a => a.startsWith("processo_") || a.startsWith("senado_processo")),
        votacao: allActions.filter(a => a.startsWith("votacao_") || a === "senado_votacoes"),
        materia: allActions.filter(a => a.startsWith("materia_")),
        camara: allActions.filter(a => a.startsWith("camara_")),
        administrativo: allActions.filter(a => a.startsWith("adm_")),
        outros: ["busca", "search", "catalogo", "ingest_codigos", "lexml"],
      },
    }, 400);
  } catch (error) {
    console.error("[legislacao-federal] Error:", error);
    return json({ error: "Erro ao processar solicitação" }, 500);
  }
});
