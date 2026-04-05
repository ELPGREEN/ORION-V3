// Tipos principais do sistema Juridico AI

export interface User {
  id: string;
  email: string;
  nome: string;
  oab?: string;
  telefone?: string;
  plano: 'basico' | 'premium' | 'admin';
  usos: UsageQuota;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface UsageQuota {
  chat: { usado: number; limite: number };
  pecas: { usado: number; limite: number };
  jurisprudencia: { usado: number; limite: number };
  documentos: { usado: number; limite: number };
  contratos: { usado: number; limite: number };
  ultimoReset: Date;
}

export interface Documento {
  id: string;
  usuarioId: string;
  tipo: TipoDocumento;
  titulo: string;
  conteudo: string;
  arquivoUrl?: string;
  status: 'rascunho' | 'finalizado' | 'enviado';
  criadoEm: Date;
  atualizadoEm: Date;
}

export type TipoDocumento =
  | 'peticao_inicial'
  | 'contestacao'
  | 'recurso'
  | 'contrato'
  | 'parecer'
  | 'agravo'
  | 'apelacao'
  | 'tutela'
  | 'outro';

export interface Jurisprudencia {
  id: string;
  numero: string;
  tribunal: string;
  classe: string;
  assunto: string;
  relator: string;
  dataJulgamento: Date;
  ementa: string;
  textoIntegral?: string;
}

export interface Tribunal {
  id: string;
  sigla: string;
  nome: string;
  tipo: 'superior' | 'regional' | 'estadual' | 'trabalhista';
}

export interface MensagemChat {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Servico {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  rota: string;
  categoria: 'ia' | 'pesquisa' | 'documentos' | 'calculadora';
  premium?: boolean;
}

// Constantes de limites por plano
export const LIMITES_PLANO = {
  basico: {
    chat: 200,
    pecas: 5,
    jurisprudencia: 50,
    documentos: 10,
    contratos: 3,
    uploadMB: 50,
    uploadPaginas: 400,
  },
  premium: {
    chat: 2000,
    pecas: 100,
    jurisprudencia: 500,
    documentos: 100,
    contratos: 50,
    uploadMB: 150,
    uploadPaginas: 1200,
  },
  admin: {
    chat: Infinity,
    pecas: Infinity,
    jurisprudencia: Infinity,
    documentos: Infinity,
    contratos: Infinity,
    uploadMB: 500,
    uploadPaginas: 5000,
  },
} as const;

// Lista de tribunais para seletor
export const TRIBUNAIS: Tribunal[] = [
  // Superiores
  { id: 'stf', sigla: 'STF', nome: 'Supremo Tribunal Federal', tipo: 'superior' },
  { id: 'stj', sigla: 'STJ', nome: 'Superior Tribunal de Justiça', tipo: 'superior' },
  { id: 'tst', sigla: 'TST', nome: 'Tribunal Superior do Trabalho', tipo: 'superior' },
  { id: 'tse', sigla: 'TSE', nome: 'Tribunal Superior Eleitoral', tipo: 'superior' },
  { id: 'stm', sigla: 'STM', nome: 'Superior Tribunal Militar', tipo: 'superior' },
  // TRFs
  { id: 'trf1', sigla: 'TRF1', nome: 'Tribunal Regional Federal da 1ª Região', tipo: 'regional' },
  { id: 'trf2', sigla: 'TRF2', nome: 'Tribunal Regional Federal da 2ª Região', tipo: 'regional' },
  { id: 'trf3', sigla: 'TRF3', nome: 'Tribunal Regional Federal da 3ª Região', tipo: 'regional' },
  { id: 'trf4', sigla: 'TRF4', nome: 'Tribunal Regional Federal da 4ª Região', tipo: 'regional' },
  { id: 'trf5', sigla: 'TRF5', nome: 'Tribunal Regional Federal da 5ª Região', tipo: 'regional' },
  { id: 'trf6', sigla: 'TRF6', nome: 'Tribunal Regional Federal da 6ª Região', tipo: 'regional' },
  // TJs principais
  { id: 'tjsp', sigla: 'TJSP', nome: 'Tribunal de Justiça de São Paulo', tipo: 'estadual' },
  { id: 'tjrj', sigla: 'TJRJ', nome: 'Tribunal de Justiça do Rio de Janeiro', tipo: 'estadual' },
  { id: 'tjrs', sigla: 'TJRS', nome: 'Tribunal de Justiça do Rio Grande do Sul', tipo: 'estadual' },
  { id: 'tjmg', sigla: 'TJMG', nome: 'Tribunal de Justiça de Minas Gerais', tipo: 'estadual' },
  { id: 'tjpr', sigla: 'TJPR', nome: 'Tribunal de Justiça do Paraná', tipo: 'estadual' },
  { id: 'tjsc', sigla: 'TJSC', nome: 'Tribunal de Justiça de Santa Catarina', tipo: 'estadual' },
  // TRTs principais
  { id: 'trt4', sigla: 'TRT4', nome: 'Tribunal Regional do Trabalho da 4ª Região (RS)', tipo: 'trabalhista' },
  { id: 'trt2', sigla: 'TRT2', nome: 'Tribunal Regional do Trabalho da 2ª Região (SP)', tipo: 'trabalhista' },
  { id: 'trt1', sigla: 'TRT1', nome: 'Tribunal Regional do Trabalho da 1ª Região (RJ)', tipo: 'trabalhista' },
];
