import { cn } from "@/lib/utils";

export type Jurisdiction = "brasil" | "eua" | "ambos";

interface Props {
  value: Jurisdiction;
  onChange: (j: Jurisdiction) => void;
  size?: "sm" | "md";
  className?: string;
}

const options: { id: Jurisdiction; flag: string; label: string; labelShort: string }[] = [
  { id: "brasil", flag: "🇧🇷", label: "Brasil", labelShort: "BR" },
  { id: "eua", flag: "🇺🇸", label: "EUA", labelShort: "US" },
  { id: "ambos", flag: "🌐", label: "Ambos", labelShort: "Todos" },
];

export function JurisdictionSelector({ value, onChange, size = "sm", className }: Props) {
  const isSmall = size === "sm";

  return (
    <div className={cn("flex items-center gap-0.5 bg-muted/50 border border-border p-0.5", className)}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "flex items-center gap-1 transition-colors tracking-wider font-medium",
            isSmall ? "text-[10px] px-2 py-1" : "text-xs px-3 py-1.5",
            value === opt.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <span>{opt.flag}</span>
          <span className="hidden sm:inline">{opt.label}</span>
          <span className="sm:hidden">{opt.labelShort}</span>
        </button>
      ))}
    </div>
  );
}

// Source classification helpers
const BRAZIL_SOURCES = new Set([
  "stf", "cnj", "lexml", "camara", "brasilapi", "senado_legislacao", "catalogo_leis",
  "neural_knowledge", "neural_embeddings",
  "datajud_stj", "datajud_tst", "datajud_tse", "datajud_stm",
  "datajud_trf1", "datajud_trf2", "datajud_trf3", "datajud_trf4", "datajud_trf5", "datajud_trf6",
  "datajud_tjsp", "datajud_tjrj", "datajud_tjrs", "datajud_tjmg",
  "datajud_tjpr", "datajud_tjba", "datajud_tjpe", "datajud_tjsc",
  "datajud_tjce", "datajud_tjgo", "datajud_tjdft", "datajud_tjpa", "datajud_tjma",
  "datajud_tjac", "datajud_tjal", "datajud_tjam", "datajud_tjap",
  "datajud_tjes", "datajud_tjms", "datajud_tjmt", "datajud_tjpb",
  "datajud_tjpi", "datajud_tjrn", "datajud_tjro", "datajud_tjrr",
  "datajud_tjse", "datajud_tjto",
  "datajud_trt1", "datajud_trt2", "datajud_trt3", "datajud_trt4", "datajud_trt5",
  "datajud_trt6", "datajud_trt7", "datajud_trt8", "datajud_trt9", "datajud_trt10",
  "datajud_trt11", "datajud_trt12", "datajud_trt13", "datajud_trt14", "datajud_trt15",
  "datajud_trt16", "datajud_trt17", "datajud_trt18", "datajud_trt19", "datajud_trt20",
  "datajud_trt21", "datajud_trt22", "datajud_trt23", "datajud_trt24",
  "stf_bigquery", "tjrs", "dados_gov",
]);

const USA_SOURCES = new Set([
  "freelaw", "courtlistener_dockets", "knowledge_graph", "google_books",
]);

export function filterSourcesByJurisdiction<T extends string>(
  sources: T[],
  jurisdiction: Jurisdiction,
): T[] {
  if (jurisdiction === "ambos") return sources;
  if (jurisdiction === "brasil") return sources.filter((s) => BRAZIL_SOURCES.has(s));
  if (jurisdiction === "eua") return sources.filter((s) => USA_SOURCES.has(s));
  return sources;
}

export function isSourceInJurisdiction(source: string, jurisdiction: Jurisdiction): boolean {
  if (jurisdiction === "ambos") return true;
  if (jurisdiction === "brasil") return BRAZIL_SOURCES.has(source);
  if (jurisdiction === "eua") return USA_SOURCES.has(source);
  return true;
}
