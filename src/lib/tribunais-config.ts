// Configuração de Tribunais e Foros Brasileiros
// Sistema de adaptação automática por jurisdição

export interface TribunalConfig {
  id: string;
  nome: string;
  sigla: string;
  tipo: "superior" | "federal" | "estadual" | "trabalhista" | "eleitoral" | "militar";
  uf?: string;
  enderecamento: {
    tratamento: string;
    orgao: string;
    complemento?: string;
  };
  formatacao: {
    margemSuperior: number;
    fonte: string;
    espacamento: number;
    citacaoEstilo: "abnt" | "tribunal";
  };
  apiEndpoints?: {
    datajud?: string;
    portal?: string;
  };
  estiloArgumentacao: "formal" | "tecnico" | "conciso";
  legislacaoPrioritaria: string[];
}

// Tribunais Superiores
export const tribunaisSuperiores: TribunalConfig[] = [
  {
    id: "stf",
    nome: "Supremo Tribunal Federal",
    sigla: "STF",
    tipo: "superior",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR MINISTRO PRESIDENTE",
      orgao: "DO SUPREMO TRIBUNAL FEDERAL",
    },
    formatacao: {
      margemSuperior: 50,
      fonte: "Times New Roman",
      espacamento: 1.5,
      citacaoEstilo: "tribunal",
    },
    apiEndpoints: {
      datajud: "https://api-publica.datajud.cnj.jus.br/api_publica_stf",
      portal: "https://portal.stf.jus.br",
    },
    estiloArgumentacao: "tecnico",
    legislacaoPrioritaria: ["CF/88", "Regimento Interno STF", "Lei 9.868/99", "Lei 9.882/99"],
  },
  {
    id: "stj",
    nome: "Superior Tribunal de Justiça",
    sigla: "STJ",
    tipo: "superior",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR MINISTRO PRESIDENTE",
      orgao: "DO SUPERIOR TRIBUNAL DE JUSTIÇA",
    },
    formatacao: {
      margemSuperior: 50,
      fonte: "Times New Roman",
      espacamento: 1.5,
      citacaoEstilo: "tribunal",
    },
    apiEndpoints: {
      datajud: "https://api-publica.datajud.cnj.jus.br/api_publica_stj",
      portal: "https://www.stj.jus.br",
    },
    estiloArgumentacao: "tecnico",
    legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC", "CF/88"],
  },
  {
    id: "tst",
    nome: "Tribunal Superior do Trabalho",
    sigla: "TST",
    tipo: "trabalhista",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR MINISTRO PRESIDENTE",
      orgao: "DO TRIBUNAL SUPERIOR DO TRABALHO",
    },
    formatacao: {
      margemSuperior: 50,
      fonte: "Arial",
      espacamento: 1.5,
      citacaoEstilo: "tribunal",
    },
    apiEndpoints: {
      datajud: "https://api-publica.datajud.cnj.jus.br/api_publica_tst",
    },
    estiloArgumentacao: "tecnico",
    legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "OJs SDI"],
  },
];

// Tribunais Regionais Federais
export const tribunaisFederais: TribunalConfig[] = [
  {
    id: "trf1",
    nome: "Tribunal Regional Federal da 1ª Região",
    sigla: "TRF1",
    tipo: "federal",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR FEDERAL PRESIDENTE",
      orgao: "DO TRIBUNAL REGIONAL FEDERAL DA 1ª REGIÃO",
    },
    formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" },
    estiloArgumentacao: "formal",
    legislacaoPrioritaria: ["CPC/2015", "Lei 9.784/99", "CF/88"],
  },
  {
    id: "trf2",
    nome: "Tribunal Regional Federal da 2ª Região",
    sigla: "TRF2",
    tipo: "federal",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR FEDERAL PRESIDENTE",
      orgao: "DO TRIBUNAL REGIONAL FEDERAL DA 2ª REGIÃO",
    },
    formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" },
    estiloArgumentacao: "formal",
    legislacaoPrioritaria: ["CPC/2015", "Lei 9.784/99", "CF/88"],
  },
  {
    id: "trf3",
    nome: "Tribunal Regional Federal da 3ª Região",
    sigla: "TRF3",
    tipo: "federal",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR FEDERAL PRESIDENTE",
      orgao: "DO TRIBUNAL REGIONAL FEDERAL DA 3ª REGIÃO",
    },
    formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" },
    estiloArgumentacao: "formal",
    legislacaoPrioritaria: ["CPC/2015", "Lei 9.784/99", "CF/88"],
  },
  {
    id: "trf4",
    nome: "Tribunal Regional Federal da 4ª Região",
    sigla: "TRF4",
    tipo: "federal",
    uf: "RS",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR FEDERAL PRESIDENTE",
      orgao: "DO TRIBUNAL REGIONAL FEDERAL DA 4ª REGIÃO",
    },
    formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" },
    estiloArgumentacao: "tecnico",
    legislacaoPrioritaria: ["CPC/2015", "Lei 9.784/99", "CF/88", "Lei 8.112/90"],
  },
  {
    id: "trf5",
    nome: "Tribunal Regional Federal da 5ª Região",
    sigla: "TRF5",
    tipo: "federal",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR FEDERAL PRESIDENTE",
      orgao: "DO TRIBUNAL REGIONAL FEDERAL DA 5ª REGIÃO",
    },
    formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" },
    estiloArgumentacao: "formal",
    legislacaoPrioritaria: ["CPC/2015", "Lei 9.784/99", "CF/88"],
  },
  {
    id: "trf6",
    nome: "Tribunal Regional Federal da 6ª Região",
    sigla: "TRF6",
    tipo: "federal",
    uf: "MG",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR FEDERAL PRESIDENTE",
      orgao: "DO TRIBUNAL REGIONAL FEDERAL DA 6ª REGIÃO",
    },
    formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" },
    estiloArgumentacao: "formal",
    legislacaoPrioritaria: ["CPC/2015", "Lei 9.784/99", "CF/88"],
  },
];

// Tribunais Regionais do Trabalho
export const tribunaisTrabalhistas: TribunalConfig[] = [
  { id: "trt1", nome: "Tribunal Regional do Trabalho da 1ª Região (RJ)", sigla: "TRT1", tipo: "trabalhista", uf: "RJ", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 1ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt2", nome: "Tribunal Regional do Trabalho da 2ª Região (SP)", sigla: "TRT2", tipo: "trabalhista", uf: "SP", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 2ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt3", nome: "Tribunal Regional do Trabalho da 3ª Região (MG)", sigla: "TRT3", tipo: "trabalhista", uf: "MG", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 3ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt4", nome: "Tribunal Regional do Trabalho da 4ª Região (RS)", sigla: "TRT4", tipo: "trabalhista", uf: "RS", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 4ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt5", nome: "Tribunal Regional do Trabalho da 5ª Região (BA)", sigla: "TRT5", tipo: "trabalhista", uf: "BA", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 5ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt6", nome: "Tribunal Regional do Trabalho da 6ª Região (PE)", sigla: "TRT6", tipo: "trabalhista", uf: "PE", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 6ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt7", nome: "Tribunal Regional do Trabalho da 7ª Região (CE)", sigla: "TRT7", tipo: "trabalhista", uf: "CE", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 7ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt8", nome: "Tribunal Regional do Trabalho da 8ª Região (PA/AP)", sigla: "TRT8", tipo: "trabalhista", uf: "PA", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 8ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt9", nome: "Tribunal Regional do Trabalho da 9ª Região (PR)", sigla: "TRT9", tipo: "trabalhista", uf: "PR", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 9ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt10", nome: "Tribunal Regional do Trabalho da 10ª Região (DF/TO)", sigla: "TRT10", tipo: "trabalhista", uf: "DF", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 10ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt11", nome: "Tribunal Regional do Trabalho da 11ª Região (AM/RR)", sigla: "TRT11", tipo: "trabalhista", uf: "AM", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 11ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt12", nome: "Tribunal Regional do Trabalho da 12ª Região (SC)", sigla: "TRT12", tipo: "trabalhista", uf: "SC", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 12ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt13", nome: "Tribunal Regional do Trabalho da 13ª Região (PB)", sigla: "TRT13", tipo: "trabalhista", uf: "PB", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 13ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt14", nome: "Tribunal Regional do Trabalho da 14ª Região (RO/AC)", sigla: "TRT14", tipo: "trabalhista", uf: "RO", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 14ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt15", nome: "Tribunal Regional do Trabalho da 15ª Região (Campinas)", sigla: "TRT15", tipo: "trabalhista", uf: "SP", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 15ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt16", nome: "Tribunal Regional do Trabalho da 16ª Região (MA)", sigla: "TRT16", tipo: "trabalhista", uf: "MA", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 16ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt17", nome: "Tribunal Regional do Trabalho da 17ª Região (ES)", sigla: "TRT17", tipo: "trabalhista", uf: "ES", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 17ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt18", nome: "Tribunal Regional do Trabalho da 18ª Região (GO)", sigla: "TRT18", tipo: "trabalhista", uf: "GO", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 18ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt19", nome: "Tribunal Regional do Trabalho da 19ª Região (AL)", sigla: "TRT19", tipo: "trabalhista", uf: "AL", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 19ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt20", nome: "Tribunal Regional do Trabalho da 20ª Região (SE)", sigla: "TRT20", tipo: "trabalhista", uf: "SE", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 20ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt21", nome: "Tribunal Regional do Trabalho da 21ª Região (RN)", sigla: "TRT21", tipo: "trabalhista", uf: "RN", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 21ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt22", nome: "Tribunal Regional do Trabalho da 22ª Região (PI)", sigla: "TRT22", tipo: "trabalhista", uf: "PI", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 22ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt23", nome: "Tribunal Regional do Trabalho da 23ª Região (MT)", sigla: "TRT23", tipo: "trabalhista", uf: "MT", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 23ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
  { id: "trt24", nome: "Tribunal Regional do Trabalho da 24ª Região (MS)", sigla: "TRT24", tipo: "trabalhista", uf: "MS", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL REGIONAL DO TRABALHO DA 24ª REGIÃO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CLT", "CF/88", "Súmulas TST", "CPC/2015"] },
];

// Tribunais de Justiça Estaduais — todos os 27 TJs
export const tribunaisEstaduais: TribunalConfig[] = [
  { id: "tjac", nome: "Tribunal de Justiça do Acre", sigla: "TJAC", tipo: "estadual", uf: "AC", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO ACRE" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjal", nome: "Tribunal de Justiça de Alagoas", sigla: "TJAL", tipo: "estadual", uf: "AL", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DE ALAGOAS" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjap", nome: "Tribunal de Justiça do Amapá", sigla: "TJAP", tipo: "estadual", uf: "AP", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO AMAPÁ" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjam", nome: "Tribunal de Justiça do Amazonas", sigla: "TJAM", tipo: "estadual", uf: "AM", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO AMAZONAS" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjba", nome: "Tribunal de Justiça da Bahia", sigla: "TJBA", tipo: "estadual", uf: "BA", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DA BAHIA" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjce", nome: "Tribunal de Justiça do Ceará", sigla: "TJCE", tipo: "estadual", uf: "CE", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO CEARÁ" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjdft", nome: "Tribunal de Justiça do Distrito Federal e Territórios", sigla: "TJDFT", tipo: "estadual", uf: "DF", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO DISTRITO FEDERAL E DOS TERRITÓRIOS" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjes", nome: "Tribunal de Justiça do Espírito Santo", sigla: "TJES", tipo: "estadual", uf: "ES", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO ESPÍRITO SANTO" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjgo", nome: "Tribunal de Justiça de Goiás", sigla: "TJGO", tipo: "estadual", uf: "GO", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DE GOIÁS" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjma", nome: "Tribunal de Justiça do Maranhão", sigla: "TJMA", tipo: "estadual", uf: "MA", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO MARANHÃO" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjmt", nome: "Tribunal de Justiça do Mato Grosso", sigla: "TJMT", tipo: "estadual", uf: "MT", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DE MATO GROSSO" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjms", nome: "Tribunal de Justiça do Mato Grosso do Sul", sigla: "TJMS", tipo: "estadual", uf: "MS", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DE MATO GROSSO DO SUL" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjmg", nome: "Tribunal de Justiça de Minas Gerais", sigla: "TJMG", tipo: "estadual", uf: "MG", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DE MINAS GERAIS" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjpa", nome: "Tribunal de Justiça do Pará", sigla: "TJPA", tipo: "estadual", uf: "PA", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO PARÁ" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjpb", nome: "Tribunal de Justiça da Paraíba", sigla: "TJPB", tipo: "estadual", uf: "PB", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DA PARAÍBA" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjpr", nome: "Tribunal de Justiça do Paraná", sigla: "TJPR", tipo: "estadual", uf: "PR", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO PARANÁ" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjpe", nome: "Tribunal de Justiça de Pernambuco", sigla: "TJPE", tipo: "estadual", uf: "PE", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DE PERNAMBUCO" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjpi", nome: "Tribunal de Justiça do Piauí", sigla: "TJPI", tipo: "estadual", uf: "PI", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO PIAUÍ" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjrj", nome: "Tribunal de Justiça do Rio de Janeiro", sigla: "TJRJ", tipo: "estadual", uf: "RJ", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO RIO DE JANEIRO" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjrn", nome: "Tribunal de Justiça do Rio Grande do Norte", sigla: "TJRN", tipo: "estadual", uf: "RN", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO RIO GRANDE DO NORTE" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjrs", nome: "Tribunal de Justiça do Rio Grande do Sul", sigla: "TJRS", tipo: "estadual", uf: "RS", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO RIO GRANDE DO SUL" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, apiEndpoints: { portal: "https://www.tjrs.jus.br" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC", "Código de Normas CGJ/RS"] },
  { id: "tjro", nome: "Tribunal de Justiça de Rondônia", sigla: "TJRO", tipo: "estadual", uf: "RO", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DE RONDÔNIA" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjrr", nome: "Tribunal de Justiça de Roraima", sigla: "TJRR", tipo: "estadual", uf: "RR", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DE RORAIMA" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjsc", nome: "Tribunal de Justiça de Santa Catarina", sigla: "TJSC", tipo: "estadual", uf: "SC", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DE SANTA CATARINA" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjsp", nome: "Tribunal de Justiça de São Paulo", sigla: "TJSP", tipo: "estadual", uf: "SP", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO" }, formatacao: { margemSuperior: 45, fonte: "Arial", espacamento: 1.5, citacaoEstilo: "tribunal" }, estiloArgumentacao: "conciso", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC", "NSCGJ/SP"] },
  { id: "tjse", nome: "Tribunal de Justiça de Sergipe", sigla: "TJSE", tipo: "estadual", uf: "SE", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DE SERGIPE" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
  { id: "tjto", nome: "Tribunal de Justiça do Tocantins", sigla: "TJTO", tipo: "estadual", uf: "TO", enderecamento: { tratamento: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE", orgao: "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO TOCANTINS" }, formatacao: { margemSuperior: 45, fonte: "Times New Roman", espacamento: 1.5, citacaoEstilo: "abnt" }, estiloArgumentacao: "formal", legislacaoPrioritaria: ["CPC/2015", "CC/2002", "CDC"] },
];

// Comarcas por UF — principais cidades de cada estado
export const comarcasPorUF: Record<string, string[]> = {
  AC: ["Rio Branco", "Cruzeiro do Sul", "Sena Madureira", "Tarauacá", "Feijó", "Brasiléia"],
  AL: ["Maceió", "Arapiraca", "Rio Largo", "Palmeira dos Índios", "União dos Palmares", "Penedo", "São Miguel dos Campos", "Delmiro Gouveia"],
  AP: ["Macapá", "Santana", "Laranjal do Jari", "Oiapoque", "Mazagão"],
  AM: ["Manaus", "Parintins", "Itacoatiara", "Manacapuru", "Coari", "Tefé", "Tabatinga", "Maués"],
  BA: ["Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari", "Itabuna", "Juazeiro", "Lauro de Freitas", "Ilhéus", "Jequié", "Barreiras", "Alagoinhas", "Teixeira de Freitas", "Porto Seguro", "Simões Filho", "Paulo Afonso", "Eunápolis", "Santo Antônio de Jesus", "Valença", "Candeias", "Guanambi"],
  CE: ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Maracanaú", "Sobral", "Crato", "Itapipoca", "Maranguape", "Iguatu", "Quixadá", "Canindé", "Pacajus", "Crateús"],
  DF: ["Brasília", "Taguatinga", "Ceilândia", "Samambaia", "Gama", "Planaltina", "Sobradinho"],
  ES: ["Vitória", "Vila Velha", "Serra", "Cariacica", "Cachoeiro de Itapemirim", "Linhares", "São Mateus", "Colatina", "Guarapari", "Aracruz"],
  GO: ["Goiânia", "Aparecida de Goiânia", "Anápolis", "Rio Verde", "Luziânia", "Águas Lindas de Goiás", "Valparaíso de Goiás", "Trindade", "Formosa", "Novo Gama", "Itumbiara", "Senador Canedo", "Catalão", "Jataí"],
  MA: ["São Luís", "Imperatriz", "São José de Ribamar", "Timon", "Caxias", "Codó", "Paço do Lumiar", "Açailândia", "Bacabal", "Santa Inês"],
  MT: ["Cuiabá", "Várzea Grande", "Rondonópolis", "Sinop", "Tangará da Serra", "Cáceres", "Sorriso", "Lucas do Rio Verde", "Primavera do Leste", "Alta Floresta"],
  MS: ["Campo Grande", "Dourados", "Três Lagoas", "Corumbá", "Ponta Porã", "Naviraí", "Nova Andradina", "Aquidauana", "Maracaju", "Sidrolândia"],
  MG: ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim", "Montes Claros", "Ribeirão das Neves", "Uberaba", "Governador Valadares", "Ipatinga", "Sete Lagoas", "Divinópolis", "Santa Luzia", "Ibirité", "Poços de Caldas", "Patos de Minas", "Pouso Alegre", "Teófilo Otoni", "Barbacena", "Sabará", "Varginha", "Conselheiro Lafaiete", "Muriaé", "Araguari", "Itajubá", "Passos", "Lavras", "Nova Lima", "Itaúna", "Araxá", "Formiga", "Caratinga", "Ituiutaba", "Alfenas"],
  PA: ["Belém", "Ananindeua", "Santarém", "Marabá", "Castanhal", "Parauapebas", "Abaetetuba", "Cametá", "Marituba", "Bragança", "Altamira", "Tucuruí", "Itaituba"],
  PB: ["João Pessoa", "Campina Grande", "Santa Rita", "Patos", "Bayeux", "Sousa", "Cajazeiras", "Cabedelo", "Guarabira", "Sapé"],
  PR: ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel", "São José dos Pinhais", "Foz do Iguaçu", "Colombo", "Guarapuava", "Paranaguá", "Araucária", "Toledo", "Apucarana", "Pinhais", "Campo Largo", "Arapongas", "Almirante Tamandaré", "Umuarama", "Piraquara", "Cambé", "Francisco Beltrão", "Paranavaí"],
  PE: ["Recife", "Jaboatão dos Guararapes", "Olinda", "Caruaru", "Petrolina", "Paulista", "Cabo de Santo Agostinho", "Camaragibe", "Garanhuns", "Vitória de Santo Antão", "Igarassu", "São Lourenço da Mata", "Santa Cruz do Capibaribe", "Abreu e Lima"],
  PI: ["Teresina", "Parnaíba", "Picos", "Piripiri", "Floriano", "Campo Maior", "Barras", "União"],
  RJ: ["Rio de Janeiro", "São Gonçalo", "Duque de Caxias", "Nova Iguaçu", "Niterói", "Belford Roxo", "São João de Meriti", "Campos dos Goytacazes", "Petrópolis", "Volta Redonda", "Magé", "Itaboraí", "Mesquita", "Nova Friburgo", "Barra Mansa", "Macaé", "Cabo Frio", "Nilópolis", "Teresópolis", "Resende", "Maricá", "Angra dos Reis"],
  RN: ["Natal", "Mossoró", "Parnamirim", "São Gonçalo do Amarante", "Macaíba", "Ceará-Mirim", "Caicó", "Açu", "Currais Novos", "Santa Cruz"],
  RS: ["Porto Alegre", "Canoas", "Caxias do Sul", "Pelotas", "Santa Maria", "Novo Hamburgo", "São Leopoldo", "Rio Grande", "Gravataí", "Viamão", "Passo Fundo", "Uruguaiana", "Bagé", "Santa Cruz do Sul", "Lajeado", "Estrela", "Erechim", "Bento Gonçalves", "Cachoeirinha", "Sapucaia do Sul", "Alvorada", "Santa Rosa", "Ijuí", "Vacaria", "Farroupilha", "Montenegro", "Camaquã", "Guaíba", "Taquara", "Cruz Alta", "Carazinho", "Venâncio Aires", "Sapiranga", "Santo Ângelo", "Tramandaí", "São Borja", "Alegrete", "Santiago", "Torres", "Osório", "Campo Bom", "Frederico Westphalen", "Panambi", "Soledade", "São Jerônimo", "Cachoeira do Sul", "São Gabriel", "Rosário do Sul", "Encantado", "Arroio do Meio", "Teutônia", "Igrejinha", "Três Coroas", "Dom Pedrito", "Santana do Livramento", "Jaguarão", "Capão da Canoa", "Xangri-lá", "Imbé"],
  RO: ["Porto Velho", "Ji-Paraná", "Ariquemes", "Vilhena", "Cacoal", "Rolim de Moura", "Guajará-Mirim", "Jaru"],
  RR: ["Boa Vista", "Rorainópolis", "Caracaraí", "Pacaraima"],
  SC: ["Florianópolis", "Joinville", "Blumenau", "São José", "Chapecó", "Criciúma", "Itajaí", "Jaraguá do Sul", "Lages", "Palhoça", "Balneário Camboriú", "Brusque", "Tubarão", "São Bento do Sul", "Caçador", "Concórdia", "Camboriú", "Navegantes", "Rio do Sul", "Araranguá", "Gaspar", "Mafra", "Canoinhas", "Indaial", "Xanxerê", "Joaçaba", "Videira", "São Miguel do Oeste", "Imbituba", "Tijucas"],
  SP: ["São Paulo", "Guarulhos", "Campinas", "São Bernardo do Campo", "Santo André", "São José dos Campos", "Osasco", "Ribeirão Preto", "Sorocaba", "Mauá", "São José do Rio Preto", "Mogi das Cruzes", "Santos", "Diadema", "Jundiaí", "Piracicaba", "Carapicuíba", "Bauru", "Itaquaquecetuba", "São Vicente", "Franca", "Praia Grande", "Guarujá", "Taubaté", "Limeira", "Suzano", "Taboão da Serra", "Sumaré", "Barueri", "Embu das Artes", "São Carlos", "Indaiatuba", "Cotia", "Americana", "Marília", "Araraquara", "Jacareí", "Presidente Prudente", "Hortolândia", "Rio Claro", "Araçatuba", "Santa Bárbara d'Oeste", "Ferraz de Vasconcelos", "Francisco Morato", "Itapevi", "Bragança Paulista", "Pindamonhangaba", "Itapetininga", "São Caetano do Sul", "Mogi Guaçu", "Atibaia", "Valinhos", "Botucatu", "Assis", "Ourinhos", "Lençóis Paulista", "Itu", "Catanduva", "Cubatão", "Jaú", "Registro", "Votuporanga"],
  SE: ["Aracaju", "Nossa Senhora do Socorro", "Lagarto", "Itabaiana", "São Cristóvão", "Estância", "Tobias Barreto", "Propriá"],
  TO: ["Palmas", "Araguaína", "Gurupi", "Porto Nacional", "Paraíso do Tocantins", "Colinas do Tocantins", "Guaraí", "Dianópolis"],
};

// Retorna as UFs disponíveis
export const UFS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const UF_NOMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso",
  MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina",
  SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

// Varas e Juízos de Primeira Instância
export interface VaraConfig {
  id: string;
  tipo: "civel" | "criminal" | "familia" | "fazenda" | "trabalho" | "federal" | "juizado";
  enderecamento: {
    tratamento: string;
    orgao: string;
  };
  competencias: string[];
}

export const varasPrimeiraInstancia: Record<string, VaraConfig> = {
  civel: {
    id: "vara-civel",
    tipo: "civel",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO",
      orgao: "DA {numero}ª VARA CÍVEL DA COMARCA DE {comarca}",
    },
    competencias: ["Ações cíveis em geral", "Obrigações", "Contratos", "Responsabilidade civil"],
  },
  criminal: {
    id: "vara-criminal",
    tipo: "criminal",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO",
      orgao: "DA {numero}ª VARA CRIMINAL DA COMARCA DE {comarca}",
    },
    competencias: ["Ações penais", "Habeas Corpus originário", "Medidas cautelares penais", "Execução penal"],
  },
  juri: {
    id: "vara-juri",
    tipo: "criminal",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO PRESIDENTE DO TRIBUNAL DO JÚRI",
      orgao: "DA COMARCA DE {comarca}",
    },
    competencias: ["Crimes dolosos contra a vida", "Homicídio", "Infanticídio", "Instigação ao suicídio"],
  },
  execucao_penal: {
    id: "vara-execucao-penal",
    tipo: "criminal",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO",
      orgao: "DA {numero}ª VARA DE EXECUÇÕES CRIMINAIS DA COMARCA DE {comarca}",
    },
    competencias: ["Execução penal", "Progressão de regime", "Livramento condicional", "Indulto"],
  },
  violencia_domestica: {
    id: "vara-violencia-domestica",
    tipo: "criminal",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO",
      orgao: "DO JUIZADO DE VIOLÊNCIA DOMÉSTICA E FAMILIAR CONTRA A MULHER DA COMARCA DE {comarca}",
    },
    competencias: ["Lei Maria da Penha (11.340/06)", "Medidas protetivas de urgência"],
  },
  familia: {
    id: "vara-familia",
    tipo: "familia",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO",
      orgao: "DA {numero}ª VARA DE FAMÍLIA E SUCESSÕES DA COMARCA DE {comarca}",
    },
    competencias: ["Divórcio", "Guarda", "Alimentos", "Inventário", "Partilha"],
  },
  fazenda: {
    id: "vara-fazenda",
    tipo: "fazenda",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO",
      orgao: "DA {numero}ª VARA DA FAZENDA PÚBLICA DA COMARCA DE {comarca}",
    },
    competencias: ["Ações contra entes públicos", "Execução fiscal", "Mandado de segurança"],
  },
  trabalho: {
    id: "vara-trabalho",
    tipo: "trabalho",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DO TRABALHO",
      orgao: "DA {numero}ª VARA DO TRABALHO DE {comarca}",
    },
    competencias: ["Reclamação trabalhista", "Verbas rescisórias", "Danos morais trabalhistas"],
  },
  juizado: {
    id: "juizado-especial",
    tipo: "juizado",
    enderecamento: {
      tratamento: "MERITÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO",
      orgao: "DO JUIZADO ESPECIAL CÍVEL DA COMARCA DE {comarca}",
    },
    competencias: ["Causas até 40 SM", "Consumidor", "Pequenas causas"],
  },
  juizado_criminal: {
    id: "juizado-especial-criminal",
    tipo: "criminal",
    enderecamento: {
      tratamento: "MERITÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO",
      orgao: "DO JUIZADO ESPECIAL CRIMINAL DA COMARCA DE {comarca}",
    },
    competencias: ["Infrações de menor potencial ofensivo", "Transação penal", "Suspensão condicional do processo"],
  },
  federal: {
    id: "vara-federal",
    tipo: "federal",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ FEDERAL",
      orgao: "DA {numero}ª VARA FEDERAL DE {comarca}",
    },
    competencias: ["Ações contra União", "Previdenciário", "Tributário federal"],
  },
  federal_criminal: {
    id: "vara-federal-criminal",
    tipo: "criminal",
    enderecamento: {
      tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ FEDERAL",
      orgao: "DA {numero}ª VARA FEDERAL CRIMINAL DE {comarca}",
    },
    competencias: ["Crimes federais", "Tráfico internacional", "Contrabando", "Crimes contra o sistema financeiro"],
  },
};

// Função para obter configuração do tribunal
export function getTribunalConfig(tribunalId: string): TribunalConfig | undefined {
  const allTribunais = [
    ...tribunaisSuperiores,
    ...tribunaisFederais,
    ...tribunaisEstaduais,
    ...tribunaisTrabalhistas,
  ];
  return allTribunais.find((t) => t.id === tribunalId || t.sigla.toLowerCase() === tribunalId.toLowerCase());
}

// Função para obter configuração da vara
export function getVaraConfig(tipoVara: string): VaraConfig | undefined {
  return varasPrimeiraInstancia[tipoVara];
}

// Função para formatar endereçamento completo
export function formatarEnderecamento(
  tribunal?: TribunalConfig,
  vara?: VaraConfig,
  comarca?: string,
  numeroVara?: number
): string {
  if (tribunal) {
    return `${tribunal.enderecamento.tratamento}\n${tribunal.enderecamento.orgao}${tribunal.enderecamento.complemento ? `\n${tribunal.enderecamento.complemento}` : ""}`;
  }

  if (vara && comarca) {
    let orgao = vara.enderecamento.orgao
      .replace("{comarca}", comarca.toUpperCase())
      .replace("{numero}", numeroVara?.toString() || "");
    
    // Limpar placeholder se não tiver número
    if (!numeroVara) {
      orgao = orgao.replace(/DA \s*ª /g, "DA ");
    }

    return `${vara.enderecamento.tratamento}\n${orgao}`;
  }

  return "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO";
}

// Função para obter legislação prioritária baseada no tipo de caso
export function getLegislacaoPrioritaria(
  tribunal: TribunalConfig | undefined,
  tipoCaso: string
): string[] {
  const baseLegislacao = tribunal?.legislacaoPrioritaria || ["CPC/2015", "CC/2002", "CF/88"];
  
  const legislacaoPorTipo: Record<string, string[]> = {
    consumidor: ["CDC", "CC/2002", "CPC/2015"],
    trabalhista: ["CLT", "CF/88", "Súmulas TST"],
    previdenciario: ["Lei 8.213/91", "Lei 8.212/91", "CF/88"],
    tributario: ["CTN", "CF/88", "Lei 6.830/80"],
    familia: ["CC/2002", "CPC/2015", "ECA", "Lei 11.340/06"],
    penal: ["CP", "CPP", "LEP", "CF/88"],
    administrativo: ["Lei 9.784/99", "Lei 8.666/93", "CF/88"],
    ambiental: ["Lei 9.605/98", "Lei 12.651/12", "CF/88"],
  };

  const tipoCasoLower = tipoCaso.toLowerCase();
  for (const [key, value] of Object.entries(legislacaoPorTipo)) {
    if (tipoCasoLower.includes(key)) {
      return [...new Set([...value, ...baseLegislacao])];
    }
  }

  return baseLegislacao;
}

// Lista de todos os tribunais para seleção
export function getAllTribunais(): TribunalConfig[] {
  return [
    ...tribunaisSuperiores,
    ...tribunaisFederais,
    ...tribunaisEstaduais,
    ...tribunaisTrabalhistas,
  ];
}

// Buscar tribunal por UF
export function getTribunalByUF(uf: string): TribunalConfig | undefined {
  return tribunaisEstaduais.find((t) => t.uf === uf.toUpperCase());
}
