import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════════════════════════════
// API Client — Legislação Federal (Senado + Câmara + LexML + Catálogo)
// Cobertura COMPLETA da API Dados Abertos do Senado Federal
// Todas as APIs são públicas, sem necessidade de chave
// ═══════════════════════════════════════════════════════════════

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("ingest-legal", { body: { ...body, action: "legislacao_federal" } });
  if (error) throw new Error(error.message || "Erro na comunicação");
  if (data && !data.success && data.error) throw new Error(data.error);
  return data;
}

// ─── Tipos ───

export interface LegislacaoResult {
  source: string; sourceLabel: string; title: string; content: string;
  url: string; date: string; tipo: string; metadata: Record<string, unknown>;
}

export interface BuscaUnificadaResponse {
  success: boolean; query: string; totalResults: number; results: LegislacaoResult[];
  indexed: { neural: number; embeddings: number }; sources: string[];
}

export interface CatalogoLei {
  sigla: string; nome: string; area: string; tipo: string; url: string;
}

export interface CatalogoResponse {
  success: boolean; total: number; areas: string[]; leis: CatalogoLei[];
}

export interface IngestResponse {
  success: boolean; total: number; indexed: number; errors: string[];
}

// ═══════════════════════════════════════
// BUSCA UNIFICADA (Senado + Câmara + LexML)
// ═══════════════════════════════════════
export async function buscaLegislacao(query: string): Promise<BuscaUnificadaResponse> {
  return invoke({ action: "busca", query });
}

// ═══════════════════════════════════════
// CATÁLOGO DE LEIS BRASILEIRAS
// ═══════════════════════════════════════
export async function getCatalogo(area?: string): Promise<CatalogoResponse> {
  return invoke({ action: "catalogo", area });
}

export async function ingestCodigos(areas?: string[]): Promise<IngestResponse> {
  return invoke({ action: "ingest_codigos", areas });
}

// ═══════════════════════════════════════
// LexML SEARCH
// ═══════════════════════════════════════
export async function searchLexML(query: string, maxRecords = 10) {
  return invoke({ action: "lexml", query, maxRecords });
}

// ═══════════════════════════════════════════════════════════════
// SENADO — COMISSÃO
// ═══════════════════════════════════════════════════════════════
export async function comissaoDetalhe(codigo: string) { return invoke({ action: "comissao_detalhe", codigo }); }
export async function comissaoAgendaPeriodo(dataInicio: string, dataFim: string) { return invoke({ action: "comissao_agenda_periodo", dataInicio, dataFim }); }
export async function comissaoAgendaData(data: string) { return invoke({ action: "comissao_agenda_data", data }); }
export async function comissaoAgendaMes(mes: string) { return invoke({ action: "comissao_agenda_mes", mes }); }
export async function comissaoCpiRequerimentos(sigla: string, pagina?: number, tamanho?: number) { return invoke({ action: "comissao_cpi_requerimentos", sigla, pagina, tamanho }); }
export async function comissaoLista(tipo = "permanente") { return invoke({ action: "comissao_lista", tipo }); }
export async function comissaoListaColegiados() { return invoke({ action: "comissao_lista_colegiados" }); }
export async function comissaoListaMistas() { return invoke({ action: "comissao_lista_mistas" }); }
export async function comissaoListaTiposColegiado() { return invoke({ action: "comissao_lista_tipos_colegiado" }); }
export async function comissaoReuniaoDetalhe(codigo: string) { return invoke({ action: "comissao_reuniao_detalhe", codigo }); }
export async function comissaoReuniaoNotas(codigo: string) { return invoke({ action: "comissao_reuniao_notas", codigo }); }

// ═══════════════════════════════════════════════════════════════
// SENADO — COMPOSIÇÃO
// ═══════════════════════════════════════════════════════════════
export async function composicaoBloco(codigo: string) { return invoke({ action: "composicao_bloco", codigo }); }
export async function composicaoComissao(codigo: string) { return invoke({ action: "composicao_comissao", codigo }); }
export async function composicaoComissaoMista(codigo: string) { return invoke({ action: "composicao_comissao_mista", codigo }); }
export async function composicaoLideranca() { return invoke({ action: "composicao_lideranca" }); }
export async function composicaoLiderancaTipos() { return invoke({ action: "composicao_lideranca_tipos" }); }
export async function composicaoLiderancaTiposUnidade() { return invoke({ action: "composicao_lideranca_tipos_unidade" }); }
export async function composicaoListaPorTipo(tipo = "permanente") { return invoke({ action: "composicao_lista_tipo", tipo }); }
export async function composicaoBlocos() { return invoke({ action: "composicao_blocos" }); }
export async function composicaoListaCN(tipo = "permanente") { return invoke({ action: "composicao_lista_cn", tipo }); }
export async function composicaoPartidos() { return invoke({ action: "composicao_partidos" }); }
export async function composicaoTiposCargo() { return invoke({ action: "composicao_tipos_cargo" }); }
export async function composicaoMesaCN() { return invoke({ action: "composicao_mesa_cn" }); }
export async function composicaoMesaSF() { return invoke({ action: "composicao_mesa_sf" }); }

// ═══════════════════════════════════════════════════════════════
// SENADO — DISCURSO / TAQUIGRAFIA
// ═══════════════════════════════════════════════════════════════
export async function discursoTextoIntegral(codigo: string) { return invoke({ action: "discurso_texto_integral", codigo }); }
export async function senadorApartes(codigo: string) { return invoke({ action: "senador_apartes", codigo }); }
export async function senadorDiscursos(codigo: string) { return invoke({ action: "senador_discursos", codigo }); }
export async function senadorTiposUsoPalavra() { return invoke({ action: "senador_tipos_uso_palavra" }); }
export async function taquigrafiaNotasReuniao(id: string) { return invoke({ action: "taquigrafia_notas_reuniao", id }); }
export async function taquigrafiaNotasSessao(id: string) { return invoke({ action: "taquigrafia_notas_sessao", id }); }
export async function taquigrafiaVideosReuniao(id: string) { return invoke({ action: "taquigrafia_videos_reuniao", id }); }
export async function taquigrafiaVideosSessao(id: string) { return invoke({ action: "taquigrafia_videos_sessao", id }); }

// ═══════════════════════════════════════════════════════════════
// SENADO — LEGISLAÇÃO
// ═══════════════════════════════════════════════════════════════
export async function senadoLegislacaoLista(params: { tipo?: string; numero?: string; ano?: string; palavraChave?: string }) {
  return invoke({ action: "senado_legislacao_lista", params });
}
export async function senadoLegislacaoDetalhe(codigo: string) { return invoke({ action: "senado_legislacao_detalhe", codigo }); }
export async function senadoLegislacaoPorId(tipo: string, numdata: string, anoseq: string) {
  return invoke({ action: "senado_legislacao_identificacao", tipo, numdata, anoseq });
}
export async function senadoLegislacaoClasses() { return invoke({ action: "senado_legislacao_classes" }); }
export async function senadoLegislacaoTermos(params: Record<string, string> = {}) { return invoke({ action: "senado_legislacao_termos", params }); }
export async function senadoLegislacaoTiposDeclaracao() { return invoke({ action: "senado_legislacao_tipos_declaracao" }); }
export async function senadoTiposNorma() { return invoke({ action: "senado_tipos_norma" }); }
export async function senadoLegislacaoTiposPublicacao() { return invoke({ action: "senado_legislacao_tipos_publicacao" }); }
export async function senadoLegislacaoTiposVide() { return invoke({ action: "senado_legislacao_tipos_vide" }); }
export async function senadoLegislacaoUrn(urn: string) { return invoke({ action: "senado_legislacao_urn", urn }); }

// ═══════════════════════════════════════════════════════════════
// SENADO — ORÇAMENTO
// ═══════════════════════════════════════════════════════════════
export async function orcamentoLista() { return invoke({ action: "orcamento_lista" }); }
export async function orcamentoOficios() { return invoke({ action: "orcamento_oficios" }); }
export async function orcamentoOficioDetalhe(numero: string) { return invoke({ action: "orcamento_oficio_detalhe", numero }); }

// ═══════════════════════════════════════════════════════════════
// SENADO — PARLAMENTAR (SENADOR)
// ═══════════════════════════════════════════════════════════════
export async function senadoSenadores() { return invoke({ action: "senado_senadores" }); }
export async function senadoSenadorDetalhe(codigo: string) { return invoke({ action: "senado_senador_detalhe", codigo }); }
export async function senadorAutorias(codigo: string) { return invoke({ action: "senador_autorias", codigo }); }
export async function senadorCargos(codigo: string) { return invoke({ action: "senador_cargos", codigo }); }
export async function senadorComissoes(codigo: string) { return invoke({ action: "senador_comissoes", codigo }); }
export async function senadorFiliacoes(codigo: string) { return invoke({ action: "senador_filiacoes", codigo }); }
export async function senadorHistoricoAcademico(codigo: string) { return invoke({ action: "senador_historico_academico", codigo }); }
export async function senadorLicencas(codigo: string) { return invoke({ action: "senador_licencas", codigo }); }
export async function senadorMandatos(codigo: string) { return invoke({ action: "senador_mandatos", codigo }); }
export async function senadorProfissao(codigo: string) { return invoke({ action: "senador_profissao", codigo }); }
export async function senadorRelatorias(codigo: string) { return invoke({ action: "senador_relatorias", codigo }); }
export async function senadorVotacoes(codigo: string) { return invoke({ action: "senador_votacoes_parlamentar", codigo }); }
export async function senadorAfastados() { return invoke({ action: "senador_afastados" }); }
export async function senadorListaLegislatura(legislatura: string) { return invoke({ action: "senador_lista_legislatura", legislatura }); }
export async function senadorListaLegislaturaIntervalo(inicio: string, fim: string) { return invoke({ action: "senador_lista_legislatura_intervalo", inicio, fim }); }
export async function senadorPartidos() { return invoke({ action: "senador_partidos" }); }
export async function autorListaAtual() { return invoke({ action: "autor_lista_atual" }); }

// ═══════════════════════════════════════════════════════════════
// SENADO — PLENÁRIO
// ═══════════════════════════════════════════════════════════════
export async function senadoPlenario(data?: string) { return invoke({ action: "senado_plenario", data }); }
export async function plenarioAgendaDia(data: string) { return invoke({ action: "plenario_agenda_dia", data }); }
export async function plenarioAgendaMes(data: string) { return invoke({ action: "plenario_agenda_mes", data }); }
export async function plenarioAgendaCN(data: string) { return invoke({ action: "plenario_agenda_cn", data }); }
export async function plenarioAgendaCNPeriodo(inicio: string, fim: string) { return invoke({ action: "plenario_agenda_cn_periodo", inicio, fim }); }
export async function plenarioAgendaIcal() { return invoke({ action: "plenario_agenda_ical" }); }
export async function plenarioEncontro(codigo: string) { return invoke({ action: "plenario_encontro", codigo }); }
export async function plenarioEncontroPauta(codigo: string) { return invoke({ action: "plenario_encontro_pauta", codigo }); }
export async function plenarioEncontroResultado(codigo: string) { return invoke({ action: "plenario_encontro_resultado", codigo }); }
export async function plenarioEncontroResumo(codigo: string) { return invoke({ action: "plenario_encontro_resumo", codigo }); }
export async function plenarioLegislatura(data: string) { return invoke({ action: "plenario_legislatura", data }); }
export async function plenarioDiscursos(dataInicio: string, dataFim: string) { return invoke({ action: "plenario_discursos", dataInicio, dataFim }); }
export async function plenarioLegislaturas() { return invoke({ action: "plenario_legislaturas" }); }
export async function plenarioTiposComparecimento() { return invoke({ action: "plenario_tipos_comparecimento" }); }
export async function plenarioResultado(data: string) { return invoke({ action: "plenario_resultado", data }); }
export async function plenarioResultadoCN(data: string) { return invoke({ action: "plenario_resultado_cn", data }); }
export async function plenarioResultadoMes(data: string) { return invoke({ action: "plenario_resultado_mes", data }); }
export async function plenarioResultadoVeto(codigo: string) { return invoke({ action: "plenario_resultado_veto", codigo }); }
export async function plenarioResultadoVetoDispositivo(codigo: string) { return invoke({ action: "plenario_resultado_veto_dispositivo", codigo }); }
export async function plenarioResultadoVetoMateria(codigo: string) { return invoke({ action: "plenario_resultado_veto_materia", codigo }); }
export async function plenarioTiposSessao() { return invoke({ action: "plenario_tipos_sessao" }); }
export async function plenarioOrientacaoPeriodo(dataInicio: string, dataFim: string) { return invoke({ action: "plenario_orientacao_periodo", dataInicio, dataFim }); }
export async function plenarioOrientacaoData(data: string) { return invoke({ action: "plenario_orientacao_data", data }); }

// ═══════════════════════════════════════════════════════════════
// SENADO — PROCESSO LEGISLATIVO (v3)
// ═══════════════════════════════════════════════════════════════
export async function senadoProcessos(params: Record<string, string> = {}) { return invoke({ action: "senado_processos", params }); }
export async function senadoProcessoDetalhe(id: string) { return invoke({ action: "senado_processo_detalhe", id }); }
export async function processoAssuntos() { return invoke({ action: "processo_assuntos" }); }
export async function processoClasses() { return invoke({ action: "processo_classes" }); }
export async function processoDestinos() { return invoke({ action: "processo_destinos" }); }
export async function processoDocumento(params: Record<string, string>) { return invoke({ action: "processo_documento", params }); }
export async function processoDocumentoTipos() { return invoke({ action: "processo_documento_tipos" }); }
export async function processoDocumentoTiposConteudo() { return invoke({ action: "processo_documento_tipos_conteudo" }); }
export async function processoEmenda(params: Record<string, string>) { return invoke({ action: "processo_emenda", params }); }
export async function processoEntes() { return invoke({ action: "processo_entes" }); }
export async function processoPrazo(params: Record<string, string>) { return invoke({ action: "processo_prazo", params }); }
export async function processoPrazoTipos() { return invoke({ action: "processo_prazo_tipos" }); }
export async function processoRelatoria(params: Record<string, string>) { return invoke({ action: "processo_relatoria", params }); }
export async function processoSiglas() { return invoke({ action: "processo_siglas" }); }
export async function processoTiposAtualizacao() { return invoke({ action: "processo_tipos_atualizacao" }); }
export async function processoTiposAutor() { return invoke({ action: "processo_tipos_autor" }); }
export async function processoTiposDecisao() { return invoke({ action: "processo_tipos_decisao" }); }
export async function processoTiposSituacao() { return invoke({ action: "processo_tipos_situacao" }); }

// ═══════════════════════════════════════════════════════════════
// SENADO — VOTAÇÃO
// ═══════════════════════════════════════════════════════════════
export async function senadoVotacoes(params: Record<string, string> = {}) { return invoke({ action: "senado_votacoes", params }); }
export async function votacaoComissao(sigla: string, params: Record<string, string> = {}) { return invoke({ action: "votacao_comissao", sigla, params }); }
export async function votacaoComissaoMateria(sigla: string, numero: string, ano: string, params: Record<string, string> = {}) { return invoke({ action: "votacao_comissao_materia", sigla, numero, ano, params }); }
export async function votacaoComissaoParlamentar(codigo: string, params: Record<string, string> = {}) { return invoke({ action: "votacao_comissao_parlamentar", codigo, params }); }

// ═══════════════════════════════════════════════════════════════
// SENADO — MATÉRIA (legacy + active per v3 API docs)
// ═══════════════════════════════════════════════════════════════
export async function materiaListaTramitacao() { return invoke({ action: "materia_lista_tramitacao" }); }
export async function materiaVetos(ano: string) { return invoke({ action: "materia_vetos", ano }); }
export async function materiaDistribuicaoAutoria(params: Record<string, string> = {}) { return invoke({ action: "materia_distribuicao_autoria", params }); }
export async function materiaDistribuicaoRelatoria(sigla: string) { return invoke({ action: "materia_distribuicao_relatoria", sigla }); }
export async function materiaDetalhe(codigo: string) { return invoke({ action: "materia_detalhe", codigo }); }
export async function materiaDetalheSigla(sigla: string, numero: string, ano: string, comissao?: string) { return invoke({ action: "materia_detalhe_sigla", sigla, numero, ano, comissao }); }
export async function materiaVotacoesCodigo(codigo: string) { return invoke({ action: "materia_votacoes", codigo }); }
export async function materiaMovimentacoes(codigo: string, dataref?: string) { return invoke({ action: "materia_movimentacoes", codigo, dataref }); }
export async function materiaDocumentos(codigo: string) { return invoke({ action: "materia_documentos", codigo }); }
export async function materiaSituacaoAtual(codigo: string) { return invoke({ action: "materia_situacao_atual", codigo }); }
export async function materiaSituacaoTramitacao(data: string) { return invoke({ action: "materia_situacao_tramitacao", data }); }
export async function materiaRelatorias(codigo: string) { return invoke({ action: "materia_relatorias", codigo }); }
export async function materiaOrdia(codigo: string) { return invoke({ action: "materia_ordia", codigo }); }
export async function materiaPesquisaLista(params: Record<string, string> = {}) { return invoke({ action: "materia_pesquisa_lista", params }); }
export async function materiaListaComissao(params: Record<string, string> = {}) { return invoke({ action: "materia_lista_comissao", params }); }
export async function materiaListaPrazo(codPrazo: string, params: Record<string, string> = {}) { return invoke({ action: "materia_lista_prazo", codPrazo, params }); }
export async function materiaSubtipos() { return invoke({ action: "materia_subtipos" }); }
export async function materiaSituacoes() { return invoke({ action: "materia_situacoes" }); }
export async function materiaClasses() { return invoke({ action: "materia_classes" }); }
export async function materiaLocais() { return invoke({ action: "materia_locais" }); }
export async function materiaTiposEmendas() { return invoke({ action: "materia_tipos_emendas" }); }
export async function materiaTiposPrazo() { return invoke({ action: "materia_tipos_prazo" }); }
export async function materiaTiposNatureza() { return invoke({ action: "materia_tipos_natureza" }); }
export async function materiaTiposTurnoApresentacao() { return invoke({ action: "materia_tipos_turno_apresentacao" }); }
export async function materiaTiposAtualizacoes() { return invoke({ action: "materia_tipos_atualizacoes" }); }

// ═══════════════════════════════════════════════════════════════
// CÂMARA DOS DEPUTADOS
// ═══════════════════════════════════════════════════════════════
export async function camaraProposicoes(params: Record<string, string> = {}) { return invoke({ action: "camara_proposicoes", params }); }
export async function camaraProposicaoDetalhe(id: string) { return invoke({ action: "camara_proposicao_detalhe", id }); }
export async function camaraDeputados(params: Record<string, string> = {}) { return invoke({ action: "camara_deputados", params }); }
export async function camaraDeputadoDetalhe(id: string) { return invoke({ action: "camara_deputado_detalhe", id }); }
export async function camaraVotacoes(params: Record<string, string> = {}) { return invoke({ action: "camara_votacoes", params }); }
export async function camaraEventos(params: Record<string, string> = {}) { return invoke({ action: "camara_eventos", params }); }

// Legacy aliases for backward compatibility
export async function senadoMesa() { return invoke({ action: "senado_mesa" }); }
export async function senadoLiderancas() { return invoke({ action: "senado_liderancas" }); }
export async function senadoBlocos() { return invoke({ action: "senado_blocos" }); }
export async function senadoComissoes(tipo = "permanente") { return invoke({ action: "senado_comissoes", tipo }); }
export async function senadoClasses() { return invoke({ action: "senado_classes" }); }

// ═══════════════════════════════════════════════════════════════
// SENADO ADMINISTRATIVO — adm.senado.leg.br
// Contratações, Servidores, Transparência Financeira
// ═══════════════════════════════════════════════════════════════

// ── Contratações ──
export async function admLicitacoes() { return invoke({ action: "adm_licitacoes" }); }
export async function admContratos() { return invoke({ action: "adm_contratos" }); }
export async function admNotasEmpenho() { return invoke({ action: "adm_notas_empenho" }); }
export async function admAtasRegistroPreco() { return invoke({ action: "adm_atas_registro_preco" }); }
export async function admEmpresas() { return invoke({ action: "adm_empresas" }); }
export async function admTerceirizados() { return invoke({ action: "adm_terceirizados" }); }
export async function admJovensAprendizes() { return invoke({ action: "adm_jovens_aprendizes" }); }

// ── Servidores ──
export async function admEstagiarios() { return invoke({ action: "adm_estagiarios" }); }
export async function admPensionistas() { return invoke({ action: "adm_pensionistas" }); }
export async function admPrevisaoAposentadoria() { return invoke({ action: "adm_previsao_aposentadoria" }); }

// ── Transparência Financeira ──
export async function admDespesas(ano?: string) { return invoke({ action: "adm_despesas", ano }); }
export async function admDiarias(ano?: string) { return invoke({ action: "adm_diarias", ano }); }
export async function admPassagens(ano?: string) { return invoke({ action: "adm_passagens", ano }); }
export async function admCeaps(ano?: string) { return invoke({ action: "adm_ceaps", ano }); }
export async function admFolhaPagamento(mesAno?: string) { return invoke({ action: "adm_folha_pagamento", mesAno }); }
