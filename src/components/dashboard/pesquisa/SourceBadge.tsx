import type { SourceId, ResultType } from "@/lib/api";

const SOURCE_COLORS: Record<string, string> = {
  knowledge_graph: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  google_books: 'bg-green-500/10 text-green-400 border-green-500/30',
  camara: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  lexml: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  stf: 'bg-red-500/10 text-red-400 border-red-500/30',
  cnj: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  freelaw: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  courtlistener_dockets: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  neural_knowledge: 'bg-primary/10 text-primary border-primary/30',
  neural_embeddings: 'bg-primary/10 text-primary border-primary/30',
  dados_gov: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  stf_bigquery: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

const SOURCE_SHORT: Record<string, string> = {
  knowledge_graph: 'KG',
  google_books: 'Books',
  camara: 'Câmara',
  lexml: 'LexML',
  stf: 'STF',
  cnj: 'CNJ',
  freelaw: 'FreeLaw',
  courtlistener_dockets: 'Dockets',
  neural_knowledge: '🧠 Doutrina',
  neural_embeddings: '🧠 Neural',
  dados_gov: '📊 Dados.Gov',
  stf_bigquery: '⚖️ STF BigQuery',
};

const TYPE_COLORS: Record<ResultType, string> = {
  lei: 'bg-primary/10 text-primary border-primary/30',
  jurisprudencia: 'bg-red-500/10 text-red-400 border-red-500/30',
  doutrina: 'bg-green-500/10 text-green-400 border-green-500/30',
  entidade: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  proposicao: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  estatistica: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
};

const TYPE_LABELS: Record<ResultType, string> = {
  lei: 'Lei',
  jurisprudencia: 'Jurisp.',
  doutrina: 'Doutrina',
  entidade: 'Entidade',
  proposicao: 'Proposição',
  estatistica: 'Estatística',
};

export function SourceBadge({ source }: { source: SourceId }) {
  return (
    <span className={`text-[9px] px-1.5 py-0.5 border tracking-wider font-medium ${SOURCE_COLORS[source] || 'bg-muted text-muted-foreground border-border'}`}>
      {SOURCE_SHORT[source] || source}
    </span>
  );
}

export function TypeBadge({ type }: { type: ResultType }) {
  return (
    <span className={`text-[9px] px-1.5 py-0.5 border tracking-wider font-medium ${TYPE_COLORS[type] || 'bg-muted text-muted-foreground border-border'}`}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}
