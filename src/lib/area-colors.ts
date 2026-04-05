// ═══════════════════════════════════════
// Mapa centralizado de cores por área jurídica — 26 áreas completas
// Usado em PesquisaJurisprudencial e PesquisaUnificada
// ═══════════════════════════════════════

export const AREA_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  // ── 13 áreas originais ──
  penal:            { bg: "bg-red-500/15 border-red-500/40",     text: "text-red-400",     label: "Penal" },
  civil:            { bg: "bg-blue-500/15 border-blue-500/40",   text: "text-blue-400",    label: "Civil" },
  trabalhista:      { bg: "bg-amber-500/15 border-amber-500/40", text: "text-amber-400",   label: "Trabalhista" },
  "tributário":     { bg: "bg-emerald-500/15 border-emerald-500/40", text: "text-emerald-400", label: "Tributário" },
  tributario:       { bg: "bg-emerald-500/15 border-emerald-500/40", text: "text-emerald-400", label: "Tributário" },
  constitucional:   { bg: "bg-purple-500/15 border-purple-500/40", text: "text-purple-400", label: "Constitucional" },
  consumidor:       { bg: "bg-teal-500/15 border-teal-500/40",   text: "text-teal-400",    label: "Consumidor" },
  "família":        { bg: "bg-pink-500/15 border-pink-500/40",   text: "text-pink-400",    label: "Família" },
  familia:          { bg: "bg-pink-500/15 border-pink-500/40",   text: "text-pink-400",    label: "Família" },
  administrativo:   { bg: "bg-indigo-500/15 border-indigo-500/40", text: "text-indigo-400", label: "Administrativo" },
  ambiental:        { bg: "bg-green-500/15 border-green-500/40", text: "text-green-400",   label: "Ambiental" },
  "previdenciário": { bg: "bg-orange-500/15 border-orange-500/40", text: "text-orange-400", label: "Previdenciário" },
  previdenciario:   { bg: "bg-orange-500/15 border-orange-500/40", text: "text-orange-400", label: "Previdenciário" },
  eleitoral:        { bg: "bg-cyan-500/15 border-cyan-500/40",   text: "text-cyan-400",    label: "Eleitoral" },
  empresarial:      { bg: "bg-violet-500/15 border-violet-500/40", text: "text-violet-400", label: "Empresarial" },

  // ── 13 áreas adicionais (catálogo 400+ leis) ──
  digital:          { bg: "bg-sky-500/15 border-sky-500/40",     text: "text-sky-400",     label: "Digital" },
  "imobiliário":    { bg: "bg-stone-500/15 border-stone-500/40", text: "text-stone-400",   label: "Imobiliário" },
  imobiliario:      { bg: "bg-stone-500/15 border-stone-500/40", text: "text-stone-400",   label: "Imobiliário" },
  militar:          { bg: "bg-slate-500/15 border-slate-500/40", text: "text-slate-400",   label: "Militar" },
  internacional:    { bg: "bg-rose-500/15 border-rose-500/40",   text: "text-rose-400",    label: "Internacional" },
  "saúde":          { bg: "bg-lime-500/15 border-lime-500/40",   text: "text-lime-400",    label: "Saúde" },
  saude:            { bg: "bg-lime-500/15 border-lime-500/40",   text: "text-lime-400",    label: "Saúde" },
  educacional:      { bg: "bg-yellow-500/15 border-yellow-500/40", text: "text-yellow-400", label: "Educacional" },
  "agrário":        { bg: "bg-emerald-700/15 border-emerald-700/40", text: "text-emerald-600", label: "Agrário" },
  agrario:          { bg: "bg-emerald-700/15 border-emerald-700/40", text: "text-emerald-600", label: "Agrário" },
  "marítimo":       { bg: "bg-blue-700/15 border-blue-700/40",  text: "text-blue-600",    label: "Marítimo" },
  maritimo:         { bg: "bg-blue-700/15 border-blue-700/40",  text: "text-blue-600",    label: "Marítimo" },
  "aeronáutico":    { bg: "bg-blue-700/15 border-blue-700/40",  text: "text-blue-600",    label: "Aeronáutico" },
  aeronautico:      { bg: "bg-blue-700/15 border-blue-700/40",  text: "text-blue-600",    label: "Aeronáutico" },
  "bancário":       { bg: "bg-zinc-500/15 border-zinc-500/40",  text: "text-zinc-400",    label: "Bancário" },
  bancario:         { bg: "bg-zinc-500/15 border-zinc-500/40",  text: "text-zinc-400",    label: "Bancário" },
  financeiro:       { bg: "bg-zinc-500/15 border-zinc-500/40",  text: "text-zinc-400",    label: "Financeiro" },
  desportivo:       { bg: "bg-fuchsia-500/15 border-fuchsia-500/40", text: "text-fuchsia-400", label: "Desportivo" },
  energia:          { bg: "bg-amber-700/15 border-amber-700/40", text: "text-amber-600",   label: "Energia" },
  "mineração":      { bg: "bg-amber-700/15 border-amber-700/40", text: "text-amber-600",   label: "Mineração" },
  mineracao:        { bg: "bg-amber-700/15 border-amber-700/40", text: "text-amber-600",   label: "Mineração" },
  "processo civil": { bg: "bg-blue-400/15 border-blue-400/40",  text: "text-blue-300",    label: "Processo Civil" },
  "processo penal": { bg: "bg-red-400/15 border-red-400/40",    text: "text-red-300",     label: "Processo Penal" },
};

/** Lookup helper — normaliza para lowercase antes de buscar */
export function getAreaColor(area: string | undefined | null) {
  if (!area) return null;
  return AREA_COLORS[area.toLowerCase()] || null;
}
